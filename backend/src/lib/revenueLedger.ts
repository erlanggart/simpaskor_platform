const DEFAULT_PLATFORM_SHARE_PERCENT = 15;
const DEFAULT_BUNDLE_PLATFORM_SHARE_PERCENT = 25;

type LedgerClient = any;

type ShareEventSnapshot = {
	packageTier?: string | null;
	platformSharePercent?: number | null;
};

type SummaryRow = {
	grossRevenue: number;
	ticketGrossRevenue: number;
	votingGrossRevenue: number;
	platformShare: number;
	panitiaShare: number;
	ticketRevenue: number;
	votingRevenue: number;
	activeBalance: number;
};

type AmountRow = {
	amount: number;
};

function toNumber(value: unknown): number {
	if (value === null || value === undefined) return 0;
	return Number(value) || 0;
}

function roundCurrency(amount: number) {
	return Math.round(amount);
}

export function getRevenueSharePercents(event: ShareEventSnapshot) {
	const configuredPercent = event.platformSharePercent;
	const platformPercent =
		configuredPercent !== null && configuredPercent !== undefined
			? configuredPercent
			: event.packageTier === "TICKETING_VOTING"
			? DEFAULT_BUNDLE_PLATFORM_SHARE_PERCENT
			: DEFAULT_PLATFORM_SHARE_PERCENT;
	const clampedPlatformPercent = Math.min(100, Math.max(0, platformPercent));

	return {
		platformSharePercent: clampedPlatformPercent,
		panitiaSharePercent: 100 - clampedPlatformPercent,
	};
}

export function calculateRevenueShareAmounts(grossAmount: number, event: ShareEventSnapshot) {
	const { platformSharePercent, panitiaSharePercent } = getRevenueSharePercents(event);
	const platformAmount = roundCurrency(grossAmount * (platformSharePercent / 100));
	const panitiaAmount = roundCurrency(grossAmount - platformAmount);

	return {
		platformSharePercent,
		panitiaSharePercent,
		platformAmount,
		panitiaAmount,
	};
}

async function createRevenueShare(
	tx: LedgerClient,
	params: {
		eventId: string;
		sourceType: "TICKET" | "VOTING";
		sourceId: string;
		sourceCode: string;
		grossAmount: number;
		paidAt: Date;
		event: ShareEventSnapshot;
	}
) {
	if (params.grossAmount <= 0) return;

	await tx.$queryRaw`SELECT "id" FROM "events" WHERE "id" = ${params.eventId} FOR UPDATE`;

	await tx.transaction.createMany({
		data: [
			{
				eventId: params.eventId,
				sourceType: params.sourceType,
				sourceId: params.sourceId,
				sourceCode: params.sourceCode,
				grossAmount: roundCurrency(params.grossAmount),
				paidAt: params.paidAt,
				status: "PAID",
			},
		],
		skipDuplicates: true,
	});

	const ledgerTransaction = await tx.transaction.findUnique({
		where: {
			sourceType_sourceId: {
				sourceType: params.sourceType,
				sourceId: params.sourceId,
			},
		},
		select: { id: true },
	});

	if (!ledgerTransaction) return;

	const share = calculateRevenueShareAmounts(params.grossAmount, params.event);

	await tx.revenueShare.createMany({
		data: [
			{
				transactionId: ledgerTransaction.id,
				eventId: params.eventId,
				grossAmount: roundCurrency(params.grossAmount),
				platformSharePercent: share.platformSharePercent,
				panitiaSharePercent: share.panitiaSharePercent,
				platformAmount: share.platformAmount,
				panitiaAmount: share.panitiaAmount,
			},
		],
		skipDuplicates: true,
	});
}

export async function recordTicketRevenueShare(tx: LedgerClient, purchaseId: string) {
	const purchase = await tx.ticketPurchase.findUnique({
		where: { id: purchaseId },
		select: {
			id: true,
			eventId: true,
			totalAmount: true,
			ticketCode: true,
			status: true,
			paidAt: true,
			event: {
				select: {
					packageTier: true,
					platformSharePercent: true,
				},
			},
		},
	});

	if (!purchase || !["PAID", "USED"].includes(purchase.status)) return;

	await createRevenueShare(tx, {
		eventId: purchase.eventId,
		sourceType: "TICKET",
		sourceId: purchase.id,
		sourceCode: purchase.ticketCode,
		grossAmount: purchase.totalAmount,
		paidAt: purchase.paidAt ?? new Date(),
		event: purchase.event,
	});
}

export async function recordVotingRevenueShare(tx: LedgerClient, purchaseId: string) {
	const purchase = await tx.votingPurchase.findUnique({
		where: { id: purchaseId },
		select: {
			id: true,
			eventId: true,
			totalAmount: true,
			purchaseCode: true,
			status: true,
			paidAt: true,
			event: {
				select: {
					packageTier: true,
					platformSharePercent: true,
				},
			},
		},
	});

	if (!purchase || purchase.status !== "PAID") return;

	await createRevenueShare(tx, {
		eventId: purchase.eventId,
		sourceType: "VOTING",
		sourceId: purchase.id,
		sourceCode: purchase.purchaseCode,
		grossAmount: purchase.totalAmount,
		paidAt: purchase.paidAt ?? new Date(),
		event: purchase.event,
	});
}

export async function getEventRevenueLedgerSummary(tx: LedgerClient, eventId: string) {
	const totals = await tx.$queryRaw<SummaryRow[]>`
		SELECT
			COALESCE(SUM(rs."gross_amount"), 0)::double precision AS "grossRevenue",
			COALESCE(SUM(CASE WHEN t."source_type" = 'TICKET' THEN rs."gross_amount" ELSE 0 END), 0)::double precision AS "ticketGrossRevenue",
			COALESCE(SUM(CASE WHEN t."source_type" = 'VOTING' THEN rs."gross_amount" ELSE 0 END), 0)::double precision AS "votingGrossRevenue",
			COALESCE(SUM(rs."platform_amount"), 0)::double precision AS "platformShare",
			COALESCE(SUM(rs."panitia_amount"), 0)::double precision AS "panitiaShare",
			COALESCE(SUM(CASE WHEN t."source_type" = 'TICKET' THEN rs."panitia_amount" ELSE 0 END), 0)::double precision AS "ticketRevenue",
			COALESCE(SUM(CASE WHEN t."source_type" = 'VOTING' THEN rs."panitia_amount" ELSE 0 END), 0)::double precision AS "votingRevenue",
			COALESCE(SUM(rs."panitia_amount" - rs."withdrawn_panitia_amount"), 0)::double precision AS "activeBalance"
		FROM "revenue_shares" rs
		INNER JOIN "transactions" t ON t."id" = rs."transaction_id"
		WHERE rs."event_id" = ${eventId}
			AND t."status" = 'PAID'
			AND rs."status" <> 'CANCELLED'
	`;

	const withdrawn = await tx.$queryRaw<AmountRow[]>`
		SELECT COALESCE(SUM(wi."amount"), 0)::double precision AS "amount"
		FROM "withdrawal_items" wi
		INNER JOIN "disbursements" d ON d."id" = wi."withdrawal_id"
		WHERE d."event_id" = ${eventId}
			AND d."status" IN ('APPROVED', 'TRANSFERRED')
	`;

	const pending = await tx.$queryRaw<AmountRow[]>`
		SELECT COALESCE(SUM("amount"), 0)::double precision AS "amount"
		FROM "disbursements"
		WHERE "event_id" = ${eventId}
			AND "status" = 'PENDING'
	`;

	const row = totals[0];
	const grossRevenue = toNumber(row?.grossRevenue);
	const platformShare = toNumber(row?.platformShare);
	const panitiaShare = toNumber(row?.panitiaShare);

	return {
		grossRevenue,
		ticketGrossRevenue: toNumber(row?.ticketGrossRevenue),
		votingGrossRevenue: toNumber(row?.votingGrossRevenue),
		platformShare,
		panitiaShare,
		ticketRevenue: toNumber(row?.ticketRevenue),
		votingRevenue: toNumber(row?.votingRevenue),
		totalWithdrawn: toNumber(withdrawn[0]?.amount),
		totalPending: toNumber(pending[0]?.amount),
		activeBalance: Math.max(0, toNumber(row?.activeBalance)),
		platformShareRate: grossRevenue > 0 ? platformShare / grossRevenue : 0,
		panitiaShareRate: grossRevenue > 0 ? panitiaShare / grossRevenue : 0,
	};
}

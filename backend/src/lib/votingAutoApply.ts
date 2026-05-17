type VotingApplyResult = {
	appliedVotes: number;
	voteCount: number;
	usedVotes: number;
	categoryId: string | null;
	nomineeId: string | null;
};

const VOTE_CREATE_CHUNK_SIZE = 1000;

export async function applyPaidVotingPurchaseVotes(
	tx: any,
	purchaseId: string,
	voterIp?: string | null
): Promise<VotingApplyResult> {
	const purchase = await tx.votingPurchase.findUnique({
		where: { id: purchaseId },
		select: {
			id: true,
			status: true,
			categoryId: true,
			nomineeId: true,
			voteCount: true,
			usedVotes: true,
			buyerName: true,
			buyerEmail: true,
		},
	});

	if (!purchase || purchase.status !== "PAID" || !purchase.categoryId || !purchase.nomineeId) {
		return {
			appliedVotes: 0,
			voteCount: purchase?.voteCount ?? 0,
			usedVotes: purchase?.usedVotes ?? 0,
			categoryId: purchase?.categoryId ?? null,
			nomineeId: purchase?.nomineeId ?? null,
		};
	}

	const remainingVotes = Math.max(0, purchase.voteCount - purchase.usedVotes);
	if (remainingVotes === 0) {
		return {
			appliedVotes: 0,
			voteCount: purchase.voteCount,
			usedVotes: purchase.usedVotes,
			categoryId: purchase.categoryId,
			nomineeId: purchase.nomineeId,
		};
	}

	const nominee = await tx.votingNominee.findFirst({
		where: { id: purchase.nomineeId, categoryId: purchase.categoryId },
		select: { id: true },
	});

	if (!nominee) {
		return {
			appliedVotes: 0,
			voteCount: purchase.voteCount,
			usedVotes: purchase.usedVotes,
			categoryId: purchase.categoryId,
			nomineeId: purchase.nomineeId,
		};
	}

	const reserved = await tx.votingPurchase.updateMany({
		where: {
			id: purchase.id,
			status: "PAID",
			usedVotes: purchase.usedVotes,
		},
		data: { usedVotes: { increment: remainingVotes } },
	});

	if (reserved.count === 0) {
		const latestPurchase = await tx.votingPurchase.findUnique({
			where: { id: purchase.id },
			select: { voteCount: true, usedVotes: true, categoryId: true, nomineeId: true },
		});
		return {
			appliedVotes: 0,
			voteCount: latestPurchase?.voteCount ?? purchase.voteCount,
			usedVotes: latestPurchase?.usedVotes ?? purchase.usedVotes,
			categoryId: latestPurchase?.categoryId ?? purchase.categoryId,
			nomineeId: latestPurchase?.nomineeId ?? purchase.nomineeId,
		};
	}

	for (let offset = 0; offset < remainingVotes; offset += VOTE_CREATE_CHUNK_SIZE) {
		const chunkSize = Math.min(VOTE_CREATE_CHUNK_SIZE, remainingVotes - offset);
		await tx.votingVote.createMany({
			data: Array.from({ length: chunkSize }, () => ({
				categoryId: purchase.categoryId,
				nomineeId: purchase.nomineeId,
				purchaseId: purchase.id,
				voterName: purchase.buyerName,
				voterEmail: purchase.buyerEmail,
				voterIp: voterIp || null,
			})),
		});
	}

	await tx.votingNominee.update({
		where: { id: purchase.nomineeId },
		data: { voteCount: { increment: remainingVotes } },
	});

	return {
		appliedVotes: remainingVotes,
		voteCount: purchase.voteCount,
		usedVotes: purchase.usedVotes + remainingVotes,
		categoryId: purchase.categoryId,
		nomineeId: purchase.nomineeId,
	};
}

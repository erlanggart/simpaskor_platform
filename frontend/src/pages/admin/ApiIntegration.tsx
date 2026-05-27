import React, { useState } from "react";
import {
	LuChevronDown,
	LuChevronRight,
	LuCircleCheck,
	LuCode,
	LuCopy,
	LuGlobe,
	LuInfo,
	LuKey,
} from "react-icons/lu";
import { config } from "../../utils/config";

const EXTERNAL_API_KEY = "simpaskor-admin-fee-2026-7d4f6c9b2a8e41f0b5c3d9e7a1f8b6c4";

function getExternalBaseUrl(): string {
	const apiBase = config.api.baseUrl;
	return apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase;
}

const API_ROOT = `${getExternalBaseUrl()}/api/external`;
const ENDPOINTS = {
	adminFees: `${API_ROOT}/admin-fees`,
	platformRevenue: `${API_ROOT}/platform-revenue`,
	revenueShareBalances: `${API_ROOT}/revenue-share-balances`,
	summary: `${API_ROOT}/summary`,
};

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	};

	return (
		<button
			onClick={handleCopy}
			className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
			title="Salin"
		>
			{copied ? <LuCircleCheck className="w-4 h-4 text-green-500" /> : <LuCopy className="w-4 h-4" />}
		</button>
	);
}

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
	return (
		<div className="relative group">
			<pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg p-4 pt-8 text-sm overflow-x-auto font-mono leading-relaxed">
				<code>{code}</code>
			</pre>
			<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
				<CopyButton text={code} />
			</div>
			<span className="absolute top-2 left-4 text-xs text-gray-500 font-sans">{lang}</span>
		</div>
	);
}

function Section({
	title,
	icon: Icon,
	children,
	defaultOpen = true,
}: {
	title: string;
	icon: React.ElementType;
	children: React.ReactNode;
	defaultOpen?: boolean;
}) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
			<button
				onClick={() => setOpen(!open)}
				className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
			>
				<Icon className="w-5 h-5 text-indigo-500 flex-shrink-0" />
				<span className="font-semibold text-gray-900 dark:text-white flex-1">{title}</span>
				{open ? <LuChevronDown className="w-4 h-4 text-gray-400" /> : <LuChevronRight className="w-4 h-4 text-gray-400" />}
			</button>
			{open && <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-5">{children}</div>}
		</div>
	);
}

function EndpointBox({ label, url }: { label: string; url: string }) {
	return (
		<div>
			<label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</label>
			<div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700">
				<LuGlobe className="w-4 h-4 text-gray-400 flex-shrink-0" />
				<code className="text-sm text-gray-800 dark:text-gray-200 font-mono flex-1 break-all">{url}</code>
				<CopyButton text={url} />
			</div>
		</div>
	);
}

function QueryTable({
	rows,
}: {
	rows: { name: string; type: string; description: React.ReactNode }[];
}) {
	return (
		<div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
			<table className="w-full text-sm">
				<thead>
					<tr className="bg-gray-50 dark:bg-gray-900 text-left">
						<th className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Parameter</th>
						<th className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tipe</th>
						<th className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Fungsi</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800">
					{rows.map((row) => (
						<tr key={row.name}>
							<td className="px-4 py-2 align-top">
								<code className="text-sm text-blue-600 dark:text-blue-400 font-mono">{row.name}</code>
							</td>
							<td className="px-4 py-2 align-top">
								<span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded font-mono">
									{row.type}
								</span>
							</td>
							<td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 align-top">{row.description}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

const sharedQueryRows = [
	{ name: "from", type: "ISO date", description: "Filter tanggal bayar mulai dari tanggal ini. Opsional." },
	{ name: "to", type: "ISO date", description: "Filter tanggal bayar sampai tanggal ini. Opsional." },
	{ name: "eventId", type: "string", description: "Filter untuk satu event tertentu. Opsional." },
	{ name: "includeDetails", type: "boolean", description: "Isi true jika butuh rincian transaksi, bukan hanya summary. Default false." },
];

const lifetimeRows = [
	{ name: "eventId", type: "string", description: "Filter untuk satu event tertentu. Opsional." },
	{ name: "includeDetails", type: "boolean", description: "Isi true jika butuh daftar revenue share per transaksi tiket/voting. Default false." },
];

const ApiIntegration: React.FC = () => {
	const adminFeeCurl = `curl -X GET \\
  "${ENDPOINTS.adminFees}?from=2026-01-01&to=2026-12-31&includeDetails=true" \\
  -H "X-API-Key: ${EXTERNAL_API_KEY}"`;

	const platformRevenueCurl = `curl -X GET \\
  "${ENDPOINTS.platformRevenue}?includeDetails=true" \\
  -H "Authorization: Bearer ${EXTERNAL_API_KEY}"`;

	const platformRevenueResponse = `{
  "currency": "IDR",
  "summary": {
    "totalPlatformRevenue": 4400000,
    "totalPlatformShare": 2400000,
    "platformShareFromTickets": 1600000,
    "platformShareFromVoting": 800000,
    "totalPackagePayments": 2000000
  },
  "counts": {
    "revenueShares": 12,
    "ticketShares": 8,
    "votingShares": 4,
    "packagePayments": 2
  },
  "details": {
    "revenueShares": [],
    "packagePayments": [
      {
        "id": "evtpay_123",
        "midtransOrderId": "ORDER-456",
        "eventId": "evt_789",
        "eventTitle": "Festival X",
        "eventSlug": "festival-x",
        "userId": "usr_123",
        "packageTier": "BRONZE",
        "tier": "BRONZE",
        "amount": 500000,
        "paymentType": "EVENT_PACKAGE",
        "status": "PAID",
        "paidAt": "2026-05-01T10:30:00.000Z",
        "description": "Pembayaran paket BRONZE"
      }
    ]
  }
}`;

	const balanceCurl = `curl -X GET \\
  "${ENDPOINTS.revenueShareBalances}?includeDetails=true" \\
  -H "X-API-Key: ${EXTERNAL_API_KEY}"`;

	const summaryCurl = `curl -X GET \\
  "${ENDPOINTS.summary}" \\
  -H "X-API-Key: ${EXTERNAL_API_KEY}"`;

	const balanceResponse = `{
  "currency": "IDR",
  "filters": {
    "eventId": null,
    "scope": "lifetime"
  },
  "summary": {
    "grossRevenue": 12000000,
    "ticketGrossRevenue": 8000000,
    "votingGrossRevenue": 4000000,
    "platformShare": 2400000,
    "panitiaShare": 9600000,
    "ticketRevenue": 6400000,
    "votingRevenue": 3200000,
    "totalWithdrawn": 5000000,
    "totalPending": 1000000,
    "activeBalance": 3600000
  },
  "events": [
    {
      "event": {
        "id": "event_id",
        "title": "Festival Paskibra Nasional",
        "slug": "festival-paskibra-nasional",
        "packageTier": "TICKETING_VOTING",
        "configuredPlatformSharePercent": 20,
        "platformSharePercent": 20,
        "panitiaSharePercent": 80
      },
      "balance": {
        "grossRevenue": 12000000,
        "ticketRevenue": 6400000,
        "votingRevenue": 3200000,
        "totalWithdrawn": 5000000,
        "totalPending": 1000000,
        "activeBalance": 3600000
      }
    }
  ]
}`;

	const summaryResponse = `{
  "currency": "IDR",
  "summary": {
    "totalSimpaskorBalance": 5250000,
    "adminFee": {
      "total": 850000,
      "ticket": 500000,
      "voting": 250000,
      "registration": 100000
    },
    "platformShare": {
      "total": 2400000,
      "fromTickets": 1600000,
      "fromVoting": 800000
    },
    "packagePayments": {
      "total": 2000000,
      "byTier": {
        "BRONZE": 500000,
        "GOLD": 1500000
      }
    }
  }
}`;

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
			<div className="max-w-5xl mx-auto space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
						<LuCode className="w-6 h-6 text-indigo-500" />
						Integrasi API Keuangan
					</h1>
					<p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
						Panduan server-to-server untuk mengambil admin fee, pendapatan platform, dan saldo bagi hasil tiket/voting.
					</p>
				</div>

				<Section title="Kredensial dan Base URL" icon={LuKey}>
					<div className="space-y-3">
						<EndpointBox label="Base URL" url={API_ROOT} />
						<div>
							<label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">API Key</label>
							<div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700">
								<LuKey className="w-4 h-4 text-gray-400 flex-shrink-0" />
								<code className="text-sm text-gray-800 dark:text-gray-200 font-mono flex-1 break-all select-all">{EXTERNAL_API_KEY}</code>
								<CopyButton text={EXTERNAL_API_KEY} />
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							<div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
								<p className="text-xs font-medium text-gray-700 dark:text-gray-300">Header utama</p>
								<code className="text-xs text-blue-600 dark:text-blue-400 font-mono">X-API-Key: {"<api-key>"}</code>
							</div>
							<div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
								<p className="text-xs font-medium text-gray-700 dark:text-gray-300">Alternatif</p>
								<code className="text-xs text-blue-600 dark:text-blue-400 font-mono">Authorization: Bearer {"<api-key>"}</code>
							</div>
						</div>
					</div>
				</Section>

				<Section title="Ringkasan Endpoint" icon={LuGlobe}>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<EndpointBox label="Admin Fee" url={ENDPOINTS.adminFees} />
						<EndpointBox label="Pendapatan Platform" url={ENDPOINTS.platformRevenue} />
						<EndpointBox label="Saldo Bagi Hasil Lifetime" url={ENDPOINTS.revenueShareBalances} />
						<EndpointBox label="Summary Simpaskor" url={ENDPOINTS.summary} />
					</div>
				</Section>

				<Section title="GET /admin-fees" icon={LuGlobe}>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Mengambil admin fee layanan dari transaksi PAID. Tiket dihitung Rp 2.000 per tiket, voting Rp 500 per vote dengan batas Rp 10.000 per transaksi, dan pendaftaran Rp 5.000 per transaksi.
					</p>
					<QueryTable rows={sharedQueryRows} />
					<CodeBlock code={adminFeeCurl} />
				</Section>

				<Section title="GET /platform-revenue" icon={LuGlobe} defaultOpen={false}>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Mengambil pendapatan milik Simpaskor: bagian platform dari transaksi tiket/voting plus pembayaran paket event seperti BRONZE atau GOLD.
					</p>
					<QueryTable rows={sharedQueryRows} />
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<CodeBlock code={platformRevenueCurl} />
						<CodeBlock code={platformRevenueResponse} lang="json" />
					</div>
				</Section>

				<Section title="GET /revenue-share-balances" icon={LuGlobe}>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Mengambil saldo bagi hasil panitia dari tiket dan voting secara lifetime. Endpoint ini tidak memakai filter tanggal karena saldo harus dihitung dari seluruh transaksi PAID dikurangi seluruh pencairan APPROVED/TRANSFERRED dan pengajuan PENDING.
					</p>
					<QueryTable rows={lifetimeRows} />
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<CodeBlock code={balanceCurl} />
						<CodeBlock code={balanceResponse} lang="json" />
					</div>
				</Section>

				<Section title="GET /summary" icon={LuGlobe} defaultOpen={false}>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Mengambil total saldo Simpaskor dalam satu request: admin fee, bagian platform dari tiket/voting, dan pembayaran paket event.
					</p>
					<QueryTable rows={sharedQueryRows.slice(0, 3)} />
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<CodeBlock code={summaryCurl} />
						<CodeBlock code={summaryResponse} lang="json" />
					</div>
				</Section>

				<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3">
					<LuInfo className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
					<div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
						<p className="font-semibold">Catatan integrasi</p>
						<ul className="list-disc list-inside space-y-0.5 text-amber-600 dark:text-amber-400">
							<li>Panggil API ini dari backend web eksternal, bukan langsung dari browser.</li>
							<li>Semua nominal memakai IDR dan angka polos tanpa format ribuan.</li>
							<li>Gunakan <code className="font-mono text-xs">revenue-share-balances</code> untuk saldo bagi hasil vote+tiket yang benar-benar lifetime.</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ApiIntegration;

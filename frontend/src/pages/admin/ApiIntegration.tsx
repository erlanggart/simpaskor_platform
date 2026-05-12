import React, { useState } from "react";
import {
	LuCode,
	LuCopy,
	LuCircleCheck,
	LuKey,
	LuGlobe,
	LuInfo,
	LuChevronDown,
	LuChevronRight,
} from "react-icons/lu";
import { config } from "../../utils/config";

const EXTERNAL_API_KEY = "simpaskor-admin-fee-2026-7d4f6c9b2a8e41f0b5c3d9e7a1f8b6c4";

function getExternalBaseUrl(): string {
	const apiBase = config.api.baseUrl;
	// Strip trailing /api from base URL to get the server root
	if (apiBase.endsWith("/api")) {
		return apiBase.slice(0, -4);
	}
	return apiBase;
}

const ENDPOINT_URL = `${getExternalBaseUrl()}/api/external/admin-fees`;

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
			{copied ? (
				<LuCircleCheck className="w-4 h-4 text-green-500" />
			) : (
				<LuCopy className="w-4 h-4" />
			)}
		</button>
	);
}

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
	return (
		<div className="relative group">
			<pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto font-mono leading-relaxed">
				<code>{code}</code>
			</pre>
			<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
				<CopyButton text={code} />
			</div>
			<span className="absolute top-2 left-4 text-xs text-gray-500 font-sans">{lang}</span>
		</div>
	);
}


function Section({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean }) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
			<button
				onClick={() => setOpen(!open)}
				className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
			>
				<Icon className="w-5 h-5 text-indigo-500 flex-shrink-0" />
				<span className="font-semibold text-gray-900 dark:text-white flex-1">{title}</span>
				{open ? <LuChevronDown className="w-4 h-4 text-gray-400" /> : <LuChevronRight className="w-4 h-4 text-gray-400" />}
			</button>
			{open && <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-4">{children}</div>}
		</div>
	);
}

const ApiIntegration: React.FC = () => {
	const curlExample = `curl -X GET \\
  "${ENDPOINT_URL}?from=2026-01-01&to=2026-12-31&includeDetails=true" \\
  -H "X-API-Key: ${EXTERNAL_API_KEY}"`;

	const responseExample = `{
  "currency": "IDR",
  "filters": {
    "from": "2026-01-01T00:00:00.000Z",
    "to": "2026-12-31T23:59:59.999Z",
    "eventId": null
  },
  "summary": {
    "totalAdminFee": 350000,
    "ticketAdminFee": 200000,
    "votingAdminFee": 50000,
    "registrationAdminFee": 100000,
    "qrisFee": 0
  },
  "counts": {
    "tickets": 100,
    "voting": 100,
    "registrations": 20
  },
  "details": {
    "tickets": [
      {
        "source": "ticket",
        "id": "ticket_purchase_id",
        "eventId": "event_id",
        "eventTitle": "Festival Paskibra Nasional",
        "eventSlug": "festival-paskibra-nasional",
        "baseAmount": 50000,
        "adminFee": 4000,
        "quantity": 2,
        "status": "PAID",
        "paidAt": "2026-02-01T08:15:00.000Z",
        "midtransOrderId": "TICKET-123"
      }
    ],
    "voting": [
      {
        "source": "voting",
        "id": "voting_purchase_id",
        "eventId": "event_id",
        "eventTitle": "Festival Paskibra Nasional",
        "eventSlug": "festival-paskibra-nasional",
        "baseAmount": 20000,
        "adminFee": 1000,
        "voteCount": 2,
        "status": "PAID",
        "paidAt": "2026-02-01T09:20:00.000Z",
        "midtransOrderId": "VOTE-123"
      }
    ],
    "registrations": [
      {
        "source": "registration",
        "id": "registration_payment_id",
        "eventId": "event_id",
        "eventTitle": "Festival Paskibra Nasional",
        "eventSlug": "festival-paskibra-nasional",
        "baseAmount": 100000,
        "adminFee": 5000,
        "status": "PAID",
        "paidAt": "2026-02-01T10:25:00.000Z",
        "midtransOrderId": "REG-123"
      }
    ]
  },
  "data": [
    {
      "source": "ticket",
      "id": "ticket_purchase_id",
      "eventId": "event_id",
      "eventTitle": "Festival Paskibra Nasional",
      "eventSlug": "festival-paskibra-nasional",
      "baseAmount": 50000,
      "adminFee": 4000,
      "quantity": 2,
      "status": "PAID",
      "paidAt": "2026-02-01T08:15:00.000Z",
      "midtransOrderId": "TICKET-123"
    }
  ]
}`;

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
						<LuCode className="w-6 h-6 text-indigo-500" />
						Integrasi API Eksternal
					</h1>
					<p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
						Dokumentasi API untuk mengambil data admin fee dari sistem Simpaskor ke sistem eksternal (akunting, laporan keuangan, dll).
					</p>
				</div>

				{/* Credentials */}
				<Section title="Kredensial API" icon={LuKey}>
					<div className="space-y-3">
						<div>
							<label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">URL Endpoint</label>
							<div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700">
								<LuGlobe className="w-4 h-4 text-gray-400 flex-shrink-0" />
								<code className="text-sm text-gray-800 dark:text-gray-200 font-mono flex-1 break-all">{ENDPOINT_URL}</code>
								<CopyButton text={ENDPOINT_URL} />
							</div>
						</div>
						<div>
							<label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">API Key</label>
							<div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700">
								<LuKey className="w-4 h-4 text-gray-400 flex-shrink-0" />
								<code className="text-sm text-gray-800 dark:text-gray-200 font-mono flex-1 break-all select-all">{EXTERNAL_API_KEY}</code>
								<CopyButton text={EXTERNAL_API_KEY} />
							</div>
							<p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
								<LuInfo className="w-3 h-3" />
								Jaga kerahasiaan API key ini. Jangan bagikan ke pihak yang tidak berwenang.
							</p>
						</div>
						<div>
							<label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Metode Autentikasi</label>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
									<p className="text-xs font-medium text-gray-700 dark:text-gray-300">Header (direkomendasikan)</p>
									<code className="text-xs text-blue-600 dark:text-blue-400 font-mono">X-API-Key: {"<api-key>"}</code>
								</div>
								<div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
									<p className="text-xs font-medium text-gray-700 dark:text-gray-300">Bearer Token</p>
									<code className="text-xs text-blue-600 dark:text-blue-400 font-mono">Authorization: Bearer {"<api-key>"}</code>
								</div>
							</div>
						</div>
					</div>
				</Section>

				{/* Endpoint Detail */}
				<Section title="GET /api/external/admin-fees" icon={LuGlobe}>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Mengambil rekapitulasi admin fee dari semua transaksi yang sudah dibayar (tiket, voting, pendaftaran).
						Data dapat difilter berdasarkan rentang tanggal atau event tertentu.
					</p>

					<div>
						<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Query Parameters</h4>
						<div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-gray-50 dark:bg-gray-900 text-left">
										<th className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Parameter</th>
										<th className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tipe</th>
										<th className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Deskripsi</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800 px-4">
									<tr className="border-b border-gray-100 dark:border-gray-800">
										<td className="px-4 py-2 align-top"><code className="text-sm text-blue-600 dark:text-blue-400 font-mono">from</code></td>
										<td className="px-4 py-2 align-top"><span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded font-mono">ISO date</span></td>
										<td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 align-top">Tanggal mulai filter (opsional). Contoh: <code className="font-mono text-xs">2026-01-01</code></td>
									</tr>
									<tr className="border-b border-gray-100 dark:border-gray-800">
										<td className="px-4 py-2 align-top"><code className="text-sm text-blue-600 dark:text-blue-400 font-mono">to</code></td>
										<td className="px-4 py-2 align-top"><span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded font-mono">ISO date</span></td>
										<td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 align-top">Tanggal akhir filter (opsional). Contoh: <code className="font-mono text-xs">2026-12-31</code></td>
									</tr>
									<tr className="border-b border-gray-100 dark:border-gray-800">
										<td className="px-4 py-2 align-top"><code className="text-sm text-blue-600 dark:text-blue-400 font-mono">eventId</code></td>
										<td className="px-4 py-2 align-top"><span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded font-mono">string</span></td>
										<td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 align-top">Filter berdasarkan ID event tertentu (opsional)</td>
									</tr>
									<tr>
										<td className="px-4 py-2 align-top"><code className="text-sm text-blue-600 dark:text-blue-400 font-mono">includeDetails</code></td>
										<td className="px-4 py-2 align-top"><span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded font-mono">boolean</span></td>
										<td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 align-top">Sertakan data detail per transaksi yang sudah dipisah dalam <code className="font-mono text-xs">details.tickets</code>, <code className="font-mono text-xs">details.voting</code>, dan <code className="font-mono text-xs">details.registrations</code>. Default: <code className="font-mono text-xs">false</code></td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					<div>
						<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Struktur Admin Fee</h4>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							{[
								{ label: "Tiket", fee: "Rp 2.000 / tiket", color: "blue" },
								{ label: "Voting", fee: "Rp 500 / suara (maks. Rp 10.000)", color: "purple" },
								{ label: "Pendaftaran", fee: "Rp 5.000 / transaksi", color: "emerald" },
							].map((item) => (
								<div key={item.label} className={`bg-${item.color}-50 dark:bg-${item.color}-900/20 border border-${item.color}-200 dark:border-${item.color}-800 rounded-lg p-3`}>
									<p className={`text-xs font-semibold text-${item.color}-700 dark:text-${item.color}-300`}>{item.label}</p>
									<p className={`text-sm font-bold text-${item.color}-800 dark:text-${item.color}-200 mt-0.5`}>{item.fee}</p>
								</div>
							))}
						</div>
					</div>
				</Section>

				{/* Example */}
				<Section title="Contoh Penggunaan" icon={LuCode}>
					<div>
						<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">cURL</h4>
						<CodeBlock code={curlExample} lang="bash" />
					</div>
					<div>
						<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Contoh Response</h4>
						<CodeBlock code={responseExample} lang="json" />
					</div>
				</Section>

				{/* Notes */}
				<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
					<LuInfo className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
					<div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
						<p className="font-semibold">Catatan Keamanan</p>
						<ul className="list-disc list-inside space-y-0.5 text-amber-600 dark:text-amber-400">
							<li>API key bersifat rahasia — jangan tampilkan di log atau repositori publik.</li>
							<li>Endpoint ini hanya dapat diakses dari sisi server (server-to-server), bukan dari browser langsung untuk menghindari eksposur key.</li>
							<li>Semua data yang dikembalikan hanya mencakup transaksi dengan status <code className="font-mono text-xs">PAID</code>.</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ApiIntegration;

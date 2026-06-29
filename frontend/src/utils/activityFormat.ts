// Shared formatting helpers for the activity / security monitor views.

export const actionColor = (action: string): string => {
	switch (action) {
		case "LOGIN":
			return "bg-green-100 text-green-700";
		case "LOGOUT":
			return "bg-gray-100 text-gray-600";
		case "CREATE":
			return "bg-blue-100 text-blue-700";
		case "UPDATE":
			return "bg-amber-100 text-amber-700";
		case "DELETE":
			return "bg-red-100 text-red-700";
		case "PAGE_VIEW":
			return "bg-purple-100 text-purple-700";
		case "FAILED_LOGIN":
			return "bg-rose-100 text-rose-700";
		case "ACCESS_DENIED":
			return "bg-orange-100 text-orange-700";
		default:
			return "bg-slate-100 text-slate-600";
	}
};

export const roleColor = (role: string): string => {
	switch (role) {
		case "SUPERADMIN":
			return "bg-red-100 text-red-700";
		case "PANITIA":
			return "bg-indigo-100 text-indigo-700";
		case "JURI":
			return "bg-cyan-100 text-cyan-700";
		case "PESERTA":
			return "bg-emerald-100 text-emerald-700";
		case "PELATIH":
			return "bg-orange-100 text-orange-700";
		case "MITRA":
			return "bg-pink-100 text-pink-700";
		default:
			return "bg-gray-100 text-gray-600";
	}
};

// Normalize IPv6-mapped IPv4 (::ffff:127.0.0.1 -> 127.0.0.1) and localhost
export const fmtIp = (ip?: string | null): string => {
	if (!ip) return "—";
	const v = ip.replace(/^::ffff:/i, "");
	return v === "::1" ? "127.0.0.1 (lokal)" : v;
};

// Interpret GPS accuracy radius (meters)
export const accuracyLabel = (acc: number): string => {
	const m = Math.round(acc);
	if (acc <= 50) return `±${m} m · GPS/WiFi (lokasi device)`;
	if (acc <= 500) return `±${m} m · WiFi/seluler`;
	if (acc <= 2000) return `±${(m / 1000).toFixed(1)} km · perkiraan kasar`;
	return `±${(m / 1000).toFixed(1)} km · kemungkinan dari IP`;
};

export const accuracyClass = (acc: number): string => {
	if (acc <= 50) return "text-green-600";
	if (acc <= 2000) return "text-amber-600";
	return "text-red-500";
};

export const fmt = (d?: string | null) =>
	d
		? new Date(d).toLocaleString("id-ID", {
				day: "2-digit",
				month: "short",
				hour: "2-digit",
				minute: "2-digit",
		  })
		: "—";

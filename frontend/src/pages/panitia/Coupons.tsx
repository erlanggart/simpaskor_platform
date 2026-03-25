import React, { useState, useEffect } from "react";
import { TicketIcon } from "@heroicons/react/24/outline";
import { api } from "../../utils/api";

interface Coupon {
	id: string;
	code: string;
	maxEvents: number;
	currentEvents: number;
	isUsed: boolean;
	expiresAt: string | null;
	createdAt: string;
}

const PanitiaCoupons: React.FC = () => {
	const [coupons, setCoupons] = useState<Coupon[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchCoupons();
	}, []);

	const fetchCoupons = async () => {
		try {
			setLoading(true);
			const res = await api.get("/coupons/my");
			setCoupons(res.data || []);
		} catch (error) {
			console.error("Error fetching coupons:", error);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-32">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto mb-4"></div>
					<p className="text-sm text-gray-500 dark:text-gray-400">Memuat data...</p>
				</div>
			</div>
		);
	}

	const availableCoupons = coupons.filter((c) => !c.isUsed);
	const usedCoupons = coupons.filter((c) => c.isUsed);

	return (
		<div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
			{/* Header */}
			<div className="mb-5">
				<h2 className="text-lg font-bold text-gray-900 dark:text-white">
					Kupon Saya
				</h2>
				<p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
					{availableCoupons.length} kupon tersedia · {usedCoupons.length} digunakan
				</p>
			</div>

			{/* Coupons */}
			{coupons.length === 0 ? (
				<div className="rounded-2xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] p-12 text-center">
					<TicketIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
					<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
						Belum Ada Kupon
					</h3>
					<p className="text-xs text-gray-500 dark:text-gray-500">
						Anda belum memiliki kupon. Hubungi admin untuk mendapatkan kupon.
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-2">
					{coupons.map((coupon) => (
						<div
							key={coupon.id}
							className={`group rounded-xl backdrop-blur-sm border transition-all duration-300 hover:shadow-lg ${
								coupon.isUsed
									? "bg-gray-50/60 dark:bg-white/[0.02] border-gray-200/30 dark:border-white/[0.04] opacity-60"
									: "bg-white/60 dark:bg-white/[0.03] border-gray-200/50 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12] hover:shadow-black/5 dark:hover:shadow-black/20"
							}`}
						>
							<div className="flex items-center gap-4 p-3 md:p-4">
								{/* Icon */}
								<div
									className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
										coupon.isUsed
											? "bg-gray-200/50 dark:bg-white/5"
											: "bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/10 dark:border-red-500/20"
									}`}
								>
									<TicketIcon
										className={`w-6 h-6 ${
											coupon.isUsed
												? "text-gray-400 dark:text-gray-600"
												: "text-red-500 dark:text-red-400"
										}`}
									/>
								</div>

								{/* Info */}
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<h3 className="text-sm font-bold font-mono text-gray-900 dark:text-white tracking-wider">
											{coupon.code}
										</h3>
										<span
											className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
												coupon.isUsed
													? "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-500"
													: "bg-green-500/10 text-green-600 dark:text-green-400"
											}`}
										>
											{coupon.isUsed ? "Terpakai" : "Tersedia"}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-500">
										<span>
											Event: {coupon.currentEvents}/{coupon.maxEvents}
										</span>
										{coupon.expiresAt && (
											<span>Exp: {formatDate(coupon.expiresAt)}</span>
										)}
										<span>Dibuat: {formatDate(coupon.createdAt)}</span>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default PanitiaCoupons;

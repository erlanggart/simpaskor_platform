import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LuCircleCheck, LuTicket, LuThumbsUp, LuHouse } from "react-icons/lu";

const PaymentSuccessPage: React.FC = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [countdown, setCountdown] = useState(10);

	const orderId = searchParams.get("order_id") || "";
	const transactionStatus = searchParams.get("transaction_status") || "settlement";

	const isTicket = orderId.startsWith("TKT");
	const isVoting = orderId.startsWith("VOT");

	useEffect(() => {
		const timer = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(timer);
					if (isTicket) navigate("/e-ticketing");
					else if (isVoting) navigate("/e-voting");
					else navigate("/");
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(timer);
	}, [navigate, isTicket, isVoting]);

	const isSuccess = ["capture", "settlement"].includes(transactionStatus);
	const isPending = transactionStatus === "pending";

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
			<div className="max-w-md w-full bg-white/90 dark:bg-white/[0.05] backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/[0.06] shadow-xl p-8 text-center">
				{/* Icon */}
				<div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
					isSuccess ? "bg-green-100 dark:bg-green-900/30" : isPending ? "bg-amber-100 dark:bg-amber-900/30" : "bg-red-100 dark:bg-red-900/30"
				}`}>
					{isSuccess ? (
						<LuCircleCheck className="w-10 h-10 text-green-600 dark:text-green-400" />
					) : isPending ? (
						isTicket ? <LuTicket className="w-10 h-10 text-amber-600 dark:text-amber-400" /> : <LuThumbsUp className="w-10 h-10 text-amber-600 dark:text-amber-400" />
					) : (
						isTicket ? <LuTicket className="w-10 h-10 text-red-600 dark:text-red-400" /> : <LuThumbsUp className="w-10 h-10 text-red-600 dark:text-red-400" />
					)}
				</div>

				{/* Title */}
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
					{isSuccess ? "Pembayaran Berhasil!" : isPending ? "Menunggu Pembayaran" : "Pembayaran Gagal"}
				</h1>

				{/* Message */}
				<p className="text-gray-500 dark:text-gray-400 mb-2">
					{isSuccess && isTicket && "Tiket dan barcode telah dikirim ke email Anda."}
					{isSuccess && isVoting && "Kode vote telah dikirim ke email Anda."}
					{isSuccess && !isTicket && !isVoting && "Pembayaran Anda telah berhasil diproses."}
					{isPending && "Pembayaran sedang diproses. Anda akan menerima email setelah pembayaran dikonfirmasi."}
					{!isSuccess && !isPending && "Pembayaran tidak berhasil. Silakan coba lagi."}
				</p>

				{orderId && (
					<p className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-6">
						Order: {orderId}
					</p>
				)}

				{/* Info box */}
				{isSuccess && (
					<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
						<p className="text-sm text-green-700 dark:text-green-400">
							{isTicket ? "📧 Cek email Anda untuk barcode tiket. Tunjukkan QR code saat masuk venue." : "📧 Cek email Anda untuk kode vote. Gunakan kode tersebut di halaman E-Voting."}
						</p>
					</div>
				)}

				{/* Buttons */}
				<div className="space-y-3">
					<button
						onClick={() => navigate(isTicket ? "/e-ticketing" : isVoting ? "/e-voting" : "/")}
						className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
					>
						{isTicket ? "Kembali ke E-Ticketing" : isVoting ? "Kembali ke E-Voting" : "Kembali"}
					</button>
					<button
						onClick={() => navigate("/")}
						className="w-full py-2.5 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium transition-colors"
					>
						<LuHouse className="w-4 h-4" />
						Halaman Utama
					</button>
				</div>

				{/* Auto redirect countdown */}
				<p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
					Redirect otomatis dalam {countdown} detik...
				</p>
			</div>
		</div>
	);
};

export default PaymentSuccessPage;

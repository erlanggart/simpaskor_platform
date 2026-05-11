import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
	CreditCardIcon,
	CheckCircleIcon,
	ArrowLeftIcon,
	SparklesIcon,
	PhoneIcon,
	ClockIcon,
} from "@heroicons/react/24/outline";
import { LuMedal, LuTrophy, LuCheck, LuX, LuMegaphone, LuTicket, LuThumbsUp, LuTicketPlus } from "react-icons/lu";
import { Step4Props, PackageTier, EventPaymentData } from "../../types/eventWizard";
import { api } from "../../utils/api";
import { usePayment } from "../../hooks/usePayment";
import { useAuth } from "../../hooks/useAuth";
import { showSuccess, showError, showWarning } from "../../utils/sweetalert";
import { getPackagePriceLabel, hasNoUpfrontPayment, isRevenueSharePackage, PACKAGE_PRICE_LABELS } from "../../utils/packagePricing";
import { buildDPWhatsAppUrl } from "../../utils/dpWhatsApp";
import { GMAIL_ONLY_EMAIL_MESSAGE, isGmailEmail } from "../../utils/emailPolicy";

interface PackageOption {
	tier: PackageTier;
	name: string;
	price: number;
	priceLabel: string;
	icon: React.ElementType;
	color: string;
	borderColor: string;
	bgGlow: string;
	btnClass: string;
	note: string | null;
	featured?: boolean;
}

interface PackageFeature {
	name: string;
	iklan: boolean;
	ticketing: boolean;
	voting: boolean;
	ticketing_voting: boolean;
	bronze: boolean;
	gold: boolean;
}

const packageFeatures: PackageFeature[] = [
	{ name: "E-Ticketing", iklan: false, ticketing: true, voting: false, ticketing_voting: true, bronze: true, gold: true },
	{ name: "E-Voting", iklan: false, ticketing: false, voting: true, ticketing_voting: true, bronze: true, gold: true },
	{ name: "Akses Sistem Penilaian", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: true, gold: true },
	{ name: "Pendaftaran Peserta", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: true, gold: true },
	{ name: "Technical Meeting Aplikasi", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: true, gold: true },
	{ name: "Laporan Digital", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: true, gold: true },
	{ name: "Tim Pendamping", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: false, gold: true },
	{ name: "Device Tablet", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: false, gold: true },
	{ name: "Tim Rekap", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: false, gold: true },
	{ name: "Penyusunan Materi Penilaian", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: false, gold: true },
];

const packages: PackageOption[] = [
	{
		tier: "IKLAN",
		name: "Paket Iklan",
		price: 0,
		priceLabel: PACKAGE_PRICE_LABELS.IKLAN,
		icon: LuMegaphone,
		color: "emerald",
		borderColor: "border-emerald-400/50 dark:border-emerald-500/30",
		bgGlow: "from-emerald-500/10 to-emerald-600/5",
		btnClass: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white",
		note: "Akses demo — event tampil di landing page, fitur hanya bisa dilihat",
	},
	{
		tier: "TICKETING",
		name: "Paket Ticketing",
		price: 0,
		priceLabel: "Negosiasi",
		icon: LuTicket,
		color: "blue",
		borderColor: "border-blue-400/50 dark:border-blue-500/30",
		bgGlow: "from-blue-500/10 to-blue-600/5",
		btnClass: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white",
		note: "Harga dan bagi hasil dinegosiasikan dengan admin",
	},
	{
		tier: "VOTING",
		name: "Paket Voting",
		price: 0,
		priceLabel: "Negosiasi",
		icon: LuThumbsUp,
		color: "purple",
		borderColor: "border-purple-400/50 dark:border-purple-500/30",
		bgGlow: "from-purple-500/10 to-purple-600/5",
		btnClass: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white",
		note: "Harga dan bagi hasil dinegosiasikan dengan admin",
	},
	{
		tier: "TICKETING_VOTING",
		name: "Tiket + Voting",
		price: 0,
		priceLabel: "Negosiasi",
		icon: LuTicketPlus,
		color: "indigo",
		borderColor: "border-indigo-400/50 dark:border-indigo-500/30",
		bgGlow: "from-indigo-500/10 to-indigo-600/5",
		btnClass: "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white",
		note: "Harga dan bagi hasil bundle dinegosiasikan dengan admin",
	},
	{
		tier: "BRONZE",
		name: "Paket Bronze",
		price: 500000,
		priceLabel: PACKAGE_PRICE_LABELS.BRONZE,
		icon: LuMedal,
		color: "amber",
		borderColor: "border-amber-400/50 dark:border-amber-500/30",
		bgGlow: "from-amber-500/10 to-amber-600/5",
		btnClass: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white",
		note: "Semua fitur — Tim Pendamping (Online)",
		featured: true,
	},
	{
		tier: "GOLD",
		name: "Paket Gold",
		price: 1500000,
		priceLabel: PACKAGE_PRICE_LABELS.GOLD,
		icon: LuTrophy,
		color: "yellow",
		borderColor: "border-yellow-400/50 dark:border-yellow-500/30",
		bgGlow: "from-yellow-500/10 to-yellow-600/5",
		btnClass: "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white",
		note: null,
	},
];

const WizardStep4Payment: React.FC<Step4Props> = ({
	eventId,
	eventTitle,
	existingPayment,
	onNext,
	onBack,
	packageTier: preSelectedTier,
	eventStartDate,
	eventEndDate,
	eventProvince,
	eventCity,
	eventVenue,
}) => {
	const [selectedPackage, setSelectedPackage] = useState<PackageTier | null>(
		existingPayment?.packageTier || preSelectedTier || null
	);
	const [isProcessing, setIsProcessing] = useState(false);
	const [paymentStatus, setPaymentStatus] = useState<EventPaymentData | null>(
		existingPayment || null
	);
	const [paymentMode, setPaymentMode] = useState<"full" | "dp" | null>(null);
	const { pay, isSnapReady } = usePayment();
	const { user } = useAuth();
	const navigate = useNavigate();

	// Check payment status on mount
	useEffect(() => {
		setPaymentStatus(existingPayment || null);
	}, [existingPayment]);

	// Sync pre-selected package from Step 2
	useEffect(() => {
		if (preSelectedTier && !existingPayment?.packageTier) {
			setSelectedPackage(preSelectedTier);
		}
	}, [preSelectedTier]);

	const isPaid = paymentStatus?.status === "PAID";
	const isDpPending =
		paymentStatus?.paymentType === "DP_REQUEST" &&
		paymentStatus?.status === "PENDING";
	const isNegotiationPending =
		paymentStatus?.paymentType === "NEGOTIATION_REQUEST" &&
		paymentStatus?.status === "PENDING";
	const isAdminPending = isDpPending || isNegotiationPending;

	const handleSelectPackage = (tier: PackageTier) => {
		if (isPaid || isAdminPending) return;
		setSelectedPackage(tier);
	};

	const handlePayment = async () => {
		if (!selectedPackage || !eventId || isAdminPending) return;
		const selectedPrice = packages.find((pkg) => pkg.tier === selectedPackage)?.price || 0;
		if (selectedPrice > 0 && !isGmailEmail(user?.email || "")) {
			showError(`Email akun ${GMAIL_ONLY_EMAIL_MESSAGE} untuk pembayaran event`);
			return;
		}

		setIsProcessing(true);
		try {
			// Create payment via backend
			const response = await api.post("/event-payments/create", {
				eventId,
				packageTier: selectedPackage,
			});

			const { snapToken } = response.data;

			// Open Midtrans Snap
			pay(snapToken, {
				onSuccess: async () => {
					// Mark event as complete
					try {
						await api.post(`/event-payments/${eventId}/complete`);
					} catch (e) {
						// Webhook will handle it
					}
					setPaymentStatus({
						...response.data,
						status: "PAID",
						paidAt: new Date().toISOString(),
					});
					showSuccess("Pembayaran berhasil! Event siap dipublish.");
					setIsProcessing(false);
				},
				onPending: () => {
					showWarning(
						"Pembayaran sedang diproses. Silakan selesaikan pembayaran Anda. Status akan diperbarui otomatis setelah pembayaran dikonfirmasi.",
						"Menunggu Pembayaran"
					);
					setIsProcessing(false);
				},
				onError: () => {
					showError("Pembayaran gagal. Silakan coba lagi.");
					setIsProcessing(false);
				},
				onClose: () => {
					showWarning(
						"Pembayaran belum selesai. Silakan lakukan pembayaran terlebih dahulu untuk melanjutkan.",
						"Pembayaran Belum Selesai"
					);
					setIsProcessing(false);
				},
			});
		} catch (error: any) {
			showError(error.response?.data?.error || "Gagal memproses pembayaran");
			setIsProcessing(false);
		}
	};

	const handleFinish = async () => {
		// Complete the wizard and navigate to dashboard
		onNext();
	};

	const openDPWhatsApp = (packageTier: PackageTier) => {
		const pkg = packages.find((p) => p.tier === packageTier);
		const isNegotiation = isRevenueSharePackage(packageTier);
		const waUrl = buildDPWhatsAppUrl({
			title: eventTitle,
			packageTier,
			packageName: pkg?.name,
			packagePriceLabel: pkg?.priceLabel,
			startDate: eventStartDate,
			endDate: eventEndDate,
			province: eventProvince,
			city: eventCity,
			venue: eventVenue,
			mode: isNegotiation ? "negotiation" : "dp",
		});

		window.open(waUrl, "_blank");
	};

	const handleFreePackage = async () => {
		if (!eventId || !selectedPackage || isAdminPending) return;

		setIsProcessing(true);
		try {
			const response = await api.post("/event-payments/create", {
				eventId,
				packageTier: selectedPackage,
			});

			const pkg = packages.find(p => p.tier === selectedPackage);
			setPaymentStatus({
				...response.data,
				status: "PAID",
				paidAt: new Date().toISOString(),
			});
			showSuccess(`${pkg?.name || "Paket"} berhasil diaktifkan!`);
		} catch (error: any) {
			showError(error.response?.data?.error || "Gagal mengaktifkan paket");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleAdminRequest = async () => {
		if (!selectedPackage || !eventId || isAdminPending) return;
		const isNegotiation = isRevenueSharePackage(selectedPackage);
		const selectedPrice = packages.find((pkg) => pkg.tier === selectedPackage)?.price || 0;
		if (!isNegotiation && selectedPrice > 0 && !isGmailEmail(user?.email || "")) {
			showError(`Email akun ${GMAIL_ONLY_EMAIL_MESSAGE} untuk pembayaran event`);
			return;
		}

		setIsProcessing(true);
		try {
			const response = await api.post(`/event-payments/${eventId}/${isNegotiation ? "negotiation-request" : "dp-request"}`, {
				packageTier: selectedPackage,
			});

			setPaymentStatus({
				id: response.data.paymentId,
				eventId,
				packageTier: selectedPackage,
				amount: response.data.amount || 0,
				status: "PENDING",
				snapToken: null,
				midtransOrderId: null,
				paymentType: isNegotiation ? "NEGOTIATION_REQUEST" : "DP_REQUEST",
				paidAt: null,
			});

			const pkg = packages.find((p) => p.tier === selectedPackage);
			const waMessage = [
				"Halo Admin Simpaskor! 👋",
				"",
				"Saya ingin mendaftarkan event dengan sistem DP (Down Payment).",
				"",
				`🏆 *Nama Event:* ${eventTitle}`,
				`📦 *Paket Dipilih:* ${pkg?.name} (${pkg?.priceLabel})`,
				"",
				"Mohon informasi lebih lanjut untuk proses DP dan pembuatan event. Terima kasih! 🙏",
			].join("\n");
			void waMessage;
			const waUrl = buildDPWhatsAppUrl({
				title: eventTitle,
				packageTier: selectedPackage,
				packageName: pkg?.name,
				packagePriceLabel: pkg?.priceLabel,
				startDate: eventStartDate,
				endDate: eventEndDate,
				province: eventProvince,
				city: eventCity,
				venue: eventVenue,
				mode: isNegotiation ? "negotiation" : "dp",
			});

			// Open WhatsApp in new tab
			window.open(waUrl, "_blank");

			showSuccess(
				isNegotiation
					? "Permintaan negosiasi berhasil dikirim. Silakan lanjutkan pembicaraan dengan admin melalui WhatsApp."
					: "Permintaan DP berhasil dikirim. Silakan lanjutkan pembicaraan dengan admin melalui WhatsApp.",
				isNegotiation ? "Negosiasi Berhasil Diajukan!" : "DP Berhasil Diajukan!"
			);

			// Redirect to panitia dashboard
			navigate("/panitia/dashboard");
		} catch (error: any) {
			showError(error.response?.data?.error || "Gagal memproses permintaan admin");
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="text-center mb-8">
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
					{isPaid ? "Pembayaran Berhasil" : isNegotiationPending ? "Menunggu Hasil Negosiasi" : isDpPending ? "Menunggu Konfirmasi DP" : "Konfirmasi & Pembayaran"}
				</h2>
				<p className="text-gray-600 dark:text-gray-400 mt-2">
					{isPaid
						? "Event Anda siap untuk dipublish!"
						: isNegotiationPending
						? "Event Anda terkunci sementara sampai admin mengatur hasil negosiasi."
						: isDpPending
						? "Event Anda terkunci sementara sampai admin mengonfirmasi DP."
						: preSelectedTier
						? "Konfirmasi paket yang sudah dipilih dan lanjutkan"
						: "Pilih paket Simpaskor untuk event Anda"}
				</p>
			</div>

			{/* Payment Success State */}
			{isPaid && (
				<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
					<CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
					<h3 className="text-xl font-bold text-green-700 dark:text-green-300 mb-2">
						Pembayaran Berhasil!
					</h3>
					<p className="text-green-600 dark:text-green-400 mb-1">
						Paket: <strong>{packages.find(p => p.tier === paymentStatus?.packageTier)?.name}</strong>
					</p>
					<p className="text-green-600 dark:text-green-400 text-sm">
						Event "{eventTitle}" siap untuk dipublish dari dashboard panitia.
					</p>
				</div>
			)}

			{isAdminPending && (
				<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
					<ClockIcon className="w-16 h-16 text-amber-500 mx-auto mb-4" />
					<h3 className="text-xl font-bold text-amber-700 dark:text-amber-300 mb-2">
						{isNegotiationPending ? "Negosiasi Menunggu Admin" : "DP Menunggu Konfirmasi Admin"}
					</h3>
					<p className="text-amber-700 dark:text-amber-300 mb-1">
						Paket: <strong>{packages.find(p => p.tier === paymentStatus?.packageTier)?.name}</strong>
					</p>
					<p className="text-amber-600 dark:text-amber-400 text-sm">
						{isNegotiationPending
							? "Panitia belum dapat memakai fitur event sampai super admin mengatur persentase bagi hasil dan mengonfirmasi paket."
							: "Panitia belum dapat memakai fitur event sampai super admin mengonfirmasi DP dan mengubah status event."}
					</p>
					{paymentStatus?.packageTier && (
						<button
							type="button"
							onClick={() => openDPWhatsApp(paymentStatus.packageTier)}
							className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
						>
							<PhoneIcon className="w-4 h-4" />
							WhatsApp Admin
						</button>
					)}
				</div>
			)}

			{/* Package Selection */}
			{!isPaid && !isAdminPending && (
				<>
					{/* Pre-selected package summary */}
					{preSelectedTier && (() => {
						const pkg = packages.find(p => p.tier === preSelectedTier);
						if (!pkg) return null;
						const Icon = pkg.icon;
						return (
							<div className={`relative p-5 rounded-xl border-2 ${pkg.borderColor} bg-white dark:bg-gray-800 shadow-md`}>
								<div className="flex items-center gap-4">
									<div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${pkg.bgGlow} flex items-center justify-center`}>
										<Icon className="w-7 h-7 text-gray-700 dark:text-gray-300" />
									</div>
									<div className="flex-1">
										<h3 className="text-lg font-bold text-gray-900 dark:text-white">{pkg.name}</h3>
										<p className="text-sm text-gray-500 dark:text-gray-400">{pkg.note || "Paket terpilih dari langkah sebelumnya"}</p>
									</div>
									<div className="text-right">
										<p className="text-2xl font-extrabold text-gray-900 dark:text-white">{pkg.priceLabel}</p>
									</div>
								</div>
							</div>
						);
					})()}

					{/* Full package selection (only if not pre-selected) */}
					{!preSelectedTier && (
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{packages.map((pkg) => {
							const Icon = pkg.icon;
							const isSelected = selectedPackage === pkg.tier;

							return (
								<button
									key={pkg.tier}
									type="button"
									onClick={() => handleSelectPackage(pkg.tier)}
									className={`relative text-left p-5 rounded-xl border-2 transition-all duration-300 ${
										isSelected
											? `${pkg.borderColor} bg-white dark:bg-gray-800 shadow-lg ring-2 ring-offset-2 dark:ring-offset-gray-900 ${
												pkg.tier === "IKLAN" ? "ring-emerald-400" :
												pkg.tier === "TICKETING" ? "ring-blue-400" :
												pkg.tier === "VOTING" ? "ring-purple-400" :
												pkg.tier === "TICKETING_VOTING" ? "ring-indigo-400" :
												pkg.tier === "BRONZE" ? "ring-amber-400" :
												"ring-yellow-400"
											}`
											: "border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800/60 hover:shadow-md"
									}`}
								>
									{pkg.featured && (
										<div className="absolute -top-3 left-1/2 -translate-x-1/2">
											<span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-full shadow">
												<SparklesIcon className="w-3 h-3" />
												Populer
											</span>
										</div>
									)}

									{isSelected && (
										<div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
											<CheckCircleIcon className="w-4 h-4 text-white" />
										</div>
									)}

									<div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pkg.bgGlow} flex items-center justify-center mb-3`}>
										<Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
									</div>

									<h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
										{pkg.name}
									</h3>
									<p className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
										{pkg.priceLabel}
									</p>
									{pkg.note && (
										<p className="text-xs text-gray-500 dark:text-gray-400">
											{pkg.note}
										</p>
									)}
								</button>
							);
						})}
					</div>
					)}

				{/* Payment Mode Selection - only for paid packages */}
				{selectedPackage && !hasNoUpfrontPayment(selectedPackage) && (
						<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
							<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
								Pilih Metode Pembayaran
							</h3>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<button
									type="button"
									onClick={() => setPaymentMode("full")}
									className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
										paymentMode === "full"
											? "border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500/30"
											: "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
									}`}
								>
									<div className="flex items-center gap-3">
										<div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
											paymentMode === "full" ? "bg-red-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"
										}`}>
											<CreditCardIcon className="w-5 h-5" />
										</div>
										<div>
											<p className="font-semibold text-gray-900 dark:text-white text-sm">Bayar Penuh</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">Pembayaran langsung via Midtrans</p>
										</div>
									</div>
								</button>
								<button
									type="button"
									onClick={() => setPaymentMode("dp")}
									className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
										paymentMode === "dp"
											? "border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500/30"
											: "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
									}`}
								>
									<div className="flex items-center gap-3">
										<div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
											paymentMode === "dp" ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"
										}`}>
											<PhoneIcon className="w-5 h-5" />
										</div>
										<div>
											<p className="font-semibold text-gray-900 dark:text-white text-sm">DP via Admin</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">Hubungi admin untuk DP, event dibuat oleh admin</p>
										</div>
									</div>
								</button>
							</div>
							{paymentMode === "dp" && (
								<div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
									<p className="font-semibold mb-1">Catatan DP (Down Payment):</p>
									<ul className="list-disc list-inside space-y-0.5">
										<li>Anda akan diarahkan ke WhatsApp untuk menghubungi admin Simpaskor</li>
										<li>Admin akan memproses DP dan membuat event untuk Anda</li>
										<li>Pelunasan dilakukan sebelum event dimulai</li>
									</ul>
								</div>
							)}
						</div>
					)}

					{/* Feature Comparison Table - only when no pre-selection */}
					{!preSelectedTier && (
					<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								Perbandingan Fitur
							</h3>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="bg-gray-50 dark:bg-gray-800/80">
										<th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
											Fitur
										</th>
										<th className="text-center px-3 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
											Iklan
										</th>
										<th className="text-center px-3 py-3 text-xs font-medium text-blue-600 dark:text-blue-400">
											Tiket
										</th>
										<th className="text-center px-3 py-3 text-xs font-medium text-purple-600 dark:text-purple-400">
											Voting
										</th>
										<th className="text-center px-3 py-3 text-xs font-medium text-indigo-600 dark:text-indigo-400">
											T + V
										</th>
										<th className="text-center px-3 py-3 text-xs font-medium text-amber-600 dark:text-amber-400">
											Bronze
										</th>
										<th className="text-center px-3 py-3 text-xs font-medium text-yellow-600 dark:text-yellow-400">
											Gold
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
									{packageFeatures.map((feature, i) => (
										<tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
											<td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
												{feature.name}
											</td>
											{(["iklan", "ticketing", "voting", "ticketing_voting", "bronze", "gold"] as const).map((tier) => (
												<td key={tier} className="text-center px-3 py-3">
													{feature[tier] ? (
														<LuCheck className="w-5 h-5 text-green-500 mx-auto" />
													) : (
														<LuX className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
													)}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
					)}
				</>
			)}

			{/* Action Buttons */}
			<div className="flex items-center justify-between pt-4">
				{!isPaid && !isAdminPending && (
					<button
						type="button"
						onClick={onBack}
						className="flex items-center gap-2 px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
					>
						<ArrowLeftIcon className="w-4 h-4" />
						Kembali
					</button>
				)}

				{isPaid || isAdminPending ? (
					<button
						type="button"
						onClick={handleFinish}
						className={`w-full sm:w-auto px-8 py-3 text-white font-semibold rounded-xl shadow-lg transition-all ${
							isPaid
								? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
								: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
						}`}
					>
						Ke Dashboard →
					</button>
				) : selectedPackage === "IKLAN" ? (
					<button
						type="button"
						onClick={handleFreePackage}
						disabled={isProcessing}
						className={`flex items-center gap-2 px-8 py-3 font-semibold rounded-xl shadow-lg transition-all ${packages.find(p => p.tier === selectedPackage)?.btnClass || "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"}`}
					>
						{isProcessing ? (
							<>
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								Memproses...
							</>
						) : (
							<>
								{React.createElement(packages.find(p => p.tier === selectedPackage)?.icon || LuMegaphone, { className: "w-5 h-5" })}
								Aktifkan {packages.find(p => p.tier === selectedPackage)?.name}
							</>
						)}
					</button>
				) : selectedPackage && isRevenueSharePackage(selectedPackage) ? (
					<button
						type="button"
						onClick={handleAdminRequest}
						disabled={!selectedPackage || isProcessing}
						className="flex items-center gap-2 px-8 py-3 font-semibold rounded-xl shadow-lg transition-all bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white disabled:opacity-60"
					>
						<PhoneIcon className="w-5 h-5" />
						Negosiasi via WhatsApp
					</button>
				) : paymentMode === "dp" ? (
					<button
						type="button"
						onClick={handleAdminRequest}
						disabled={!selectedPackage}
						className={`flex items-center gap-2 px-8 py-3 font-semibold rounded-xl shadow-lg transition-all ${
							selectedPackage
								? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
								: "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
						}`}
					>
						<PhoneIcon className="w-5 h-5" />
						Hubungi Admin via WhatsApp
					</button>
				) : (
					<button
						type="button"
						onClick={handlePayment}
						disabled={!selectedPackage || !paymentMode || isProcessing || !isSnapReady}
						className={`flex items-center gap-2 px-8 py-3 font-semibold rounded-xl shadow-lg transition-all ${
							selectedPackage && paymentMode && !isProcessing && isSnapReady
								? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white"
								: "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
						}`}
					>
						{isProcessing ? (
							<>
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								Memproses...
							</>
						) : (
							<>
								<CreditCardIcon className="w-5 h-5" />
								Bayar {getPackagePriceLabel(selectedPackage)}
							</>
						)}
					</button>
				)}
			</div>
		</div>
	);
};

export default WizardStep4Payment;

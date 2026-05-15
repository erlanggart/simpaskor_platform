import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { IconType } from "react-icons";
import {
	LuArrowRight,
	LuCircleCheck,
	LuCreditCard,
	LuMailCheck,
	LuTicket,
	LuUsers,
	LuX,
} from "react-icons/lu";

type TicketGuideStep = {
	title: string;
	description: string;
	icon: IconType;
};

const ticketGuideSteps: TicketGuideStep[] = [
	{
		title: "Pilih event",
		description: "Buka daftar E-Ticketing, lalu pilih event dengan tiket yang masih tersedia.",
		icon: LuTicket,
	},
	{
		title: "Isi data tiket",
		description: "Lengkapi data pembeli dan peserta. Jika event mengaktifkan pilihan pasukan, pilih pasukan yang ditonton.",
		icon: LuUsers,
	},
	{
		title: "Konfirmasi & bayar",
		description: "Cek ringkasan pembelian, lalu lanjutkan pembayaran kalau event-nya berbayar. Kalau sudah beres, tiket langsung diproses.",
		icon: LuCreditCard,
	},
	{
		title: "Terima QR ticket",
		description: "Setelah berhasil, QR code aktif muncul di layar dan E-Ticket dikirim otomatis ke email peserta.",
		icon: LuMailCheck,
	},
];

const TicketGuideCard: React.FC = () => {
	const [isGuideOpen, setIsGuideOpen] = useState(false);

	const guideContent = (
		<>
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.45),transparent_46%)] opacity-80 dark:bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.16),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_46%)]" />
			<div className="relative">
				<div className="mb-4 flex items-start justify-between gap-3">
					<div>
						<p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-600 dark:text-yellow-300">
							Panduan
						</p>
						<h2 className="mt-1 text-xl font-black leading-tight text-gray-950 dark:text-white">
							Cara Membeli Tiket
						</h2>
					</div>
					<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-500 text-white shadow-lg shadow-yellow-500/25">
						<LuCircleCheck className="h-5 w-5" />
					</div>
				</div>

				<div className="space-y-3">
					{ticketGuideSteps.map((step, index) => {
						const Icon = step.icon;
						const isLast = index === ticketGuideSteps.length - 1;

						return (
							<motion.div
								key={step.title}
								initial={{ opacity: 0, x: 14 }}
								whileInView={{ opacity: 1, x: 0 }}
								viewport={{ once: true, amount: 0.6 }}
								transition={{ duration: 0.42, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
								className="relative flex gap-3"
							>
								<div className="relative flex flex-col items-center">
									<div className="z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-700 shadow-sm dark:border-yellow-400/20 dark:bg-yellow-400/10 dark:text-yellow-200">
										<Icon className="h-4 w-4" />
									</div>
									{!isLast && (
										<div className="mt-1 h-full min-h-8 w-px bg-gradient-to-b from-yellow-300/70 to-yellow-200/10 dark:from-yellow-400/35 dark:to-yellow-400/5" />
									)}
								</div>
								<div className="min-w-0 pb-1.5">
									<p className="text-sm font-black text-gray-900 dark:text-white">
										{index + 1}. {step.title}
									</p>
									<p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
										{step.description}
									</p>
								</div>
							</motion.div>
						);
					})}
				</div>

				<Link
					to="/e-ticketing"
					className="landing-modern-btn landing-modern-btn-yellow group mt-5 w-full"
				>
					<span>Beli Tiket Sekarang</span>
					<LuArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
				</Link>
			</div>
		</>
	);

	return (
		<>
			<motion.button
				type="button"
				onClick={() => setIsGuideOpen(true)}
				initial={{ opacity: 0, y: 14 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, amount: 0.35 }}
				transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
				className="landing-modern-card landing-modern-card-yellow group relative w-full p-4 text-left"
			>
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.18),transparent_44%)]" />
				<div className="relative flex items-center justify-between gap-4">
					<div>
						<p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-600 dark:text-yellow-300">
							Panduan
						</p>
						<p className="mt-1 text-base font-black text-gray-950 dark:text-white">Lihat Panduan</p>
						<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Cara beli tiket dengan cepat</p>
					</div>
					<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-500 text-white shadow-lg shadow-yellow-500/25">
						<LuArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
					</div>
				</div>
			</motion.button>

			{typeof document !== "undefined" &&
				createPortal(
					<AnimatePresence>
						{isGuideOpen && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/55 px-4 py-5 backdrop-blur-sm sm:px-6 sm:py-8"
								onClick={() => setIsGuideOpen(false)}
							>
								<motion.div
									initial={{ y: 22, scale: 0.98, opacity: 0 }}
									animate={{ y: 0, scale: 1, opacity: 1 }}
									exit={{ y: 22, scale: 0.98, opacity: 0 }}
									transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
									className="relative flex max-h-[calc(100dvh-2.5rem)] w-full max-w-[26rem] flex-col overflow-hidden rounded-2xl border border-yellow-200/60 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-yellow-400/15 dark:bg-gray-950/95 sm:max-h-[calc(100dvh-4rem)] sm:max-w-md"
									onClick={(event) => event.stopPropagation()}
								>
									<button
										type="button"
										onClick={() => setIsGuideOpen(false)}
										className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900/5 text-gray-500 transition-colors hover:bg-gray-900/10 hover:text-gray-900 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15 dark:hover:text-white"
										aria-label="Tutup panduan"
									>
										<LuX className="h-4 w-4" />
									</button>
									<div className="relative overflow-y-auto p-4 pr-11 sm:p-5 sm:pr-12">
										{guideContent}
									</div>
								</motion.div>
							</motion.div>
						)}
					</AnimatePresence>,
					document.body,
				)}
		</>
	);
};

export default TicketGuideCard;

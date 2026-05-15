import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { IconType } from "react-icons";
import {
	LuArrowRight,
	LuCreditCard,
	LuListChecks,
	LuSparkles,
	LuThumbsUp,
	LuTicketCheck,
	LuX,
} from "react-icons/lu";

type VoteGuideStep = {
	title: string;
	description: string;
	icon: IconType;
};

const voteGuideSteps: VoteGuideStep[] = [
	{
		title: "Pilih event voting",
		description: "Cari event yang mau kamu dukung, lalu buka halaman voting-nya.",
		icon: LuListChecks,
	},
	{
		title: "Pilih kategori & nominee",
		description: "Pilih kategori, cek nominee, lalu tentukan jagoan favoritmu.",
		icon: LuThumbsUp,
	},
	{
		title: "Gunakan vote aktif",
		description: "Kalau butuh kode vote, beli paketnya dulu dan selesaikan pembayaran sampai kodenya aktif.",
		icon: LuCreditCard,
	},
	{
		title: "Kirim dukungan",
		description: "Masukkan kode aktif kalau diminta, klik Vote, dan dukunganmu langsung masuk.",
		icon: LuTicketCheck,
	},
];

const VoteGuideCard: React.FC = () => {
	const [isGuideOpen, setIsGuideOpen] = useState(false);

	const guideContent = (
		<>
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.45),transparent_46%)] opacity-80 dark:bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_46%)]" />
			<div className="relative">
				<div className="mb-4 flex items-start justify-between gap-3">
					<div>
						<div className="flex flex-wrap items-center gap-2">
							<p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-600 dark:text-purple-300">
								Panduan
							</p>
						</div>
						<h2 className="mt-1 text-xl font-black leading-tight text-gray-950 dark:text-white">
							Cara Melakukan Vote
						</h2>
					</div>
					<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-500/25">
						<LuSparkles className="h-5 w-5" />
					</div>
				</div>

				<div className="space-y-3">
					{voteGuideSteps.map((step, index) => {
						const Icon = step.icon;
						const isLast = index === voteGuideSteps.length - 1;

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
									<div className="z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-purple-200 bg-purple-50 text-purple-700 shadow-sm dark:border-purple-400/20 dark:bg-purple-400/10 dark:text-purple-200">
										<Icon className="h-4 w-4" />
									</div>
									{!isLast && (
										<div className="mt-1 h-full min-h-8 w-px bg-gradient-to-b from-purple-300/70 to-purple-200/10 dark:from-purple-400/35 dark:to-purple-400/5" />
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
					to="/e-voting"
					className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-gray-900/15 transition-all duration-300 hover:bg-purple-600 hover:shadow-purple-500/25 dark:bg-white dark:text-gray-950 dark:hover:bg-purple-300"
				>
					<span>Mulai Vote</span>
					<LuArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
				</Link>
			</div>
		</>
	);

	return (
		<>
			<motion.aside
				initial={{ opacity: 0, y: 18, scale: 0.98 }}
				whileInView={{ opacity: 1, y: 0, scale: 1 }}
				viewport={{ once: true, amount: 0.35 }}
				transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
				className="group relative hidden overflow-hidden rounded-2xl border border-purple-200/60 bg-white/75 p-4 shadow-xl shadow-purple-100/60 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-300/70 hover:shadow-2xl hover:shadow-purple-200/60 dark:border-purple-400/15 dark:bg-white/[0.045] dark:shadow-black/20 dark:hover:border-purple-400/30 lg:block"
			>
				{guideContent}
			</motion.aside>

			<motion.button
				type="button"
				onClick={() => setIsGuideOpen(true)}
				initial={{ opacity: 0, y: 14 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, amount: 0.35 }}
				transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
				className="group relative overflow-hidden rounded-2xl border border-purple-200/70 bg-white/80 p-4 text-left shadow-lg shadow-purple-100/60 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-300/80 dark:border-purple-400/15 dark:bg-white/[0.045] dark:shadow-black/20 lg:hidden"
			>
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_44%)]" />
				<div className="relative flex items-center justify-between gap-4">
					<div>
						<p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-600 dark:text-purple-300">
							Panduan
						</p>
						<p className="mt-1 text-base font-black text-gray-950 dark:text-white">Lihat Panduan</p>
						<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Cara vote favoritmu</p>
					</div>
					<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-500/25">
						<LuArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
					</div>
				</div>
			</motion.button>

			<AnimatePresence>
				{isGuideOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-[80] flex items-end bg-black/55 p-4 backdrop-blur-sm sm:items-center"
						onClick={() => setIsGuideOpen(false)}
					>
						<motion.div
							initial={{ y: 28, scale: 0.97, opacity: 0 }}
							animate={{ y: 0, scale: 1, opacity: 1 }}
							exit={{ y: 28, scale: 0.97, opacity: 0 }}
							transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
							className="relative mx-auto max-h-[86vh] w-full max-w-md overflow-y-auto rounded-2xl border border-purple-200/60 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-purple-400/15 dark:bg-gray-950/95"
							onClick={(event) => event.stopPropagation()}
						>
							<button
								type="button"
								onClick={() => setIsGuideOpen(false)}
								className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900/5 text-gray-500 transition-colors hover:bg-gray-900/10 hover:text-gray-900 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15 dark:hover:text-white"
								aria-label="Tutup panduan"
							>
								<LuX className="h-4 w-4" />
							</button>
							<div className="pr-7">
								{guideContent}
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
};

export default VoteGuideCard;

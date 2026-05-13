import React from "react";
import { Link } from "react-router-dom";
import {
	LuArrowRight,
	LuBadgeDollarSign,
	LuCheck,
	LuCopy,
	LuHandshake,
	LuTicketCheck,
} from "react-icons/lu";

const MitraPage: React.FC = () => {
	const steps = [
		"Daftar sebagai Mitra Simpaskor",
		"Dapatkan kode referral unik",
		"Bagikan kode ke panitia event",
		"Komisi tercatat saat kode digunakan",
	];

	return (
		<div className="relative w-full min-h-[calc(100vh-3.5rem)] px-4 sm:px-6 lg:px-8 py-10 md:py-16">
			<div className="max-w-6xl mx-auto">
				<section className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-center">
					<div>
						<p className="text-[11px] md:text-xs tracking-[0.3em] text-red-600 dark:text-red-400 font-bold mb-4">
							KEMITRAAN SIMPASKOR
						</p>
						<h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-none text-gray-950 dark:text-white">
							Jadi Mitra,
							<span className="block text-red-600 dark:text-red-400">
								Dapat Komisi Event
							</span>
						</h1>
						<p className="mt-6 text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
							Setiap mitra mendapatkan kode referral yang bisa digunakan panitia saat membuat event. Setiap event yang memakai kode Anda akan menghasilkan komisi.
						</p>

						<div className="mt-8 flex flex-col sm:flex-row gap-3">
							<Link
								to="/register?role=mitra"
								className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all group"
							>
								<span>Daftar sebagai Mitra</span>
								<LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
							</Link>
							<Link
								to="/login"
								className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-800 dark:text-white text-sm font-semibold hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12] transition-all"
							>
								<span>Masuk Dashboard</span>
							</Link>
						</div>
					</div>

					<div className="relative">
						<div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl shadow-xl overflow-hidden">
							<div className="p-6 md:p-8 border-b border-gray-200/80 dark:border-white/10">
								<div className="flex items-center justify-between gap-4">
									<div>
										<p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 font-bold">
											Program Mitra
										</p>
										<p className="mt-2 text-3xl md:text-4xl font-black text-gray-950 dark:text-white">
											Dapatkan Komisi
										</p>
									</div>
									<div className="w-14 h-14 rounded-2xl bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center">
										<LuBadgeDollarSign className="w-7 h-7" />
									</div>
								</div>
							</div>

							<div className="p-6 md:p-8">
								<div className="rounded-xl border border-dashed border-red-300 dark:border-red-500/40 bg-red-50/70 dark:bg-red-950/20 p-4">
									<div className="flex items-center justify-between gap-3">
										<div>
											<p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
												Contoh kode referral
											</p>
											<p className="mt-1 text-xl font-black tracking-widest text-gray-950 dark:text-white">
												MTR-SKOR-24A8F1
											</p>
										</div>
										<LuCopy className="w-5 h-5 text-red-600 dark:text-red-400" />
									</div>
								</div>

								<div className="mt-6 grid gap-3">
									{steps.map((step, index) => (
										<div key={step} className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/[0.07] text-red-600 dark:text-red-400 flex items-center justify-center text-sm font-bold">
												{index + 1}
											</div>
											<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
												{step}
											</p>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</section>

				<section className="mt-12 grid md:grid-cols-3 gap-4">
					{[
						{ icon: LuHandshake, title: "Kode Unik", text: "Kode referral dibuat otomatis untuk setiap akun mitra." },
						{ icon: LuTicketCheck, title: "Dipakai Panitia", text: "Panitia memasukkan kode saat membuat draft event baru." },
						{ icon: LuCheck, title: "Komisi Tercatat", text: "Setiap event yang memakai kode referral akan mencatat komisi untuk mitra terkait." },
					].map((item) => {
						const Icon = item.icon;
						return (
							<div key={item.title} className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.035] p-5">
								<Icon className="w-6 h-6 text-red-600 dark:text-red-400 mb-4" />
								<h2 className="text-base font-bold text-gray-950 dark:text-white">
									{item.title}
								</h2>
								<p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
									{item.text}
								</p>
							</div>
						);
					})}
				</section>
			</div>
		</div>
	);
};

export default MitraPage;

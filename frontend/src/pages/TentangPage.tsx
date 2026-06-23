import React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
	LuArrowRight,
	LuClipboardList,
	LuTicket,
	LuThumbsUp,
	LuHeart,
	LuUsers,
	LuSparkles,
	LuShieldCheck,
	LuRocket,
	LuTrendingUp,
} from "react-icons/lu";
import SEO from "../components/SEO";
import { absoluteUrl } from "../utils/seo";
import { UsersIcon } from "../components/common/LottieIcons";

/**
 * Reusable scroll-reveal wrapper. Fades + lifts children into view once,
 * respecting the user's reduced-motion preference.
 */
const Reveal: React.FC<{
	children: React.ReactNode;
	delay?: number;
	className?: string;
}> = ({ children, delay = 0, className }) => {
	const reduce = useReducedMotion();
	return (
		<motion.div
			className={className}
			initial={reduce ? false : { opacity: 0, y: 28 }}
			whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.3 }}
			transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
		>
			{children}
		</motion.div>
	);
};

const staggerParent: Variants = {
	hidden: {},
	show: { transition: { staggerChildren: 0.12 } },
};

const staggerChild: Variants = {
	hidden: { opacity: 0, y: 24 },
	show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const pillars = [
	{
		icon: LuClipboardList,
		title: "Rekap Nilai Digital",
		desc: "Penilaian juri lomba baris berbaris, rekapitulasi, dan klasemen otomatis—tanpa lagi repot kertas dan spreadsheet manual.",
	},
	{
		icon: LuTicket,
		title: "E-Ticketing",
		desc: "Jual tiket event dengan QR code, validasi di lokasi, dan laporan penjualan real-time.",
	},
	{
		icon: LuThumbsUp,
		title: "E-Voting",
		desc: "Voting kandidat favorit secara online, transparan, live, dan aman dari manipulasi.",
	},
];

const steps = [
	{
		no: "01",
		title: "Buat Event",
		desc: "Daftar sebagai panitia, susun kategori penilaian, tiket, atau voting hanya dalam hitungan menit.",
	},
	{
		no: "02",
		title: "Kelola Bersama",
		desc: "Undang juri, peserta, dan pelatih. Semua bekerja di satu platform yang sama secara real-time.",
	},
	{
		no: "03",
		title: "Jalankan & Pantau",
		desc: "Penilaian, penjualan tiket, dan voting berjalan langsung dengan data yang selalu update.",
	},
	{
		no: "04",
		title: "Rayakan Hasil",
		desc: "Klasemen, juara, dan rekapitulasi tampil otomatis—siap dibagikan ke seluruh komunitas.",
	},
];

const values = [
	{
		icon: LuHeart,
		title: "Berakar pada Komunitas",
		desc: "Setiap fitur lahir dari kebutuhan nyata penyelenggara dan peserta lomba baris berbaris di lapangan.",
	},
	{
		icon: LuShieldCheck,
		title: "Transparan & Terpercaya",
		desc: "Nilai, suara, dan transaksi tercatat jelas. Tidak ada ruang untuk kecurangan dalam setiap penilaian.",
	},
	{
		icon: LuRocket,
		title: "Tumbuh Bersama",
		desc: "Kami berkembang seiring komunitas baris berbaris berkembang—bukan sebaliknya.",
	},
];

const TentangPage: React.FC = () => {
	const reduce = useReducedMotion();

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "AboutPage",
		name: "Apa itu Simpaskor",
		description:
			"Simpaskor adalah solusi all-in-one untuk rekap nilai, e-ticketing, dan e-voting lomba baris berbaris. Lebih dari sekadar bisnis—kami membangun komunitas baris berbaris.",
		url: absoluteUrl("/tentang"),
		publisher: {
			"@type": "Organization",
			name: "Simpaskor",
			url: absoluteUrl("/"),
		},
	};

	return (
		<>
			<SEO
				title="Apa itu Simpaskor"
				description="Simpaskor adalah solusi all-in-one untuk rekap nilai, e-ticketing, dan e-voting lomba baris berbaris. Bukan sekadar bisnis—kami membangun komunitas baris berbaris."
				path="/tentang"
				jsonLd={jsonLd}
			/>

			<div className="relative w-full text-slate-800 dark:text-gray-200">
				{/* ===================== HERO ===================== */}
				<section className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col items-center justify-center px-5 py-20 text-center sm:px-6 md:px-12">
					<motion.div
						initial={reduce ? false : { opacity: 0, y: -10 }}
						animate={reduce ? undefined : { opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-600 dark:text-red-400"
					>
						<LuSparkles className="h-3.5 w-3.5" />
						Apa itu
					</motion.div>

					<h1 className="simpaskor-animated-title text-[3rem] font-black leading-none sm:text-7xl md:text-8xl">
						{"SIMPASKOR".split("").map((letter, i) => (
							<span
								key={i}
								className="simpaskor-letter"
								style={{ "--letter-delay": `${i * 0.055}s` } as React.CSSProperties}
							>
								{letter}
							</span>
						))}
					</h1>
					<div className="simpaskor-underline mx-auto" />

					<Reveal delay={0.15}>
						<p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base md:text-lg">
							Solusi <span className="font-semibold text-slate-700 dark:text-gray-200">All-in-One</span> yang
							menyatukan rekap nilai, e-ticketing, dan e-voting dalam satu platform—dibangun untuk para
							penyelenggara lomba dan komunitas baris berbaris di seluruh Indonesia.
						</p>
					</Reveal>
				</section>

				{/* ===================== MANIFESTO ===================== */}
				<section className="relative mx-auto max-w-5xl px-5 py-16 sm:px-6 md:px-12 md:py-24">
					<Reveal>
						<div className="relative overflow-hidden rounded-3xl border border-red-500/15 bg-gradient-to-br from-red-500/[0.07] via-transparent to-red-500/[0.04] px-6 py-12 text-center shadow-xl shadow-red-900/[0.04] sm:px-12 md:py-16 dark:border-white/[0.06] dark:from-red-500/[0.1] dark:shadow-black/20">
							<div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />
							<div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />

							<div className="relative">
								<UsersIcon className="mx-auto h-16 w-16" />
								<p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-red-500/80 dark:text-red-400/80">
									Filosofi Kami
								</p>
								<h2 className="mx-auto mt-5 max-w-3xl text-2xl font-black leading-snug text-slate-800 sm:text-3xl md:text-4xl dark:text-white">
									Simpaskor bukan sekadar bisnis.{" "}
									<span className="bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent dark:from-red-400 dark:to-red-600">
										Lebih dari itu—kami membangun komunitas baris berbaris.
									</span>
								</h2>
								<p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">
									Di balik setiap lomba dan latihan, ada para anggota paskibra dan pegiat baris berbaris yang
									berlatih, berjuang, dan bertumbuh bersama. Simpaskor hadir bukan hanya untuk mempermudah
									teknis penilaian, tapi untuk merekatkan seluruh komunitas baris berbaris dalam satu
									ekosistem yang saling menguatkan.
								</p>
							</div>
						</div>
					</Reveal>
				</section>

				{/* ===================== WHAT IS / PILLARS ===================== */}
				<section className="relative mx-auto max-w-6xl px-5 py-12 sm:px-6 md:px-12 md:py-20">
					<Reveal>
						<div className="mx-auto max-w-2xl text-center">
							<h2 className="text-2xl font-black text-slate-800 sm:text-3xl md:text-4xl dark:text-white">
								Satu platform, tiga kekuatan
							</h2>
							<p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">
								Semua yang Anda butuhkan untuk menjalankan event modern—tanpa berpindah-pindah aplikasi.
							</p>
						</div>
					</Reveal>

					<motion.div
						variants={staggerParent}
						initial="hidden"
						whileInView="show"
						viewport={{ once: true, amount: 0.2 }}
						className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
					>
						{pillars.map((p) => (
							<motion.div
								key={p.title}
								variants={staggerChild}
								className="group relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white/70 p-6 shadow-sm shadow-gray-900/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-900/[0.06] dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-red-400/30"
							>
								<div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-600 transition-transform duration-300 group-hover:scale-110 dark:text-red-400">
									<p.icon className="h-6 w-6" />
								</div>
								<h3 className="text-lg font-bold text-slate-800 dark:text-white">{p.title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{p.desc}</p>
							</motion.div>
						))}
					</motion.div>
				</section>

				{/* ===================== HOW IT WORKS ===================== */}
				<section className="relative mx-auto max-w-6xl px-5 py-12 sm:px-6 md:px-12 md:py-20">
					<Reveal>
						<div className="mx-auto max-w-2xl text-center">
							<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-500/80 dark:text-red-400/80">
								Cara Kerja
							</p>
							<h2 className="mt-3 text-2xl font-black text-slate-800 sm:text-3xl md:text-4xl dark:text-white">
								Bagaimana Simpaskor bekerja
							</h2>
							<p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">
								Dari ide menjadi event yang berjalan—hanya empat langkah.
							</p>
						</div>
					</Reveal>

					<div className="relative mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
						{steps.map((s, i) => (
							<Reveal key={s.no} delay={i * 0.1}>
								<div className="relative h-full rounded-2xl border border-gray-200/70 bg-white/70 p-6 dark:border-white/[0.07] dark:bg-white/[0.03]">
									<span className="bg-gradient-to-br from-red-500 to-red-700 bg-clip-text text-4xl font-black text-transparent dark:from-red-400 dark:to-red-600">
										{s.no}
									</span>
									<h3 className="mt-3 text-base font-bold text-slate-800 dark:text-white">{s.title}</h3>
									<p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{s.desc}</p>
								</div>
							</Reveal>
						))}
					</div>
				</section>

				{/* ===================== VALUES ===================== */}
				<section className="relative mx-auto max-w-6xl px-5 py-12 sm:px-6 md:px-12 md:py-20">
					<Reveal>
						<div className="mx-auto max-w-2xl text-center">
							<div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-600 dark:text-red-400">
								<LuUsers className="h-3.5 w-3.5" />
								Nilai Kami
							</div>
							<h2 className="text-2xl font-black text-slate-800 sm:text-3xl md:text-4xl dark:text-white">
								Mengapa kami ada
							</h2>
						</div>
					</Reveal>

					<motion.div
						variants={staggerParent}
						initial="hidden"
						whileInView="show"
						viewport={{ once: true, amount: 0.2 }}
						className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3"
					>
						{values.map((v) => (
							<motion.div
								key={v.title}
								variants={staggerChild}
								className="rounded-2xl border border-gray-200/70 bg-white/70 p-6 text-center dark:border-white/[0.07] dark:bg-white/[0.03]"
							>
								<div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
									<v.icon className="h-6 w-6" />
								</div>
								<h3 className="text-lg font-bold text-slate-800 dark:text-white">{v.title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{v.desc}</p>
							</motion.div>
						))}
					</motion.div>
				</section>

				{/* ===================== CLOSING CTA ===================== */}
				<section className="relative mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-6 md:px-12">
					<Reveal>
						<div className="relative overflow-hidden rounded-3xl border border-gray-200/70 bg-gradient-to-br from-slate-900 to-black px-6 py-14 text-center sm:px-12 dark:border-white/[0.08]">
							<div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-500/20 blur-3xl" />
							<div className="relative">
								<LuTrendingUp className="mx-auto h-10 w-10 text-red-400" />
								<h2 className="mx-auto mt-5 max-w-2xl text-2xl font-black leading-snug text-white sm:text-3xl">
									Jadi bagian dari komunitas baris berbaris yang bertumbuh
								</h2>
								<p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base">
									Mulai selenggarakan lomba Anda hari ini, atau jelajahi event yang sedang berlangsung
									bersama ribuan anggota komunitas baris berbaris di Simpaskor.
								</p>
								<div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
									<Link
										to="/register"
										className="landing-modern-btn landing-modern-btn-primary group w-full sm:w-auto md:px-6 md:py-3"
									>
										<span>Mulai Sekarang</span>
										<LuArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
									</Link>
									<Link
										to="/events"
										className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-5 py-3 text-xs font-bold text-white backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/10 sm:w-auto md:px-6"
									>
										<span>Jelajahi Event</span>
										<LuArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
									</Link>
								</div>
							</div>
						</div>
					</Reveal>
				</section>
			</div>
		</>
	);
};

export default TentangPage;

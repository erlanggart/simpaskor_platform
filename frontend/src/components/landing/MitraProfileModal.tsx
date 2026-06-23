import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
	LuX,
	LuMapPin,
	LuBuilding2,
	LuBadgeCheck,
	LuCalendarCheck,
	LuLayoutGrid,
	LuUser,
	LuArrowRight,
} from "react-icons/lu";
import { config } from "../../utils/config";

export interface MitraProfile {
	id: string;
	name: string;
	photo: string | null;
	bio: string | null;
	institution: string | null;
	city: string | null;
	province: string | null;
	verified: boolean;
	joinedAt: string | null;
	eventCount: number;
}

const resolvePhoto = (photo: string | null): string => {
	if (!photo) return "";
	if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
	return `${config.api.backendUrl}${photo}`;
};

const initials = (name: string) =>
	name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0])
		.join("")
		.toUpperCase();

const locationLabel = (p: MitraProfile) => {
	const parts = [p.city, p.province].filter(Boolean);
	return parts.length ? parts.join(", ") : "Indonesia";
};

const joinedYear = (iso: string | null) => {
	if (!iso) return "-";
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? "-" : d.getFullYear().toString();
};

interface Props {
	partner: MitraProfile | null;
	onClose: () => void;
}

const MitraProfileModal: React.FC<Props> = ({ partner, onClose }) => {
	// Tutup dengan Esc + kunci scroll body saat modal terbuka.
	useEffect(() => {
		if (!partner) return;
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
	}, [partner, onClose]);

	const photoUrl = partner ? resolvePhoto(partner.photo) : "";

	return (
		<AnimatePresence>
			{partner && (
				<motion.div
					className="fixed inset-0 z-[120] flex items-center justify-center p-4"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					{/* Backdrop */}
					<div
						className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
						onClick={onClose}
						aria-hidden="true"
					/>

					{/* Kartu */}
					<motion.div
						role="dialog"
						aria-modal="true"
						initial={{ opacity: 0, scale: 0.92, y: 24 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 12 }}
						transition={{ type: "spring", damping: 26, stiffness: 320 }}
						className="relative z-10 w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-2xl dark:bg-[#13131c]"
					>
						{/* Cover gradien merah → hitam */}
						<div className="relative h-28 bg-gradient-to-br from-red-600 via-red-800 to-black">
							<div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(120%_120%_at_15%_-10%,rgba(255,255,255,0.5),transparent_55%)]" />
							<button
								type="button"
								onClick={onClose}
								aria-label="Tutup"
								className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/25"
							>
								<LuX className="h-5 w-5" />
							</button>
						</div>

						<div className="px-6 pb-6">
							{/* Avatar */}
							<div className="relative -mt-14 mb-3 inline-block">
								{photoUrl ? (
									<img
										src={photoUrl}
										alt={partner.name}
										className="h-28 w-28 rounded-3xl object-cover shadow-xl ring-4 ring-white dark:ring-[#13131c]"
									/>
								) : (
									<div className="grid h-28 w-28 place-items-center rounded-3xl bg-gradient-to-br from-red-600 to-red-900 text-3xl font-black text-white shadow-xl ring-4 ring-white dark:ring-[#13131c]">
										{initials(partner.name) || <LuUser className="h-10 w-10" />}
									</div>
								)}
								{partner.verified && (
									<span
										className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-white shadow-md dark:bg-[#13131c]"
										title="Mitra Terverifikasi"
									>
										<LuBadgeCheck className="h-6 w-6 text-emerald-500" />
									</span>
								)}
							</div>

							{/* Nama + status */}
							<div className="flex items-center gap-2">
								<h3 className="text-xl font-black leading-tight text-slate-900 dark:text-white">
									{partner.name}
								</h3>
							</div>
							<p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
								{partner.verified ? "Mitra Resmi Simpaskor" : "Mitra Simpaskor"}
							</p>

							{/* Lokasi & institusi */}
							<div className="mt-4 space-y-2">
								<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
									<LuMapPin className="h-4 w-4 shrink-0 text-red-500" />
									<span>{locationLabel(partner)}</span>
								</div>
								{partner.institution && (
									<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
										<LuBuilding2 className="h-4 w-4 shrink-0 text-red-500" />
										<span>{partner.institution}</span>
									</div>
								)}
							</div>

							{/* Bio */}
							{partner.bio && (
								<p className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-600 dark:bg-white/[0.04] dark:text-gray-300">
									“{partner.bio}”
								</p>
							)}

							{/* Statistik */}
							<div className="mt-5 grid grid-cols-2 gap-3">
								<div className="rounded-2xl border border-gray-100 bg-white p-3 text-center dark:border-white/[0.07] dark:bg-white/[0.03]">
									<LuLayoutGrid className="mx-auto h-5 w-5 text-red-500" />
									<p className="mt-1.5 text-xl font-black text-slate-900 dark:text-white">
										{partner.eventCount}
									</p>
									<p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
										Event Kolaborasi
									</p>
								</div>
								<div className="rounded-2xl border border-gray-100 bg-white p-3 text-center dark:border-white/[0.07] dark:bg-white/[0.03]">
									<LuCalendarCheck className="mx-auto h-5 w-5 text-red-500" />
									<p className="mt-1.5 text-xl font-black text-slate-900 dark:text-white">
										{joinedYear(partner.joinedAt)}
									</p>
									<p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
										Bergabung
									</p>
								</div>
							</div>

							{/* CTA */}
							<Link
								to="/mitra"
								className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-700 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:from-red-700 hover:to-red-800"
							>
								<span>Tentang Kemitraan Simpaskor</span>
								<LuArrowRight className="h-4 w-4" />
							</Link>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default MitraProfileModal;

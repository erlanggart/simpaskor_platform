import React, { useCallback, useEffect, useState } from "react";
import Lottie from "lottie-react";
import { LuLoaderCircle, LuLockKeyhole, LuTriangleAlert } from "react-icons/lu";
import locationAnimation from "../assets/lottie/location.json";
import { authAPI } from "../utils/api";

type GateState = "checking" | "granted" | "denied" | "unsupported";

interface LocationGateProps {
	children: React.ReactNode;
}

/**
 * Mandatory location gate. After login, the dashboard is blocked until the user
 * grants browser geolocation. Coordinates are sent to the backend so SuperAdmin
 * can see where each account logged in from.
 */
export const LocationGate: React.FC<LocationGateProps> = ({ children }) => {
	const [state, setState] = useState<GateState>("checking");
	const [submitting, setSubmitting] = useState(false);

	const requestLocation = useCallback(() => {
		if (!("geolocation" in navigator)) {
			setState("unsupported");
			return;
		}
		setState("checking");
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				setSubmitting(true);
				try {
					await authAPI.sendLocation({
						latitude: pos.coords.latitude,
						longitude: pos.coords.longitude,
						accuracy: pos.coords.accuracy,
						status: "GRANTED",
					});
				} catch {
					// Even if saving fails, allow access because location was granted.
				} finally {
					setSubmitting(false);
					sessionStorage.setItem("location_granted", "1");
					setState("granted");
				}
			},
			() => {
				authAPI.sendLocation({ status: "DENIED" }).catch(() => {});
				setState("denied");
			},
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
		);
	}, []);

	useEffect(() => {
		if (sessionStorage.getItem("location_granted") === "1") {
			setState("granted");
			return;
		}
		requestLocation();
	}, [requestLocation]);

	if (state === "granted") {
		return <>{children}</>;
	}

	return (
		<div className="fixed inset-0 z-[9999] flex h-[100dvh] overflow-y-auto overflow-x-hidden bg-white p-4 sm:p-5">
			<div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full bg-orange-50" />
			<div className="pointer-events-none absolute -bottom-20 -right-16 h-60 w-60 rounded-full bg-emerald-50" />

			<div
				className="relative z-10 m-auto w-full max-w-sm shrink-0 rounded-3xl border border-gray-100 bg-white px-5 py-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:px-8 sm:py-8"
				role="dialog"
				aria-modal="true"
				aria-labelledby="location-gate-title"
			>
				<div className="mx-auto mb-2 h-24 w-24 sm:mb-3 sm:h-28 sm:w-28">
					<Lottie
						animationData={locationAnimation}
						loop
						autoplay
						className="h-full w-full"
						rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
					/>
				</div>

				{state === "checking" && (
					<>
						<h2
							id="location-gate-title"
							className="mb-2 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
						>
							{submitting
								? "Sip, lokasimu ditemukan!"
								: "Yuk, aktifkan lokasi!"}
						</h2>
						<p className="text-sm leading-6 text-gray-500">
							{submitting
								? "Sebentar ya, kami sedang menyiapkan dashboard untukmu."
								: "Izinkan akses lokasi dari browser, lalu kamu bisa langsung lanjut. Prosesnya cuma sebentar."}
						</p>
						<div className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700">
							<LuLoaderCircle className="h-4 w-4 animate-spin" />
							{submitting ? "Menyiapkan dashboard..." : "Menunggu izinmu..."}
						</div>
					</>
				)}

				{state === "denied" && (
					<>
						<h2
							id="location-gate-title"
							className="mb-2 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
						>
							Ups, izinnya belum aktif
						</h2>
						<p className="text-sm leading-6 text-gray-500">
							Buka ikon gembok di address bar, ubah izin{" "}
							<span className="font-semibold text-gray-700">Location</span>{" "}
							menjadi{" "}
							<span className="font-semibold text-gray-700">Allow</span>, lalu
							coba lagi. Kamu tinggal selangkah lagi!
						</p>
						<button
							type="button"
							onClick={requestLocation}
							className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-100"
						>
							Coba Aktifkan Lagi
						</button>
						<div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
							<LuLockKeyhole className="h-3.5 w-3.5" />
							Lokasi digunakan untuk keamanan akunmu
						</div>
					</>
				)}

				{state === "unsupported" && (
					<>
						<h2
							id="location-gate-title"
							className="mb-2 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
						>
							Browser ini belum siap
						</h2>
						<p className="text-sm leading-6 text-gray-500">
							Coba buka Simpaskor lewat Chrome, Edge, atau Firefox dengan
							koneksi HTTPS agar fitur lokasi bisa digunakan.
						</p>
						<div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
							<LuTriangleAlert className="h-4 w-4" />
							Fitur lokasi tidak tersedia
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default LocationGate;

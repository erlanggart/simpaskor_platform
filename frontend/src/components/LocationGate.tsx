import React, { useCallback, useEffect, useState } from "react";
import { LuMapPin, LuLoaderCircle, LuTriangleAlert } from "react-icons/lu";
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
					// even if save fails, allow in (location was granted)
				} finally {
					setSubmitting(false);
					sessionStorage.setItem("location_granted", "1");
					setState("granted");
				}
			},
			() => {
				// denied or unavailable
				authAPI
					.sendLocation({ status: "DENIED" })
					.catch(() => {});
				setState("denied");
			},
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
		);
	}, []);

	useEffect(() => {
		// If already granted in this browser session, skip re-prompting
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
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-4">
			<div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
				<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
					{state === "checking" ? (
						<LuLoaderCircle className="h-8 w-8 animate-spin text-red-600" />
					) : state === "unsupported" ? (
						<LuTriangleAlert className="h-8 w-8 text-red-600" />
					) : (
						<LuMapPin className="h-8 w-8 text-red-600" />
					)}
				</div>

				{state === "checking" && (
					<>
						<h2 className="mb-2 text-xl font-bold text-gray-800">
							{submitting ? "Menyimpan lokasi…" : "Meminta izin lokasi…"}
						</h2>
						<p className="text-sm text-gray-500">
							Mohon izinkan akses lokasi pada popup browser untuk melanjutkan ke
							dashboard.
						</p>
					</>
				)}

				{state === "denied" && (
					<>
						<h2 className="mb-2 text-xl font-bold text-gray-800">
							Lokasi wajib diaktifkan
						</h2>
						<p className="mb-5 text-sm text-gray-500">
							Untuk masuk ke dashboard, Anda harus mengizinkan akses lokasi. Jika
							sebelumnya diblokir, buka ikon gembok/izin di address bar browser,
							ubah <b>Location</b> menjadi <b>Allow</b>, lalu klik tombol di
							bawah.
						</p>
						<button
							onClick={requestLocation}
							className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700"
						>
							Aktifkan Lokasi & Coba Lagi
						</button>
					</>
				)}

				{state === "unsupported" && (
					<>
						<h2 className="mb-2 text-xl font-bold text-gray-800">
							Browser tidak mendukung lokasi
						</h2>
						<p className="text-sm text-gray-500">
							Perangkat/browser Anda tidak mendukung geolokasi. Silakan gunakan
							browser lain (Chrome/Edge/Firefox) dengan koneksi HTTPS.
						</p>
					</>
				)}
			</div>
		</div>
	);
};

export default LocationGate;

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	CalendarIcon,
	TrashIcon,
	ArrowUturnLeftIcon,
	UsersIcon,
	ArrowLeftIcon,
	ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import { showSuccess, showError, showConfirm } from "../../utils/sweetalert";

interface TrashedEvent {
	id: string;
	title: string;
	slug: string | null;
	thumbnail: string | null;
	status: string;
	startDate: string;
	endDate: string;
	province: string | null;
	city: string | null;
	location: string | null;
	currentParticipants: number;
	deletedAt: string | null;
	deletedByName: string | null;
	createdBy: {
		id: string;
		name: string;
		email: string;
	} | null;
	_count?: {
		participations: number;
		ticketPurchases: number;
		votingPurchases: number;
	};
}

const getImageUrl = (thumbnail: string | null) => {
	if (!thumbnail) return null;
	if (thumbnail.startsWith("http://") || thumbnail.startsWith("https://")) return thumbnail;
	return `${import.meta.env.VITE_BACKEND_URL || ""}${thumbnail}`;
};

const formatDate = (value: string | null) => {
	if (!value) return "-";
	return new Date(value).toLocaleString("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const EventTrash: React.FC = () => {
	const [events, setEvents] = useState<TrashedEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<string | null>(null);

	useEffect(() => {
		fetchTrash();
	}, []);

	const fetchTrash = async () => {
		try {
			setLoading(true);
			const response = await api.get("/events/trash");
			setEvents(response.data.data || []);
		} catch (error) {
			console.error("Error fetching trashed events:", error);
			showError("Gagal memuat data sampah event");
		} finally {
			setLoading(false);
		}
	};

	const handleRestore = async (event: TrashedEvent) => {
		const result = await showConfirm(
			`Pulihkan event "${event.title}" beserta seluruh datanya? Event akan kembali muncul seperti semula.`,
			"Pulihkan Event?",
			"Ya, Pulihkan"
		);
		if (!result.isConfirmed) return;

		try {
			setBusyId(event.id);
			await api.post(`/events/${event.id}/restore`);
			showSuccess("Event berhasil dipulihkan");
			setEvents((prev) => prev.filter((e) => e.id !== event.id));
		} catch (error: any) {
			showError(error.response?.data?.message || "Gagal memulihkan event");
		} finally {
			setBusyId(null);
		}
	};

	const handlePermanentDelete = async (event: TrashedEvent) => {
		const result = await showConfirm(
			`PERINGATAN: Event "${event.title}" dan SEMUA data terkait (peserta, penilaian, materi, tiket, voting, transaksi) akan dihapus PERMANEN dan TIDAK BISA dikembalikan lagi. Lanjutkan?`,
			"Hapus Permanen?",
			"Ya, Hapus Permanen"
		);
		if (!result.isConfirmed) return;

		try {
			setBusyId(event.id);
			await api.delete(`/events/${event.id}/permanent`);
			showSuccess("Event dihapus permanen");
			setEvents((prev) => prev.filter((e) => e.id !== event.id));
		} catch (error: any) {
			showError(error.response?.data?.message || "Gagal menghapus event");
		} finally {
			setBusyId(null);
		}
	};

	return (
		<div className="p-4 md:p-6 max-w-[1200px] mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<div className="flex items-center gap-2">
						<TrashIcon className="w-6 h-6 text-red-500" />
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sampah Event</h1>
					</div>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
						Event yang dihapus disimpan di sini. Pulihkan untuk mengembalikan event beserta seluruh datanya.
					</p>
				</div>
				<Link
					to="/admin/events"
					className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors"
				>
					<ArrowLeftIcon className="w-4 h-4" />
					Kembali ke Event
				</Link>
			</div>

			{/* Info banner */}
			<div className="flex items-start gap-3 p-4 mb-5 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/[0.06]">
				<ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
				<p className="text-sm text-amber-700 dark:text-amber-300">
					Menghapus event dari halaman <span className="font-semibold">Event Management</span> tidak langsung
					menghilangkan datanya — event dipindahkan ke sampah ini dan bisa dipulihkan kapan saja. Hapus
					permanen hanya jika Anda benar-benar yakin.
				</p>
			</div>

			{loading ? (
				<div className="flex justify-center py-16">
					<div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
				</div>
			) : events.length === 0 ? (
				<div className="text-center py-16">
					<TrashIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
					<p className="text-gray-500 dark:text-gray-400">Sampah kosong — tidak ada event yang dihapus.</p>
				</div>
			) : (
				<div className="space-y-3">
					{events.map((event) => (
						<div
							key={event.id}
							className="flex flex-col sm:flex-row gap-4 p-4 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06]"
						>
							{/* Thumbnail */}
							<div className="w-full sm:w-32 h-32 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/[0.05]">
								{event.thumbnail ? (
									<img
										src={getImageUrl(event.thumbnail) || ""}
										alt={event.title}
										className="w-full h-full object-cover grayscale opacity-80"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center">
										<CalendarIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
									</div>
								)}
							</div>

							{/* Info */}
							<div className="flex-1 min-w-0">
								<h3 className="font-semibold text-gray-900 dark:text-white truncate">{event.title}</h3>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
									{[event.city, event.province].filter(Boolean).join(", ") || event.location || "Lokasi tidak diset"}
								</p>
								<div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
									<span className="inline-flex items-center gap-1">
										<UsersIcon className="w-3.5 h-3.5" />
										{event._count?.participations ?? event.currentParticipants ?? 0} peserta
									</span>
									<span>Dibuat oleh: {event.createdBy?.name || "-"}</span>
								</div>
								<div className="mt-2 text-xs text-red-500 dark:text-red-400">
									Dihapus {formatDate(event.deletedAt)}
									{event.deletedByName ? ` oleh ${event.deletedByName}` : ""}
								</div>
							</div>

							{/* Actions */}
							<div className="flex sm:flex-col items-stretch justify-center gap-2 sm:w-40">
								<button
									onClick={() => handleRestore(event)}
									disabled={busyId === event.id}
									className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition-colors"
								>
									<ArrowUturnLeftIcon className="w-4 h-4" />
									Pulihkan
								</button>
								<button
									onClick={() => handlePermanentDelete(event)}
									disabled={busyId === event.id}
									className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
								>
									<TrashIcon className="w-4 h-4" />
									Hapus Permanen
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default EventTrash;

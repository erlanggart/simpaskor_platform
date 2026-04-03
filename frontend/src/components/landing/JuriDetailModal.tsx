import React, { useEffect, useState } from "react";
import {
	LuX,
	LuBuilding2,
	LuMapPin,
	LuCalendar,
	LuTag,
} from "react-icons/lu";
import { api } from "../../utils/api";
import { config } from "../../utils/config";

interface EventHistory {
	eventId: string;
	title: string;
	slug: string | null;
	thumbnail: string | null;
	startDate: string;
	endDate: string;
	location: string | null;
	status: string;
	categories: string[];
}

interface JuriDetail {
	id: string;
	name: string;
	avatar: string | null;
	institution: string | null;
	city: string | null;
	province: string | null;
	bio: string | null;
	eventHistory: EventHistory[];
}

interface JuriDetailModalProps {
	juriId: string | null;
	onClose: () => void;
}

const JuriDetailModal: React.FC<JuriDetailModalProps> = ({
	juriId,
	onClose,
}) => {
	const [data, setData] = useState<JuriDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const getImageUrl = (imageUrl: string | null): string | null => {
		if (!imageUrl) return null;
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
			return imageUrl;
		}
		return `${config.api.backendUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
	};

	useEffect(() => {
		if (!juriId) return;
		const fetchDetail = async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await api.get(`/users/public/juries/${juriId}`);
				setData(res.data);
			} catch {
				setError("Gagal memuat data juri.");
			} finally {
				setLoading(false);
			}
		};
		fetchDetail();
	}, [juriId]);

	if (!juriId) return null;

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	const statusLabel: Record<string, { text: string; color: string }> = {
		ACTIVE: { text: "Aktif", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
		COMPLETED: { text: "Selesai", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
		UPCOMING: { text: "Akan Datang", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
		DRAFT: { text: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
	};

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center p-4"
			onClick={onClose}
		>
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

			{/* Modal */}
			<div
				className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Close button */}
				<button
					onClick={onClose}
					className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/40 transition-colors"
				>
					<LuX className="w-4 h-4" />
				</button>

				{loading && (
					<div className="flex items-center justify-center py-20">
						<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
					</div>
				)}

				{error && (
					<div className="flex items-center justify-center py-20 text-red-500 text-sm">
						{error}
					</div>
				)}

				{data && !loading && (
					<div className="overflow-y-auto max-h-[85vh]">
						{/* Header with avatar */}
						<div className="relative">
							<div className="h-32 bg-gradient-to-br from-purple-600 to-purple-900" />
							<div className="px-6 pb-4 -mt-16 flex items-end gap-4">
								<div className="w-24 h-24 rounded-xl overflow-hidden border-4 border-white dark:border-gray-900 shadow-lg flex-shrink-0 bg-purple-800">
									{getImageUrl(data.avatar) ? (
										<img
											src={getImageUrl(data.avatar)!}
											alt={data.name}
											className="w-full h-full object-cover"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center">
											<span className="text-3xl font-black text-white/30">
												{data.name.charAt(0).toUpperCase()}
											</span>
										</div>
									)}
								</div>
								<div className="pb-1 min-w-0">
									<div className="inline-block px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-semibold mb-1">
										JURI
									</div>
									<h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
										{data.name}
									</h2>
									<div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
										{data.institution && (
											<span className="flex items-center gap-1">
												<LuBuilding2 className="w-3.5 h-3.5" />
												{data.institution}
											</span>
										)}
										{(data.city || data.province) && (
											<span className="flex items-center gap-1">
												<LuMapPin className="w-3.5 h-3.5" />
												{[data.city, data.province]
													.filter(Boolean)
													.join(", ")}
											</span>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Bio */}
						{data.bio && (
							<div className="px-6 py-3">
								<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
									{data.bio}
								</p>
							</div>
						)}

						{/* Event History */}
						<div className="px-6 pb-6 pt-2">
							<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
								<LuCalendar className="w-4 h-4 text-purple-500" />
								Riwayat Event ({data.eventHistory.length})
							</h3>

							{data.eventHistory.length === 0 ? (
								<p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">
									Belum ada riwayat event.
								</p>
							) : (
								<div className="space-y-3">
									{data.eventHistory.map((event) => {
										const thumbnailUrl = getImageUrl(event.thumbnail);
											const status = statusLabel[event.status] ?? { text: event.status, color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" };
										return (
											<div
												key={event.eventId}
												className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-colors"
											>
												{/* Event thumbnail */}
												<div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-800">
													{thumbnailUrl ? (
														<img
															src={thumbnailUrl}
															alt={event.title}
															className="w-full h-full object-cover"
														/>
													) : (
														<div className="w-full h-full flex items-center justify-center">
															<LuCalendar className="w-5 h-5 text-gray-400" />
														</div>
													)}
												</div>

												{/* Event info */}
												<div className="flex-1 min-w-0">
													<div className="flex items-start justify-between gap-2">
														<h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
															{event.title}
														</h4>
														<span
															className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color}`}
														>
															{status.text}
														</span>
													</div>
													<div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-1">
														<LuCalendar className="w-3 h-3" />
														{formatDate(event.startDate)}
														{event.endDate && ` - ${formatDate(event.endDate)}`}
													</div>
													{event.location && (
														<div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
															<LuMapPin className="w-3 h-3" />
															<span className="line-clamp-1">{event.location}</span>
														</div>
													)}
													{event.categories.length > 0 && (
														<div className="flex flex-wrap gap-1 mt-1.5">
															{event.categories.map((cat, i) => (
																<span
																	key={i}
																	className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-100/50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[10px] font-medium"
																>
																	<LuTag className="w-2.5 h-2.5" />
																	{cat}
																</span>
															))}
														</div>
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default JuriDetailModal;

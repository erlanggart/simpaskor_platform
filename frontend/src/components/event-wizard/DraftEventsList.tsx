import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
	PencilSquareIcon,
	TrashIcon,
	ClockIcon,
	DocumentTextIcon,
	LockClosedIcon,
	PhoneIcon,
} from "@heroicons/react/24/outline";
import { buildDPWhatsAppUrl } from "../../utils/dpWhatsApp";

interface DraftEvent {
	id: string;
	title: string | null;
	startDate: string;
	endDate: string;
	province: string | null;
	city: string | null;
	venue: string | null;
	packageTier: string | null;
	wizardStep: number;
	wizardCompleted: boolean;
	paymentStatus?: string | null;
	eventPayment?: {
		status?: string | null;
		paymentType?: string | null;
	} | null;
	createdAt: string;
	updatedAt: string;
}

interface DraftEventsListProps {
	onDraftDeleted?: () => void;
}

const DraftEventsList: React.FC<DraftEventsListProps> = ({ onDraftDeleted }) => {
	const [drafts, setDrafts] = useState<DraftEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	useEffect(() => {
		fetchDrafts();
	}, []);

	const fetchDrafts = async () => {
		try {
			const token = localStorage.getItem("token");
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/events/drafts`,
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			if (!response.ok) throw new Error("Failed to fetch drafts");

			const result = await response.json();
			setDrafts(result.data || []);
		} catch (error) {
			console.error("Error fetching drafts:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!window.confirm("Yakin ingin menghapus draft ini?")) return;

		setDeletingId(id);
		try {
			const token = localStorage.getItem("token");
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/api/events/${id}`,
				{
					method: "DELETE",
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			if (!response.ok) throw new Error("Failed to delete draft");

			setDrafts(drafts.filter((d) => d.id !== id));
			onDraftDeleted?.();
		} catch (error) {
			console.error("Error deleting draft:", error);
			alert("Gagal menghapus draft");
		} finally {
			setDeletingId(null);
		}
	};

	const getProgressPercent = (step: number): number => {
		return Math.min(100, Math.round((step / 4) * 100));
	};

	const isDpPending = (draft: DraftEvent): boolean => {
		return draft.paymentStatus === "DP_REQUESTED" || (
			draft.eventPayment?.paymentType === "DP_REQUEST" &&
			draft.eventPayment?.status === "PENDING"
		);
	};

	const handleWhatsApp = (draft: DraftEvent) => {
		window.open(
			buildDPWhatsAppUrl({
				title: draft.title,
				packageTier: draft.packageTier,
				startDate: draft.startDate,
				endDate: draft.endDate,
				province: draft.province,
				city: draft.city,
				venue: draft.venue,
			}),
			"_blank"
		);
	};

	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (loading) {
		return (
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow dark:shadow-gray-900/50 p-6 transition-colors">
				<div className="animate-pulse flex items-center gap-4">
					<div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
					<div className="flex-1">
						<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
						<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
					</div>
				</div>
			</div>
		);
	}

	if (drafts.length === 0) {
		return null;
	}

	return (
		<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow dark:shadow-gray-900/50 transition-colors">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-3">
					<DocumentTextIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
					<h3 className="font-semibold text-gray-900 dark:text-white">
						Draft Event ({drafts.length})
					</h3>
				</div>
				<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
					Lanjutkan pembuatan event atau pantau DP yang menunggu konfirmasi
				</p>
			</div>

			<div className="divide-y divide-gray-200 dark:divide-gray-700">
				{drafts.map((draft) => {
					const dpPending = isDpPending(draft);

					return (
						<div
							key={draft.id}
							className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
						>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<h4 className="font-medium text-gray-900 dark:text-white">
											{draft.title || "Event Tanpa Judul"}
										</h4>
										{dpPending && (
											<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
												<LockClosedIcon className="w-3 h-3" />
												Menunggu Konfirmasi DP
											</span>
										)}
									</div>
									<div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
										<ClockIcon className="w-4 h-4" />
										<span>Diubah: {formatDate(draft.updatedAt)}</span>
									</div>

									{/* Progress Bar */}
									<div className="mt-3">
										<div className="flex items-center justify-between text-xs mb-1">
											<span className="text-gray-600 dark:text-gray-400">
												Step {draft.wizardStep} dari 4
											</span>
											<span className="text-gray-600 dark:text-gray-400">
												{getProgressPercent(draft.wizardStep)}%
											</span>
										</div>
										<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
											<div
												className={`${dpPending ? "bg-amber-500 dark:bg-amber-400" : "bg-red-600 dark:bg-red-400"} h-2 rounded-full transition-all`}
												style={{ width: `${getProgressPercent(draft.wizardStep)}%` }}
											></div>
										</div>
									</div>
								</div>

								<div className="flex items-center gap-2 ml-4">
									{dpPending ? (
										<button
											type="button"
											onClick={() => handleWhatsApp(draft)}
											className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
											title="Hubungi admin lewat WhatsApp"
										>
											<PhoneIcon className="w-4 h-4" />
											WhatsApp Admin
										</button>
									) : (
										<Link
											to={`/panitia/events/create/${draft.id}`}
											className="flex items-center gap-2 px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-sm"
										>
											<PencilSquareIcon className="w-4 h-4" />
											Lanjutkan
										</Link>
									)}
									<button
										onClick={() => handleDelete(draft.id)}
										disabled={deletingId === draft.id}
										className={`p-2 rounded-lg transition-colors ${
											deletingId === draft.id
												? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
												: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
										}`}
										title="Hapus draft"
									>
										<TrashIcon className="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default DraftEventsList;

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
	DocumentTextIcon,
	VideoCameraIcon,
	PhotoIcon,
	ArrowDownTrayIcon,
	FolderIcon,
	CalendarIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";

interface Material {
	id: string;
	title: string;
	description: string | null;
	type: "DOCUMENT" | "VIDEO" | "IMAGE" | "OTHER";
	fileUrl: string | null;
	createdAt: string;
}

interface EventInfo {
	id: string;
	title: string;
	description: string | null;
	startDate: string;
	endDate: string;
}

interface JuryAssignment {
	id: string;
	event: EventInfo;
	assignedCategories: {
		id: string;
		assessmentCategory: {
			id: string;
			name: string;
			description: string | null;
		};
	}[];
}

const JuriEventMateri: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const [assignment, setAssignment] = useState<JuryAssignment | null>(null);
	const [materials, setMaterials] = useState<Material[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (eventSlug) {
			fetchData();
		}
	}, [eventSlug]);

	const fetchData = async () => {
		try {
			setLoading(true);
			const assignmentRes = await api.get(`/juries/events/${eventSlug}`);
			setAssignment(assignmentRes.data);
			// Fetch materials using event ID from assignment
			if (assignmentRes.data?.event?.id) {
				const materialsRes = await api.get(`/events/${assignmentRes.data.event.id}/materials`).catch(() => ({ data: [] }));
				setMaterials(materialsRes.data || []);
			}
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const getTypeIcon = (type: string) => {
		switch (type) {
			case "DOCUMENT":
				return <DocumentTextIcon className="h-8 w-8 text-blue-500" />;
			case "VIDEO":
				return <VideoCameraIcon className="h-8 w-8 text-red-500" />;
			case "IMAGE":
				return <PhotoIcon className="h-8 w-8 text-green-500" />;
			default:
				return <FolderIcon className="h-8 w-8 text-gray-500" />;
		}
	};

	const getBackendUrl = () => {
		return import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	if (!assignment) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="text-center">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
						Event tidak ditemukan
					</h2>
					<Link
						to="/juri/events"
						className="mt-4 inline-block text-indigo-600 hover:text-indigo-500"
					>
						Kembali ke Event Saya
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Materi Event
					</h1>
					<div className="mt-2 flex items-center text-gray-600 dark:text-gray-400">
						<CalendarIcon className="h-5 w-5 mr-2" />
						{assignment.event.title}
					</div>
				</div>

				{/* Categories assigned */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-6">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						Kategori Penilaian Anda
					</h2>
					<div className="flex flex-wrap gap-2">
						{assignment.assignedCategories.map((cat) => (
							<span
								key={cat.id}
								className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
							>
								{cat.assessmentCategory.name}
							</span>
						))}
					</div>
				</div>

				{/* Materials List */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
					<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
							Daftar Materi
						</h2>
					</div>

					{materials.length === 0 ? (
						<div className="p-12 text-center">
							<FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
							<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
								Belum Ada Materi
							</h3>
							<p className="mt-2 text-gray-600 dark:text-gray-400">
								Panitia belum mengunggah materi untuk event ini.
							</p>
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-700">
							{materials.map((material) => (
								<div
									key={material.id}
									className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
								>
									<div className="flex items-center gap-4">
										{getTypeIcon(material.type)}
										<div>
											<h3 className="text-sm font-medium text-gray-900 dark:text-white">
												{material.title}
											</h3>
											{material.description && (
												<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
													{material.description}
												</p>
											)}
											<p className="mt-1 text-xs text-gray-400">
												Ditambahkan: {formatDate(material.createdAt)}
											</p>
										</div>
									</div>
									{material.fileUrl && (
										<a
											href={`${getBackendUrl()}${material.fileUrl}`}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
										>
											<ArrowDownTrayIcon className="h-4 w-4" />
											Download
										</a>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default JuriEventMateri;

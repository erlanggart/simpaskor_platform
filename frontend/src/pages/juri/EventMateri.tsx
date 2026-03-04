import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
	DocumentTextIcon,
	FolderIcon,
	CalendarIcon,
	ListBulletIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";

interface ScoreOption {
	id: string;
	name: string;
	score: number;
	order: number;
}

interface ScoreCategory {
	id: string;
	name: string;
	color: string;
	order: number;
	options: ScoreOption[];
}

interface Material {
	id: string;
	eventId: string;
	eventAssessmentCategoryId: string;
	number: number;
	name: string;
	description: string | null;
	order: number;
	schoolCategoryIds: string[];
	schoolCategories: { id: string; name: string }[];
	scoreCategories: ScoreCategory[];
}

interface MaterialCategory {
	id: string;
	assessmentCategoryId: string;
	categoryName: string;
	categoryDescription: string | null;
	materials: Material[];
}

interface MaterialsResponse {
	categories: MaterialCategory[];
	eventSchoolCategories: { id: string; name: string; order: number }[];
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
	const [materialCategories, setMaterialCategories] = useState<MaterialCategory[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<string>("");

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
			// Fetch materials using event slug
			const materialsRes = await api.get<MaterialsResponse>(`/materials/event/${eventSlug}`).catch(() => ({ data: { categories: [], eventSchoolCategories: [] } }));
			const categories = materialsRes.data?.categories || [];
			setMaterialCategories(categories);
			// Set first category as active tab
			if (categories.length > 0 && categories[0]) {
				setActiveTab(categories[0].id);
			}
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const getScoreCategoryColor = (color: string) => {
		const colors: Record<string, string> = {
			red: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
			orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
			yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
			green: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
			blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
			gray: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
		};
		return colors[color] || colors.gray;
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

				{/* Materials by Category - Tabs */}
				{materialCategories.length === 0 ? (
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
						<FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
						<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
							Belum Ada Materi
						</h3>
						<p className="mt-2 text-gray-600 dark:text-gray-400">
							Panitia belum menambahkan materi untuk event ini.
						</p>
					</div>
				) : (
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
						{/* Category Tabs */}
						<div className="border-b border-gray-200 dark:border-gray-700">
							<nav className="flex overflow-x-auto px-4">
								{materialCategories.map((category) => {
									const isActive = activeTab === category.id;
									return (
										<button
											key={category.id}
											onClick={() => setActiveTab(category.id)}
											className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
												isActive
													? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
													: "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
											}`}
										>
											<DocumentTextIcon className="h-4 w-4" />
											<span>{category.categoryName}</span>
											<span className={`px-2 py-0.5 rounded-full text-xs ${
												isActive
													? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
													: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
											}`}>
												{category.materials.length}
											</span>
										</button>
									);
								})}
							</nav>
						</div>

						{/* Tab Content */}
						{(() => {
							const activeCategory = materialCategories.find(c => c.id === activeTab);
							if (!activeCategory) return null;

							return (
								<div>
									{/* Category Description */}
									{activeCategory.categoryDescription && (
										<div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
											<p className="text-sm text-gray-600 dark:text-gray-400">
												{activeCategory.categoryDescription}
											</p>
										</div>
									)}

									{activeCategory.materials.length === 0 ? (
										<div className="p-6 text-center text-gray-500 dark:text-gray-400">
											Belum ada materi untuk kategori ini.
										</div>
									) : (
										<div className="divide-y divide-gray-200 dark:divide-gray-700">
											{activeCategory.materials.map((material) => (
												<div
													key={material.id}
													className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
												>
													<div className="flex items-start justify-between">
														<div className="flex items-start gap-4">
															<span className="flex items-center justify-center w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400 font-bold">
																{material.number}
															</span>
															<div>
																<h3 className="text-base font-medium text-gray-900 dark:text-white">
																	{material.name}
																</h3>
																{material.description && (
																	<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
																		{material.description}
																	</p>
																)}
																
																{/* School Categories */}
																{material.schoolCategories.length > 0 && (
																	<div className="mt-2 flex flex-wrap gap-1">
																		{material.schoolCategories.map((sc) => (
																			<span
																				key={sc.id}
																				className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded"
																			>
																				{sc.name}
																			</span>
																		))}
																	</div>
																)}
															</div>
														</div>
													</div>

													{/* Score Categories */}
													{material.scoreCategories.length > 0 && (
														<div className="mt-4 ml-14">
															<div className="flex items-center gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400">
																<ListBulletIcon className="h-4 w-4" />
																Kategori Nilai:
															</div>
															<div className="flex flex-wrap gap-2">
																{material.scoreCategories.map((sc) => (
																	<div
																		key={sc.id}
																		className={`px-3 py-1.5 rounded-lg text-sm ${getScoreCategoryColor(sc.color)}`}
																	>
																		<span className="font-medium">{sc.name}</span>
																		{sc.options.length > 0 && (
																			<span className="ml-1 opacity-75">
																				({sc.options.map(o => o.score).join(", ")})
																			</span>
																		)}
																	</div>
																))}
															</div>
														</div>
													)}
												</div>
											))}
										</div>
									)}
								</div>
							);
						})()}
					</div>
				)}
			</div>
		</div>
	);
};

export default JuriEventMateri;

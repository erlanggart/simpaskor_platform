import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { ChartBarIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import AssessmentHistoryDashboard from "../../components/peserta/assessment/AssessmentHistoryDashboard";
import AssessmentScoreDetail from "../../components/peserta/assessment/AssessmentScoreDetail";
import {
	AssessmentDashboardData,
	AssessmentPerformanceSession,
	AssessmentScoreData,
} from "../../components/peserta/assessment/types";

const AssessmentHistory: React.FC = () => {
	const { eventSlug, groupId } = useParams<{ eventSlug: string; groupId?: string }>();
	const [dashboardData, setDashboardData] = useState<AssessmentDashboardData | null>(null);
	const [scoreData, setScoreData] = useState<AssessmentScoreData | null>(null);
	const [performanceSessions, setPerformanceSessions] = useState<AssessmentPerformanceSession[]>([]);
	const [loading, setLoading] = useState(!eventSlug);
	const [loadingScores, setLoadingScores] = useState(false);
	const [performanceLoadError, setPerformanceLoadError] = useState(false);
	const [activeTab, setActiveTab] = useState<string>("");

	const fetchDashboardData = useCallback(async () => {
		try {
			setLoading(true);
			const res = await api.get("/evaluations/my-performance-summary");
			setDashboardData(res.data);
		} catch (error) {
			console.error("Error fetching assessment dashboard:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchScores = useCallback(async (slug: string, selectedGroupId?: string) => {
		try {
			setLoadingScores(true);
			setScoreData(null);
			setPerformanceSessions([]);
			setPerformanceLoadError(false);

			const [scoreResult, performanceResult] = await Promise.allSettled([
				api.get(`/evaluations/my-scores/${slug}`, {
					params: selectedGroupId ? { groupId: selectedGroupId } : undefined,
				}),
				api.get(`/performance/events/${slug}/sessions`, {
					params: selectedGroupId ? { participantId: selectedGroupId } : undefined,
				}),
			]);

			if (scoreResult.status !== "fulfilled") {
				throw scoreResult.reason;
			}

			setScoreData(scoreResult.value.data);
			if (scoreResult.value.data?.scoresByCategory?.length > 0) {
				setActiveTab(scoreResult.value.data.scoresByCategory[0].categoryName);
			} else {
				setActiveTab("");
			}

			if (performanceResult.status === "fulfilled" && Array.isArray(performanceResult.value.data)) {
				setPerformanceSessions(performanceResult.value.data);
			} else {
				setPerformanceSessions([]);
				setPerformanceLoadError(true);
				if (performanceResult.status === "rejected") {
					console.error("Error fetching performance sessions:", performanceResult.reason);
				}
			}
		} catch (error) {
			console.error("Error fetching scores:", error);
		} finally {
			setLoadingScores(false);
		}
	}, []);

	useEffect(() => {
		if (!eventSlug) {
			fetchDashboardData();
		}
	}, [eventSlug, fetchDashboardData]);

	useEffect(() => {
		if (eventSlug) {
			fetchScores(eventSlug, groupId);
		} else {
			setScoreData(null);
			setPerformanceSessions([]);
			setPerformanceLoadError(false);
			setActiveTab("");
		}
	}, [eventSlug, groupId, fetchScores]);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	if (!eventSlug && loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (eventSlug && loadingScores) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (eventSlug && scoreData) {
		return (
			<AssessmentScoreDetail
				scoreData={scoreData}
				performanceSessions={performanceSessions}
				performanceLoadError={performanceLoadError}
				activeTab={activeTab}
				onTabChange={setActiveTab}
			/>
		);
	}

	if (eventSlug && !loadingScores) {
		return (
			<div className="min-h-screen">
				<div className="max-w-4xl mx-auto px-4 py-6">
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-md p-8 text-center">
						<ChartBarIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
						<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
							Data Penilaian Tidak Ditemukan
						</h3>
						<p className="text-gray-500 dark:text-gray-400 mb-5">
							Event ini belum memiliki rekap penilaian yang bisa ditampilkan.
						</p>
						<Link
							to="/peserta/assessment-history"
							className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
						>
							Kembali ke Dashboard
						</Link>
					</div>
				</div>
			</div>
		);
	}

	if (!dashboardData) {
		return (
			<div className="min-h-screen">
				<div className="max-w-4xl mx-auto px-4 py-6">
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-md p-8 text-center">
						<TrophyIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
						<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
							Gagal Memuat Dashboard Assessment
						</h3>
						<p className="text-gray-500 dark:text-gray-400">
							Coba muat ulang halaman beberapa saat lagi.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<AssessmentHistoryDashboard dashboardData={dashboardData} formatDate={formatDate} />
	);
};

export default AssessmentHistory;

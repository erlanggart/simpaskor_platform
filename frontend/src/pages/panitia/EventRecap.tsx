import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowPathIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import ParticipantDetailModal from "../../components/panitia/ParticipantDetailModal";

interface Jury {
  id: string;
  name: string;
  assignedCategories: string[];
}

interface Category {
  id: string;
  name: string;
  order: number;
  customWeight: number | null;
  customMaxScore: number | null;
}

interface ScoreDetail {
  juryId: string;
  juryName: string;
  score: number | null;
  maxScore: number;
  notes: string | null;
  scoredMaterials?: number;
}

interface CategoryScore {
  categoryId: string;
  categoryName: string;
  scores: ScoreDetail[];
  totalScore: number;
  averageScore: number;
  extraAdjustment?: number;
}

interface ExtraNilai {
  id: string;
  participantId: string;
  type: "PUNISHMENT" | "POINPLUS";
  scope: "GENERAL" | "CATEGORY";
  assessmentCategoryId: string | null;
  value: number;
  reason: string | null;
}

interface JuaraRank {
  id: string;
  startRank: number;
  endRank: number;
  label: string;
  order: number;
}

interface JuaraCategory {
  id: string;
  type: "UTAMA" | "UMUM" | "CUSTOM";
  name: string;
  description: string | null;
  order: number;
  assessmentCategoryIds: string[];
  ranks: JuaraRank[];
}

interface Participant {
  id: string;
  participationId: string;
  teamName: string;
  orderNumber: number | null;
  schoolCategory: {
    id: string;
    name: string;
  } | null;
  registrant: {
    id: string;
    name: string;
    institution: string | null;
  };
}

interface RecapItem {
  participant: Participant;
  categoryScores: CategoryScore[];
  grandTotal: number;
  grandAverage: number;
  extraNilai?: ExtraNilai[];
  generalExtraAdjustment?: number;
}

interface EventInfo {
  id: string;
  title: string;
  slug: string | null;
}

interface RecapData {
  event: EventInfo;
  categories: Category[];
  juries: Jury[];
  recap: RecapItem[];
}

interface SchoolCategoryGroup {
  id: string;
  name: string;
  participants: RecapItem[];
}

const PanitiaEventRecap: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const basePath = isAdminRoute ? "/admin" : "/panitia";
  const storageKey = isAdminRoute
    ? "admin_active_event"
    : "panitia_active_event";
  const dashboardPath = isAdminRoute ? "/admin/events" : "/panitia/dashboard";

  const [loading, setLoading] = useState(true);
  const [recapData, setRecapData] = useState<RecapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [showExtraNilai, setShowExtraNilai] = useState(true); // Toggle for extra nilai feature visibility
  const [applyGeneralExtraNilai, setApplyGeneralExtraNilai] = useState(true); // Apply general extra nilai to total
  const [applyCategoryExtraNilai, setApplyCategoryExtraNilai] = useState(true); // Apply category extra nilai to category scores

  // Detail modal state
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    string | null
  >(null);

  // Extra Nilai states
  const [showExtraNilaiModal, setShowExtraNilaiModal] = useState(false);
  const [extraNilaiParticipant, setExtraNilaiParticipant] =
    useState<RecapItem | null>(null);
  const [extraNilaiForm, setExtraNilaiForm] = useState({
    type: "PUNISHMENT" as "PUNISHMENT" | "POINPLUS",
    scope: "GENERAL" as "GENERAL" | "CATEGORY",
    assessmentCategoryId: "",
    value: 0,
    reason: "",
  });
  const [extraNilaiLoading, setExtraNilaiLoading] = useState(false);

  // Juara category states
  const [juaraCategories, setJuaraCategories] = useState<JuaraCategory[]>([]);
  const [selectedJuaraPreset, setSelectedJuaraPreset] = useState<string | null>(null);

  useEffect(() => {
    if (eventSlug) {
      checkAssignmentAndFetch();
      fetchJuaraCategories();
    }
  }, [eventSlug]);

  useEffect(() => {
    // Initialize selected categories when data loads
    if (recapData?.categories) {
      setSelectedCategories(new Set(recapData.categories.map((c) => c.id)));
    }
  }, [recapData?.categories]);

  const checkAssignmentAndFetch = async () => {
    try {
      setLoading(true);
      // Get active event from localStorage (check both admin and panitia keys)
      const stored = localStorage.getItem(storageKey);

      if (!stored && !isAdminRoute) {
        navigate(dashboardPath, { replace: true });
        return;
      }

      if (stored) {
        const eventData = JSON.parse(stored);

        if (eventData.slug !== eventSlug) {
          // URL doesn't match - update localStorage to match URL
          localStorage.setItem(
            storageKey,
            JSON.stringify({ slug: eventSlug, title: "", id: "" }),
          );
        }
      }

      await fetchRecap();
    } catch (err: unknown) {
      console.error("Error checking assignment:", err);
      localStorage.removeItem(storageKey);
      navigate(dashboardPath, { replace: true });
    }
  };

  const fetchRecap = async () => {
    try {
      setError(null);
      const response = await api.get(`/evaluations/event/${eventSlug}/recap`);
      setRecapData(response.data);
    } catch (err: unknown) {
      console.error("Error fetching recap:", err);
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || "Gagal memuat data rekapitulasi");
    } finally {
      setLoading(false);
    }
  };

  const fetchJuaraCategories = async () => {
    try {
      const response = await api.get(`/juara-categories/event/${eventSlug}`);
      setJuaraCategories(response.data);
    } catch (err: unknown) {
      console.error("Error fetching juara categories:", err);
      // Silent fail - juara categories are optional
    }
  };

  const handleJuaraPresetSelect = (juaraId: string | null) => {
    setSelectedJuaraPreset(juaraId);
    if (juaraId && recapData) {
      const juara = juaraCategories.find(j => j.id === juaraId);
      if (juara) {
        // Set selected categories based on juara preset
        setSelectedCategories(new Set(juara.assessmentCategoryIds));
      }
    } else if (juaraId === null && recapData?.categories) {
      // Reset to all categories when deselected
      setSelectedCategories(new Set(recapData.categories.map((c) => c.id)));
    }
  };

  const handleParticipantClick = (participantId: string) => {
    setSelectedParticipantId(participantId);
  };

  const closeDetailModal = () => {
    setSelectedParticipantId(null);
  };

  const handleDataChange = () => {
    // Refresh recap data when modal saves changes
    fetchRecap();
  };

  // Group participants by school category
  const getSchoolCategoryGroups = (): SchoolCategoryGroup[] => {
    if (!recapData) return [];

    const groups: Record<string, SchoolCategoryGroup> = {};

    recapData.recap.forEach((item) => {
      const catId = item.participant.schoolCategory?.id || "uncategorized";
      const catName = item.participant.schoolCategory?.name || "Tanpa Kategori";

      if (!groups[catId]) {
        groups[catId] = {
          id: catId,
          name: catName,
          participants: [],
        };
      }
      groups[catId].participants.push(item);
    });

    // Sort participants within each group by orderNumber
    Object.values(groups).forEach((group) => {
      group.participants.sort((a, b) => {
        const orderA = a.participant.orderNumber ?? 9999;
        const orderB = b.participant.orderNumber ?? 9999;
        return orderA - orderB;
      });
    });

    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  };

  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  const selectAllCategories = () => {
    if (recapData?.categories) {
      setSelectedCategories(new Set(recapData.categories.map((c) => c.id)));
    }
  };

  const deselectAllCategories = () => {
    setSelectedCategories(new Set());
  };

  const getFilteredCategories = () => {
    if (!recapData) return [];
    return recapData.categories.filter((c) => selectedCategories.has(c.id));
  };

  const getCategoryScore = (item: RecapItem, categoryId: string): number => {
    const catScore = item.categoryScores.find(
      (cs) => cs.categoryId === categoryId,
    );
    if (!catScore) return 0;
    // When extra nilai is hidden OR category extra nilai is disabled, subtract the category's extra adjustment
    if (!showExtraNilai || !applyCategoryExtraNilai) {
      return catScore.totalScore - (catScore.extraAdjustment || 0);
    }
    return catScore.totalScore;
  };

  const getFilteredTotal = (item: RecapItem): number => {
    const categoryTotal = getFilteredCategories().reduce((sum, cat) => {
      return sum + getCategoryScore(item, cat.id);
    }, 0);
    // Add general extra adjustment only if extra nilai is shown AND general extra nilai is enabled
    if (showExtraNilai && applyGeneralExtraNilai) {
      const generalAdjustment = item.generalExtraAdjustment || 0;
      return categoryTotal + generalAdjustment;
    }
    return categoryTotal;
  };

  // Extra Nilai functions
  const openExtraNilaiModal = (participant: RecapItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setExtraNilaiParticipant(participant);
    setExtraNilaiForm({
      type: "PUNISHMENT",
      scope: "GENERAL",
      assessmentCategoryId: "",
      value: 0,
      reason: "",
    });
    setShowExtraNilaiModal(true);
  };

  const closeExtraNilaiModal = () => {
    setShowExtraNilaiModal(false);
    setExtraNilaiParticipant(null);
  };

  const handleExtraNilaiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraNilaiParticipant || !recapData) return;

    try {
      setExtraNilaiLoading(true);
      await api.post("/evaluations/extra-nilai", {
        eventId: recapData.event.id,
        participantId: extraNilaiParticipant.participant.id,
        type: extraNilaiForm.type,
        scope: extraNilaiForm.scope,
        assessmentCategoryId:
          extraNilaiForm.scope === "CATEGORY"
            ? extraNilaiForm.assessmentCategoryId
            : null,
        value: extraNilaiForm.value,
        reason: extraNilaiForm.reason || null,
      });
      closeExtraNilaiModal();
      fetchRecap();
    } catch (err) {
      console.error("Error creating extra nilai:", err);
      alert("Gagal menambahkan extra nilai");
    } finally {
      setExtraNilaiLoading(false);
    }
  };

  const handleDeleteExtraNilai = async (
    extraNilaiId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (!confirm("Yakin ingin menghapus extra nilai ini?")) return;

    try {
      await api.delete(`/evaluations/extra-nilai/${extraNilaiId}`);
      fetchRecap();
    } catch (err) {
      console.error("Error deleting extra nilai:", err);
      alert("Gagal menghapus extra nilai");
    }
  };

  const getExtraNilaiSummary = (
    item: RecapItem,
  ): { punishment: number; poinplus: number } => {
    // If extra nilai is hidden, return zeros
    if (!showExtraNilai) {
      return { punishment: 0, poinplus: 0 };
    }
    const extraNilai = item.extraNilai || [];
    // Filter based on settings AND selected categories
    const filteredExtraNilai = extraNilai.filter((en) => {
      if (en.scope === "GENERAL" && applyGeneralExtraNilai) return true;
      if (en.scope === "CATEGORY" && applyCategoryExtraNilai) {
        // Only include if the category is currently selected/displayed
        return en.assessmentCategoryId && selectedCategories.has(en.assessmentCategoryId);
      }
      return false;
    });
    return {
      punishment: filteredExtraNilai
        .filter((en) => en.type === "PUNISHMENT")
        .reduce((sum, en) => sum + en.value, 0),
      poinplus: filteredExtraNilai
        .filter((en) => en.type === "POINPLUS")
        .reduce((sum, en) => sum + en.value, 0),
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <Link
            to={`${basePath}/events/${eventSlug}/manage`}
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Kembali ke Kelola Event
          </Link>
        </div>
      </div>
    );
  }

  if (!recapData) {
    return null;
  }

  const schoolCategoryGroups = getSchoolCategoryGroups();
  const filteredCategories = getFilteredCategories();

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto transition-all duration-300">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="mb-4">
              <Link
                to={`${basePath}/events/${eventSlug}/manage`}
                className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                Kembali ke Kelola Event
              </Link>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end mb-6">
              <button
                onClick={fetchRecap}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                <ArrowPathIcon className="w-5 h-5 mr-2" />
                Refresh Data Tabel
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                <Cog6ToothIcon className="w-5 h-5 mr-2" />
                {showSettings ? "Tutup Pengaturan" : "Pengaturan"}
              </button>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Rekap Nilai Peserta
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {recapData.event.title}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Klik nama peserta untuk melihat detail nilai
              </p>
            </div>

            {/* School Category Sections */}
            {schoolCategoryGroups.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center shadow">
                <p className="text-gray-500 dark:text-gray-400">
                  Belum ada peserta terdaftar
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {schoolCategoryGroups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow"
                  >
                    {/* Section Header */}
                    <div className="bg-indigo-600 dark:bg-gray-700 px-4 py-3">
                      <h2 className="text-lg font-semibold text-white">
                        Kategori Sekolah: {group.name}
                      </h2>
                      <p className="text-sm text-indigo-100 dark:text-gray-400">
                        Kategori Penilaian:{" "}
                        {filteredCategories.length ===
                        recapData.categories.length
                          ? "Semua Nilai"
                          : filteredCategories.map((c) => c.name).join(", ") ||
                            "Tidak ada"}
                      </p>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-indigo-700 dark:bg-indigo-900 text-white">
                            <th className="px-3 py-3 text-left text-sm font-semibold w-16">
                              No
                            </th>
                            <th className="px-3 py-3 text-left text-sm font-semibold min-w-[200px]">
                              Nama
                            </th>
                            <th className="px-3 py-3 text-center text-sm font-semibold w-24">
                              Nomor Urut
                            </th>
                            {filteredCategories.map((cat) => (
                              <th
                                key={cat.id}
                                className="px-3 py-3 text-center text-sm font-semibold min-w-[100px]"
                              >
                                {cat.name}
                              </th>
                            ))}
                            {showExtraNilai && (
                              <>
                                <th className="px-3 py-3 text-center text-sm font-semibold w-20 bg-red-700 dark:bg-red-900">
                                  -
                                </th>
                                <th className="px-3 py-3 text-center text-sm font-semibold w-20 bg-green-700 dark:bg-green-900">
                                  +
                                </th>
                              </>
                            )}
                            <th className="px-3 py-3 text-center text-sm font-semibold w-24 bg-indigo-800 dark:bg-indigo-950">
                              Total
                            </th>
                            {showExtraNilai && (
                              <th className="px-3 py-3 text-center text-sm font-semibold w-20">
                                Aksi
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {group.participants.map((item, index) => {
                            const extraSummary = getExtraNilaiSummary(item);
                            return (
                              <tr
                                key={item.participant.id}
                                className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                                  index % 2 === 0
                                    ? "bg-white dark:bg-gray-800"
                                    : "bg-gray-50 dark:bg-gray-800/70"
                                }`}
                                onClick={() =>
                                  handleParticipantClick(item.participant.id)
                                }
                              >
                                <td className="px-3 py-3 text-gray-700 dark:text-gray-300 text-sm">
                                  {index + 1}
                                </td>
                                <td className="px-3 py-3 text-gray-900 dark:text-white text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                  {item.participant.teamName}
                                </td>
                                <td className="px-3 py-3 text-center text-gray-700 dark:text-gray-300 text-sm">
                                  {item.participant.orderNumber || "-"}
                                </td>
                                {filteredCategories.map((cat) => {
                                  const score = getCategoryScore(item, cat.id);
                                  return (
                                    <td
                                      key={cat.id}
                                      className="px-3 py-3 text-center text-gray-700 dark:text-gray-300 text-sm"
                                    >
                                      {score > 0 ? score.toFixed(1) : "0"}
                                    </td>
                                  );
                                })}
                                {showExtraNilai && (
                                  <>
                                    <td className="px-3 py-3 text-center text-red-600 dark:text-red-400 text-sm font-medium bg-red-50 dark:bg-red-900/20">
                                      {extraSummary.punishment > 0
                                        ? `-${extraSummary.punishment.toFixed(1)}`
                                        : "-"}
                                    </td>
                                    <td className="px-3 py-3 text-center text-green-600 dark:text-green-400 text-sm font-medium bg-green-50 dark:bg-green-900/20">
                                      {extraSummary.poinplus > 0
                                        ? `+${extraSummary.poinplus.toFixed(1)}`
                                        : "-"}
                                    </td>
                                  </>
                                )}
                                <td className="px-3 py-3 text-center text-gray-900 dark:text-white font-bold text-sm bg-gray-100 dark:bg-gray-700/50">
                                  {getFilteredTotal(item).toFixed(1)}
                                </td>
                                {showExtraNilai && (
                                  <td className="px-3 py-3 text-center">
                                    <button
                                      onClick={(e) =>
                                        openExtraNilaiModal(item, e)
                                      }
                                      className="inline-flex items-center px-2 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
                                      title="Tambah Extra Nilai"
                                    >
                                      <PlusIcon className="w-3 h-3 mr-1" />
                                      Extra
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {group.participants.length === 0 && (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        Tidak ada peserta dalam kategori ini
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total Peserta
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {recapData.recap.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Kategori Sekolah
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {schoolCategoryGroups.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Kategori Penilaian
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {filteredCategories.length} / {recapData.categories.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Dewan Juri
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {recapData.juries.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Sidebar */}
        <div
          className={`transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden ${
            showSettings ? "w-80" : "w-0"
          }`}
        >
            <div className="w-80 h-screen sticky top-0 bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pengaturan
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {/* Juara Preset Selector */}
                  {juaraCategories.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Preset Kategori Juara
                      </h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleJuaraPresetSelect(null)}
                          className={`w-full px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                            selectedJuaraPreset === null
                              ? "bg-gray-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          Semua Kategori
                        </button>
                        {juaraCategories.map((juara) => (
                          <button
                            key={juara.id}
                            onClick={() => handleJuaraPresetSelect(juara.id)}
                            className={`w-full px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                              selectedJuaraPreset === juara.id
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`inline-block w-2 h-2 rounded-full ${
                                juara.type === "UTAMA" ? "bg-yellow-400" :
                                juara.type === "UMUM" ? "bg-blue-400" : "bg-purple-400"
                              }`} />
                              <span>{juara.name}</span>
                            </div>
                            {juara.description && (
                              <p className={`text-xs mt-0.5 ${
                                selectedJuaraPreset === juara.id ? "text-indigo-200" : "text-gray-500 dark:text-gray-400"
                              }`}>
                                {juara.description}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Pilih preset untuk filter kategori otomatis
                      </p>
                    </div>
                  )}

                  {/* Divider between Juara Preset and Kategori Penilaian */}
                  {juaraCategories.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700" />
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kategori Penilaian
                    </h4>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={selectAllCategories}
                        className="flex-1 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                      >
                        Pilih Semua
                      </button>
                      <button
                        onClick={deselectAllCategories}
                        className="flex-1 px-3 py-1.5 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                      >
                        Hapus Semua
                      </button>
                    </div>
                    <div className="space-y-2">
                      {recapData.categories.map((cat) => (
                        <label
                          key={cat.id}
                          className={`flex items-center w-full px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            selectedCategories.has(cat.id)
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.has(cat.id)}
                            onChange={() => toggleCategory(cat.id)}
                            className="sr-only"
                          />
                          <span className="text-sm">{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Selected Count */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Terpilih:{" "}
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        {selectedCategories.size}
                      </span>{" "}
                      dari {recapData.categories.length} kategori
                    </p>
                  </div>

                  {/* Extra Nilai Toggle */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    {/* Show/Hide Toggle */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Tampilkan Extra Nilai
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Kolom & tombol
                        </p>
                      </div>
                      <button
                        onClick={() => setShowExtraNilai(!showExtraNilai)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          showExtraNilai
                            ? "bg-indigo-600"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showExtraNilai ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Application Mode - only enabled when showExtraNilai is true */}
                    <div className={`mt-4 pt-3 border-t border-gray-100 dark:border-gray-600 ${!showExtraNilai ? 'opacity-50 pointer-events-none' : ''}`}>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Penerapan Extra Nilai
                        {!showExtraNilai && <span className="text-xs text-gray-400 ml-1">(nonaktif)</span>}
                      </h4>

                      {/* General Extra Nilai Toggle */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Umum
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setApplyGeneralExtraNilai(!applyGeneralExtraNilai)
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            applyGeneralExtraNilai
                              ? "bg-purple-500"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              applyGeneralExtraNilai
                                ? "translate-x-5"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Category Extra Nilai Toggle */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Kategori
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setApplyCategoryExtraNilai(!applyCategoryExtraNilai)
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            applyCategoryExtraNilai
                              ? "bg-teal-500"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              applyCategoryExtraNilai
                                ? "translate-x-5"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {applyGeneralExtraNilai && applyCategoryExtraNilai
                          ? "Extra nilai umum & kategori diterapkan pada perhitungan"
                          : applyGeneralExtraNilai
                            ? "Hanya extra nilai umum yang diterapkan"
                            : applyCategoryExtraNilai
                              ? "Hanya extra nilai kategori yang diterapkan"
                              : "Extra nilai tidak diterapkan (nilai asli saja)"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Participant Detail Modal */}
      {selectedParticipantId && eventSlug && (
        <ParticipantDetailModal
          participantId={selectedParticipantId}
          eventSlug={eventSlug}
          juries={recapData.juries}
          onClose={closeDetailModal}
          onDataChange={handleDataChange}
        />
      )}

      {/* Extra Nilai Modal */}
      {showExtraNilaiModal && extraNilaiParticipant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tambah Extra Nilai
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {extraNilaiParticipant.participant.teamName}
                </p>
              </div>
              <button
                onClick={closeExtraNilaiModal}
                className="p-1 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleExtraNilaiSubmit} className="p-4 space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipe
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExtraNilaiForm((prev) => ({
                        ...prev,
                        type: "PUNISHMENT",
                      }))
                    }
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      extraNilaiForm.type === "PUNISHMENT"
                        ? "bg-red-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    <MinusIcon className="w-4 h-4 inline mr-1" />
                    Punishment
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExtraNilaiForm((prev) => ({
                        ...prev,
                        type: "POINPLUS",
                      }))
                    }
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      extraNilaiForm.type === "POINPLUS"
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    <PlusIcon className="w-4 h-4 inline mr-1" />
                    Poin Plus
                  </button>
                </div>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Penerapan
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExtraNilaiForm((prev) => ({
                        ...prev,
                        scope: "GENERAL",
                        assessmentCategoryId: "",
                      }))
                    }
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      extraNilaiForm.scope === "GENERAL"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    Total (Umum)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExtraNilaiForm((prev) => ({
                        ...prev,
                        scope: "CATEGORY",
                      }))
                    }
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      extraNilaiForm.scope === "CATEGORY"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    Per Kategori
                  </button>
                </div>
              </div>

              {/* Category Selection (if scope is CATEGORY) */}
              {extraNilaiForm.scope === "CATEGORY" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kategori Penilaian
                  </label>
                  <select
                    value={extraNilaiForm.assessmentCategoryId}
                    onChange={(e) =>
                      setExtraNilaiForm((prev) => ({
                        ...prev,
                        assessmentCategoryId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Pilih Kategori</option>
                    {recapData.categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Value Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nilai (
                  {extraNilaiForm.type === "PUNISHMENT"
                    ? "Pengurangan"
                    : "Penambahan"}
                  )
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={extraNilaiForm.value}
                  onChange={(e) =>
                    setExtraNilaiForm((prev) => ({
                      ...prev,
                      value: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alasan (Opsional)
                </label>
                <textarea
                  value={extraNilaiForm.reason}
                  onChange={(e) =>
                    setExtraNilaiForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Contoh: Pelanggaran aturan, bonus kreativitas, dll."
                />
              </div>

              {/* Existing Extra Nilai List */}
              {extraNilaiParticipant.extraNilai &&
                extraNilaiParticipant.extraNilai.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Extra Nilai yang Ada
                    </h4>
                    <div className="space-y-2">
                      {extraNilaiParticipant.extraNilai.map((en) => (
                        <div
                          key={en.id}
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            en.type === "PUNISHMENT"
                              ? "bg-red-50 dark:bg-red-900/20"
                              : "bg-green-50 dark:bg-green-900/20"
                          }`}
                        >
                          <div>
                            <span
                              className={`text-sm font-medium ${
                                en.type === "PUNISHMENT"
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-green-600 dark:text-green-400"
                              }`}
                            >
                              {en.type === "PUNISHMENT" ? "-" : "+"}
                              {en.value}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              {en.scope === "GENERAL"
                                ? "Total"
                                : recapData.categories.find(
                                    (c) => c.id === en.assessmentCategoryId,
                                  )?.name || "Kategori"}
                            </span>
                            {en.reason && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {en.reason}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteExtraNilai(en.id, e)}
                            className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Hapus"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={extraNilaiLoading || extraNilaiForm.value <= 0}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                    extraNilaiForm.type === "PUNISHMENT"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {extraNilaiLoading
                    ? "Menyimpan..."
                    : `Tambah ${extraNilaiForm.type === "PUNISHMENT" ? "Punishment" : "Poin Plus"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PanitiaEventRecap;

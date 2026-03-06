import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeftIcon,
  TrophyIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { api } from "../../utils/api";

interface AssessmentCategory {
  id: string;
  name: string;
  order: number;
}

interface JuaraRank {
  id?: string;
  startRank: number;
  endRank: number;
  label: string;
  order: number;
}

interface JuaraCategory {
  id?: string;
  type: "UTAMA" | "UMUM" | "CUSTOM";
  name: string;
  description: string;
  order: number;
  assessmentCategoryIds: string[];
  ranks: JuaraRank[];
}

interface EventInfo {
  id: string;
  title: string;
  slug: string;
  assessmentCategories: {
    assessmentCategory: AssessmentCategory;
  }[];
}

// Template Simpaskor untuk peringkat juara
const SIMPASKOR_RANK_TEMPLATE: JuaraRank[] = [
  { startRank: 1, endRank: 3, label: "Utama", order: 0 },
  { startRank: 4, endRank: 6, label: "Harapan", order: 1 },
  { startRank: 7, endRank: 9, label: "Madya", order: 2 },
  { startRank: 10, endRank: 12, label: "Bina", order: 3 },
  { startRank: 13, endRank: 15, label: "Mula", order: 4 },
  { startRank: 16, endRank: 18, label: "Purwa", order: 5 },
  { startRank: 19, endRank: 21, label: "Caraka", order: 6 },
  { startRank: 22, endRank: 24, label: "Wira", order: 7 },
  { startRank: 25, endRank: 27, label: "Perintis", order: 8 },
  { startRank: 28, endRank: 30, label: "Potensial", order: 9 },
  { startRank: 31, endRank: 33, label: "Pemula", order: 10 },
];

const ManageJuara: React.FC = () => {
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
  const [saving, setSaving] = useState(false);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [assessmentCategories, setAssessmentCategories] = useState<AssessmentCategory[]>([]);
  const [juaraCategories, setJuaraCategories] = useState<JuaraCategory[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (eventSlug) {
      checkAssignmentAndFetch();
    }
  }, [eventSlug]);

  const checkAssignmentAndFetch = async () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem(storageKey);

      if (!stored && !isAdminRoute) {
        navigate(dashboardPath, { replace: true });
        return;
      }

      if (stored) {
        const eventData = JSON.parse(stored);
        if (eventData.slug !== eventSlug) {
          localStorage.setItem(
            storageKey,
            JSON.stringify({ slug: eventSlug, title: "", id: "" })
          );
        }
      }

      await Promise.all([fetchEventInfo(), fetchJuaraCategories()]);
    } catch (err) {
      console.error("Error checking assignment:", err);
      localStorage.removeItem(storageKey);
      navigate(dashboardPath, { replace: true });
    }
  };

  const fetchEventInfo = async () => {
    try {
      const response = await api.get(`/events/${eventSlug}`);
      setEventInfo(response.data);
      
      // Extract assessment categories
      const categories = response.data.assessmentCategories
        ?.map((ac: any) => ac.assessmentCategory)
        .sort((a: AssessmentCategory, b: AssessmentCategory) => a.order - b.order) || [];
      setAssessmentCategories(categories);
    } catch (err) {
      console.error("Error fetching event info:", err);
    }
  };

  const fetchJuaraCategories = async () => {
    try {
      const response = await api.get(`/juara-categories/event/${eventSlug}`);
      
      if (response.data.length === 0) {
        // Initialize with default categories and ranks
        const defaultRanks: JuaraRank[] = [
          { startRank: 1, endRank: 3, label: "Juara Utama", order: 0 },
          { startRank: 4, endRank: 6, label: "Juara Harapan", order: 1 },
          { startRank: 7, endRank: 9, label: "Juara Madya", order: 2 },
        ];
        setJuaraCategories([
          {
            type: "UTAMA",
            name: "Juara Utama",
            description: "Kategori penilaian utama untuk menentukan juara",
            order: 0,
            assessmentCategoryIds: [],
            ranks: [...defaultRanks],
          },
          {
            type: "UMUM",
            name: "Juara Umum",
            description: "Semua kategori penilaian digabungkan",
            order: 1,
            assessmentCategoryIds: [],
            ranks: [...defaultRanks],
          },
        ]);
      } else {
        // Ensure ranks array exists for each category
        setJuaraCategories(response.data.map((cat: JuaraCategory) => ({
          ...cat,
          ranks: cat.ranks || [],
        })));
      }
    } catch (err) {
      console.error("Error fetching juara categories:", err);
      // Initialize with default
      const defaultRanks: JuaraRank[] = [
        { startRank: 1, endRank: 3, label: "Juara Utama", order: 0 },
        { startRank: 4, endRank: 6, label: "Juara Harapan", order: 1 },
        { startRank: 7, endRank: 9, label: "Juara Madya", order: 2 },
      ];
      setJuaraCategories([
        {
          type: "UTAMA",
          name: "Juara Utama",
          description: "Kategori penilaian utama untuk menentukan juara",
          order: 0,
          assessmentCategoryIds: [],
          ranks: [...defaultRanks],
        },
        {
          type: "UMUM",
          name: "Juara Umum",
          description: "Semua kategori penilaian digabungkan",
          order: 1,
          assessmentCategoryIds: [],
          ranks: [...defaultRanks],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleAssessmentCategory = (juaraIndex: number, categoryId: string) => {
    const newCategories = [...juaraCategories];
    const juara = newCategories[juaraIndex];
    if (!juara) return;
    
    if (juara.assessmentCategoryIds.includes(categoryId)) {
      juara.assessmentCategoryIds = juara.assessmentCategoryIds.filter(id => id !== categoryId);
    } else {
      juara.assessmentCategoryIds.push(categoryId);
    }
    
    setJuaraCategories(newCategories);
    setHasChanges(true);
  };

  const selectAllCategories = (juaraIndex: number) => {
    const newCategories = [...juaraCategories];
    const juara = newCategories[juaraIndex];
    if (!juara) return;
    juara.assessmentCategoryIds = assessmentCategories.map(c => c.id);
    setJuaraCategories(newCategories);
    setHasChanges(true);
  };

  const deselectAllCategories = (juaraIndex: number) => {
    const newCategories = [...juaraCategories];
    const juara = newCategories[juaraIndex];
    if (!juara) return;
    juara.assessmentCategoryIds = [];
    setJuaraCategories(newCategories);
    setHasChanges(true);
  };

  const updateJuaraName = (juaraIndex: number, name: string) => {
    const newCategories = [...juaraCategories];
    const juara = newCategories[juaraIndex];
    if (!juara) return;
    juara.name = name;
    setJuaraCategories(newCategories);
    setHasChanges(true);
  };

  const updateJuaraDescription = (juaraIndex: number, description: string) => {
    const newCategories = [...juaraCategories];
    const juara = newCategories[juaraIndex];
    if (!juara) return;
    juara.description = description;
    setJuaraCategories(newCategories);
    setHasChanges(true);
  };

  const addCustomCategory = () => {
    const customCount = juaraCategories.filter(j => j.type === "CUSTOM").length;

    const defaultRanks: JuaraRank[] = [
      { startRank: 1, endRank: 3, label: "Juara 1", order: 0 },
    ];

    setJuaraCategories([
      ...juaraCategories,
      {
        type: "CUSTOM",
        name: `Custom ${customCount + 1}`,
        description: "",
        order: juaraCategories.length,
        assessmentCategoryIds: [],
        ranks: defaultRanks,
      },
    ]);
    setHasChanges(true);
  };

  const removeCustomCategory = (index: number) => {
    const juara = juaraCategories[index];
    if (!juara || juara.type !== "CUSTOM") return;
    
    const newCategories = juaraCategories.filter((_, i) => i !== index);
    setJuaraCategories(newCategories);
    setHasChanges(true);
  };

  // Rank management functions
  const addRank = (juaraIndex: number) => {
    const newCategories = [...juaraCategories];
    const juara = newCategories[juaraIndex];
    if (!juara) return;

    // Calculate next rank range based on existing ranks
    const existingRanks = juara.ranks || [];
    let startRank = 1;
    let endRank = 3;
    
    if (existingRanks.length > 0) {
      const lastRank = existingRanks[existingRanks.length - 1];
      if (lastRank) {
        startRank = lastRank.endRank + 1;
        endRank = startRank + 2;
      }
    }

    juara.ranks = [
      ...existingRanks,
      {
        startRank,
        endRank,
        label: `Peringkat ${existingRanks.length + 1}`,
        order: existingRanks.length,
      },
    ];
    
    setJuaraCategories(newCategories);
    setHasChanges(true);
  };

  const removeRank = (juaraIndex: number, rankIndex: number) => {
    const newCategories = [...juaraCategories];
    const juara = newCategories[juaraIndex];
    if (!juara || !juara.ranks) return;

    juara.ranks = juara.ranks.filter((_, i) => i !== rankIndex);
    // Re-order remaining ranks
    juara.ranks = juara.ranks.map((r, i) => ({ ...r, order: i }));
    
    setJuaraCategories(newCategories);
    setHasChanges(true);
  };

  const updateRank = (
    juaraIndex: number,
    rankIndex: number,
    field: "startRank" | "endRank" | "label",
    value: string | number
  ) => {
    const newCategories = [...juaraCategories];
    const juara = newCategories[juaraIndex];
    if (!juara || !juara.ranks || !juara.ranks[rankIndex]) return;

    if (field === "label") {
      juara.ranks[rankIndex].label = value as string;
    } else {
      juara.ranks[rankIndex][field] = Number(value);
    }
    
    setJuaraCategories(newCategories);
    setHasChanges(true);
  };

  // Apply Simpaskor template to a juara category
  const applySimpaskorTemplate = (juaraIndex: number) => {
    const newCategories = [...juaraCategories];
    const juara = newCategories[juaraIndex];
    if (!juara) return;

    juara.ranks = SIMPASKOR_RANK_TEMPLATE.map((r) => ({ ...r }));
    setJuaraCategories(newCategories);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!eventInfo) return;

    // Validate
    for (const juara of juaraCategories) {
      if (!juara.name.trim()) {
        Swal.fire({
          icon: "error",
          title: "Validasi Gagal",
          text: "Nama kategori juara tidak boleh kosong",
        });
        return;
      }
      if (juara.assessmentCategoryIds.length === 0) {
        Swal.fire({
          icon: "error",
          title: "Validasi Gagal",
          text: `Pilih minimal 1 kategori penilaian untuk "${juara.name}"`,
        });
        return;
      }
    }

    try {
      setSaving(true);
      await api.post(`/juara-categories/event/${eventSlug}/bulk`, {
        categories: juaraCategories.map((j, idx) => ({
          ...j,
          order: idx,
        })),
      });

      setHasChanges(false);
      
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Kategori juara berhasil disimpan",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error saving juara categories:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal Menyimpan",
        text: "Terjadi kesalahan saat menyimpan kategori juara",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryTypeLabel = (type: JuaraCategory["type"]) => {
    switch (type) {
      case "UTAMA":
        return { label: "Juara Utama", color: "bg-indigo-600" };
      case "UMUM":
        return { label: "Juara Umum", color: "bg-purple-600" };
      case "CUSTOM":
        return { label: "Custom", color: "bg-teal-600" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            to={`${basePath}/events/${eventSlug}/manage`}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Kembali ke Kelola Event
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <TrophyIcon className="w-7 h-7 mr-2 text-indigo-600" />
                Pengaturan Kategori Juara
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {eventInfo?.title}
              </p>
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`inline-flex items-center px-5 py-2.5 rounded-lg font-medium transition-colors ${
                hasChanges
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5 mr-2" />
                  Simpan Pengaturan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>ℹ️ Informasi:</strong> Kategori juara menentukan bagaimana pemeringkatan dihitung.
            <br />• <strong>Juara Utama</strong> - Kategori inti untuk menentukan juara utama
            <br />• <strong>Juara Umum</strong> - Semua kategori digabung untuk ranking keseluruhan
            <br />• <strong>Custom</strong> - Tambah kategori sesuai kebutuhan
            <br />• <strong>Peringkat</strong> - Atur label berdasarkan posisi ranking
            <br />• <strong>Template Simpaskor</strong> - Gunakan template 11 tingkatan: Utama, Harapan, Madya, Bina, Mula, Purwa, Caraka, Wira, Perintis, Potensial, Pemula
          </p>
        </div>

        {/* Juara Categories */}
        <div className="space-y-6">
          {juaraCategories.map((juara, index) => {
            const typeInfo = getCategoryTypeLabel(juara.type);
            return (
              <div
                key={juara.id || `${juara.type}-${index}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
              >
                {/* Category Header */}
                <div className={`${typeInfo.color} px-4 py-3 flex items-center justify-between`}>
                  <div className="flex items-center">
                    <TrophyIcon className="w-5 h-5 text-white mr-2" />
                    <span className="text-white font-semibold">{typeInfo.label}</span>
                  </div>
                  {juara.type === "CUSTOM" && (
                    <button
                      onClick={() => removeCustomCategory(index)}
                      className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded transition-colors"
                      title="Hapus kategori"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Category Content */}
                <div className="p-4 space-y-4">
                  {/* Name & Description */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nama Kategori Juara
                      </label>
                      <input
                        type="text"
                        value={juara.name}
                        onChange={(e) => updateJuaraName(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="Nama kategori"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Deskripsi (Opsional)
                      </label>
                      <input
                        type="text"
                        value={juara.description}
                        onChange={(e) => updateJuaraDescription(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="Deskripsi singkat"
                      />
                    </div>
                  </div>

                  {/* Assessment Categories Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Pilih Kategori Penilaian
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => selectAllCategories(index)}
                          className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 rounded transition-colors"
                        >
                          Pilih Semua
                        </button>
                        <button
                          onClick={() => deselectAllCategories(index)}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                          Hapus Semua
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {assessmentCategories.map((category) => {
                        const isSelected = juara.assessmentCategoryIds.includes(category.id);
                        return (
                          <button
                            key={category.id}
                            onClick={() => toggleAssessmentCategory(index, category.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                          >
                            {isSelected && <CheckIcon className="w-4 h-4 inline mr-1" />}
                            {category.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Count */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {juara.assessmentCategoryIds.length} dari {assessmentCategories.length} kategori dipilih
                    </p>
                  </div>

                  {/* Rank Configuration */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Pengaturan Peringkat
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => applySimpaskorTemplate(index)}
                          className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 rounded transition-colors flex items-center gap-1"
                          title="Gunakan template Simpaskor (11 tingkatan)"
                        >
                          <TrophyIcon className="w-3 h-3" />
                          Template Simpaskor
                        </button>
                        <button
                          onClick={() => addRank(index)}
                          className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900 rounded transition-colors flex items-center gap-1"
                        >
                          <PlusIcon className="w-3 h-3" />
                          Tambah Peringkat
                        </button>
                      </div>
                    </div>

                    {(!juara.ranks || juara.ranks.length === 0) ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        Belum ada konfigurasi peringkat. Klik "Tambah Peringkat" untuk menambahkan.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {juara.ranks.map((rank, rankIndex) => (
                          <div
                            key={rank.id || `rank-${rankIndex}`}
                            className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                          >
                            {/* Rank Range */}
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400 w-12">Rank</span>
                              <input
                                type="number"
                                min="1"
                                value={rank.startRank}
                                onChange={(e) => updateRank(index, rankIndex, "startRank", e.target.value)}
                                className="w-14 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                              />
                              <span className="text-gray-500 dark:text-gray-400">-</span>
                              <input
                                type="number"
                                min="1"
                                value={rank.endRank}
                                onChange={(e) => updateRank(index, rankIndex, "endRank", e.target.value)}
                                className="w-14 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                              />
                            </div>

                            {/* Arrow */}
                            <span className="text-gray-400 dark:text-gray-500 mx-2">→</span>

                            {/* Label */}
                            <input
                              type="text"
                              value={rank.label}
                              onChange={(e) => updateRank(index, rankIndex, "label", e.target.value)}
                              className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="Label peringkat"
                            />

                            {/* Delete Button */}
                            <button
                              onClick={() => removeRank(index, rankIndex)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                              title="Hapus peringkat"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rank Preview */}
                    {juara.ranks && juara.ranks.length > 0 && (
                      <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium mb-2">
                          Preview Hasil Peringkat:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {juara.ranks.map((rank, rankIndex) => {
                            const rankLabels = [];
                            for (let i = rank.startRank; i <= rank.endRank; i++) {
                              const subRank = i - rank.startRank + 1;
                              rankLabels.push(
                                <span
                                  key={`${rankIndex}-${i}`}
                                  className="inline-block px-2 py-0.5 text-xs bg-white dark:bg-gray-800 rounded border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                                >
                                  #{i}: {rank.label} {subRank}
                                </span>
                              );
                            }
                            return rankLabels;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Custom Button */}
        <div className="mt-6">
          <button
            onClick={addCustomCategory}
            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors flex items-center justify-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Tambah Kategori Juara Custom
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageJuara;

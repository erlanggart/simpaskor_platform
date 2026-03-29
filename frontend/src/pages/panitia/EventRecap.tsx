import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowPathIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
  XMarkIcon,
  PlusIcon,
  DocumentArrowDownIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from "../../utils/api";
import ParticipantDetailModal from "../../components/panitia/ParticipantDetailModal";
import ExtraNilaiModal from "../../components/panitia/ExtraNilaiModal";

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
  scope: "GENERAL" | "CATEGORY" | "JUARA";
  assessmentCategoryId: string | null;
  juaraCategoryId: string | null;
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

interface VerificationIssue {
  type: "duplicate" | "missing" | "mismatch" | "material_excess" | "score_exceeds_max";
  severity: "error" | "warning";
  participantName: string;
  participantId: string;
  category?: string;
  juryId?: string;
  juryName?: string;
  eventCategoryId?: string;
  message: string;
  fixAction?: "delete_jury_category" | "recalculate" | "none";
  fixed?: boolean;
}

interface VerificationResult {
  totalIssues: number;
  duplicates: VerificationIssue[];
  missing: VerificationIssue[];
  mismatches: VerificationIssue[];
  materialIssues: VerificationIssue[];
  isClean: boolean;
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

  // Tab state for school categories
  const [activeSchoolCategoryTab, setActiveSchoolCategoryTab] = useState<string | null>(null);

  // Extra Nilai states
  const [showExtraNilaiModal, setShowExtraNilaiModal] = useState(false);
  const [extraNilaiParticipant, setExtraNilaiParticipant] =
    useState<RecapItem | null>(null);

  // Juara category states
  const [juaraCategories, setJuaraCategories] = useState<JuaraCategory[]>([]);
  const [selectedJuaraPreset, setSelectedJuaraPreset] = useState<string | null>(null);

  // Reorder state: maps schoolCategoryId -> ordered participant IDs
  const [manualOrder, setManualOrder] = useState<Record<string, string[]>>({});

  // Verification states
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFixing, setIsFixing] = useState<string | null>(null);

  // Track if categories have been initialized (to avoid resetting on refresh)
  const categoriesInitialized = useRef(false);

  useEffect(() => {
    if (eventSlug) {
      checkAssignmentAndFetch();
      fetchJuaraCategories();
    }
  }, [eventSlug]);

  useEffect(() => {
    // Initialize selected categories only on first data load
    if (recapData?.categories && !categoriesInitialized.current) {
      setSelectedCategories(new Set(recapData.categories.map((c) => c.id)));
      categoriesInitialized.current = true;
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
    // Clear manual order when changing juara preset
    setManualOrder({});
  };

  // Move participant up or down in the ranking
  const handleMoveParticipant = (index: number, direction: 'up' | 'down') => {
    const activeGroup = getActiveSchoolCategoryGroup();
    if (!activeGroup) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeGroup.participants.length) return;

    const groupId = activeGroup.id;
    const currentParticipants = [...activeGroup.participants];
    const temp = currentParticipants[index]!;
    currentParticipants[index] = currentParticipants[targetIndex]!;
    currentParticipants[targetIndex] = temp;

    setManualOrder((prev) => ({
      ...prev,
      [groupId]: currentParticipants.map((p) => p.participant.id),
    }));
  };

  // Compute rank position considering ties (same score = same rank)
  const getRankPosition = (participants: RecapItem[], index: number): number => {
    if (index === 0) return 1;
    const currentScore = getFilteredTotal(participants[index]!);
    let rank = 1;
    for (let i = 0; i < index; i++) {
      const prevScore = getFilteredTotal(participants[i]!);
      if (prevScore !== currentScore) {
        rank = i + 1;
      }
    }
    // If current score differs from the one right before, rank = index + 1
    const prevScore = getFilteredTotal(participants[index - 1]!);
    if (prevScore !== currentScore) {
      rank = index + 1;
    }
    return rank;
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

  // Get rank label based on position and juara ranks configuration
  const getRankLabel = (position: number, ranks: JuaraRank[]): string => {
    if (!ranks || ranks.length === 0) return `#${position}`;
    
    for (const rank of ranks) {
      if (position >= rank.startRank && position <= rank.endRank) {
        // Calculate sub-rank (e.g., Utama 1, Utama 2, Utama 3)
        const subRank = position - rank.startRank + 1;
        return `${rank.label} ${subRank}`;
      }
    }
    // Position is beyond configured ranks
    return `#${position}`;
  };

  // Get the currently selected juara category (for rank display)
  const getSelectedJuara = (): JuaraCategory | null => {
    if (!selectedJuaraPreset) return null;
    return juaraCategories.find(j => j.id === selectedJuaraPreset) || null;
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

    // Sort participants within each group
    Object.values(groups).forEach((group) => {
      const groupId = group.id;
      const existingManualOrder = manualOrder[groupId];

      if (selectedJuaraPreset && existingManualOrder && existingManualOrder.length > 0) {
        // Manual drag-drop order takes priority
        group.participants.sort((a, b) => {
          const idxA = existingManualOrder.indexOf(a.participant.id);
          const idxB = existingManualOrder.indexOf(b.participant.id);
          // Items not in manual order go to the end
          return (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB);
        });
      } else if (selectedJuaraPreset) {
        // When juara preset is selected, sort by total score (highest first) with stable tiebreaker
        group.participants.sort((a, b) => {
          const totalA = getFilteredTotal(a);
          const totalB = getFilteredTotal(b);
          if (totalB !== totalA) return totalB - totalA; // Descending by score
          // Tiebreaker: orderNumber ascending, then team name alphabetically
          const orderA = a.participant.orderNumber ?? 9999;
          const orderB = b.participant.orderNumber ?? 9999;
          if (orderA !== orderB) return orderA - orderB;
          return a.participant.teamName.localeCompare(b.participant.teamName);
        });
      } else {
        // Default: sort by orderNumber
        group.participants.sort((a, b) => {
          const orderA = a.participant.orderNumber ?? 9999;
          const orderB = b.participant.orderNumber ?? 9999;
          return orderA - orderB;
        });
      }
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
    let total = categoryTotal;
    // Add general extra adjustment only if extra nilai is shown AND general extra nilai is enabled
    if (showExtraNilai && applyGeneralExtraNilai) {
      const generalAdjustment = item.generalExtraAdjustment || 0;
      total += generalAdjustment;
    }
    // Add juara-scoped extra nilai if a juara preset is selected
    if (showExtraNilai && selectedJuaraPreset && item.extraNilai) {
      const juaraAdjustment = item.extraNilai
        .filter((en) => en.scope === "JUARA" && en.juaraCategoryId === selectedJuaraPreset)
        .reduce((sum, en) => sum + (en.type === "PUNISHMENT" ? -en.value : en.value), 0);
      total += juaraAdjustment;
    }
    return total;
  };

  // Extra Nilai functions
  const openExtraNilaiModal = (participant: RecapItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setExtraNilaiParticipant(participant);
    setShowExtraNilaiModal(true);
  };

  const closeExtraNilaiModal = () => {
    setShowExtraNilaiModal(false);
    setExtraNilaiParticipant(null);
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
      if (en.scope === "JUARA" && selectedJuaraPreset) {
        // Only include if the juara category matches current preset
        return en.juaraCategoryId === selectedJuaraPreset;
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

  // Get current active school category group
  const getActiveSchoolCategoryGroup = (): SchoolCategoryGroup | null => {
    const groups = getSchoolCategoryGroups();
    if (groups.length === 0) return null;
    
    if (activeSchoolCategoryTab) {
      const found = groups.find(g => g.id === activeSchoolCategoryTab);
      if (found) return found;
    }
    
    // Default to first group
    return groups[0] || null;
  };

  // Verification function
  const runVerification = async () => {
    if (!recapData) return;

    setIsVerifying(true);

    const duplicates: VerificationIssue[] = [];
    const missing: VerificationIssue[] = [];
    const mismatches: VerificationIssue[] = [];
    const materialIssues: VerificationIssue[] = [];

    // Build jury-to-category assignment map
    const juryAssignments = new Map<string, Set<string>>();
    recapData.juries.forEach((jury) => {
      juryAssignments.set(jury.id, new Set(jury.assignedCategories));
    });

    for (const item of recapData.recap) {
      const pName = item.participant.teamName;
      const pId = item.participant.id;

      for (const catScore of item.categoryScores) {
        // 1. Check for MISSING scores: jury assigned to category but score is null
        for (const jury of recapData.juries) {
          const assignedCats = juryAssignments.get(jury.id);
          if (assignedCats && assignedCats.has(catScore.categoryId)) {
            const juryScore = catScore.scores.find((s) => s.juryId === jury.id);
            if (!juryScore || juryScore.score === null) {
              missing.push({
                type: "missing",
                severity: "warning",
                participantName: pName,
                participantId: pId,
                category: catScore.categoryName,
                juryName: jury.name,
                message: `Juri "${jury.name}" belum memberikan nilai untuk kategori "${catScore.categoryName}"`,
              });
            }
          }
        }

        // 2. Check for DUPLICATE scores: identical scores from different juries (suspicious)
        const validScores = catScore.scores.filter((s) => s.score !== null);
        if (validScores.length >= 2) {
          const scoreMap = new Map<number, string[]>();
          for (const s of validScores) {
            const key = s.score!;
            if (!scoreMap.has(key)) scoreMap.set(key, []);
            scoreMap.get(key)!.push(s.juryName);
          }
          for (const [score, juryNames] of scoreMap) {
            if (juryNames.length >= 2) {
              duplicates.push({
                type: "duplicate",
                severity: "warning",
                participantName: pName,
                participantId: pId,
                category: catScore.categoryName,
                message: `${juryNames.length} juri (${juryNames.join(", ")}) memberikan nilai sama (${score}) pada kategori "${catScore.categoryName}"`,
              });
            }
          }
        }

        // 3. Check for MISMATCH: totalScore != sum of individual jury scores + extraAdjustment
        const sumOfScores = validScores.reduce((sum, s) => sum + (s.score || 0), 0);
        const extraAdj = catScore.extraAdjustment || 0;
        const expectedTotal = sumOfScores + extraAdj;
        const diff = Math.abs(catScore.totalScore - expectedTotal);
        if (diff > 0.01) {
          mismatches.push({
            type: "mismatch",
            severity: "error",
            participantName: pName,
            participantId: pId,
            category: catScore.categoryName,
            message: `Total kategori "${catScore.categoryName}" tidak sesuai: tercatat ${catScore.totalScore.toFixed(1)}, seharusnya ${expectedTotal.toFixed(1)} (selisih: ${diff.toFixed(1)})`,
          });
        }

        // 4. Check for score exceeding maxScore (possible material duplication)
        for (const s of validScores) {
          if (s.score !== null && s.score > s.maxScore) {
            materialIssues.push({
              type: "score_exceeds_max",
              severity: "error",
              participantName: pName,
              participantId: pId,
              category: catScore.categoryName,
              juryName: s.juryName,
              message: `Nilai juri "${s.juryName}" (${s.score}) melebihi batas maksimum (${s.maxScore}) di kategori "${catScore.categoryName}" — kemungkinan nilai materi terhitung ganda!`,
            });
          }
        }

        // 5. Check inconsistent scoredMaterials count between juries
        const scoredMaterialCounts = validScores
          .filter((s) => s.scoredMaterials !== undefined && s.scoredMaterials !== null)
          .map((s) => ({ juryName: s.juryName, count: s.scoredMaterials! }));
        if (scoredMaterialCounts.length >= 2) {
          const counts = scoredMaterialCounts.map((s) => s.count);
          const maxCount = Math.max(...counts);
          const minCount = Math.min(...counts);
          if (maxCount !== minCount) {
            materialIssues.push({
              type: "material_excess",
              severity: "warning",
              participantName: pName,
              participantId: pId,
              category: catScore.categoryName,
              message: `Jumlah materi yang dinilai tidak konsisten di kategori "${catScore.categoryName}": ${scoredMaterialCounts.map((s) => `${s.juryName} (${s.count})`).join(", ")}`,
            });
          }
        }
      }

      // 6. Check grand total mismatch
      const expectedGrandTotal = item.categoryScores.reduce(
        (sum, cs) => sum + cs.totalScore,
        0
      ) + (item.generalExtraAdjustment || 0);
      const grandDiff = Math.abs(item.grandTotal - expectedGrandTotal);
      if (grandDiff > 0.01) {
        mismatches.push({
          type: "mismatch",
          severity: "error",
          participantName: pName,
          participantId: pId,
          message: `Grand total tidak sesuai: tercatat ${item.grandTotal.toFixed(1)}, seharusnya ${expectedGrandTotal.toFixed(1)} (selisih: ${grandDiff.toFixed(1)})`,
        });
      }
    }

    // 7. Deep backend verification: check material-level duplicates in database
    try {
      const backendRes = await api.get(`/evaluations/event/${eventSlug}/verify`);
      const backendData = backendRes.data;
      if (backendData.issues && Array.isArray(backendData.issues)) {
        for (const issue of backendData.issues) {
          if (issue.type === "material_excess" || issue.type === "material_duplicate") {
            materialIssues.push({
              type: "material_excess",
              severity: "error",
              participantName: issue.participantName,
              participantId: issue.participantId,
              category: issue.category,
              juryId: issue.juryId,
              juryName: issue.juryName,
              eventCategoryId: issue.eventCategoryId,
              message: issue.message,
              fixAction: issue.fixAction || "delete_jury_category",
            });
          } else if (issue.type === "score_exceeds_max") {
            // Only add if not already caught by frontend check
            const alreadyExists = materialIssues.some(
              (mi) =>
                mi.participantId === issue.participantId &&
                mi.category === issue.category &&
                mi.juryName === issue.juryName &&
                mi.type === "score_exceeds_max"
            );
            if (!alreadyExists) {
              materialIssues.push({
                type: "score_exceeds_max",
                severity: "error",
                participantName: issue.participantName,
                participantId: issue.participantId,
                category: issue.category,
                juryId: issue.juryId,
                juryName: issue.juryName,
                eventCategoryId: issue.eventCategoryId,
                message: issue.message,
                fixAction: issue.fixAction || "delete_jury_category",
              });
            }
          } else if (issue.type === "missing_score") {
            const alreadyExists = missing.some(
              (mi) =>
                mi.participantId === issue.participantId &&
                mi.category === issue.category &&
                mi.juryName === issue.juryName
            );
            if (!alreadyExists) {
              missing.push({
                type: "missing",
                severity: "warning",
                participantName: issue.participantName,
                participantId: issue.participantId,
                category: issue.category,
                juryId: issue.juryId,
                juryName: issue.juryName,
                eventCategoryId: issue.eventCategoryId,
                message: issue.message,
                fixAction: "none",
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Backend verification failed, using frontend-only results:", err);
    }

    const result: VerificationResult = {
      totalIssues: duplicates.length + missing.length + mismatches.length + materialIssues.length,
      duplicates,
      missing,
      mismatches,
      materialIssues,
      isClean: duplicates.length === 0 && missing.length === 0 && mismatches.length === 0 && materialIssues.length === 0,
    };

    setVerificationResult(result);
    setShowVerificationModal(true);
    setIsVerifying(false);
  };

  // Fix a single verification issue
  const fixIssue = async (issue: VerificationIssue, issueIndex: number, listKey: "materialIssues" | "mismatches" | "missing" | "duplicates") => {
    if (!eventSlug || !issue.fixAction || issue.fixAction === "none" || issue.fixed) return;

    const fixId = `${listKey}-${issueIndex}`;
    setIsFixing(fixId);

    try {
      await api.post(`/evaluations/event/${eventSlug}/verify/fix`, {
        action: issue.fixAction,
        participantId: issue.participantId,
        juryId: issue.juryId,
        eventCategoryId: issue.eventCategoryId,
      });

      // Mark issue as fixed in UI
      setVerificationResult((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        const list = [...updated[listKey]];
        const existing = list[issueIndex];
        if (existing) list[issueIndex] = { ...existing, fixed: true };
        updated[listKey] = list;
        updated.totalIssues = [
          ...updated.materialIssues,
          ...updated.mismatches,
          ...updated.missing,
          ...updated.duplicates,
        ].filter((i) => !i.fixed).length;
        return updated;
      });
    } catch (err) {
      console.error("Fix failed:", err);
      alert("Gagal memperbaiki masalah. Silakan coba lagi.");
    } finally {
      setIsFixing(null);
    }
  };

  // Fix all fixable issues at once
  const fixAllIssues = async () => {
    if (!verificationResult || !eventSlug) return;

    const allFixable: Array<{ issue: VerificationIssue; index: number; listKey: "materialIssues" | "mismatches" | "missing" | "duplicates" }> = [];

    (["materialIssues", "mismatches"] as const).forEach((key) => {
      verificationResult[key].forEach((issue, i) => {
        if (issue.fixAction && issue.fixAction !== "none" && !issue.fixed) {
          allFixable.push({ issue, index: i, listKey: key });
        }
      });
    });

    if (allFixable.length === 0) return;

    if (!confirm(`Akan memperbaiki ${allFixable.length} masalah secara otomatis. Lanjutkan?`)) return;

    setIsFixing("all");

    for (const item of allFixable) {
      try {
        await api.post(`/evaluations/event/${eventSlug}/verify/fix`, {
          action: item.issue.fixAction,
          participantId: item.issue.participantId,
          juryId: item.issue.juryId,
          eventCategoryId: item.issue.eventCategoryId,
        });

        // Mark individual issue as fixed
        setVerificationResult((prev) => {
          if (!prev) return prev;
          const updated = { ...prev };
          const list = [...updated[item.listKey]];
          const existing = list[item.index];
          if (existing) list[item.index] = { ...existing, fixed: true };
          updated[item.listKey] = list;
          return updated;
        });
      } catch (err) {
        console.error(`Fix failed for ${item.listKey}[${item.index}]:`, err);
      }
    }

    // Recalculate total
    setVerificationResult((prev) => {
      if (!prev) return prev;
      const remaining = [
        ...prev.materialIssues,
        ...prev.mismatches,
        ...prev.missing,
        ...prev.duplicates,
      ].filter((i) => !i.fixed).length;
      return { ...prev, totalIssues: remaining };
    });

    setIsFixing(null);
    // Refresh recap data
    fetchRecap();
  };

  // Export functions
  const exportToExcel = () => {
    if (!recapData) return;
    
    const activeGroup = getActiveSchoolCategoryGroup();
    if (!activeGroup) return;

    const categories = getFilteredCategories();
    
    // Build header row
    const headers = [
      "No",
      "Nama Peserta",
      "Nomor Urut",
      ...categories.map(c => c.name),
    ];
    
    if (showExtraNilai) {
      headers.push("Punishment (-)", "Poin Plus (+)");
    }
    headers.push("Total");
    
    if (selectedJuaraPreset) {
      headers.push("Peringkat");
    }
    
    // Build data rows
    const rows = activeGroup.participants.map((item, index) => {
      const extraSummary = getExtraNilaiSummary(item);
      // Combine team name and institution
      const nameWithInstitution = item.participant.registrant.institution
        ? `${item.participant.teamName} - ${item.participant.registrant.institution}`
        : item.participant.teamName;
      const row: (string | number)[] = [
        index + 1,
        nameWithInstitution,
        item.participant.orderNumber || "-",
        ...categories.map(cat => getCategoryScore(item, cat.id).toFixed(1)),
      ];
      
      if (showExtraNilai) {
        row.push(
          extraSummary.punishment > 0 ? `-${extraSummary.punishment.toFixed(1)}` : "-",
          extraSummary.poinplus > 0 ? `+${extraSummary.poinplus.toFixed(1)}` : "-"
        );
      }
      row.push(getFilteredTotal(item).toFixed(1));
      
      if (selectedJuaraPreset && selectedJuara) {
        const rankPos = manualOrder[activeGroup.id] ? index + 1 : getRankPosition(activeGroup.participants, index);
        row.push(getRankLabel(rankPos, selectedJuara.ranks));
      }
      
      return row;
    });
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Set column widths
    ws["!cols"] = [
      { wch: 5 },   // No
      { wch: 45 },  // Nama + Instansi
      { wch: 12 },  // Nomor Urut
      ...categories.map(() => ({ wch: 15 })),
      ...(showExtraNilai ? [{ wch: 12 }, { wch: 12 }] : []),
      { wch: 12 }, // Total
      ...(selectedJuaraPreset ? [{ wch: 15 }] : []), // Peringkat
    ];
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeGroup.name.substring(0, 31));
    
    // Generate filename
    const filename = `Rekap_${recapData.event.title}_${activeGroup.name}_${new Date().toISOString().split("T")[0]}.xlsx`;
    
    // Download
    XLSX.writeFile(wb, filename);
  };

  const exportToPDF = async () => {
    if (!recapData) return;
    
    const activeGroup = getActiveSchoolCategoryGroup();
    if (!activeGroup) return;

    const categories = getFilteredCategories();
    
    // Load and compress logo image
    const loadImage = (url: string, maxSize: number = 100, quality: number = 0.7): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // Scale down to maxSize while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          // Use JPEG with compression for smaller file size
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = url;
      });
    };

    // Create PDF
    const doc = new jsPDF({
      orientation: categories.length > 3 ? "landscape" : "portrait",
      unit: "mm",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Red color theme (matching Simpaskor logo)
    const primaryRed: [number, number, number] = [220, 38, 38]; // #DC2626
    const darkRed: [number, number, number] = [185, 28, 28]; // #B91C1C
    
    try {
      // Add logo - use webp source, compress to 100px max, 70% quality JPEG
      const logoBase64 = await loadImage("/simpaskor.webp", 100, 0.7);
      doc.addImage(logoBase64, "JPEG", 14, 8, 20, 20);
    } catch {
      // Logo failed to load, continue without it
      console.warn("Failed to load logo for PDF");
    }
    
    // Title section (next to logo)
    doc.setFontSize(18);
    doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.setFont("helvetica", "bold");
    doc.text("REKAP NILAI PESERTA", 38, 15);
    
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.text(recapData.event.title, 38, 21);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Kategori Sekolah: ${activeGroup.name}`, 38, 27);
    if (selectedJuara) {
      doc.text(`Kategori Juara: ${selectedJuara.name}`, 38, 32);
    }
    
    // Add date on the right side
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const dateStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    doc.text(`Dicetak: ${dateStr}`, pageWidth - 14, 15, { align: "right" });
    
    // Horizontal line separator
    doc.setDrawColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.setLineWidth(0.8);
    doc.line(14, 35, pageWidth - 14, 35);
    
    // Build header row
    const headers = [
      "No",
      "Nama Peserta",
      "No. Urut",
      ...categories.map(c => c.name),
    ];
    
    if (showExtraNilai) {
      headers.push("-", "+");
    }
    headers.push("Total");
    
    if (selectedJuaraPreset) {
      headers.push("Peringkat");
    }
    
    // Build data rows
    const rows = activeGroup.participants.map((item, index) => {
      const extraSummary = getExtraNilaiSummary(item);
      // Combine team name and institution
      const nameWithInstitution = item.participant.registrant.institution
        ? `${item.participant.teamName} - ${item.participant.registrant.institution}`
        : item.participant.teamName;
      const row: (string | number)[] = [
        index + 1,
        nameWithInstitution,
        item.participant.orderNumber || "-",
        ...categories.map(cat => getCategoryScore(item, cat.id).toFixed(1)),
      ];
      
      if (showExtraNilai) {
        row.push(
          extraSummary.punishment > 0 ? `-${extraSummary.punishment.toFixed(1)}` : "-",
          extraSummary.poinplus > 0 ? `+${extraSummary.poinplus.toFixed(1)}` : "-"
        );
      }
      row.push(getFilteredTotal(item).toFixed(1));
      
      if (selectedJuaraPreset && selectedJuara) {
        const rankPos = manualOrder[activeGroup.id] ? index + 1 : getRankPosition(activeGroup.participants, index);
        row.push(getRankLabel(rankPos, selectedJuara.ranks));
      }
      
      return row;
    });
    
    // Add table with red theme
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 38,
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: primaryRed,
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: {
        textColor: [50, 50, 50],
      },
      alternateRowStyles: {
        fillColor: [254, 242, 242], // Light red tint
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 50 },
        2: { halign: "center", cellWidth: 12 },
      },
      // Style total column
      didParseCell: (data) => {
        // Total column (dynamic position based on headers)
        const totalColIndex = headers.indexOf("Total");
        if (data.column.index === totalColIndex && data.section === "body") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [254, 226, 226]; // Slightly darker red tint
        }
        // Peringkat column styling
        const peringkatColIndex = headers.indexOf("Peringkat");
        if (data.column.index === peringkatColIndex && data.section === "body") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = darkRed;
        }
      },
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Footer line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
      
      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Simpaskor - Sistem Paskibra Skor | https://simpaskor.id", 14, pageHeight - 8);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: "right" });
    }
    
    // Generate filename
    const filename = `Rekap_${recapData.event.title}_${activeGroup.name}_${new Date().toISOString().split("T")[0]}.pdf`;
    
    // Download
    doc.save(filename);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Memuat data rekapitulasi...</p>
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
            className="text-red-600 dark:text-red-400 hover:underline"
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

  const filteredCategories = getFilteredCategories();
  const schoolCategoryGroups = getSchoolCategoryGroups();
  const selectedJuara = getSelectedJuara();

  return (
    <>
      <div className="min-h-screen flex">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto transition-all duration-300">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            

            {/* Action Buttons - Responsive */}
            <div className="flex flex-wrap gap-2 sm:gap-4 justify-center sm:justify-end mb-6">
              <button
                onClick={runVerification}
                disabled={isVerifying || !recapData}
                className="inline-flex items-center px-3 py-2 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base active:scale-95"
              >
                <ShieldCheckIcon className={`w-5 h-5 sm:mr-2 ${isVerifying ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{isVerifying ? "Memverifikasi..." : "Verifikasi Nilai"}</span>
              </button>
              <button
                onClick={exportToExcel}
                disabled={!getActiveSchoolCategoryGroup()}
                className="inline-flex items-center px-3 py-2 sm:px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base active:scale-95"
              >
                <DocumentArrowDownIcon className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">Ekspor Excel</span>
              </button>
              <button
                onClick={exportToPDF}
                disabled={!getActiveSchoolCategoryGroup()}
                className="inline-flex items-center px-3 py-2 sm:px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base active:scale-95"
              >
                <DocumentArrowDownIcon className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">Ekspor PDF</span>
              </button>
              <button
                onClick={fetchRecap}
                className="inline-flex items-center px-3 py-2 sm:px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm sm:text-base active:scale-95"
              >
                <ArrowPathIcon className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">Refresh Data</span>
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="inline-flex items-center px-3 py-2 sm:px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm sm:text-base active:scale-95"
              >
                <Cog6ToothIcon className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">{showSettings ? "Tutup" : "Pengaturan"}</span>
              </button>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Rekap Nilai Peserta
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {recapData.event.title}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Klik nama peserta untuk melihat detail nilai
              </p>
            </div>

            {/* School Category Sections */}
            {schoolCategoryGroups.length === 0 ? (
              <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 text-center shadow">
                <p className="text-gray-500 dark:text-gray-400">
                  Belum ada peserta terdaftar
                </p>
              </div>
            ) : (
              <div>
                {/* School Category Tabs - Horizontal Scroll on Mobile */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
                  {schoolCategoryGroups.map((group) => {
                    const isActive = activeSchoolCategoryTab 
                      ? activeSchoolCategoryTab === group.id 
                      : schoolCategoryGroups[0]?.id === group.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => setActiveSchoolCategoryTab(group.id)}
                        className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm sm:text-base active:scale-95 flex-shrink-0 ${
                          isActive
                            ? "bg-red-600 text-white"
                            : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {group.name}
                        <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${
                          isActive
                            ? "bg-red-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}>
                          {group.participants.length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Tab Content */}
                {(() => {
                  const activeGroup = getActiveSchoolCategoryGroup();
                  if (!activeGroup) return null;
                  
                  return (
                    <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden shadow">
                      {/* Section Header */}
                      <div className="bg-red-600 dark:bg-gray-700 px-4 py-3">
                        <h2 className="text-lg font-semibold text-white">
                          Kategori Sekolah: {activeGroup.name}
                          {selectedJuara && (
                            <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-yellow-900 text-xs rounded-full">
                              {selectedJuara.name}
                            </span>
                          )}
                        </h2>
                        <p className="text-sm text-red-100 dark:text-gray-400">
                          Kategori Penilaian:{" "}
                          {filteredCategories.length ===
                          recapData.categories.length
                            ? "Semua Nilai"
                            : filteredCategories.map((c) => c.name).join(", ") ||
                              "Tidak ada"}
                          {selectedJuara && (
                            <span className="ml-2">• Diurutkan berdasarkan total nilai tertinggi</span>
                          )}
                        </p>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-red-700 dark:bg-red-900 text-white">
                              <th className="px-3 py-3 text-left text-sm font-semibold w-16">
                                No
                              </th>
                              <th className="px-3 py-3 text-left text-sm font-semibold min-w-[250px]">
                                Nama Peserta
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
                              <th className="px-3 py-3 text-center text-sm font-semibold w-24 bg-red-800 dark:bg-red-950">
                                Total
                              </th>
                              {selectedJuara && (
                                <th className="px-3 py-3 text-center text-sm font-semibold min-w-[120px] bg-yellow-600 dark:bg-yellow-700">
                                  Peringkat
                                </th>
                              )}
                              {showExtraNilai && (
                                <th className="px-3 py-3 text-center text-sm font-semibold w-20">
                                  Aksi
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {activeGroup.participants.map((item, index) => {
                              const extraSummary = getExtraNilaiSummary(item);
                              const canReorder = !!selectedJuaraPreset;
                              const rankPos = selectedJuara ? getRankPosition(activeGroup.participants, index) : 0;
                              const isFirst = index === 0;
                              const isLast = index === activeGroup.participants.length - 1;
                              return (
                                <tr
                                  key={item.participant.id}
                                  className={`border-b border-gray-200/60 dark:border-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                                    index % 2 === 0
                                      ? "bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm"
                                      : "bg-gray-50 dark:bg-gray-800/70"
                                  }`}
                                  onClick={() =>
                                    handleParticipantClick(item.participant.id)
                                  }
                                >
                                  <td className="px-3 py-3 text-gray-700 dark:text-gray-300 text-sm">
                                    <span className="inline-flex items-center gap-1">
                                      {canReorder && (
                                        <span className="inline-flex flex-col gap-0.5 mr-1">
                                          <button
                                            type="button"
                                            disabled={isFirst}
                                            onClick={(e) => { e.stopPropagation(); handleMoveParticipant(index, 'up'); }}
                                            className={`p-0.5 rounded transition-colors ${isFirst ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'}`}
                                            title="Pindah ke atas"
                                          >
                                            <ChevronUpIcon className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isLast}
                                            onClick={(e) => { e.stopPropagation(); handleMoveParticipant(index, 'down'); }}
                                            className={`p-0.5 rounded transition-colors ${isLast ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'}`}
                                            title="Pindah ke bawah"
                                          >
                                            <ChevronDownIcon className="w-3.5 h-3.5" />
                                          </button>
                                        </span>
                                      )}
                                      {index + 1}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 text-gray-900 dark:text-white text-sm font-medium hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                    <div>{item.participant.teamName}</div>
                                    {item.participant.registrant.institution && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                                        {item.participant.registrant.institution}
                                      </div>
                                    )}
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
                                  {selectedJuara && (
                                    <td className="px-3 py-3 text-center text-sm font-semibold bg-yellow-50 dark:bg-yellow-900/20">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200">
                                        {manualOrder[activeGroup.id] ? getRankLabel(index + 1, selectedJuara.ranks) : getRankLabel(rankPos, selectedJuara.ranks)}
                                      </span>
                                    </td>
                                  )}
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

                      {activeGroup.participants.length === 0 && (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          Tidak ada peserta dalam kategori ini
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Summary */}
            <div className="mt-6 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 shadow">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Total Peserta
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {recapData.recap.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Kategori Sekolah
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {schoolCategoryGroups.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Kategori Penilaian
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {filteredCategories.length} / {recapData.categories.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Dewan Juri
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {recapData.juries.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Sidebar - Full screen overlay on mobile, slide-in on desktop */}
        {showSettings && (
          <div
            className="fixed inset-0 bg-black/50 z-40 sm:hidden"
            onClick={() => setShowSettings(false)}
          />
        )}
        <div
          className={`fixed sm:relative inset-y-0 right-0 z-50 sm:z-auto transition-all duration-300 ease-in-out flex-shrink-0 ${
            showSettings ? "w-[85vw] sm:w-80 translate-x-0" : "w-0 translate-x-full sm:translate-x-0"
          }`}
        >
            <div className="w-[85vw] sm:w-80 h-full sm:h-screen sticky top-0 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm shadow-2xl flex flex-col">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200/60 dark:border-gray-700/40">
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
                                ? "bg-red-600 text-white"
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
                                selectedJuaraPreset === juara.id ? "text-red-200" : "text-gray-500 dark:text-gray-400"
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
                    <div className="border-t border-gray-200/60 dark:border-gray-700/40" />
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kategori Penilaian
                    </h4>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={selectAllCategories}
                        className="flex-1 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
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
                              ? "bg-red-600 text-white"
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
                  <div className="pt-4 border-t border-gray-200/60 dark:border-gray-700/40">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Terpilih:{" "}
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {selectedCategories.size}
                      </span>{" "}
                      dari {recapData.categories.length} kategori
                    </p>
                  </div>

                  {/* Extra Nilai Toggle */}
                  <div className="pt-4 border-t border-gray-200/60 dark:border-gray-700/40">
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
                            ? "bg-red-600"
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
      {showExtraNilaiModal && extraNilaiParticipant && recapData && (
        <ExtraNilaiModal
          participant={extraNilaiParticipant}
          eventId={recapData.event.id}
          categories={recapData.categories}
          onClose={closeExtraNilaiModal}
          onDataChange={fetchRecap}
          juaraCategories={juaraCategories.map(jc => ({ id: jc.id, name: jc.name, type: jc.type }))}
          selectedJuaraPreset={selectedJuaraPreset}
        />
      )}

      {/* Verification Result Modal */}
      {showVerificationModal && verificationResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700">
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b rounded-t-xl ${
              verificationResult.isClean
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}>
              <div className="flex items-center gap-3">
                {verificationResult.isClean ? (
                  <CheckCircleIcon className="w-7 h-7 text-green-600 dark:text-green-400" />
                ) : (
                  <ExclamationTriangleIcon className="w-7 h-7 text-red-600 dark:text-red-400" />
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Hasil Verifikasi Nilai
                  </h3>
                  <p className={`text-sm ${
                    verificationResult.isClean
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    {verificationResult.isClean
                      ? "Semua nilai terverifikasi dengan baik!"
                      : `Ditemukan ${verificationResult.totalIssues} masalah`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVerificationModal(false)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {verificationResult.isClean ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="w-16 h-16 text-green-500 dark:text-green-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Tidak Ada Masalah!
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                  Tidak ditemukan materi ganda, nilai yang hilang, atau penjumlahan yang tidak sesuai.
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`rounded-lg p-3 text-center border ${
                      verificationResult.materialIssues.length > 0
                        ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                        : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                    }`}>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{verificationResult.materialIssues.length}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Materi Ganda</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center border ${
                      verificationResult.mismatches.length > 0
                        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                    }`}>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{verificationResult.mismatches.length}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Penjumlahan Salah</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center border ${
                      verificationResult.missing.length > 0
                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                        : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                    }`}>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{verificationResult.missing.length}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Nilai Belum Diisi</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center border ${
                      verificationResult.duplicates.length > 0
                        ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                        : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                    }`}>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{verificationResult.duplicates.length}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Nilai Identik</p>
                    </div>
                  </div>

                  {/* Material Issues Section (highest priority) */}
                  {verificationResult.materialIssues.length > 0 && (
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-400 mb-2">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        Materi Ganda / Nilai Melebihi Maksimum ({verificationResult.materialIssues.filter(i => !i.fixed).length})
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {verificationResult.materialIssues.map((issue, i) => (
                          <div
                            key={`material-${i}`}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              issue.fixed
                                ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50 opacity-60"
                                : "bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/50"
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${issue.fixed ? "bg-green-500" : "bg-purple-500"}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {issue.participantName}
                                {issue.fixed && <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-normal">Diperbaiki</span>}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{issue.message}</p>
                            </div>
                            {issue.fixAction && issue.fixAction !== "none" && !issue.fixed && (
                              <button
                                onClick={() => fixIssue(issue, i, "materialIssues")}
                                disabled={isFixing !== null}
                                className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:opacity-50"
                                title="Hapus nilai duplikat untuk juri & kategori ini"
                              >
                                <WrenchScrewdriverIcon className={`w-3 h-3 ${isFixing === `materialIssues-${i}` ? "animate-spin" : ""}`} />
                                {issue.fixAction === "delete_jury_category" ? "Hapus Nilai" : "Hitung Ulang"}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mismatches Section */}
                  {verificationResult.mismatches.length > 0 && (
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        Penjumlahan Tidak Sesuai ({verificationResult.mismatches.filter(i => !i.fixed).length})
                      </h4>
                      <div className="space-y-2">
                        {verificationResult.mismatches.map((issue, i) => (
                          <div
                            key={`mismatch-${i}`}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              issue.fixed
                                ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50 opacity-60"
                                : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50"
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${issue.fixed ? "bg-green-500" : "bg-red-500"}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {issue.participantName}
                                {issue.fixed && <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-normal">Diperbaiki</span>}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{issue.message}</p>
                            </div>
                            {issue.fixAction && issue.fixAction !== "none" && !issue.fixed && (
                              <button
                                onClick={() => fixIssue(issue, i, "mismatches")}
                                disabled={isFixing !== null}
                                className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                                title="Hitung ulang nilai"
                              >
                                <WrenchScrewdriverIcon className={`w-3 h-3 ${isFixing === `mismatches-${i}` ? "animate-spin" : ""}`} />
                                Hitung Ulang
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Section */}
                  {verificationResult.missing.length > 0 && (
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        Nilai Belum Diisi ({verificationResult.missing.length})
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Juri perlu menilai materi ini secara manual melalui halaman penilaian.
                      </p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {verificationResult.missing.map((issue, i) => (
                          <div
                            key={`missing-${i}`}
                            className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-lg"
                          >
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{issue.participantName}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{issue.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Duplicates Section */}
                  {verificationResult.duplicates.length > 0 && (
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        Nilai Ganda Terdeteksi ({verificationResult.duplicates.length})
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Beberapa juri memberikan nilai identik. Periksa apakah ini disengaja.
                      </p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {verificationResult.duplicates.map((issue, i) => (
                          <div
                            key={`dup-${i}`}
                            className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 rounded-lg"
                          >
                            <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{issue.participantName}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{issue.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                {!verificationResult.isClean && (
                  <>
                    {[...verificationResult.materialIssues, ...verificationResult.mismatches].some(
                      (i) => i.fixAction && i.fixAction !== "none" && !i.fixed
                    ) && (
                      <button
                        onClick={fixAllIssues}
                        disabled={isFixing !== null}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
                      >
                        <WrenchScrewdriverIcon className={`w-4 h-4 ${isFixing === "all" ? "animate-spin" : ""}`} />
                        {isFixing === "all" ? "Memperbaiki..." : "Perbaiki Semua"}
                      </button>
                    )}
                    <button
                      onClick={() => { setShowVerificationModal(false); runVerification(); }}
                      disabled={isVerifying}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors text-sm"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      Verifikasi Ulang
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => { setShowVerificationModal(false); fetchRecap(); }}
                className="px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PanitiaEventRecap;

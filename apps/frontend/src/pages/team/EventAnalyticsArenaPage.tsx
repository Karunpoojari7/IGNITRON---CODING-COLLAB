import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Send,
  AlertTriangle,
  Loader2,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Trophy,
  Check,
  Lock,
  PauseCircle,
  ShieldAlert,
  FileSpreadsheet,
  Sparkles,
  Flag,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { questionAndArenaService } from '../../services/question-and-arena.service';
import { useCompetitionState, useServerTimer } from '../../hooks/useCompetition';
import { useParticipantMonitoring } from '../../hooks/useParticipantMonitoring';
import { ExamLockOverlay } from '../../components/competition/ExamLockOverlay';
import {
  AnalyticsArenaStateDto,
  AnalyticsQuestionDto,
} from '@ignitron/shared';

export interface DatasetDef {
  fileName: string;
  dfName: string;
  title: string;
  description: string;
  columns: string[];
  previewRows: Record<string, any>[];
  fieldInfo: { field: string; type: string; desc: string }[];
}

export const DATASET_REGISTRY: Record<string, DatasetDef> = {
  'IGNITRON_Round3_Reference_Dataset.json': {
    fileName: 'IGNITRON_Round3_Reference_Dataset.json',
    dfName: 'reference_json',
    title: 'IGNITRON Round 3 Reference Dataset (Master JSON)',
    description: 'Complete JSON dataset containing participant_scores (100), submission_status_summary (1,000), submission_ids (1,000), team_leaderboard (50), team_round_scores (50), and verification.',
    columns: ['section', 'record_count', 'description', 'verified_highlight'],
    previewRows: [
      { section: 'participant_scores', record_count: 100, description: 'All participants and their raw scores in Rounds 1, 2 and 3.', verified_highlight: 'P101 total=207.4; Highest=P196 (217.2)' },
      { section: 'submission_status_summary', record_count: 1000, description: 'Count of submissions by execution status.', verified_highlight: 'ACCEPTED=302 / 1000' },
      { section: 'submission_ids', record_count: 1000, description: 'All submission IDs; use this list to check for duplicates.', verified_highlight: 'Duplicates=0' },
      { section: 'team_leaderboard', record_count: 50, description: 'All 50 teams, sorted by total score descending.', verified_highlight: 'Rank 1=T148 (Syntax Ninjas, 425.6)' },
      { section: 'team_round_scores', record_count: 50, description: 'Team ID and round-wise scores used for ranking and tie-break practice.', verified_highlight: 'Totals match leaderboard=true' },
    ],
    fieldInfo: [
      { field: 'dataset_name', type: 'string', desc: 'IGNITRON Round 3 Reference Dataset' },
      { field: 'sections.participant_scores', type: 'object (100 records)', desc: 'Per-participant round_1_score, round_2_score, round_3_score, total_score' },
      { field: 'sections.submission_status_summary', type: 'object (5 statuses)', desc: 'Counts for ACCEPTED, COMPILATION_ERROR, RUNTIME_ERROR, TIME_LIMIT_EXCEEDED, WRONG_ANSWER' },
      { field: 'sections.submission_ids', type: 'object (1,000 IDs)', desc: 'List of submission_id strings SUB_10001..SUB_11000' },
      { field: 'sections.team_leaderboard', type: 'object (50 teams)', desc: 'Ranked teams with rank, team_id, team_name, department, round scores, total_score' },
      { field: 'sections.team_round_scores', type: 'object (50 teams)', desc: 'team_id, team_name, total_score, round_2_score, round_3_score' },
      { field: 'verification', type: 'object (10 metrics)', desc: 'Ground-truth verification values' },
    ],
  },
  'participants.csv': {
    fileName: 'participants.csv',
    dfName: 'df',
    title: 'Participant Scores (100 Records)',
    description: 'Participant IDs, names, and Round 1, Round 2, Round 3, and total scores across all 100 contestants.',
    columns: ['participant_id', 'participant_name', 'round_1_score', 'round_2_score', 'round_3_score', 'total_score'],
    previewRows: [
      { participant_id: 'P101', participant_name: 'Akash Patel', round_1_score: 25.4, round_2_score: 87.4, round_3_score: 94.6, total_score: 207.4 },
      { participant_id: 'P102', participant_name: 'Vikram Chauhan', round_1_score: 22.7, round_2_score: 78.5, round_3_score: 67.7, total_score: 168.9 },
      { participant_id: 'P103', participant_name: 'Chetan Kapoor', round_1_score: 14.1, round_2_score: 47.0, round_3_score: 47.8, total_score: 108.9 },
      { participant_id: 'P196', participant_name: 'Neha Singh', round_1_score: 29.0, round_2_score: 96.4, round_3_score: 91.8, total_score: 217.2 },
    ],
    fieldInfo: [
      { field: 'participant_id', type: 'string (PK)', desc: 'Unique participant identifier (P101 to P200)' },
      { field: 'participant_name', type: 'string', desc: 'Full registered participant name' },
      { field: 'round_1_score', type: 'float', desc: 'Raw score in Round 1' },
      { field: 'round_2_score', type: 'float', desc: 'Raw score in Round 2' },
      { field: 'round_3_score', type: 'float', desc: 'Raw score in Round 3' },
      { field: 'total_score', type: 'float', desc: 'Sum of round_1_score + round_2_score + round_3_score' },
    ],
  },
  'submission_ids.csv': {
    fileName: 'submission_ids.csv',
    dfName: 'ids',
    title: 'Submission IDs Audit (1,000 Records)',
    description: 'Complete list of 1,000 submission identifiers (SUB_10001 to SUB_11000) for duplicate detection.',
    columns: ['submission_id'],
    previewRows: [
      { submission_id: 'SUB_10001' },
      { submission_id: 'SUB_10002' },
      { submission_id: 'SUB_10003' },
      { submission_id: 'SUB_10004' },
    ],
    fieldInfo: [
      { field: 'submission_id', type: 'string (PK)', desc: 'Unique submission identifier (SUB_10001 to SUB_11000)' },
    ],
  },
  'submission_status_summary.csv': {
    fileName: 'submission_status_summary.csv',
    dfName: 'summary',
    title: 'Submission Status Summary (5 Records)',
    description: 'Aggregated submission counts across all 5 execution verdicts totaling 1,000 submissions.',
    columns: ['execution_status', 'count'],
    previewRows: [
      { execution_status: 'ACCEPTED', count: 302 },
      { execution_status: 'COMPILATION_ERROR', count: 188 },
      { execution_status: 'RUNTIME_ERROR', count: 160 },
      { execution_status: 'TIME_LIMIT_EXCEEDED', count: 158 },
      { execution_status: 'WRONG_ANSWER', count: 192 },
    ],
    fieldInfo: [
      { field: 'execution_status', type: 'string', desc: 'Execution verdict category' },
      { field: 'count', type: 'integer', desc: 'Number of submissions with that execution_status' },
    ],
  },
  'team_leaderboard.csv': {
    fileName: 'team_leaderboard.csv',
    dfName: 'leaderboard',
    title: 'Team Leaderboard (50 Records)',
    description: 'Ranked standings for all 50 teams with department, member count, round scores, and total_score.',
    columns: ['rank', 'team_id', 'team_name', 'department', 'member_count', 'round_1_score', 'round_2_score', 'round_3_score', 'total_score'],
    previewRows: [
      { rank: 1, team_id: 'T148', team_name: 'Syntax Ninjas', department: 'Information Technology', member_count: 2, round_1_score: 51.0, round_2_score: 197.9, round_3_score: 176.7, total_score: 425.6 },
      { rank: 2, team_id: 'T147', team_name: 'Recursion Crusaders', department: 'Artificial Intelligence & Data Science', member_count: 2, round_1_score: 51.3, round_2_score: 179.3, round_3_score: 172.0, total_score: 402.6 },
      { rank: 3, team_id: 'T118', team_name: 'Code Architects', department: 'Information Technology', member_count: 2, round_1_score: 46.9, round_2_score: 161.4, round_3_score: 180.6, total_score: 388.9 },
    ],
    fieldInfo: [
      { field: 'rank', type: 'integer', desc: 'Official leaderboard rank (1 to 50)' },
      { field: 'team_id', type: 'string (PK)', desc: 'Team identifier (T101 to T150)' },
      { field: 'team_name', type: 'string', desc: 'Registered team name' },
      { field: 'department', type: 'string', desc: 'Academic department' },
      { field: 'member_count', type: 'integer', desc: 'Number of team members (2)' },
      { field: 'round_1_score', type: 'float', desc: 'Combined Round 1 score' },
      { field: 'round_2_score', type: 'float', desc: 'Combined Round 2 score' },
      { field: 'round_3_score', type: 'float', desc: 'Combined Round 3 score' },
      { field: 'total_score', type: 'float', desc: 'Combined total score across all 3 rounds' },
    ],
  },
  'team_round_scores.csv': {
    fileName: 'team_round_scores.csv',
    dfName: 'scores',
    title: 'Team Round Scores (50 Records)',
    description: 'Per-team total_score, round_2_score, and round_3_score for multi-key ranking verification.',
    columns: ['team_id', 'team_name', 'total_score', 'round_2_score', 'round_3_score'],
    previewRows: [
      { team_id: 'T148', team_name: 'Syntax Ninjas', total_score: 425.6, round_2_score: 197.9, round_3_score: 176.7 },
      { team_id: 'T147', team_name: 'Recursion Crusaders', total_score: 402.6, round_2_score: 179.3, round_3_score: 172.0 },
      { team_id: 'T118', team_name: 'Code Architects', total_score: 388.9, round_2_score: 161.4, round_3_score: 180.6 },
    ],
    fieldInfo: [
      { field: 'team_id', type: 'string (PK)', desc: 'Team identifier (T101 to T150)' },
      { field: 'team_name', type: 'string', desc: 'Registered team name' },
      { field: 'total_score', type: 'float', desc: 'Primary ranking key (descending)' },
      { field: 'round_2_score', type: 'float', desc: 'Tertiary tie-break key (descending)' },
      { field: 'round_3_score', type: 'float', desc: 'Secondary tie-break key (descending)' },
    ],
  },
  'verification_summary.csv': {
    fileName: 'verification_summary.csv',
    dfName: 'verification',
    title: 'Verification Summary (10 Metrics)',
    description: 'Official ground-truth verification metrics matching IGNITRON_Round3_Reference_Dataset.json.',
    columns: ['metric', 'value'],
    previewRows: [
      { metric: 'participant_count', value: '100' },
      { metric: 'team_count', value: '50' },
      { metric: 'submission_count', value: '1000' },
      { metric: 'duplicate_submission_id_count', value: '0' },
      { metric: 'p101_total_score', value: '207.4' },
      { metric: 'accepted_submission_count', value: '302' },
    ],
    fieldInfo: [
      { field: 'metric', type: 'string', desc: 'Verification metric key' },
      { field: 'value', type: 'string/JSON', desc: 'Exact verified reference value' },
    ],
  },
};

type NavTab = 'DATASET' | 'CASE_1' | 'CASE_2' | 'CASE_3';

const NAV_TABS: Array<{ id: NavTab; label: string; caseNumber?: 1 | 2 | 3 }> = [
  { id: 'DATASET', label: 'DATASET' },
  { id: 'CASE_1', label: 'CASE 01 – DATA FUNDAMENTALS', caseNumber: 1 },
  { id: 'CASE_2', label: 'CASE 02 – DATA INTEGRITY', caseNumber: 2 },
  { id: 'CASE_3', label: 'CASE 03 – ANALYTICAL INTELLIGENCE', caseNumber: 3 },
];

const QUESTION_SUBTITLES: Record<number, { name: string; marksLabel?: string }> = {};

function formatProblemDescription(raw: string): string {
  return (raw || '')
    .replace(/^###\s*/gm, '')
    .replace(/^####\s*/gm, '')
    .replace(/\*\*/g, '')
    .trim();
}

/** Minimal Python syntax highlighter — returns JSX spans for coloured tokens */
function highlightPython(code: string): React.ReactNode {
  if (!code) return null;
  const lines = code.split('\n');
  let key = 0;

  const tokenize = (src: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    const combined = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')|\b(def|return|print|for|in|if|elif|else|import|from|as|pass|break|continue|class|lambda|and|or|not|True|False|None|with|yield|raise|try|except|finally|while|del|global|nonlocal|assert|is)\b|\b(len|sum|max|min|sorted|list|dict|set|tuple|int|float|str|bool|range|enumerate|zip|map|filter|round|abs|type|isinstance|hasattr|getattr)\b|\b(\d+\.?\d*)\b/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = combined.exec(src)) !== null) {
      if (m.index > last) {
        result.push(<span key={key++}>{src.slice(last, m.index)}</span>);
      }
      if (m[1]) result.push(<span key={key++} className="text-slate-400 italic">{m[1]}</span>);
      else if (m[2]) result.push(<span key={key++} className="text-amber-300">{m[2]}</span>);
      else if (m[3]) result.push(<span key={key++} className="text-violet-400 font-semibold">{m[3]}</span>);
      else if (m[4]) result.push(<span key={key++} className="text-sky-300">{m[4]}</span>);
      else if (m[5]) result.push(<span key={key++} className="text-orange-300">{m[5]}</span>);
      last = combined.lastIndex;
    }
    if (last < src.length) result.push(<span key={key++}>{src.slice(last)}</span>);
    return result;
  };

  return (
    <>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {tokenize(line)}
          {'\n'}
        </span>
      ))}
    </>
  );
}

export const EventAnalyticsArenaPage: React.FC = () => {
  const { user } = useAuth();
  const teamUser = user?.type === 'TEAM' ? (user as any) : null;
  const navigate = useNavigate();

  // Loading & error states
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [arenaState, setArenaState] = useState<AnalyticsArenaStateDto | null>(null);

  // Navigation: 4 primary tabs (DATASET, CASE 01, CASE 02, CASE 03)
  const [activeNav, setActiveNav] = useState<NavTab>('CASE_1');

  // Local map of selected options per questionId + flagging state
  const [selectedOptions, setSelectedOptions] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('ignitron_r3_flagged');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const toggleFlagQuestion = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = { ...prev, [questionId]: !prev[questionId] };
      try {
        localStorage.setItem('ignitron_r3_flagged', JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Case submission state
  const [submittingCaseNum, setSubmittingCaseNum] = useState<number | null>(null);
  const [caseBanner, setCaseBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Finalize Round 3 modal
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showLeaveWarningModal, setShowLeaveWarningModal] = useState(false);
  const [showConcludedModal, setShowConcludedModal] = useState(false);

  // Dataset Explorer state
  const [selectedDatasetFile, setSelectedDatasetFile] = useState<string>('IGNITRON_Round3_Reference_Dataset.json');
  const [datasetSearch, setDatasetSearch] = useState<string>('');
  const [datasetPage, setDatasetPage] = useState<number>(1);
  const [backendDatasetData, setBackendDatasetData] = useState<{
    columns: string[];
    rows: Record<string, any>[];
    totalRows: number;
    totalPages: number;
  } | null>(null);
  const [isDatasetLoading, setIsDatasetLoading] = useState(false);
  const [datasetSubTab, setDatasetSubTab] = useState<'PREVIEW' | 'SCHEMA'>('PREVIEW');

  // Authoritative Competition State & Server Timer
  const { data: compState } = useCompetitionState();
  const isCompetitionPaused = Boolean(compState?.isPaused || arenaState?.isPaused);
  const isRoundActive =
    compState?.currentRoundNumber === 3 && compState?.status === 'ROUND_3_ACTIVE';
  const configuredDuration =
    compState?.rounds?.find((r) => r.roundNumber === 3)?.durationMinutes ?? 60;

  const timer = useServerTimer(
    isRoundActive ? compState?.deadlineAt : null,
    isCompetitionPaused,
    isRoundActive ? (arenaState?.remainingSeconds ?? compState?.remainingDurationSeconds ?? configuredDuration * 60) : configuredDuration * 60,
  );

  const isConcluded =
    Boolean(
      compState?.status &&
        (['ROUND_3_EVALUATION', 'FINAL_EVALUATION', 'COMPLETED'].includes(compState.status) ||
          (compState.currentRoundNumber && compState.currentRoundNumber > 3)),
    ) || Boolean(timer.isExpired && compState?.deadlineAt);

  const isLocked = isConcluded || Boolean(arenaState?.isSubmitted);

  // Anti-cheat & participant monitoring (armed only after load + visibility settle)
  const {
    focusWarning,
    isLockedByProctoring,
    lockStatus,
    isDisqualified,
    lockReason,
    warningCount,
    clearWarning,
    refreshStatus,
  } = useParticipantMonitoring({
    roundNumber: 3,
    isRoundActive: Boolean(isRoundActive && !isLocked),
    isSubmitted: Boolean(arenaState?.isSubmitted),
    isConcluded,
    isReady: !isLoading && Boolean(arenaState),
    arenaType: 'ANALYTICS',
  });

  useEffect(() => {
    if (timer.isExpired && !arenaState?.isSubmitted) {
      setShowConcludedModal(true);
    }
  }, [timer.isExpired, arenaState?.isSubmitted]);

  const handleBackToDashboard = () => {
    if (!isLocked && !isConcluded && !timer.isExpired && isRoundActive) {
      setShowLeaveWarningModal(true);
    } else {
      navigate('/team/dashboard');
    }
  };

  // Fetch Round 3 Arena State
  const fetchArenaState = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const state = await questionAndArenaService.getAnalyticsArenaState();
      setArenaState(state);

      const initialOpts: Record<string, 'A' | 'B' | 'C' | 'D'> = {};
      for (const c of state.cases) {
        for (const q of c.questions) {
          if (q.selectedOption && ['A', 'B', 'C', 'D'].includes(q.selectedOption)) {
            initialOpts[q.id] = q.selectedOption as 'A' | 'B' | 'C' | 'D';
          }
        }
      }
      setSelectedOptions(initialOpts);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to load Round 3 Event Analytics Engine.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArenaState();
  }, [fetchArenaState]);

  // Fetch dataset preview when DATASET tab is open or filter/page changes
  useEffect(() => {
    if (activeNav !== 'DATASET') return;
    let cancelled = false;

    const loadPreview = async () => {
      try {
        setIsDatasetLoading(true);
        const data = await questionAndArenaService.getDatasetPreview(
          selectedDatasetFile,
          datasetPage,
          12,
          datasetSearch.trim() || undefined,
        );
        if (!cancelled) {
          setBackendDatasetData(data);
        }
      } catch {
        if (!cancelled) {
          setBackendDatasetData(null);
        }
      } finally {
        if (!cancelled) {
          setIsDatasetLoading(false);
        }
      }
    };

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [activeNav, selectedDatasetFile, datasetPage, datasetSearch]);

  // Derived active case & progress
  const activeCaseNumber: 1 | 2 | 3 | null =
    activeNav === 'CASE_1' ? 1 : activeNav === 'CASE_2' ? 2 : activeNav === 'CASE_3' ? 3 : null;

  const activeCase = useMemo(() => {
    if (!arenaState || !activeCaseNumber) return null;
    return arenaState.cases.find((c) => c.caseNumber === activeCaseNumber) || null;
  }, [arenaState, activeCaseNumber]);

  const allQuestions = useMemo(() => {
    if (!arenaState) return [];
    return arenaState.cases.flatMap((c) => c.questions);
  }, [arenaState]);

  const totalAnsweredCount = useMemo(() => {
    return allQuestions.filter((q) => Boolean(selectedOptions[q.id])).length;
  }, [allQuestions, selectedOptions]);

  const totalSubmittedCount = useMemo(() => {
    return allQuestions.filter((q) => q.isSubmitted).length;
  }, [allQuestions]);

  const submittedCasesCount = useMemo(() => {
    if (!arenaState) return 0;
    return arenaState.cases.filter(
      (c) => c.questions.length > 0 && c.questions.every((q) => q.isSubmitted),
    ).length;
  }, [arenaState]);

  // Handle selecting an MCQ option (A, B, C, or D) with automatic backend save
  const handleSelectOption = async (
    q: AnalyticsQuestionDto,
    optionKey: 'A' | 'B' | 'C' | 'D',
  ) => {
    if (q.isSubmitted || isLocked || isCompetitionPaused || isLockedByProctoring) return;

    setSelectedOptions((prev) => ({ ...prev, [q.id]: optionKey }));
    setCaseBanner(null);

    try {
      setSavingQuestionId(q.id);
      await questionAndArenaService.selectAnalyticsOption(q.id, optionKey);
      setArenaState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cases: prev.cases.map((c) => ({
            ...c,
            questions: c.questions.map((item) =>
              item.id === q.id
                ? { ...item, selectedOption: optionKey, status: item.isSubmitted ? 'SUBMITTED' : 'SAVED' }
                : item,
            ),
          })),
        };
      });
      setSavedToast(`Q${q.orderNumber} saved`);
      setTimeout(() => setSavedToast(null), 2000);
    } catch (err: any) {
      setCaseBanner({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to save selection.',
      });
    } finally {
      setSavingQuestionId(null);
    }
  };

  // Handle submitting both questions of the active case together
  const handleSubmitCase = async () => {
    if (!activeCase || isLocked || isCompetitionPaused || isLockedByProctoring) return;
    const isCaseSubmitted = activeCase.questions.every((q) => q.isSubmitted);
    if (isCaseSubmitted) return;

    const answers = activeCase.questions.map((q) => ({
      questionId: q.id,
      selectedOption: selectedOptions[q.id],
    }));

    if (answers.some((a) => !a.selectedOption)) {
      setCaseBanner({
        type: 'error',
        message: 'Please select an answer (A, B, C, or D) for both questions before submitting the case.',
      });
      return;
    }

    try {
      setSubmittingCaseNum(activeCase.caseNumber);
      setCaseBanner(null);

      const res = await questionAndArenaService.submitAnalyticsCase(
        activeCase.caseNumber,
        answers as Array<{ questionId: string; selectedOption: 'A' | 'B' | 'C' | 'D' }>,
      );

      await fetchArenaState();
      setCaseBanner({
        type: 'success',
        message: res.message || `Case 0${activeCase.caseNumber} submitted successfully.`,
      });
    } catch (err: any) {
      setCaseBanner({
        type: 'error',
        message: err?.response?.data?.message || err?.message || `Failed to submit Case 0${activeCase.caseNumber}.`,
      });
    } finally {
      setSubmittingCaseNum(null);
    }
  };

  // Handle finalizing Round 3
  const handleFinalizeRound3 = async () => {
    try {
      setIsFinalizing(true);
      await questionAndArenaService.finalizeRound3();
      setShowFinalModal(false);
      await fetchArenaState();
      setCaseBanner({
        type: 'success',
        message: 'Round 3 officially finalized and locked. All answers are preserved.',
      });
    } catch (err: any) {
      setCaseBanner({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to finalize Round 3.',
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  // Handle CSV download with auth credentials
  const handleDownloadCsv = (fileName: string) => {
    const url = questionAndArenaService.getDatasetDownloadUrl(fileName);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const activeDatasetDef = DATASET_REGISTRY[selectedDatasetFile] || DATASET_REGISTRY['round_performance.csv'];
  const activeDatasetColumns = backendDatasetData?.columns || activeDatasetDef.columns;
  const activeDatasetRows = backendDatasetData?.rows || activeDatasetDef.previewRows;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020a06] flex flex-col items-center justify-center text-emerald-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="font-mono text-xs uppercase tracking-widest text-emerald-300/80">
          Loading Round 3 &mdash; IGNITRON Event Analytics Engine...
        </p>
      </div>
    );
  }

  if (errorMessage && !arenaState) {
    return (
      <div className="min-h-screen bg-[#020a06] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-[#04140d] border border-rose-500/40 p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Round 3 Unavailable</h2>
          <p className="text-sm text-slate-300">{errorMessage}</p>
          <button
            onClick={() => navigate('/team/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isActiveCaseSubmitted = activeCase
    ? activeCase.questions.length > 0 && activeCase.questions.every((q) => q.isSubmitted)
    : false;
  const isActiveCaseReadyToSubmit = activeCase
    ? activeCase.questions.length > 0 &&
      activeCase.questions.every((q) => Boolean(selectedOptions[q.id])) &&
      !isActiveCaseSubmitted &&
      !isLocked &&
      !isCompetitionPaused &&
      !isLockedByProctoring
    : false;

  return (
    <div className="min-h-screen bg-[#020a06] text-slate-100 flex flex-col">
      {/* Proctoring Exam Lock Overlay */}
      <ExamLockOverlay
        isOpen={Boolean(isLockedByProctoring)}
        lockStatus={lockStatus}
        isDisqualified={isDisqualified}
        lockReason={lockReason}
        warningCount={warningCount}
        onRefreshStatus={refreshStatus}
        onReturnToDashboard={() => navigate('/team/dashboard')}
      />

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#03120b]/95 backdrop-blur-md border-b border-emerald-500/20">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back + Brand */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToDashboard}
              className="p-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/25 text-emerald-300 transition cursor-pointer"
              title="Back to Dashboard"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  ROUND 03
                </span>
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Python Code Tracing Challenge
                </h1>
              </div>
              <p className="text-[11px] text-emerald-300/65 font-mono">
                {teamUser?.teamName || 'Team Workspace'} &bull; 6 Questions &bull; 1 Mark Each &bull; 6 Marks Total &bull; No Negative Marking
              </p>
            </div>
          </div>

          {/* Center/Right: 4 Primary Navigation Tabs in Exact Order */}
          <nav className="flex flex-wrap items-center gap-1.5" aria-label="Round 3 Navigation">
            {NAV_TABS.map((tab) => {
              const isActive = activeNav === tab.id;
              const caseObj = tab.caseNumber
                ? arenaState?.cases.find((c) => c.caseNumber === tab.caseNumber)
                : null;
              const caseSubmitted =
                caseObj && caseObj.questions.length > 0 && caseObj.questions.every((q) => q.isSubmitted);

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveNav(tab.id);
                    setCaseBanner(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold tracking-wide transition flex items-center gap-1.5 cursor-pointer border ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      : 'bg-[#04160e] text-slate-300 border-emerald-900/60 hover:border-emerald-500/40 hover:text-emerald-200'
                  }`}
                >
                  {tab.id === 'DATASET' && <Database className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{tab.label}</span>
                  {caseSubmitted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Warning / Paused / Submitted Banners */}
      <div className="max-w-7xl w-full mx-auto px-4 pt-3 space-y-2">
        {focusWarning && (
          <div className="p-3 rounded-xl bg-amber-950/70 border border-amber-500/50 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{focusWarning.message}</span>
            </div>
            <button
              type="button"
              onClick={clearWarning}
              className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-200 font-mono text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {isCompetitionPaused && (
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center gap-2.5 text-xs text-amber-200">
            <PauseCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Round 3 is currently paused by competition administrators. Inputs are temporarily locked.</span>
          </div>
        )}

        {arenaState?.isSubmitted && (
          <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 flex items-center gap-2.5 text-xs text-emerald-200">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Round 3 has been officially finalized and submitted. Your answers are locked and preserved.</span>
          </div>
        )}

        {caseBanner && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              caseBanner.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {caseBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{caseBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setCaseBanner(null)}
              className="text-[11px] font-mono opacity-75 hover:opacity-100 cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {/* Compact Q1-Q6 Question Navigator with Answered & Flagged Indicators */}
        {allQuestions.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#04140d]/80 border border-emerald-900/60 px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase text-emerald-300/70 mr-1">Questions:</span>
              {allQuestions.map((q) => {
                const isAnswered = Boolean(selectedOptions[q.id]);
                const isFlagged = Boolean(flaggedQuestions[q.id]);
                const targetTab: NavTab = q.caseNumber === 1 ? 'CASE_1' : q.caseNumber === 2 ? 'CASE_2' : 'CASE_3';
                const isCurrentCase = activeNav === targetTab;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setActiveNav(targetTab);
                      setTimeout(() => {
                        document.getElementById(`r3-q-${q.orderNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 50);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border flex items-center gap-1 cursor-pointer transition ${
                      q.isSubmitted
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                        : isAnswered
                        ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600/60'
                        : isCurrentCase
                        ? 'bg-[#071f14] text-white border-emerald-500/50'
                        : 'bg-[#020a06] text-slate-400 border-emerald-900/50 hover:text-slate-200'
                    }`}
                  >
                    <span>Q{q.orderNumber}</span>
                    {isFlagged && <Flag className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {Object.values(flaggedQuestions).filter(Boolean).length} Flagged
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 space-y-5">
        {/* ================================================================ */}
        {/* VIEW 1: DATASET EXPLORER                                         */}
        {/* ================================================================ */}
        {activeNav === 'DATASET' && (
          <section className="space-y-4">
            <div className="rounded-2xl bg-[#04140d]/90 border border-emerald-500/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                  <span>IGNITRON Round 3 Reference Dataset (JSON + 6 CSV Files)</span>
                </h2>
                <p className="text-xs text-emerald-200/70 mt-0.5">
                  Inspect schema fields, preview records, and download CSV files to verify your analytical reasoning.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadCsv(activeDatasetDef.fileName)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold transition cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {activeDatasetDef.fileName}</span>
              </button>
            </div>

            {/* 5 Dataset Selector Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {Object.values(DATASET_REGISTRY).map((ds) => {
                const selected = ds.fileName === selectedDatasetFile;
                return (
                  <button
                    key={ds.fileName}
                    type="button"
                    onClick={() => {
                      setSelectedDatasetFile(ds.fileName);
                      setDatasetPage(1);
                      setDatasetSearch('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono transition border cursor-pointer ${
                      selected
                        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60 font-bold'
                        : 'bg-[#04140d] text-slate-300 border-emerald-900/50 hover:border-emerald-500/40'
                    }`}
                  >
                    {ds.fileName} <span className="text-emerald-400/70">({ds.dfName})</span>
                  </button>
                );
              })}
            </div>

            {/* Dataset Info + Preview/Schema Card */}
            <div className="rounded-2xl bg-[#04140d]/90 border border-emerald-500/25 overflow-hidden">
              <div className="px-4 py-3 border-b border-emerald-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-black/25">
                <div>
                  <h3 className="text-sm font-bold text-white">{activeDatasetDef.title}</h3>
                  <p className="text-xs text-slate-400">{activeDatasetDef.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDatasetSubTab('PREVIEW')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer border ${
                      datasetSubTab === 'PREVIEW'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                        : 'bg-transparent text-slate-400 border-emerald-900/50'
                    }`}
                  >
                    Data Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatasetSubTab('SCHEMA')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer border ${
                      datasetSubTab === 'SCHEMA'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                        : 'bg-transparent text-slate-400 border-emerald-900/50'
                    }`}
                  >
                    Field Info ({activeDatasetDef.fieldInfo.length})
                  </button>
                </div>
              </div>

              {datasetSubTab === 'PREVIEW' ? (
                <div className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="relative flex-1 min-w-[220px] max-w-sm">
                      <Search className="w-3.5 h-3.5 text-emerald-400/70 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={datasetSearch}
                        onChange={(e) => {
                          setDatasetSearch(e.target.value);
                          setDatasetPage(1);
                        }}
                        placeholder="Filter rows..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#020a06] border border-emerald-900/70 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>
                    {backendDatasetData && (
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <span>
                          Page {datasetPage} / {Math.max(1, backendDatasetData.totalPages)} ({backendDatasetData.totalRows} rows)
                        </span>
                        <button
                          type="button"
                          disabled={datasetPage <= 1 || isDatasetLoading}
                          onClick={() => setDatasetPage((p) => Math.max(1, p - 1))}
                          className="p-1 rounded bg-emerald-950/60 border border-emerald-800/60 disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={datasetPage >= backendDatasetData.totalPages || isDatasetLoading}
                          onClick={() => setDatasetPage((p) => p + 1)}
                          className="p-1 rounded bg-emerald-950/60 border border-emerald-800/60 disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-emerald-900/60">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-emerald-950/60 text-emerald-300 border-b border-emerald-900/60">
                        <tr>
                          {activeDatasetColumns.map((col) => (
                            <th key={col} className="px-3 py-2 font-semibold whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-950/70">
                        {isDatasetLoading ? (
                          <tr>
                            <td colSpan={activeDatasetColumns.length} className="px-3 py-6 text-center text-emerald-400">
                              Loading dataset rows...
                            </td>
                          </tr>
                        ) : activeDatasetRows.length === 0 ? (
                          <tr>
                            <td colSpan={activeDatasetColumns.length} className="px-3 py-6 text-center text-slate-400">
                              No matching records found.
                            </td>
                          </tr>
                        ) : (
                          activeDatasetRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-emerald-950/30">
                              {activeDatasetColumns.map((col) => (
                                <td key={col} className="px-3 py-1.5 text-slate-200 whitespace-nowrap">
                                  {row[col] !== undefined && row[col] !== null ? String(row[col]) : '-'}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeDatasetDef.fieldInfo.map((f) => (
                    <div
                      key={f.field}
                      className="p-3 rounded-xl bg-[#020a06] border border-emerald-900/60 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-300">{f.field}</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {f.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{f.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* VIEW 2: CASE 01 / CASE 02 / CASE 03 (2 MCQ QUESTIONS PER CASE)   */}
        {/* ================================================================ */}
        {activeNav !== 'DATASET' && activeCase && (
          <section className="space-y-4">
            {/* Case Header & Progress Summary */}
            <div className="rounded-2xl bg-[#04140d]/90 border border-emerald-500/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    CASE 0{activeCase.caseNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {activeCase.totalMarks} MARKS
                  </span>
                  {isActiveCaseSubmitted && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      SUBMITTED
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white">{activeCase.caseTitle}</h2>
                <p className="text-xs text-slate-300">{activeCase.caseDescription}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {savedToast && (
                  <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                    {savedToast}
                  </span>
                )}
                <div className="text-right font-mono">
                  <div className="text-[10px] uppercase text-slate-400">Case Progress</div>
                  <div className="text-sm font-bold text-emerald-300">
                    {activeCase.questions.filter((q) => Boolean(selectedOptions[q.id])).length} / {activeCase.questions.length} Selected
                  </div>
                </div>
              </div>
            </div>

            {/* Two Questions Displayed Vertically */}
            <div className="space-y-4">
              {activeCase.questions.map((q) => {
                const chosen = selectedOptions[q.id] || null;
                const subtitle = QUESTION_SUBTITLES[q.orderNumber]?.name;
                const options = q.options && q.options.length > 0
                  ? q.options
                  : [
                      { key: 'A' as const, label: 'Option A', code: '' },
                      { key: 'B' as const, label: 'Option B', code: '' },
                      { key: 'C' as const, label: 'Option C', code: '' },
                      { key: 'D' as const, label: 'Option D', code: 'None of the above expressions' },
                    ];

                return (
                  <article
                    key={q.id}
                    id={`r3-q-${q.orderNumber}`}
                    className="rounded-2xl bg-[#04140d]/95 border border-emerald-500/25 p-4 sm:p-5 space-y-4 shadow-lg"
                  >
                    {/* Question Header */}
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-emerald-900/50 pb-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
                            Q{q.orderNumber}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-white">
                            {q.title}
                            {subtitle ? ` — ${subtitle}` : ''}
                          </h3>
                        </div>
                        <p className="text-[11px] font-mono text-emerald-300/70">
                          {q.technology} &bull; {q.concept}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleFlagQuestion(q.id)}
                          className={`px-2 py-1 rounded-lg border font-mono text-[11px] flex items-center gap-1 cursor-pointer transition ${
                            flaggedQuestions[q.id]
                              ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-amber-300'
                          }`}
                          title="Flag question for review"
                        >
                          <Flag className={`w-3 h-3 ${flaggedQuestions[q.id] ? 'fill-amber-400' : ''}`} />
                          <span>{flaggedQuestions[q.id] ? 'Flagged' : 'Flag'}</span>
                        </button>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                          {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                        </span>
                        {q.isSubmitted ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[11px] font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Submitted
                          </span>
                        ) : savingQuestionId === q.id ? (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono text-[11px]">
                            Saving...
                          </span>
                        ) : chosen ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-700/60 text-emerald-300 font-mono text-[11px]">
                            Saved ({chosen})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 font-mono text-[11px]">
                            Unanswered
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Problem Description */}
                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line bg-[#020a06]/80 border border-emerald-950 rounded-xl p-3.5">
                      {formatProblemDescription(q.description)}
                    </div>

                    {/* 4 Selectable MCQ Option Cards (A, B, C, D) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {options.map((opt) => {
                        const isSelected = chosen === opt.key;
                        const disabled = q.isSubmitted || isLocked || isCompetitionPaused || isLockedByProctoring;

                        return (
                          <button
                            key={opt.key}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleSelectOption(q, opt.key)}
                            className={`text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                              disabled ? 'cursor-not-allowed opacity-85' : 'cursor-pointer'
                            } ${
                              isSelected
                                ? 'bg-emerald-500/15 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                : 'bg-[#020a06] border-emerald-900/60 hover:border-emerald-500/50 hover:bg-emerald-950/30'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border ${
                                isSelected
                                  ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                                  : 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80'
                              }`}
                            >
                              {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : opt.key}
                            </span>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="text-[11px] font-mono font-bold uppercase text-slate-400">
                                {opt.label || `Option ${opt.key}`}
                              </div>
                              {opt.code ? (
                                <pre className="font-mono text-xs text-slate-100 break-words whitespace-pre-wrap leading-relaxed bg-black/30 rounded-lg p-2 overflow-x-auto">
                                  {highlightPython(opt.code)}
                                </pre>
                              ) : (
                                <div className="font-mono text-xs text-slate-100 break-words whitespace-pre-wrap">
                                  {opt.label}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Single SUBMIT CASE Bar */}
            <div className="rounded-2xl bg-[#04140d]/95 border border-emerald-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-300">
                {isActiveCaseSubmitted ? (
                  <span className="text-emerald-300 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Case 0{activeCase.caseNumber} has been submitted and locked.
                  </span>
                ) : (
                  <span>
                    Select one option for both questions in Case 0{activeCase.caseNumber}, then submit the case together.
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={!isActiveCaseReadyToSubmit || submittingCaseNum === activeCase.caseNumber}
                onClick={handleSubmitCase}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
              >
                {submittingCaseNum === activeCase.caseNumber ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Case...</span>
                  </>
                ) : isActiveCaseSubmitted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Case 0{activeCase.caseNumber} Submitted</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Case</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Minimal Footer: Timer & Overall Progress */}
      <footer className="sticky bottom-0 z-30 bg-[#03120b]/95 backdrop-blur-md border-t border-emerald-500/20">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${timer.secondsLeft > 0 && timer.secondsLeft <= 300 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
              <span className="text-slate-400">TIME LEFT:</span>
              <span className={`font-bold text-sm ${timer.secondsLeft > 0 && timer.secondsLeft <= 300 ? 'text-rose-400' : 'text-white'}`}>
                {timer.formatted}
              </span>
            </div>

            <div className="text-slate-300">
              ANSWERS: <strong className="text-emerald-300">{totalAnsweredCount} / {allQuestions.length || 6}</strong>
            </div>

            <div className="text-slate-300">
              CASES SUBMITTED: <strong className="text-amber-300">{submittedCasesCount} / 3</strong>
              {totalSubmittedCount > 0 && (
                <span className="text-slate-500 ml-1">({totalSubmittedCount} Qs)</span>
              )}
            </div>
          </div>

          {!arenaState?.isSubmitted && !isConcluded && (
            <button
              type="button"
              disabled={submittedCasesCount < 3 || isFinalizing || isLocked}
              onClick={() => setShowFinalModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Finalize Round 3</span>
            </button>
          )}
        </div>
      </footer>

      {/* Finalize Round 3 Confirmation Modal */}
      {showFinalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#04140d] border border-amber-500/40 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Finalize Round 3 Submission?</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              You have submitted all 3 cases ({totalSubmittedCount}/6 questions). Finalizing locks Round 3 permanently for your team.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFinalModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isFinalizing}
                onClick={handleFinalizeRound3}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isFinalizing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Finalize</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Warning Modal */}
      {showLeaveWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#04140d] border border-amber-500/40 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Return to Team Dashboard?</h3>
            <p className="text-xs text-slate-300">
              Your saved selections and submitted cases remain preserved, and the Round 3 server timer continues running.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveWarningModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Stay in Round 3
              </button>
              <button
                type="button"
                onClick={() => navigate('/team/dashboard')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
              >
                Leave to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Round Concluded Modal */}
      {showConcludedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#04140d] border border-emerald-500/40 p-6 text-center space-y-4">
            <Clock className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Round 3 Time Concluded</h3>
            <p className="text-xs text-slate-300">
              The Round 3 timer has expired. All saved selections and submitted cases have been recorded.
            </p>
            <button
              type="button"
              onClick={() => navigate('/team/dashboard')}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

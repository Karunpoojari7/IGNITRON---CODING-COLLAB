import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Code2,
  Play,
  Send,
  AlertTriangle,
  Loader2,
  Clock,
  CheckCircle2,
  ChevronRight,
  Download,
  Search,
  Lock,
  Flame,
  Trophy,
  BarChart2,
  Save,
  Info,
  Eye,
  ChevronDown,
  X,
} from 'lucide-react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

import { useAuth } from '../../context/AuthContext';
import { questionAndArenaService } from '../../services/question-and-arena.service';
import { useCompetitionState, useServerTimer } from '../../hooks/useCompetition';
import {
  AnalyticsArenaStateDto,
  AnalyticsQuestionDto,
  AnalyticsSubmissionResultDto,
} from '@ignitron/shared';

// Custom dark theme for CodeMirror matching IGNITRON emerald / forest-green aesthetic
const customDarkTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: '#010a07',
    color: '#e2e8f0',
  },
  '.cm-content': {
    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    lineHeight: '1.6',
    fontSize: '13px',
  },
  '.cm-gutters': {
    backgroundColor: '#010604',
    color: '#1a4332',
    borderRight: '1px solid #063c2c',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#064e3b33',
    color: '#00F5A0',
  },
  '.cm-activeLine': {
    backgroundColor: '#064e3b15',
  },
  '.cm-selectionMatch': {
    backgroundColor: '#00F5A022',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#00F5A0',
  },
});

// Default Mock/Telemetry dataset matching reference screenshot
const LEADERBOARD_ROWS = [
  { teamId: 'T101', teamName: 'Orion', r1: 28, r2: 86, r3: 91, penalty: 120 },
  { teamId: 'T102', teamName: 'ByteForge', r1: 29, r2: 82, r3: 91, penalty: 90 },
  { teamId: 'T103', teamName: 'NullNinjas', r1: 27, r2: 90, r3: 88, penalty: 60 },
  { teamId: 'T104', teamName: 'LogicLoop', r1: 25, r2: 86, r3: 94, penalty: 180 },
  { teamId: 'T105', teamName: 'StackSquad', r1: 29, r2: 82, r3: 88, penalty: 90 },
  { teamId: 'T106', teamName: 'CodeCrafters', r1: 26, r2: 85, r3: 88, penalty: 75 },
  { teamId: 'T107', teamName: 'BitBlazers', r1: 24, r2: 80, r3: 84, penalty: 30 },
  { teamId: 'T108', teamName: 'AlgoAces', r1: 26, r2: 85, r3: 88, penalty: 75 },
];

const LEADERBOARD_FIELD_INFO = [
  { field: 'Team ID', type: 'string', desc: 'Unique team registration identifier (e.g. T101)' },
  { field: 'Team Name', type: 'string', desc: 'Registered collegiate team display name' },
  { field: 'R1', type: 'integer (0-30)', desc: 'Points awarded in Round 1: MCQ Arena' },
  { field: 'R2', type: 'integer (0-100)', desc: 'Points awarded in Round 2: Bug Hunt Arena' },
  { field: 'R3', type: 'integer (0-100)', desc: 'Points awarded in Round 3: Event Analytics Engine' },
  { field: 'Penalty (s)', type: 'integer (seconds)', desc: 'Cumulative execution time & penalty used for Case 3 tie-breaking' },
];

// Visual metadata per question matching reference design
interface DisplayMeta {
  shortTitle: string;
  caseBadge: string;
  caseGroupTitle: string;
  promptText: string;
  optionsFallback?: { key: 'A' | 'B' | 'C' | 'D'; label: string; code?: string; subtext?: string }[];
  rules: string[];
}

const QUESTION_DISPLAY_META: Record<number, DisplayMeta> = {
  1: {
    shortTitle: 'Total Score Calculation',
    caseBadge: 'Case 1 – Basic Analytics',
    caseGroupTitle: 'Case 1: Basic Analytics',
    promptText: 'Which implementation is correct?',
    optionsFallback: [
      { key: 'A', label: 'Option A', code: 'total = r1 + r2 + r3' },
      { key: 'B', label: 'Option B', code: 'total = r1 + r2' },
      { key: 'C', label: 'Option C', code: 'total = r1 + r2 + r3 - penaltySeconds' },
      { key: 'D', label: 'Option D', subtext: 'None of these are correct? Write the correct implementation in the editor below.' },
    ],
    rules: [
      'Total score = R1 + R2 + R3.',
      'Penalty seconds are not part of the score (used for tie-breaking in Case 3).',
      'All scores are integers (R1 ≤ 30, R2 ≤ 100, R3 ≤ 100).',
      'Use the given dataset for the questions in this round.',
    ],
  },
  2: {
    shortTitle: 'Leaderboard Ranking',
    caseBadge: 'Case 1 – Basic Analytics',
    caseGroupTitle: 'Case 1: Basic Analytics',
    promptText: 'Implement normalized multi-round leaderboard ranking in Python:',
    rules: [
      'Rank teams by total weighted performance in descending order.',
      'Normalize Round 1 out of 30, Round 2 out of 100, Round 3 out of 100.',
      'Weighted formula = (r1_pct * 0.30) + (r2_pct * 0.30) + (r3_pct * 0.40).',
      'Sort teams descending by average_weighted_score. If tied, sort by team_id ascending.',
    ],
  },
  3: {
    shortTitle: 'Record Validation',
    caseBadge: 'Case 2 – Data Integrity',
    caseGroupTitle: 'Case 2: Data Integrity',
    promptText: 'Select the optimal deduplication method for tournament telemetry:',
    rules: [
      'Detect and isolate duplicated submission records by participant and timestamp.',
      'Keep the earliest submission timestamp when duplicates exist.',
      'Validate that all round scores adhere to standard numerical ranges.',
      'Return clean Pandas DataFrame without row fragmentation.',
    ],
  },
  4: {
    shortTitle: 'Duplicate Handling',
    caseBadge: 'Case 2 – Data Integrity',
    caseGroupTitle: 'Case 2: Data Integrity',
    promptText: 'Implement IQR statistical anomaly filter for submission latencies:',
    rules: [
      'Compute Interquartile Range (IQR = Q3 - Q1) for runtime anomalies.',
      'Outlier boundaries: Lower = Q1 - 1.5 * IQR, Upper = Q3 + 1.5 * IQR.',
      'Filter out submission anomalies outside valid operational thresholds.',
      'Flag suspicious records with anomaly score for tournament review.',
    ],
  },
  5: {
    shortTitle: 'Tie-Breaking Logic',
    caseBadge: 'Case 3 – Advanced Analytics',
    caseGroupTitle: 'Case 3: Advanced Analytics',
    promptText: 'Select the multi-column tie-breaker expression adhering to tournament rules:',
    rules: [
      'Primary sort: Total Weighted Score descending.',
      'First tie-breaker: Round 3 score descending.',
      'Second tie-breaker: Cumulative penalty seconds ascending.',
      'Final tie-breaker: Team ID ascending.',
    ],
  },
  6: {
    shortTitle: 'Top K Leaderboard',
    caseBadge: 'Case 3 – Advanced Analytics',
    caseGroupTitle: 'Case 3: Advanced Analytics',
    promptText: 'Construct the Master Top-K tournament decision engine:',
    rules: [
      'Aggregate all multi-table relational datasets across all 50 collegiate teams.',
      'Filter top K qualifying teams for finals advancement.',
      'Produce JSON ranking payload strictly adhering to official tournament specification.',
      'Edge cases: Handle empty groups and identical scores gracefully.',
    ],
  },
};

export const EventAnalyticsArenaPage: React.FC = () => {
  const { user } = useAuth();
  const teamUser = user?.type === 'TEAM' ? (user as any) : null;
  const navigate = useNavigate();

  // Loading & error states
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Arena state from backend
  const [arenaState, setArenaState] = useState<AnalyticsArenaStateDto | null>(null);

  // Active question navigation
  const [activeQuestionId, setActiveQuestionId] = useState<string>('');

  // Interactive Question State
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [editorCode, setEditorCode] = useState<string>('');
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [lastSavedToast, setLastSavedToast] = useState<string | null>(null);

  // Execution & Submission state
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testRunOutput, setTestRunOutput] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<AnalyticsSubmissionResultDto | null>(null);

  // Right Panel State: Dataset Explorer Tab ('DATASET' | 'FIELD_INFO')
  const [activeRightTab, setActiveRightTab] = useState<'DATASET' | 'FIELD_INFO'>('DATASET');
  const [selectedDatasetFile, setSelectedDatasetFile] = useState<string>('IGNITRON_LEADERBOARD');

  // Full Dataset Modal State
  const [showFullDatasetModal, setShowFullDatasetModal] = useState(false);
  const [datasetSearch, setDatasetSearch] = useState<string>('');
  const [datasetPage, setDatasetPage] = useState<number>(1);
  const [backendDatasetData, setBackendDatasetData] = useState<any | null>(null);
  const [isBackendDatasetLoading, setIsBackendDatasetLoading] = useState(false);

  // Final review modal
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Authoritative Competition State & Server Timer
  const { data: compState } = useCompetitionState();
  const isRoundActive =
    compState?.currentRoundNumber === 3 && compState?.status === 'ROUND_3_ACTIVE';
  const timer = useServerTimer(
    isRoundActive ? compState?.deadlineAt : null,
    arenaState?.isPaused ?? false,
    arenaState?.remainingSeconds ?? 3564, // 59:24 default matching reference
  );

  // --------------------------------------------------------------------------
  // 1. INITIAL DATA FETCH
  // --------------------------------------------------------------------------
  const fetchArenaState = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const state = await questionAndArenaService.getAnalyticsArenaState();
      setArenaState(state);

      if (state.cases.length > 0 && state.cases[0].questions.length > 0) {
        const firstQ = state.cases[0].questions[0];
        setActiveQuestionId((prev) => prev || firstQ.id);
      }
    } catch (err: any) {
      console.error('Failed to load Round 3 state:', err);
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to initialize Event Analytics Arena.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArenaState();
  }, [fetchArenaState]);

  // Find active question object
  const activeQuestion: AnalyticsQuestionDto | null = useMemo(() => {
    if (!arenaState || !activeQuestionId) return null;
    for (const c of arenaState.cases) {
      const q = c.questions.find((item) => item.id === activeQuestionId);
      if (q) return q;
    }
    return null;
  }, [arenaState, activeQuestionId]);

  // Flatten all questions
  const allQuestions = useMemo(() => {
    if (!arenaState) return [];
    return arenaState.cases.flatMap((c) => c.questions);
  }, [arenaState]);

  const activeQuestionIndex = useMemo(() => {
    return allQuestions.findIndex((q) => q.id === activeQuestionId);
  }, [allQuestions, activeQuestionId]);

  const activeOrderNumber = activeQuestion?.orderNumber || (activeQuestionIndex >= 0 ? activeQuestionIndex + 1 : 1);
  const activeMeta = QUESTION_DISPLAY_META[activeOrderNumber] || QUESTION_DISPLAY_META[1];

  // --------------------------------------------------------------------------
  // 2. SYNC CODE & OPTION WHEN ACTIVE QUESTION CHANGES
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!activeQuestion) return;

    // For Q1, if no option is selected yet, default to Option D to display write your own editor as in reference
    if (activeQuestion.orderNumber === 1 && !activeQuestion.selectedOption) {
      setSelectedOption('D');
    } else {
      setSelectedOption(activeQuestion.selectedOption || null);
    }

    const initialCode =
      activeQuestion.savedCode && activeQuestion.savedCode.trim() !== ''
        ? activeQuestion.savedCode
        : activeQuestion.starterCode;
    setEditorCode(initialCode);
    setTestRunOutput(null);
    setSubmissionResult(null);
  }, [activeQuestion?.id]);

  // --------------------------------------------------------------------------
  // 3. FETCH DATASET PREVIEW FOR MODAL
  // --------------------------------------------------------------------------
  const fetchBackendDatasetPreview = useCallback(async (file: string, page = 1, search = '') => {
    if (file === 'IGNITRON_LEADERBOARD') return;
    try {
      setIsBackendDatasetLoading(true);
      const res = await questionAndArenaService.getDatasetPreview(file, page, 15, search);
      setBackendDatasetData(res);
    } catch (err) {
      console.error('Failed to load dataset preview:', err);
    } finally {
      setIsBackendDatasetLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showFullDatasetModal && selectedDatasetFile !== 'IGNITRON_LEADERBOARD') {
      fetchBackendDatasetPreview(selectedDatasetFile, datasetPage, datasetSearch);
    }
  }, [showFullDatasetModal, selectedDatasetFile, datasetPage, datasetSearch, fetchBackendDatasetPreview]);

  // --------------------------------------------------------------------------
  // 4. AUTOSAVE DRAFT FOR CODING QUESTIONS
  // --------------------------------------------------------------------------
  const draftDebounceTimer = useRef<any>(null);

  const handleEditorChange = (value: string) => {
    setEditorCode(value);
    if (!activeQuestion) return;

    if (draftDebounceTimer.current) {
      clearTimeout(draftDebounceTimer.current);
    }

    draftDebounceTimer.current = setTimeout(async () => {
      try {
        setIsDraftSaving(true);
        await questionAndArenaService.saveAnalyticsDraft(activeQuestion.id, value);
        setLastSavedToast(new Date().toLocaleTimeString());
      } catch (err) {
        console.warn('Autosave draft failed:', err);
      } finally {
        setIsDraftSaving(false);
      }
    }, 1500);
  };

  // --------------------------------------------------------------------------
  // 5. MANUAL SAVE DRAFT
  // --------------------------------------------------------------------------
  const handleSaveDraftManual = async () => {
    if (!activeQuestion) return;
    try {
      setIsDraftSaving(true);
      if (activeQuestion.format === 'WRITE_CODE' || selectedOption === 'D') {
        await questionAndArenaService.saveAnalyticsDraft(activeQuestion.id, editorCode);
      }
      if (selectedOption) {
        await questionAndArenaService.selectAnalyticsOption(activeQuestion.id, selectedOption);
      }
      setLastSavedToast('Draft Saved ✓');
      setTimeout(() => setLastSavedToast(null), 3000);
    } catch (err: any) {
      console.error('Manual draft save failed:', err);
    } finally {
      setIsDraftSaving(false);
    }
  };

  // --------------------------------------------------------------------------
  // 6. SELECT MCQ OPTION
  // --------------------------------------------------------------------------
  const handleSelectOption = async (optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (!activeQuestion || arenaState?.isSubmitted || activeQuestion.isSubmitted) return;
    setSelectedOption(optionKey);

    try {
      await questionAndArenaService.selectAnalyticsOption(activeQuestion.id, optionKey);
      setLastSavedToast(`Option ${optionKey} Saved`);
      setTimeout(() => setLastSavedToast(null), 2500);
    } catch (err: any) {
      console.error('Failed to save selected option:', err);
    }
  };

  // --------------------------------------------------------------------------
  // 7. TEST RUN AGAINST SAMPLE TEST CASES
  // --------------------------------------------------------------------------
  const handleTestRun = async () => {
    if (!activeQuestion || isTestRunning) return;
    try {
      setIsTestRunning(true);
      const res = await questionAndArenaService.testRunAnalytics(
        activeQuestion.id,
        editorCode,
      );
      setTestRunOutput(res);
    } catch (err: any) {
      console.error('Test run failed:', err);
      setTestRunOutput({
        allPassed: false,
        passedTests: 0,
        totalTests: 1,
        testCaseResults: [
          {
            caseIndex: 1,
            passed: false,
            status: 'EXECUTION_ERROR',
            stderr: err?.response?.data?.message || err?.message || 'Execution failed',
          },
        ],
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  // --------------------------------------------------------------------------
  // 8. SUBMIT INDIVIDUAL QUESTION
  // --------------------------------------------------------------------------
  const handleSubmitQuestion = async () => {
    if (!activeQuestion || isSubmitting || arenaState?.isSubmitted) return;

    if (activeQuestion.format === 'SELECT_CODE' && !selectedOption) {
      alert('Please select an option before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await questionAndArenaService.submitAnalyticsQuestion(
        activeQuestion.id,
        selectedOption || undefined,
        activeQuestion.format === 'WRITE_CODE' || selectedOption === 'D' ? editorCode : undefined,
      );
      setSubmissionResult(res);

      // Refresh arena state
      const updatedState = await questionAndArenaService.getAnalyticsArenaState();
      setArenaState(updatedState);
    } catch (err: any) {
      console.error('Submission failed:', err);
      const msg = err?.response?.data?.message || err?.message || 'Submission failed.';
      if (msg.toLowerCase().includes('already been officially submitted')) {
        setArenaState((prev) => (prev ? { ...prev, isSubmitted: true } : prev));
      }
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // 9. FINALIZE ROUND 3
  // --------------------------------------------------------------------------
  const handleFinalizeRound = async () => {
    if (isFinalizing) return;
    try {
      setIsFinalizing(true);
      const res = await questionAndArenaService.finalizeRound3();
      setShowFinalModal(false);
      alert(res.message || 'Round 3 submitted successfully!');
      const updatedState = await questionAndArenaService.getAnalyticsArenaState();
      setArenaState(updatedState);
    } catch (err: any) {
      console.error('Finalize failed:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to finalize round.';
      if (msg.toLowerCase().includes('already been officially submitted')) {
        setShowFinalModal(false);
        setArenaState((prev) => (prev ? { ...prev, isSubmitted: true } : prev));
      }
      alert(msg);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Navigate question forward
  const handleNextQuestion = () => {
    if (activeQuestionIndex < allQuestions.length - 1) {
      setActiveQuestionId(allQuestions[activeQuestionIndex + 1].id);
    } else {
      setShowFinalModal(true);
    }
  };

  // --------------------------------------------------------------------------
  // LOADING / ERROR VIEW
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020D0A] text-[#00F5A0] flex flex-col items-center justify-center p-6 font-mono selection:bg-emerald-500/30">
        <Loader2 className="w-12 h-12 animate-spin text-[#00F5A0] mb-4" />
        <h2 className="text-xl font-bold tracking-wider uppercase text-white">
          Initializing Event Analytics Engine
        </h2>
        <p className="text-xs text-emerald-400/70 mt-2">
          Loading tournament datasets, schemas, and analytical problem statements...
        </p>
      </div>
    );
  }

  if (errorMessage || !arenaState) {
    return (
      <div className="min-h-screen bg-[#020D0A] text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-red-950/20 border border-red-500/40 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-md">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-red-200 uppercase tracking-wider mb-2">
            Access Restricted
          </h2>
          <p className="text-sm text-red-300/80 mb-6 font-mono">
            {errorMessage || 'Unable to load Event Analytics Arena.'}
          </p>
          <button
            onClick={() => navigate('/team/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 text-xs font-mono uppercase tracking-wider transition-all"
          >
            Back to Team Dashboard
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // LIVE 16:9 COMPETITION DASHBOARD (MATCHING REFERENCE IMAGE)
  // --------------------------------------------------------------------------
  return (
    <div className="h-screen max-h-screen bg-[#020D0A] text-slate-100 flex flex-col overflow-hidden font-sans select-none relative">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(0,245,160,0.08),transparent_70%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_30%_at_50%_110%,rgba(0,245,160,0.05),transparent)]" />

      {/* 1. TOP NAVIGATION BAR (~68px) */}
      <header className="h-16 px-6 bg-[#020F0B]/95 border-b border-[#0D382B] flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        {/* Left: Branding & Flame Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
            <Flame className="w-5 h-5 text-amber-400 fill-amber-400/80 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-white tracking-wider leading-none">
              IGNITRON 2K26
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#00F5A0] font-bold leading-none mt-1">
              CODING COLLAB
            </span>
          </div>
        </div>

        {/* Center: 3 Round Navigation Pills */}
        <div className="flex items-center gap-3">
          {/* Round 1 */}
          <div className="px-4 py-1.5 rounded-full bg-[#031812] border border-[#0F4A37] text-emerald-400/80 font-mono text-xs font-medium flex items-center gap-1.5 shadow-sm">
            <span>Round 1</span>
            <span className="text-[#00F5A0] font-bold">✓</span>
          </div>

          {/* Round 2 */}
          <div className="px-4 py-1.5 rounded-full bg-[#031812] border border-[#0F4A37] text-emerald-400/80 font-mono text-xs font-medium flex items-center gap-1.5 shadow-sm">
            <span>Round 2</span>
            <span className="text-[#00F5A0] font-bold">✓</span>
          </div>

          {/* Round 3 (Active Emerald Pill) */}
          <div className="px-5 py-1.5 rounded-full bg-[#04241B] border-2 border-[#00F5A0] text-[#00F5A0] font-mono text-xs font-bold shadow-[0_0_15px_rgba(0,245,160,0.35)] flex items-center gap-2">
            <span>Round 3</span>
            <span className="font-normal text-emerald-300">Final Round</span>
          </div>
        </div>

        {/* Right: Team Badge & Gold Timer Card */}
        <div className="flex items-center gap-4">
          {/* Team Dropdown Pill */}
          <div className="px-3.5 py-1.5 rounded-xl bg-[#031913] border border-[#0E4735] text-emerald-300 font-mono text-xs flex items-center gap-2 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-[#00F5A0] shadow-[0_0_6px_#00F5A0]" />
            <span className="font-semibold text-slate-200">
              Team: {teamUser?.teamName || arenaState?.activeParticipantName || 'CodeCrafters'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-500" />
          </div>

          {/* Gold Timer Card */}
          <div className="px-4 py-1 rounded-xl bg-[#03150F] border-2 border-[#E7B948] flex items-center gap-3 shadow-[0_0_15px_rgba(231,185,72,0.25)]">
            <Clock className="w-5 h-5 text-[#E7B948]" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#E7B948] font-bold leading-none">
                Time Left
              </span>
              <span className="text-xl font-mono font-black text-[#FFD45A] tracking-wider leading-none mt-0.5">
                {timer.formatted.replace(':', ' : ')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. ROUND TITLE BANNER (~64px) */}
      <div className="mx-6 mt-2.5 mb-2 px-5 py-2.5 rounded-2xl border border-[#0D4030] bg-gradient-to-r from-[#031A14] via-[#05241C] to-[#02130F] flex items-center justify-between shadow-lg relative overflow-hidden shrink-0 z-10">
        {/* Left: Trophy + Title + Final Round Badge */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#FBBF24] shadow-[0_0_12px_rgba(251,191,36,0.25)] shrink-0">
            <Trophy className="w-5 h-5 text-amber-400 fill-amber-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-extrabold text-white tracking-wide">
                Round 3 – IGNITRON Event Analytics Engine
              </h1>
              <span className="px-2.5 py-0.5 rounded-md border border-[#E7B948]/60 bg-[#E7B948]/10 text-[#FFD45A] font-mono text-[10px] font-bold uppercase tracking-wider">
                Final Round
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-normal">
              Build the analytics engine that powers the IGNITRON leaderboard.
            </p>
          </div>
        </div>

        {/* Right: Green Telemetry Silhouettes Graphic */}
        <div className="flex items-end gap-1 opacity-40 pr-2">
          {[14, 22, 18, 30, 24, 38, 28, 42, 35, 48, 32, 26, 40, 46, 36].map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}px` }}
              className="w-1 rounded-t-sm bg-gradient-to-t from-emerald-900 to-[#00F5A0]"
            />
          ))}
        </div>
      </div>

      {/* 3. MAIN 3-COLUMN WORKSPACE (Left 21%, Center 53%, Right 26%) */}
      <div className="flex-1 flex gap-3 px-6 pb-2 min-h-0 overflow-hidden z-10">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: ROUND 3 OVERVIEW & QUESTION MATRIX (21%)                */}
        {/* ==================================================================== */}
        <aside className="w-[21%] min-w-[270px] max-w-[320px] flex flex-col gap-2 overflow-y-auto pr-0.5 scrollbar-none">
          {/* Overview Card */}
          <div className="rounded-2xl border border-[#0D4030] bg-[#031712]/90 p-3 backdrop-blur-sm flex flex-col gap-2 shadow-sm shrink-0">
            <div className="flex items-center gap-2 text-slate-200">
              <BarChart2 className="w-4 h-4 text-[#00F5A0]" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
                Round 3 Overview
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-[#0D4030]/60">
              <div>
                <span className="text-slate-300 font-semibold">6 Questions</span>
              </div>
              <div className="text-right">
                <span className="text-slate-300 font-semibold">100 Marks</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">3 Cases</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[11px]">Code + Logic</span>
              </div>
            </div>
          </div>

          {/* Case 1: Basic Analytics */}
          <div className="rounded-2xl border border-[#0D4030] bg-[#031712]/90 p-2.5 backdrop-blur-sm flex flex-col gap-1.5 shadow-sm shrink-0">
            <div className="flex items-center justify-between text-xs font-mono px-1 pb-1 border-b border-[#0D4030]/50">
              <span className="font-bold text-slate-200">Case 1: Basic Analytics</span>
              <span className="text-slate-400 text-[11px]">(20 Marks)</span>
            </div>

            {/* Q1 */}
            {(() => {
              const q1 = allQuestions.find((q) => q.orderNumber === 1);
              const isSelected = activeQuestion?.orderNumber === 1;
              return (
                <button
                  onClick={() => q1 && setActiveQuestionId(q1.id)}
                  className={`w-full p-2 rounded-xl text-left font-mono text-xs transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-[#04281E] border-[#00F5A0] text-white shadow-[0_0_10px_rgba(0,245,160,0.25)]'
                      : 'bg-black/30 border-transparent hover:bg-[#042017] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded-full bg-[#00F5A0] text-black font-black text-[10px] flex items-center justify-center shrink-0">
                      Q1
                    </span>
                    <span className="truncate font-medium text-[11px]">Total Score Calculation</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-bold ml-2">10</span>
                </button>
              );
            })()}

            {/* Q2 */}
            {(() => {
              const q2 = allQuestions.find((q) => q.orderNumber === 2);
              const isSelected = activeQuestion?.orderNumber === 2;
              return (
                <button
                  onClick={() => q2 && setActiveQuestionId(q2.id)}
                  className={`w-full p-2 rounded-xl text-left font-mono text-xs transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-[#04281E] border-[#00F5A0] text-white shadow-[0_0_10px_rgba(0,245,160,0.25)]'
                      : 'bg-black/30 border-transparent hover:bg-[#042017] text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-400">Q2</span>
                    <span className="truncate text-[11px]">Leaderboard Ranking</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-bold ml-2">10</span>
                </button>
              );
            })()}
          </div>

          {/* Case 2: Data Integrity */}
          <div className="rounded-2xl border border-[#0D4030] bg-[#031712]/90 p-2.5 backdrop-blur-sm flex flex-col gap-1.5 shadow-sm shrink-0">
            <div className="flex items-center justify-between text-xs font-mono px-1 pb-1 border-b border-[#0D4030]/50">
              <span className="font-bold text-slate-200">Case 2: Data Integrity</span>
              <span className="text-slate-400 text-[11px]">(25 Marks)</span>
            </div>

            {/* Q3 */}
            {(() => {
              const q3 = allQuestions.find((q) => q.orderNumber === 3);
              const isSelected = activeQuestion?.orderNumber === 3;
              return (
                <button
                  onClick={() => q3 && setActiveQuestionId(q3.id)}
                  className={`w-full p-2 rounded-xl text-left font-mono text-xs transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-[#04281E] border-[#00F5A0] text-white shadow-[0_0_10px_rgba(0,245,160,0.25)]'
                      : 'bg-black/30 border-transparent hover:bg-[#042017] text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-400">Q3</span>
                    <span className="truncate text-[11px]">Record Validation</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-bold ml-2">12</span>
                </button>
              );
            })()}

            {/* Q4 */}
            {(() => {
              const q4 = allQuestions.find((q) => q.orderNumber === 4);
              const isSelected = activeQuestion?.orderNumber === 4;
              return (
                <button
                  onClick={() => q4 && setActiveQuestionId(q4.id)}
                  className={`w-full p-2 rounded-xl text-left font-mono text-xs transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-[#04281E] border-[#00F5A0] text-white shadow-[0_0_10px_rgba(0,245,160,0.25)]'
                      : 'bg-black/30 border-transparent hover:bg-[#042017] text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-400">Q4</span>
                    <span className="truncate text-[11px]">Duplicate Handling</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-bold ml-2">13</span>
                </button>
              );
            })()}
          </div>

          {/* Case 3: Advanced Analytics */}
          <div className="rounded-2xl border border-[#0D4030] bg-[#031712]/90 p-2.5 backdrop-blur-sm flex flex-col gap-1.5 shadow-sm shrink-0">
            <div className="flex items-center justify-between text-xs font-mono px-1 pb-1 border-b border-[#0D4030]/50">
              <span className="font-bold text-slate-200">Case 3: Advanced Analytics</span>
              <span className="text-slate-400 text-[11px]">(45 Marks)</span>
            </div>

            {/* Q5 */}
            {(() => {
              const q5 = allQuestions.find((q) => q.orderNumber === 5);
              const isSelected = activeQuestion?.orderNumber === 5;
              return (
                <button
                  onClick={() => q5 && setActiveQuestionId(q5.id)}
                  className={`w-full p-2 rounded-xl text-left font-mono text-xs transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-[#04281E] border-[#00F5A0] text-white shadow-[0_0_10px_rgba(0,245,160,0.25)]'
                      : 'bg-black/30 border-transparent hover:bg-[#042017] text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-400">Q5</span>
                    <span className="truncate text-[11px]">Tie-Breaking Logic</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-bold ml-2">22</span>
                </button>
              );
            })()}

            {/* Q6 */}
            {(() => {
              const q6 = allQuestions.find((q) => q.orderNumber === 6);
              const isSelected = activeQuestion?.orderNumber === 6;
              return (
                <button
                  onClick={() => q6 && setActiveQuestionId(q6.id)}
                  className={`w-full p-2 rounded-xl text-left font-mono text-xs transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-[#04281E] border-[#00F5A0] text-white shadow-[0_0_10px_rgba(0,245,160,0.25)]'
                      : 'bg-black/30 border-transparent hover:bg-[#042017] text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-400">Q6</span>
                    <span className="truncate text-[11px]">Top K Leaderboard</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-bold ml-2">23</span>
                </button>
              );
            })()}
          </div>

          {/* Bottom Rubric: Code Quality Card */}
          <div className="rounded-xl border border-[#0D4030] bg-[#031712]/90 p-2.5 flex items-center justify-between font-mono text-xs shadow-sm mt-auto shrink-0">
            <div className="flex items-center gap-1.5 text-[#00F5A0]">
              <Code2 className="w-3.5 h-3.5" />
              <span className="text-[10px] text-slate-300 font-semibold">
                Code Quality (Across Q2, Q4, Q6)
              </span>
            </div>
            <span className="text-amber-400 font-black text-xs">10</span>
          </div>
        </aside>

        {/* ==================================================================== */}
        {/* CENTER COLUMN: ACTIVE QUESTION WORKSPACE (53%)                       */}
        {/* ==================================================================== */}
        <main className="flex-1 flex flex-col gap-2.5 min-w-0 overflow-y-auto px-0.5 scrollbar-thin">
          <div className="rounded-2xl border border-[#0D4030] bg-[#02130F]/95 p-4 backdrop-blur-sm flex flex-col gap-3 shadow-xl shrink-0">
            {/* Header: Q Badge + Title + Case Pill + Marks Badge */}
            <div className="flex items-center justify-between border-b border-[#0D4030]/60 pb-2.5">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-lg bg-[#00F5A0] text-black font-mono font-black text-xs shadow-[0_0_8px_#00F5A0]">
                  Q{activeOrderNumber}
                </span>
                <h2 className="text-base font-bold text-white tracking-wide">
                  {activeMeta.shortTitle}
                </h2>
                <span className="px-3 py-0.5 rounded-full border border-emerald-800/80 bg-emerald-950/40 text-emerald-300 text-[10px] font-mono">
                  {activeMeta.caseBadge}
                </span>
              </div>

              <div className="px-3 py-1 rounded-full border border-[#00F5A0]/50 bg-emerald-950/60 text-[#00F5A0] text-xs font-mono font-bold shadow-sm">
                {activeQuestion?.marks || 10} Marks
              </div>
            </div>

            {/* Problem Description */}
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {activeOrderNumber === 1
                ? 'The Event Analytics Engine must calculate the total score of every team using the three competition rounds (Round 1, Round 2 and Round 3).'
                : activeQuestion?.description?.replace(/### Operational Briefing/, '')?.trim() ||
                  activeQuestion?.description}
            </p>

            {/* Prompt Callout */}
            <div className="border-l-4 border-[#00F5A0] pl-3 py-0.5 bg-gradient-to-r from-emerald-950/30 to-transparent">
              <span className="text-xs font-bold text-[#00F5A0] font-mono tracking-wide">
                {activeMeta.promptText}
              </span>
            </div>

            {/* 2×2 Options Grid */}
            {activeQuestion?.format === 'SELECT_CODE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {/* OPTION A */}
                <div
                  onClick={() => handleSelectOption('A')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    selectedOption === 'A'
                      ? 'bg-[#04281E] border-[#00F5A0] shadow-[0_0_12px_rgba(0,245,160,0.25)]'
                      : 'bg-[#010907] border-[#0C3527] hover:border-emerald-700/60'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedOption === 'A'
                          ? 'border-[#00F5A0] bg-[#00F5A0]/20'
                          : 'border-slate-600'
                      }`}
                    >
                      {selectedOption === 'A' && (
                        <div className="w-2 h-2 rounded-full bg-[#00F5A0]" />
                      )}
                    </div>
                    <span className="font-bold text-slate-200">Option A</span>
                  </div>
                  <div className="p-2 rounded bg-[#010604] border border-[#0A261C] font-mono text-[11px] text-slate-200">
                    <code>
                      {activeQuestion?.options?.[0]?.code ||
                        activeMeta.optionsFallback?.[0]?.code ||
                        'total = r1 + r2 + r3'}
                    </code>
                  </div>
                </div>

                {/* OPTION B */}
                <div
                  onClick={() => handleSelectOption('B')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    selectedOption === 'B'
                      ? 'bg-[#04281E] border-[#00F5A0] shadow-[0_0_12px_rgba(0,245,160,0.25)]'
                      : 'bg-[#010907] border-[#0C3527] hover:border-emerald-700/60'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedOption === 'B'
                          ? 'border-[#00F5A0] bg-[#00F5A0]/20'
                          : 'border-slate-600'
                      }`}
                    >
                      {selectedOption === 'B' && (
                        <div className="w-2 h-2 rounded-full bg-[#00F5A0]" />
                      )}
                    </div>
                    <span className="font-bold text-slate-200">Option B</span>
                  </div>
                  <div className="p-2 rounded bg-[#010604] border border-[#0A261C] font-mono text-[11px] text-slate-200">
                    <code>
                      {activeQuestion?.options?.[1]?.code ||
                        activeMeta.optionsFallback?.[1]?.code ||
                        'total = r1 + r2'}
                    </code>
                  </div>
                </div>

                {/* OPTION C */}
                <div
                  onClick={() => handleSelectOption('C')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    selectedOption === 'C'
                      ? 'bg-[#04281E] border-[#00F5A0] shadow-[0_0_12px_rgba(0,245,160,0.25)]'
                      : 'bg-[#010907] border-[#0C3527] hover:border-emerald-700/60'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedOption === 'C'
                          ? 'border-[#00F5A0] bg-[#00F5A0]/20'
                          : 'border-slate-600'
                      }`}
                    >
                      {selectedOption === 'C' && (
                        <div className="w-2 h-2 rounded-full bg-[#00F5A0]" />
                      )}
                    </div>
                    <span className="font-bold text-slate-200">Option C</span>
                  </div>
                  <div className="p-2 rounded bg-[#010604] border border-[#0A261C] font-mono text-[11px] text-slate-200">
                    <code>
                      {activeQuestion?.options?.[2]?.code ||
                        activeMeta.optionsFallback?.[2]?.code ||
                        'total = r1 + r2 + r3 - penaltySeconds'}
                    </code>
                  </div>
                </div>

                {/* OPTION D (GOLD CARD WITH "WRITE YOUR OWN" BADGE) */}
                <div
                  onClick={() => handleSelectOption('D')}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-1.5 shadow-[0_0_12px_rgba(231,185,72,0.15)] ${
                    selectedOption === 'D'
                      ? 'bg-[#181406] border-[#E7B948] ring-1 ring-[#FFD45A]'
                      : 'bg-[#100E05] border-[#E7B948]/70 hover:border-[#E7B948]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedOption === 'D'
                            ? 'border-[#E7B948] bg-[#E7B948]/20'
                            : 'border-amber-600'
                        }`}
                      >
                        {selectedOption === 'D' && (
                          <div className="w-2 h-2 rounded-full bg-[#FFD45A]" />
                        )}
                      </div>
                      <span className="font-bold text-[#FFD45A]">Option D</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md border border-[#E7B948] bg-amber-500/20 text-[#FFD45A] text-[10px] font-mono font-bold">
                      &lt;/&gt; Write Your Own
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-amber-200/80 leading-snug">
                    {activeMeta.optionsFallback?.[3]?.subtext ||
                      'None of these are correct? Write the correct implementation in the editor below.'}
                  </p>
                </div>
              </div>
            )}

            {/* Code Editor Section (Option D or WRITE_CODE questions) */}
            <div className="flex flex-col rounded-xl border border-[#0D4030] bg-[#010A07] overflow-hidden mt-1 shadow-inner">
              {/* Header Bar */}
              <div className="px-3.5 py-1.5 bg-[#020F0B] border-b border-[#0D4030] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-[#00F5A0] font-bold">
                  <Code2 className="w-4 h-4" />
                  <span>
                    Your Code ({activeQuestion?.format === 'WRITE_CODE' ? 'solution.py' : 'Option D'})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {lastSavedToast && (
                    <span className="text-[11px] text-[#00F5A0] animate-fade-in font-bold">
                      {lastSavedToast}
                    </span>
                  )}
                  {isDraftSaving && (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#010907] border border-[#0E4735] text-emerald-300 text-[11px]">
                    <span className="text-slate-400">Language:</span>
                    <span className="font-bold text-white">Python 3</span>
                    <ChevronDown className="w-3 h-3 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* CodeMirror Editor */}
              <div className="h-36 overflow-hidden">
                <CodeMirror
                  value={editorCode}
                  height="100%"
                  extensions={[python(), customDarkTheme]}
                  theme={oneDark}
                  onChange={handleEditorChange}
                  editable={!arenaState.isSubmitted}
                  placeholder="# Write your corrected implementation here..."
                />
              </div>

              {/* Editor Bottom Actions & Execution Feedback */}
              <div className="px-3 py-1.5 bg-[#020F0B] border-t border-[#0D4030] flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestRun}
                    disabled={isTestRunning || arenaState.isSubmitted}
                    className="px-3 py-1 rounded-lg bg-[#06241B] hover:bg-[#0A3326] text-[#00F5A0] border border-[#00F5A0]/30 flex items-center gap-1.5 transition-colors disabled:opacity-50 text-[11px] font-bold"
                  >
                    {isTestRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    <span>Run Sample Tests</span>
                  </button>

                  <button
                    onClick={handleSubmitQuestion}
                    disabled={isSubmitting || arenaState.isSubmitted}
                    className="px-3 py-1 rounded-lg bg-[#00F5A0] hover:bg-[#34D399] text-black font-extrabold flex items-center gap-1.5 transition-all text-[11px] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3 h-3 animate-spin text-black" />
                    ) : (
                      <Send className="w-3 h-3 text-black" />
                    )}
                    <span>{activeQuestion?.isSubmitted ? 'Update Solution' : 'Submit Question'}</span>
                  </button>
                </div>

                {/* Quick Status Pill */}
                {submissionResult ? (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                      submissionResult.isCorrect
                        ? 'bg-emerald-500/20 text-[#00F5A0] border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                    }`}
                  >
                    {submissionResult.status} ({submissionResult.score} / {submissionResult.maximumMarks} pts)
                  </span>
                ) : testRunOutput ? (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                      testRunOutput.allPassed
                        ? 'bg-emerald-500/20 text-[#00F5A0] border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {testRunOutput.passedTests} / {testRunOutput.totalTests} Tests Passed
                  </span>
                ) : activeQuestion?.isSubmitted ? (
                  <span className="text-[11px] text-[#00F5A0] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Solution Submitted
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </main>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: DATASET EXPLORER & RULES / ASSUMPTIONS (26%)           */}
        {/* ==================================================================== */}
        <aside className="w-[26%] min-w-[310px] max-w-[380px] flex flex-col gap-2 overflow-y-auto pl-0.5 scrollbar-none">
          {/* Upper Card: Dataset Explorer */}
          <div className="rounded-2xl border border-[#0D4030] bg-[#031712]/90 p-3.5 backdrop-blur-sm flex flex-col gap-2.5 shadow-lg shrink-0">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#00F5A0]" />
              <span className="text-xs font-mono font-bold text-slate-200">
                Dataset: IGNITRON Leaderboard
              </span>
            </div>

            {/* Tab Navigation: [ Dataset ] | [ Field Info ] */}
            <div className="flex items-center border-b border-[#0D4030]/60 pb-1 font-mono text-xs">
              <button
                onClick={() => setActiveRightTab('DATASET')}
                className={`px-3 py-1 font-bold transition-colors ${
                  activeRightTab === 'DATASET'
                    ? 'text-[#00F5A0] border-b-2 border-[#00F5A0]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dataset
              </button>
              <button
                onClick={() => setActiveRightTab('FIELD_INFO')}
                className={`px-3 py-1 font-bold transition-colors ${
                  activeRightTab === 'FIELD_INFO'
                    ? 'text-[#00F5A0] border-b-2 border-[#00F5A0]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Field Info
              </button>
            </div>

            {/* Content: Dataset Table Preview */}
            {activeRightTab === 'DATASET' ? (
              <div className="overflow-x-auto border border-[#0A261C] rounded-lg bg-[#010907] max-h-52 overflow-y-auto">
                <table className="w-full text-left font-mono text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#0D4030] bg-[#02130F] text-slate-300">
                      <th className="p-1.5 font-bold">Team ID</th>
                      <th className="p-1.5 font-bold">Team Name</th>
                      <th className="p-1.5 font-bold">R1</th>
                      <th className="p-1.5 font-bold">R2</th>
                      <th className="p-1.5 font-bold">R3</th>
                      <th className="p-1.5 font-bold">Penalty (s)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0A261C] text-slate-300">
                    {LEADERBOARD_ROWS.map((row) => (
                      <tr key={row.teamId} className="hover:bg-[#04241B]/40 transition-colors">
                        <td className="p-1.5 text-[#00F5A0] font-bold">{row.teamId}</td>
                        <td className="p-1.5 text-white">{row.teamName}</td>
                        <td className="p-1.5">{row.r1}</td>
                        <td className="p-1.5">{row.r2}</td>
                        <td className="p-1.5">{row.r3}</td>
                        <td className="p-1.5 text-slate-400">{row.penalty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Content: Field Info List */
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto p-1 font-mono text-xs">
                {LEADERBOARD_FIELD_INFO.map((f) => (
                  <div key={f.field} className="p-2 rounded-lg bg-[#010907] border border-[#0A261C] text-[11px]">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[#00F5A0] font-bold">{f.field}</span>
                      <span className="text-slate-400 text-[10px]">{f.type}</span>
                    </div>
                    <p className="text-slate-300 text-[10px] leading-tight">{f.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Dataset Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setShowFullDatasetModal(true)}
                className="px-3 py-1.5 rounded-lg border border-[#00F5A0]/50 hover:border-[#00F5A0] bg-[#04241B]/40 hover:bg-[#04241B] text-[#00F5A0] text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Full Dataset</span>
              </button>

              <a
                href="/api/arena/analytics/dataset-download/teams.csv"
                download="teams.csv"
                className="p-1.5 rounded-lg border border-[#0D4030] bg-[#02130F] hover:bg-[#04241B] text-slate-300 hover:text-white transition-colors"
                title="Download CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Lower Card: Rules & Assumptions */}
          <div className="rounded-2xl border border-[#0D4030] bg-[#031712]/90 p-3.5 backdrop-blur-sm flex flex-col gap-2.5 shadow-lg shrink-0">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#00F5A0]" />
              <span className="text-xs font-mono font-bold text-slate-200">
                Rules &amp; Assumptions
              </span>
            </div>

            <ul className="space-y-1.5 text-[11px] font-mono text-slate-300">
              {activeMeta.rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-[#00F5A0] shrink-0">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* 4. BOTTOM PROGRESS & ACTION BAR (~64px) */}
      <footer className="h-16 px-6 bg-[#020F0B]/95 border-t border-[#0D382B] flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        {/* Left: Progress + Case 1 / Case 2 / Case 3 Segmented Pills */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Progress
          </span>

          {/* Case 1 Pill */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-300 font-semibold text-[11px]">Case 1</span>
            <div className="flex items-center gap-1 w-20 h-2 bg-[#02130F] border border-[#0D4030] rounded-full p-0.5">
              <div
                className={`h-full rounded-full transition-all ${
                  allQuestions[0]?.isSubmitted || allQuestions[0]?.selectedOption
                    ? 'w-1/2 bg-gradient-to-r from-emerald-500 to-[#00F5A0]'
                    : activeOrderNumber === 1
                    ? 'w-1/2 bg-[#00F5A0]'
                    : 'w-0'
                }`}
              />
              <div
                className={`h-full rounded-full transition-all ${
                  allQuestions[1]?.isSubmitted
                    ? 'w-1/2 bg-gradient-to-r from-emerald-500 to-[#00F5A0]'
                    : activeOrderNumber === 2
                    ? 'w-1/2 bg-[#00F5A0]'
                    : 'w-0'
                }`}
              />
            </div>
          </div>

          {/* Case 2 Pill */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">Case 2</span>
            <div className="flex items-center gap-1 w-20 h-2 bg-[#02130F] border border-[#0D4030] rounded-full p-0.5">
              <div
                className={`h-full rounded-full transition-all ${
                  allQuestions[2]?.isSubmitted || allQuestions[2]?.selectedOption
                    ? 'w-1/2 bg-gradient-to-r from-emerald-500 to-[#00F5A0]'
                    : activeOrderNumber === 3
                    ? 'w-1/2 bg-[#00F5A0]'
                    : 'w-0'
                }`}
              />
              <div
                className={`h-full rounded-full transition-all ${
                  allQuestions[3]?.isSubmitted
                    ? 'w-1/2 bg-gradient-to-r from-emerald-500 to-[#00F5A0]'
                    : activeOrderNumber === 4
                    ? 'w-1/2 bg-[#00F5A0]'
                    : 'w-0'
                }`}
              />
            </div>
          </div>

          {/* Case 3 Pill */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">Case 3</span>
            <div className="flex items-center gap-1 w-20 h-2 bg-[#02130F] border border-[#0D4030] rounded-full p-0.5">
              <div
                className={`h-full rounded-full transition-all ${
                  allQuestions[4]?.isSubmitted || allQuestions[4]?.selectedOption
                    ? 'w-1/2 bg-gradient-to-r from-emerald-500 to-[#00F5A0]'
                    : activeOrderNumber === 5
                    ? 'w-1/2 bg-[#00F5A0]'
                    : 'w-0'
                }`}
              />
              <div
                className={`h-full rounded-full transition-all ${
                  allQuestions[5]?.isSubmitted
                    ? 'w-1/2 bg-gradient-to-r from-emerald-500 to-[#00F5A0]'
                    : activeOrderNumber === 6
                    ? 'w-1/2 bg-[#00F5A0]'
                    : 'w-0'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Right: Save Draft + Next Question Buttons */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={handleSaveDraftManual}
            disabled={isDraftSaving}
            className="px-4 py-2 rounded-xl bg-[#031812] border border-[#0E4735] hover:bg-[#06241B] text-slate-300 hover:text-white flex items-center gap-2 transition-all shadow-sm"
          >
            <Save className="w-3.5 h-3.5 text-slate-400" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={handleNextQuestion}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#00D98A] to-[#00F5A0] hover:from-[#00F5A0] hover:to-[#34D399] text-black font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(0,245,160,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{activeQuestionIndex >= allQuestions.length - 1 ? 'Finalize & Submit' : 'Next Question'}</span>
            <ChevronRight className="w-4 h-4 text-black stroke-[3]" />
          </button>
        </div>
      </footer>

      {/* ==================================================================== */}
      {/* 5. VIEW FULL DATASET MODAL                                           */}
      {/* ==================================================================== */}
      {showFullDatasetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[#031712] border border-[#00F5A0]/50 rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[#0D4030] pb-3 shrink-0">
              <div className="flex items-center gap-2 text-white">
                <Database className="w-5 h-5 text-[#00F5A0]" />
                <h3 className="text-base font-bold">IGNITRON Tournament Master Datasets</h3>
              </div>
              <button
                onClick={() => setShowFullDatasetModal(false)}
                className="text-slate-400 hover:text-white font-mono text-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 font-mono text-xs">
              <button
                onClick={() => setSelectedDatasetFile('IGNITRON_LEADERBOARD')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  selectedDatasetFile === 'IGNITRON_LEADERBOARD'
                    ? 'bg-[#00F5A0] text-black font-bold'
                    : 'bg-[#010907] border border-[#0D4030] text-slate-300'
                }`}
              >
                Leaderboard (Active)
              </button>
              {arenaState.dataset.files.map((f) => (
                <button
                  key={f.filename}
                  onClick={() => {
                    setSelectedDatasetFile(f.filename);
                    setDatasetPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    selectedDatasetFile === f.filename
                      ? 'bg-[#00F5A0] text-black font-bold'
                      : 'bg-[#010907] border border-[#0D4030] text-slate-300'
                  }`}
                >
                  {f.filename}
                </button>
              ))}
            </div>

            {/* Search filter for CSVs */}
            {selectedDatasetFile !== 'IGNITRON_LEADERBOARD' && (
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-emerald-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={datasetSearch}
                  onChange={(e) => {
                    setDatasetSearch(e.target.value);
                    setDatasetPage(1);
                  }}
                  placeholder="Search records by keyword, ID, team..."
                  className="w-full bg-[#010907] border border-[#0D4030] rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#00F5A0]"
                />
              </div>
            )}

            {/* Table Area */}
            <div className="flex-1 overflow-auto border border-[#0D4030] rounded-xl bg-[#010907]">
              {selectedDatasetFile === 'IGNITRON_LEADERBOARD' ? (
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#0D4030] bg-[#02130F] text-slate-300">
                      <th className="p-2 font-bold">Team ID</th>
                      <th className="p-2 font-bold">Team Name</th>
                      <th className="p-2 font-bold">R1 Score</th>
                      <th className="p-2 font-bold">R2 Score</th>
                      <th className="p-2 font-bold">R3 Score</th>
                      <th className="p-2 font-bold">Penalty (s)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0A261C] text-slate-300">
                    {LEADERBOARD_ROWS.map((row) => (
                      <tr key={row.teamId} className="hover:bg-[#04241B]/40">
                        <td className="p-2 text-[#00F5A0] font-bold">{row.teamId}</td>
                        <td className="p-2 text-white font-medium">{row.teamName}</td>
                        <td className="p-2">{row.r1}</td>
                        <td className="p-2">{row.r2}</td>
                        <td className="p-2">{row.r3}</td>
                        <td className="p-2 text-slate-400">{row.penalty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : isBackendDatasetLoading ? (
                <div className="h-40 flex items-center justify-center font-mono text-xs text-[#00F5A0]">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading records...
                </div>
              ) : backendDatasetData && backendDatasetData.rows.length > 0 ? (
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#0D4030] bg-[#02130F] text-slate-300">
                      {backendDatasetData.columns.map((c: string) => (
                        <th key={c} className="p-2 font-bold whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0A261C] text-slate-300">
                    {backendDatasetData.rows.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-[#04241B]/40">
                        {backendDatasetData.columns.map((c: string) => (
                          <td key={c} className="p-2 whitespace-nowrap">{String(row[c] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-xs font-mono text-slate-500">
                  No matching records found.
                </div>
              )}
            </div>

            {/* Pagination Controls for CSVs */}
            {selectedDatasetFile !== 'IGNITRON_LEADERBOARD' && backendDatasetData && (
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 shrink-0">
                <span>{backendDatasetData.totalRows} Total Records</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDatasetPage((p) => Math.max(1, p - 1))}
                    disabled={datasetPage <= 1}
                    className="px-2 py-1 rounded bg-[#010907] border border-[#0D4030] disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <span>{datasetPage} / {backendDatasetData.totalPages}</span>
                  <button
                    onClick={() => setDatasetPage((p) => Math.min(backendDatasetData.totalPages, p + 1))}
                    disabled={datasetPage >= backendDatasetData.totalPages}
                    className="px-2 py-1 rounded bg-[#010907] border border-[#0D4030] disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. FINALIZE ROUND 3 MODAL                                            */}
      {/* ==================================================================== */}
      {showFinalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#031712] border border-[#00F5A0]/60 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#0D4030] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Finalize Round 3</h3>
                  <p className="text-xs font-mono text-[#00F5A0]">
                    IGNITRON Event Analytics Engine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFinalModal(false)}
                className="text-slate-400 hover:text-white font-mono text-lg"
              >
                ✕
              </button>
            </div>

            {/* Checklist of all 6 questions */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {allQuestions.map((q) => (
                <div
                  key={q.id}
                  className="p-3 rounded-xl bg-black/40 border border-[#0D4030] flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        q.isSubmitted ? 'bg-[#00F5A0]' : 'bg-amber-400'
                      }`}
                    />
                    <span className="font-bold text-slate-200">
                      Q{q.orderNumber}: {QUESTION_DISPLAY_META[q.orderNumber]?.shortTitle || q.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{q.marks} pts</span>
                    <span
                      className={`font-bold ${
                        q.isSubmitted ? 'text-[#00F5A0]' : 'text-amber-400'
                      }`}
                    >
                      {q.isSubmitted ? 'Submitted' : 'Draft / Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300">
              Note: 10 marks are reserved for Code Quality evaluation across your analytical coding solutions, assessed by the tournament judging panel.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 font-mono text-xs">
              <button
                onClick={() => setShowFinalModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Back to Workspace
              </button>
              <button
                onClick={handleFinalizeRound}
                disabled={isFinalizing || arenaState.isSubmitted}
                className="px-6 py-2 rounded-xl bg-[#00F5A0] hover:bg-[#34D399] text-black font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,245,160,0.4)] disabled:opacity-50"
              >
                {isFinalizing ? 'Finalizing...' : 'Confirm Final Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

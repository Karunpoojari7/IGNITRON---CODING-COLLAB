import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  ChevronLeft,
  Download,
  Search,
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
import { useParticipantMonitoring } from '../../hooks/useParticipantMonitoring';
import { ExamLockOverlay } from '../../components/competition/ExamLockOverlay';
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

// Master Datasets definitions & fallback preview records
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
  'round_performance.csv': {
    fileName: 'round_performance.csv',
    dfName: 'performance',
    title: 'Multi-Round Performance Telemetry',
    description: '300 granular records tracking participant scores, accuracy, speed, and completion times across all 3 rounds.',
    columns: ['participant_id', 'round_number', 'raw_score', 'maximum_score', 'accuracy_score', 'speed_score', 'completion_score', 'completion_time_seconds', 'penalty_seconds'],
    previewRows: [
      { participant_id: 'P101', round_number: 1, raw_score: 25.4, maximum_score: 30, accuracy_score: 87.0, speed_score: 93.0, completion_score: 94.0, completion_time_seconds: 1554, penalty_seconds: 180 },
      { participant_id: 'P101', round_number: 2, raw_score: 87.4, maximum_score: 100, accuracy_score: 84.0, speed_score: 80.8, completion_score: 88.5, completion_time_seconds: 1778, penalty_seconds: 0 },
      { participant_id: 'P101', round_number: 3, raw_score: 94.6, maximum_score: 100, accuracy_score: 87.0, speed_score: 88.4, completion_score: 91.5, completion_time_seconds: 3221, penalty_seconds: 180 },
      { participant_id: 'P102', round_number: 1, raw_score: 22.7, maximum_score: 30, accuracy_score: 76.2, speed_score: 78.4, completion_score: 70.7, completion_time_seconds: 1233, penalty_seconds: 180 },
      { participant_id: 'P102', round_number: 2, raw_score: 78.5, maximum_score: 100, accuracy_score: 68.8, speed_score: 80.1, completion_score: 76.5, completion_time_seconds: 1933, penalty_seconds: 120 },
      { participant_id: 'P102', round_number: 3, raw_score: 67.7, maximum_score: 100, accuracy_score: 66.1, speed_score: 62.9, completion_score: 75.8, completion_time_seconds: 3336, penalty_seconds: 60 },
      { participant_id: 'P103', round_number: 1, raw_score: 14.1, maximum_score: 30, accuracy_score: 50.3, speed_score: 50.0, completion_score: 43.2, completion_time_seconds: 1408, penalty_seconds: 0 },
      { participant_id: 'P103', round_number: 2, raw_score: 47.0, maximum_score: 100, accuracy_score: 43.9, speed_score: 52.1, completion_score: 44.5, completion_time_seconds: 1833, penalty_seconds: 0 },
    ],
    fieldInfo: [
      { field: 'participant_id', type: 'string (PK)', desc: 'Unique contestant identification code (e.g. P101)' },
      { field: 'round_number', type: 'integer (1, 2, 3)', desc: 'Tournament competition round index' },
      { field: 'raw_score', type: 'float', desc: 'Actual points earned by the participant in this round' },
      { field: 'maximum_score', type: 'integer', desc: 'Maximum available score for the round (R1: 30, R2: 100, R3: 100)' },
      { field: 'accuracy_score', type: 'float (0-100)', desc: 'Algorithmic accuracy percentage' },
      { field: 'speed_score', type: 'float (0-100)', desc: 'Execution and completion speed rating' },
      { field: 'completion_score', type: 'float (0-100)', desc: 'Aggregate problem completion benchmark' },
      { field: 'completion_time_seconds', type: 'integer', desc: 'Total wall-clock duration in seconds' },
      { field: 'penalty_seconds', type: 'integer', desc: 'Incurred penalty seconds for failed test runs' },
    ],
  },
  'participants.csv': {
    fileName: 'participants.csv',
    dfName: 'participants',
    title: 'Tournament Participants Roster',
    description: 'Demographic and academic profiles for 100 tournament contestants across 50 collegiate teams.',
    columns: ['participant_id', 'team_id', 'participant_name', 'department', 'year', 'college'],
    previewRows: [
      { participant_id: 'P101', team_id: 'T101', participant_name: 'Akash Patel', department: 'Artificial Intelligence & Data Science', year: 4, college: 'Institute of Technology & Science' },
      { participant_id: 'P102', team_id: 'T101', participant_name: 'Vikram Chauhan', department: 'Artificial Intelligence & Data Science', year: 3, college: 'University College of Engineering' },
      { participant_id: 'P103', team_id: 'T102', participant_name: 'Chetan Kapoor', department: 'Information Technology', year: 4, college: 'Academy of Computer Studies' },
      { participant_id: 'P104', team_id: 'T102', participant_name: 'Rohit Patel', department: 'Information Technology', year: 2, college: 'Institute of Technology & Science' },
      { participant_id: 'P105', team_id: 'T103', participant_name: 'Kiran Nair', department: 'Information Technology', year: 3, college: 'University College of Engineering' },
      { participant_id: 'P106', team_id: 'T103', participant_name: 'Advait Gupta', department: 'Information Technology', year: 2, college: 'Metropolitan Technical Institute' },
      { participant_id: 'P107', team_id: 'T104', participant_name: 'Kiran Chauhan', department: 'Artificial Intelligence & Data Science', year: 3, college: 'Metropolitan Technical Institute' },
      { participant_id: 'P108', team_id: 'T104', participant_name: 'Sahil Rao', department: 'Artificial Intelligence & Data Science', year: 2, college: 'Academy of Computer Studies' },
    ],
    fieldInfo: [
      { field: 'participant_id', type: 'string (PK)', desc: 'Primary key identifying each individual participant' },
      { field: 'team_id', type: 'string (FK)', desc: 'Foreign key referencing collegiate team assignment (e.g. T101)' },
      { field: 'participant_name', type: 'string', desc: 'Full registered contestant name' },
      { field: 'department', type: 'string', desc: 'Academic engineering discipline' },
      { field: 'year', type: 'integer (1-4)', desc: 'Current academic collegiate study year' },
      { field: 'college', type: 'string', desc: 'Affiliated university or engineering institute' },
    ],
  },
  'submission_logs.csv': {
    fileName: 'submission_logs.csv',
    dfName: 'submissions',
    title: 'Code Execution Submission Logs',
    description: '1,000 real-time telemetry records tracking language runtimes, memory, execution times, and verdicts.',
    columns: ['submission_id', 'participant_id', 'language', 'execution_status', 'execution_time', 'memory_used', 'submitted_at'],
    previewRows: [
      { submission_id: 'SUB_10001', participant_id: 'P186', language: 'cpp', execution_status: 'TIME_LIMIT_EXCEEDED', execution_time: 1.097, memory_used: 56150, submitted_at: '2026-11-19T14:55:13.000Z' },
      { submission_id: 'SUB_10002', participant_id: 'P169', language: 'python', execution_status: 'ACCEPTED', execution_time: 0.953, memory_used: 77247, submitted_at: '2026-11-19T11:24:32.000Z' },
      { submission_id: 'SUB_10003', participant_id: 'P153', language: 'python', execution_status: 'WRONG_ANSWER', execution_time: 1.716, memory_used: 62220, submitted_at: '2026-11-19T10:07:47.000Z' },
      { submission_id: 'SUB_10004', participant_id: 'P200', language: 'python', execution_status: 'ACCEPTED', execution_time: 0.955, memory_used: 30831, submitted_at: '2026-11-19T14:08:09.000Z' },
      { submission_id: 'SUB_10005', participant_id: 'P130', language: 'python', execution_status: 'COMPILATION_ERROR', execution_time: 0.593, memory_used: 24062, submitted_at: '2026-11-19T14:05:13.000Z' },
      { submission_id: 'SUB_10006', participant_id: 'P132', language: 'cpp', execution_status: 'WRONG_ANSWER', execution_time: 0.243, memory_used: 78217, submitted_at: '2026-11-19T10:00:30.000Z' },
      { submission_id: 'SUB_10007', participant_id: 'P129', language: 'python', execution_status: 'ACCEPTED', execution_time: 1.581, memory_used: 36708, submitted_at: '2026-11-19T11:15:51.000Z' },
      { submission_id: 'SUB_10008', participant_id: 'P194', language: 'java', execution_status: 'COMPILATION_ERROR', execution_time: 0.823, memory_used: 69094, submitted_at: '2026-11-19T14:05:25.000Z' },
    ],
    fieldInfo: [
      { field: 'submission_id', type: 'string (PK)', desc: 'Unique compilation run identifier (e.g. SUB_10001)' },
      { field: 'participant_id', type: 'string (FK)', desc: 'Submitting contestant identifier' },
      { field: 'language', type: 'string', desc: 'Compiler runtime environment (python, javascript, java, cpp)' },
      { field: 'execution_status', type: 'string', desc: 'Verdict: ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, COMPILATION_ERROR' },
      { field: 'execution_time', type: 'float (seconds)', desc: 'Runtime execution latency in test sandbox' },
      { field: 'memory_used', type: 'integer (KB)', desc: 'Peak memory consumption during test suite evaluation' },
    ],
  },
  'event_activity.csv': {
    fileName: 'event_activity.csv',
    dfName: 'activity',
    title: 'Event Activity & Security Audit',
    description: '500 audit logs detailing participant interactions: LOGIN, TEST_RUN, DOC_READ, SUBMIT, DRAFT_SAVE, VIEW_LEADERBOARD.',
    columns: ['activity_id', 'participant_id', 'activity_type', 'duration_minutes', 'engagement_score', 'activity_timestamp'],
    previewRows: [
      { activity_id: 'ACT_1001', participant_id: 'P131', activity_type: 'LOGIN', duration_minutes: 29, engagement_score: 58, activity_timestamp: '2026-11-19T13:43:39.000Z' },
      { activity_id: 'ACT_1002', participant_id: 'P167', activity_type: 'TEST_RUN', duration_minutes: 15, engagement_score: 89, activity_timestamp: '2026-11-19T12:35:54.000Z' },
      { activity_id: 'ACT_1003', participant_id: 'P120', activity_type: 'DRAFT_SAVE', duration_minutes: 11, engagement_score: 83, activity_timestamp: '2026-11-19T12:42:05.000Z' },
      { activity_id: 'ACT_1004', participant_id: 'P127', activity_type: 'LOGIN', duration_minutes: 19, engagement_score: 86, activity_timestamp: '2026-11-19T11:57:00.000Z' },
      { activity_id: 'ACT_1005', participant_id: 'P151', activity_type: 'DOC_READ', duration_minutes: 37, engagement_score: 94, activity_timestamp: '2026-11-19T11:01:18.000Z' },
      { activity_id: 'ACT_1006', participant_id: 'P179', activity_type: 'TEST_RUN', duration_minutes: 38, engagement_score: 89, activity_timestamp: '2026-11-19T13:43:36.000Z' },
      { activity_id: 'ACT_1007', participant_id: 'P176', activity_type: 'DRAFT_SAVE', duration_minutes: 10, engagement_score: 74, activity_timestamp: '2026-11-19T11:06:43.000Z' },
      { activity_id: 'ACT_1008', participant_id: 'P128', activity_type: 'VIEW_LEADERBOARD', duration_minutes: 32, engagement_score: 43, activity_timestamp: '2026-11-19T14:35:51.000Z' },
    ],
    fieldInfo: [
      { field: 'activity_id', type: 'string (PK)', desc: 'Audit log identifier' },
      { field: 'participant_id', type: 'string (FK)', desc: 'Participant who triggered the event' },
      { field: 'activity_type', type: 'string', desc: 'Action: LOGIN, TEST_RUN, DOC_READ, SUBMIT, DRAFT_SAVE, VIEW_LEADERBOARD' },
      { field: 'duration_minutes', type: 'integer', desc: 'Duration spent engaged in activity' },
      { field: 'engagement_score', type: 'integer (0-100)', desc: 'System engagement intensity metric' },
      { field: 'activity_timestamp', type: 'timestamp', desc: 'ISO 8601 audit timestamp' },
    ],
  },
  'teams.csv': {
    fileName: 'teams.csv',
    dfName: 'teams',
    title: 'Collegiate Teams Master Directory',
    description: '50 competing collegiate teams with institutional affiliations, slots, and registration timestamps.',
    columns: ['team_id', 'team_name', 'department', 'team_size'],
    previewRows: [
      { team_id: 'T101', team_name: 'Tensor Titans', department: 'Artificial Intelligence & Data Science', team_size: 2 },
      { team_id: 'T102', team_name: 'Nexus Hunters', department: 'Information Technology', team_size: 2 },
      { team_id: 'T103', team_name: 'Omega Sentinels', department: 'Information Technology', team_size: 2 },
      { team_id: 'T104', team_name: 'Matrix Pioneers', department: 'Artificial Intelligence & Data Science', team_size: 2 },
      { team_id: 'T105', team_name: 'Terminal Ninjas', department: 'Computer Science & Engineering', team_size: 2 },
      { team_id: 'T106', team_name: 'Recursion Masters', department: 'Artificial Intelligence & Data Science', team_size: 2 },
      { team_id: 'T107', team_name: 'Nexus Warriors', department: 'Computer Science & Engineering', team_size: 2 },
      { team_id: 'T108', team_name: 'Vector Gladiators', department: 'Information Technology', team_size: 2 },
    ],
    fieldInfo: [
      { field: 'team_id', type: 'string (PK)', desc: 'Collegiate team identifier (e.g. T101)' },
      { field: 'team_name', type: 'string', desc: 'Official registered team name' },
      { field: 'department', type: 'string', desc: 'Academic engineering department' },
      { field: 'team_size', type: 'integer', desc: 'Number of relay participants (standard: 2)' },
    ],
  },
};

// Automatic Question to Target Dataset Mapping
export const QUESTION_DATASET_MAP: Record<number, string> = {
  1: 'round_performance.csv',
  2: 'round_performance.csv',
  3: 'participants.csv',
  4: 'submission_logs.csv',
  5: 'event_activity.csv',
  6: 'round_performance.csv',
};

// Visual metadata per question
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
    shortTitle: 'Calculate Average Round Scores',
    caseBadge: 'Case 1 – Performance Analysis',
    caseGroupTitle: 'Case 1: Participant Performance Analysis',
    promptText: 'Find the average raw score obtained by participants in each round:',
    optionsFallback: [
      { key: 'A', label: 'Option A', code: 'performance.groupby("round_number")["raw_score"].mean()' },
      { key: 'B', label: 'Option B', code: 'performance.groupby("participant_id")["raw_score"].mean()' },
      { key: 'C', label: 'Option C', code: 'performance.groupby("round_number")["maximum_score"].sum()' },
      { key: 'D', label: 'Option D', subtext: 'Write your own Python code below if none of the above are valid.' },
    ],
    rules: [
      'Target DataFrame: performance (round_performance.csv).',
      'Group records by round_number (Rounds 1, 2, 3).',
      'Calculate the arithmetic mean of raw_score.',
      'Expected Output: Round 1: 19.96, Round 2: 66.12, Round 3: 67.11.',
    ],
  },
  2: {
    shortTitle: 'Find the Top 5 Performers',
    caseBadge: 'Case 1 – Performance Analysis',
    caseGroupTitle: 'Case 1: Participant Performance Analysis',
    promptText: 'Identify the five participants who obtained the highest raw scores in Round 3:',
    optionsFallback: [
      { key: 'A', label: 'Option A', code: 'performance[performance["round_number"] == 3].nlargest(5, "completion_time_seconds")' },
      { key: 'B', label: 'Option B', code: 'performance[performance["round_number"] == 3].nlargest(5, "raw_score")' },
      { key: 'C', label: 'Option C', code: 'performance.nlargest(5, "raw_score")' },
      { key: 'D', label: 'Option D', subtext: 'Write your own Python code below if none of the above are valid.' },
    ],
    rules: [
      'Target DataFrame: performance (round_performance.csv).',
      'Filter records where round_number == 3.',
      'Extract the 5 highest participants sorted by raw_score descending.',
      'Expected Top 5: P136 (100.0), P170 (100.0), P134 (97.2), P101 (94.6), P189 (92.1).',
    ],
  },
  3: {
    shortTitle: 'Identify Duplicate Participant IDs',
    caseBadge: 'Case 2 – Data Cleaning & Integrity',
    caseGroupTitle: 'Case 2: Data Cleaning and Submission Analysis',
    promptText: 'Find all duplicate participant IDs in the participants dataset:',
    optionsFallback: [
      { key: 'A', label: 'Option A', code: 'participants[participants.duplicated("participant_id")]' },
      { key: 'B', label: 'Option B', code: 'participants.drop_duplicates("participant_id")' },
      { key: 'C', label: 'Option C', code: 'participants[participants["participant_id"].isna()]' },
      { key: 'D', label: 'Option D', subtext: 'Write your own Python code below if none of the above are valid.' },
    ],
    rules: [
      'Target DataFrame: participants (participants.csv).',
      'Detect duplicate records based on primary key participant_id.',
      'Note: In the official master dataset, no duplicate IDs exist (returns an empty DataFrame).',
      'This validates data-cleaning integrity and unique constraint preservation.',
    ],
  },
  4: {
    shortTitle: 'Count Accepted Submissions',
    caseBadge: 'Case 2 – Data Cleaning & Integrity',
    caseGroupTitle: 'Case 2: Data Cleaning and Submission Analysis',
    promptText: 'Find the number of accepted programming submissions for each programming language:',
    optionsFallback: [
      { key: 'A', label: 'Option A', code: 'submissions.groupby("language")["submission_id"].count()' },
      { key: 'B', label: 'Option B', code: 'submissions.groupby("execution_status")["language"].count()' },
      { key: 'C', label: 'Option C', code: 'submissions[submissions["execution_status"] == "ACCEPTED"].groupby("language")["submission_id"].count()' },
      { key: 'D', label: 'Option D', subtext: 'Write your own Python code below if none of the above are valid.' },
    ],
    rules: [
      'Target DataFrame: submissions (submission_logs.csv).',
      'Filter records where execution_status == "ACCEPTED".',
      'Group by language and count total accepted submissions.',
      'Expected Counts: Python: 92, JavaScript: 80, Java: 75, C++: 55.',
    ],
  },
  5: {
    shortTitle: 'Analyse Participant Engagement',
    caseBadge: 'Case 3 – Event Intelligence & Ranking',
    caseGroupTitle: 'Case 3: Event Intelligence and Team Ranking',
    promptText: 'Calculate the average engagement score for each activity type (LOGIN, TEST_RUN, DOC_READ, SUBMIT):',
    optionsFallback: [
      { key: 'A', label: 'Option A', code: 'activity.groupby("activity_type")["duration_minutes"].mean()' },
      { key: 'B', label: 'Option B', code: 'activity.groupby("activity_type")["engagement_score"].mean()' },
      { key: 'C', label: 'Option C', code: 'activity.groupby("participant_id")["engagement_score"].sum()' },
      { key: 'D', label: 'Option D', subtext: 'Write your own Python code below if none of the above are valid.' },
    ],
    rules: [
      'Target DataFrame: activity (event_activity.csv).',
      'Group records by activity_type.',
      'Compute the mean of engagement_score across all participant audit events.',
      'Expected Averages: TEST_RUN: 75.06, LOGIN: 73.16, DRAFT_SAVE: 72.03, VIEW_LEADERBOARD: 70.84, DOC_READ: 69.61, SUBMIT: 65.89.',
    ],
  },
  6: {
    shortTitle: 'Find Top 5 Teams in Round 3',
    caseBadge: 'Case 3 – Event Intelligence & Ranking',
    caseGroupTitle: 'Case 3: Event Intelligence and Team Ranking',
    promptText: 'Find the five teams with the highest average Round 3 raw score:',
    optionsFallback: [
      { key: 'A', label: 'Option A', code: 'performance[performance["round_number"] == 3].groupby("participant_id")["raw_score"].mean().nlargest(5)' },
      { key: 'B', label: 'Option B', code: 'performance[performance["round_number"] == 3].merge(participants[["participant_id","team_id"]], on="participant_id").groupby("team_id")["raw_score"].sum().nlargest(5)' },
      { key: 'C', label: 'Option C', code: 'performance[performance["round_number"] == 3].merge(participants[["participant_id","team_id"]], on="participant_id").groupby("team_id")["raw_score"].mean().nlargest(5)' },
      { key: 'D', label: 'Option D', subtext: 'Write your own Python code below if none of the above are valid.' },
    ],
    rules: [
      'Target DataFrames: performance, participants, teams.',
      'Filter Round 3 performances and merge on participant_id with participants.',
      'Group by team_id and calculate the mean raw_score.',
      'Expected Top 5: Code Architects (90.30), Syntax Ninjas (88.35), Recursion Crusaders (86.00), Algorithm Warriors (85.30), Matrix Sentinels (84.90).',
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
  const [selectionRequiredModal, setSelectionRequiredModal] = useState(false);
  const [selectionHighlighted, setSelectionHighlighted] = useState(false);
  const [actionErrorModal, setActionErrorModal] = useState<string | null>(null);
  const [showSubmittedSuccessModal, setShowSubmittedSuccessModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<AnalyticsSubmissionResultDto | null>(null);

  // Right Panel State: Dataset Explorer Tab ('DATASET' | 'FIELD_INFO')
  const [activeRightTab, setActiveRightTab] = useState<'DATASET' | 'FIELD_INFO'>('DATASET');
  const [selectedDatasetFile, setSelectedDatasetFile] = useState<string>('round_performance.csv');

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
    arenaState?.remainingSeconds ?? 3564,
  );

  const [showLeaveWarningModal, setShowLeaveWarningModal] = useState(false);
  const [showConcludedModal, setShowConcludedModal] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const isConcluded =
    Boolean(
      compState?.status &&
        (['ROUND_3_EVALUATION', 'FINAL_EVALUATION', 'COMPLETED'].includes(compState.status) ||
          (compState.currentRoundNumber && compState.currentRoundNumber > 3)),
    ) || Boolean(timer.isExpired && compState?.deadlineAt);

  const isLocked = isConcluded || Boolean(arenaState?.isSubmitted);

  // Requirement 6: Anti-Cheating & Participant Monitoring
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
    arenaType: 'ANALYTICS',
  });

  // Requirement 1 & 3: Automatic Round Conclusion & Workspace Locking when timer hits zero
  useEffect(() => {
    if (timer.isExpired && !arenaState?.isSubmitted && !reviewMode) {
      setShowConcludedModal(true);
    }
  }, [timer.isExpired, arenaState?.isSubmitted, reviewMode]);

  const handleBackToDashboard = () => {
    if (!isLocked && !isConcluded && !timer.isExpired && isRoundActive) {
      setShowLeaveWarningModal(true);
    } else {
      navigate('/team/dashboard');
    }
  };

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

    setSelectedOption(activeQuestion.selectedOption || null);
    const targetFile = QUESTION_DATASET_MAP[activeOrderNumber] || 'round_performance.csv';
    setSelectedDatasetFile(targetFile);

    const initialCode =
      activeQuestion.savedCode && activeQuestion.savedCode.trim() !== ''
        ? activeQuestion.savedCode
        : activeQuestion.starterCode;
    setEditorCode(initialCode);
    setTestRunOutput(null);
    setSubmissionResult(null);
  }, [activeQuestion?.id, activeOrderNumber]);

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
    if (!activeQuestion || isLocked || isConcluded || timer.isExpired || reviewMode || activeQuestion.isSubmitted) return;
    setSelectedOption(optionKey);
    setSelectionHighlighted(false);
    setSelectionRequiredModal(false);

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
      setSelectionRequiredModal(true);
      setSelectionHighlighted(true);
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
      setActionErrorModal(msg);
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
      await questionAndArenaService.finalizeRound3();
      setShowFinalModal(false);
      const updatedState = await questionAndArenaService.getAnalyticsArenaState();
      setArenaState(updatedState);
      setShowSubmittedSuccessModal(true);
    } catch (err: any) {
      console.error('Finalize failed:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to finalize round.';
      if (msg.toLowerCase().includes('already been officially submitted')) {
        setShowFinalModal(false);
        setArenaState((prev) => (prev ? { ...prev, isSubmitted: true } : prev));
        setShowSubmittedSuccessModal(true);
      } else {
        setActionErrorModal(msg);
      }
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
          {/* Requirement 5: Round 3 Back Navigation Button */}
          <button
            type="button"
            onClick={handleBackToDashboard}
            className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-900/60 text-emerald-300 transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
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
          {arenaState?.isSubmitted && (
            <button
              onClick={() => setShowSubmittedSuccessModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-1.5 hover:bg-emerald-500/30 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00F5A0]" />
              <span>Submission Status</span>
            </button>
          )}
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
              <span className="font-bold text-slate-200">Case 1: Performance Analysis</span>
              <span className="text-[#00F5A0] text-[11px] font-bold">(20 Marks)</span>
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
                    <span className="truncate font-medium text-[11px]">Average Round Scores</span>
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
                      : 'bg-black/30 border-transparent hover:bg-[#042017] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      Q2
                    </span>
                    <span className="truncate text-[11px]">Top 5 Performers</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-bold ml-2">10</span>
                </button>
              );
            })()}
          </div>

          {/* Case 2: Data Cleaning & Submission Analysis */}
          <div className="rounded-2xl border border-[#0D4030] bg-[#031712]/90 p-2.5 backdrop-blur-sm flex flex-col gap-1.5 shadow-sm shrink-0">
            <div className="flex items-center justify-between text-xs font-mono px-1 pb-1 border-b border-[#0D4030]/50">
              <span className="font-bold text-slate-200">Case 2: Data Cleaning</span>
              <span className="text-[#00F5A0] text-[11px] font-bold">(25 Marks)</span>
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
                      : 'bg-black/30 border-transparent hover:bg-[#042017] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      Q3
                    </span>
                    <span className="truncate text-[11px]">Duplicate Participant IDs</span>
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
                      : 'bg-black/30 border-transparent hover:bg-[#042017] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      Q4
                    </span>
                    <span className="truncate text-[11px]">Accepted Submissions</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-bold ml-2">13</span>
                </button>
              );
            })()}
          </div>

          {/* Case 3: Event Intelligence and Team Ranking */}
          <div className="rounded-2xl border border-[#0D4030] bg-[#031712]/90 p-2.5 backdrop-blur-sm flex flex-col gap-1.5 shadow-sm shrink-0">
            <div className="flex items-center justify-between text-xs font-mono px-1 pb-1 border-b border-[#0D4030]/50">
              <span className="font-bold text-slate-200">Case 3: Event Intelligence</span>
              <span className="text-[#00F5A0] text-[11px] font-bold">(55 Marks)</span>
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
                      : 'bg-black/30 border-transparent hover:bg-[#042017] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      Q5
                    </span>
                    <span className="truncate text-[11px]">Participant Engagement</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-bold ml-2">25</span>
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
                      : 'bg-black/30 border-transparent hover:bg-[#042017] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      Q6
                    </span>
                    <span className="truncate text-[11px]">Top 5 Teams in Round 3</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-bold ml-2">30</span>
                </button>
              );
            })()}
          </div>

          {/* Bottom Rubric: Total Tournament Marks Card */}
          <div className="rounded-xl border border-[#0D4030] bg-[#031712]/90 p-2.5 flex items-center justify-between font-mono text-xs shadow-sm mt-auto shrink-0">
            <div className="flex items-center gap-1.5 text-[#00F5A0]">
              <Code2 className="w-3.5 h-3.5" />
              <span className="text-[10px] text-slate-300 font-semibold">
                Round 3 Total: 6 Questions (20 + 25 + 55)
              </span>
            </div>
            <span className="text-[#00F5A0] font-black text-xs">100 Marks</span>
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
              {activeQuestion?.description?.replace(/### Operational Briefing/, '')?.trim() ||
                `Perform real data analysis and query operations using pandas on the ${selectedDatasetFile} dataset.`}
            </p>

            {/* Prompt Callout */}
            <div className="border-l-4 border-[#00F5A0] pl-3 py-0.5 bg-gradient-to-r from-emerald-950/30 to-transparent">
              <span className="text-xs font-bold text-[#00F5A0] font-mono tracking-wide">
                {activeMeta.promptText}
              </span>
            </div>

            {/* 2×2 Options Grid */}
            {activeQuestion?.format === 'SELECT_CODE' && (
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-2.5 transition-all ${
                selectionHighlighted && !selectedOption
                  ? 'p-2 rounded-2xl border-2 border-amber-400/80 bg-amber-500/10 ring-2 ring-amber-400/30'
                  : ''
              }`}>
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
                  editable={!isLocked && !isConcluded && !timer.isExpired && !reviewMode}
                  placeholder="# Write your corrected implementation here..."
                />
              </div>

              {/* Editor Bottom Actions & Execution Feedback */}
              <div className="px-3 py-1.5 bg-[#020F0B] border-t border-[#0D4030] flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestRun}
                    disabled={isTestRunning || isLocked || isConcluded || timer.isExpired || reviewMode}
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
                    disabled={isSubmitting || isLocked || isConcluded || timer.isExpired || reviewMode}
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
                    {submissionResult.status} (Submitted)
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
          {(() => {
            const currentDataset = DATASET_REGISTRY[selectedDatasetFile] || DATASET_REGISTRY['round_performance.csv'];
            return (
              <div className="rounded-2xl border border-[#0D4030] bg-[#031712]/90 p-3.5 backdrop-blur-sm flex flex-col gap-2.5 shadow-lg shrink-0">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <Database className="w-4 h-4 text-[#00F5A0] shrink-0" />
                    <span className="text-xs font-mono font-bold text-slate-200 truncate">
                      {currentDataset.dfName} ({currentDataset.fileName})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#00F5A0] font-bold bg-[#04281E] px-2 py-0.5 rounded border border-[#0D4030] shrink-0">
                    master_dataset
                  </span>
                </div>

                {/* Dataset quick-selector chips */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {(Object.keys(DATASET_REGISTRY) as (keyof typeof DATASET_REGISTRY)[]).map((fname) => {
                    const ds = DATASET_REGISTRY[fname];
                    const isSelected = selectedDatasetFile === fname;
                    return (
                      <button
                        key={fname}
                        onClick={() => setSelectedDatasetFile(fname)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors border ${
                          isSelected
                            ? 'bg-[#00F5A0] text-black font-bold border-[#00F5A0]'
                            : 'bg-black/40 text-slate-400 border-[#0D4030] hover:text-white hover:bg-[#04241B]'
                        }`}
                        title={ds.title}
                      >
                        {ds.dfName}
                      </button>
                    );
                  })}
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
                    Dataset Preview
                  </button>
                  <button
                    onClick={() => setActiveRightTab('FIELD_INFO')}
                    className={`px-3 py-1 font-bold transition-colors ${
                      activeRightTab === 'FIELD_INFO'
                        ? 'text-[#00F5A0] border-b-2 border-[#00F5A0]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Field Info ({currentDataset.fieldInfo.length})
                  </button>
                </div>

                {/* Content: Dataset Table Preview */}
                {activeRightTab === 'DATASET' ? (
                  <div className="overflow-x-auto border border-[#0A261C] rounded-lg bg-[#010907] max-h-52 overflow-y-auto">
                    <table className="w-full text-left font-mono text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-[#0D4030] bg-[#02130F] text-slate-300">
                          {currentDataset.columns.map((col) => (
                            <th key={col} className="p-1.5 font-bold whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0A261C] text-slate-300">
                        {currentDataset.previewRows.map((row: any, rIdx: number) => (
                          <tr key={rIdx} className="hover:bg-[#04241B]/40 transition-colors">
                            {currentDataset.columns.map((col) => (
                              <td key={col} className="p-1.5 whitespace-nowrap">
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Content: Field Info List */
                  <div className="flex flex-col gap-2 max-h-52 overflow-y-auto p-1 font-mono text-xs">
                    {currentDataset.fieldInfo.map((f) => (
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
                    href={`/api/arena/analytics/dataset-download/${currentDataset.fileName}`}
                    download={currentDataset.fileName}
                    className="p-1.5 rounded-lg border border-[#0D4030] bg-[#02130F] hover:bg-[#04241B] text-slate-300 hover:text-white transition-colors"
                    title={`Download ${currentDataset.fileName}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })()}

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
              {(Object.keys(DATASET_REGISTRY) as (keyof typeof DATASET_REGISTRY)[]).map((fname) => {
                const isSelected = selectedDatasetFile === fname;
                const ds = DATASET_REGISTRY[fname];
                return (
                  <button
                    key={fname}
                    onClick={() => {
                      setSelectedDatasetFile(fname);
                      setDatasetPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#00F5A0] text-black font-bold'
                        : 'bg-[#010907] border border-[#0D4030] text-slate-300 hover:text-white'
                    }`}
                  >
                    {ds.dfName} ({fname})
                  </button>
                );
              })}
            </div>

            {/* Search filter for CSVs */}
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

            {/* Table Area */}
            <div className="flex-1 overflow-auto border border-[#0D4030] rounded-xl bg-[#010907]">
              {isBackendDatasetLoading ? (
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
              ) : (() => {
                const fallbackDs = DATASET_REGISTRY[selectedDatasetFile] || DATASET_REGISTRY['round_performance.csv'];
                return (
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#0D4030] bg-[#02130F] text-slate-300">
                        {fallbackDs.columns.map((c: string) => (
                          <th key={c} className="p-2 font-bold whitespace-nowrap">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0A261C] text-slate-300">
                      {fallbackDs.previewRows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-[#04241B]/40">
                          {fallbackDs.columns.map((c: string) => (
                            <td key={c} className="p-2 whitespace-nowrap">{String(row[c] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
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
                    <span className="text-slate-400 font-mono text-[11px]">Case {q.caseNumber}</span>
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
              Note: Analytical coding solutions will be assessed by the tournament judging panel for evaluation.
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
                disabled={isFinalizing || isLocked || isConcluded || timer.isExpired || reviewMode}
                className="px-6 py-2 rounded-xl bg-[#00F5A0] hover:bg-[#34D399] text-black font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,245,160,0.4)] disabled:opacity-50"
              >
                {isFinalizing ? 'Finalizing...' : 'Confirm Final Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELECTION REQUIRED MODAL */}
      {selectionRequiredModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#031712] border-2 border-amber-400/80 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Selection Required</h3>
                <p className="text-xs text-amber-400/90 font-mono">Action incomplete</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Please select an option before submitting. The options area has been highlighted for you.
            </p>

            <div className="flex justify-end pt-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setSelectionRequiredModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTION ERROR / NOTICE MODAL */}
      {actionErrorModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#031712] border-2 border-emerald-400/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Notice</h3>
                <p className="text-xs text-emerald-400/90 font-mono">Tournament Arena</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {actionErrorModal}
            </p>

            <div className="flex justify-end pt-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setActionErrorModal(null)}
                className="px-5 py-2 rounded-xl bg-[#00F5A0] hover:bg-[#34D399] text-black font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROUND 3 SUBMITTED CONFIRMATION MODAL */}
      {showSubmittedSuccessModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-xl w-full p-7 sm:p-9 rounded-3xl bg-[#02130a] border-2 border-emerald-400/60 shadow-[0_0_50px_rgba(16,185,129,0.35)] space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ROUND SUBMITTED SUCCESSFULLY
              </span>
              <h3 className="text-2xl font-black text-white">
                Round 3 Submission Recorded
              </h3>
              <p className="text-sm text-emerald-200/80 max-w-md mx-auto leading-relaxed">
                Your response has been submitted successfully.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Your submission has been recorded. The results will be announced by the organizers.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/60 border border-emerald-500/30 font-mono text-center">
              <span className="text-xs text-emerald-400 font-bold">
                Submission Status: <span className="text-white">Submitted</span>
              </span>
            </div>

            <p className="text-xs text-emerald-400/90 font-medium">
              Thank you for participating in IGNITRON 2K26!
            </p>

            <div className="pt-4 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setShowSubmittedSuccessModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                View Submitted Workspace
              </button>
              <Link
                to="/team/dashboard"
                className="px-6 py-2.5 rounded-xl bg-[#00F5A0] hover:bg-[#34D399] text-black font-black uppercase text-xs font-mono tracking-wider transition-all shadow-[0_0_20px_rgba(0,245,160,0.4)]"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

    
      {/* REQUIREMENT 5: RETURN TO DASHBOARD WARNING MODAL */}
      {showLeaveWarningModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#031712] border-2 border-amber-400/80 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Return to Dashboard?</h3>
                <p className="text-xs text-amber-400/90 font-mono">Active Round in Progress</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Your competition round is currently active. Returning to the dashboard will not stop the countdown, and your time will continue running.
            </p>
            <p className="text-xs text-amber-300/90 font-medium">
              Are you sure you want to leave the workspace?
            </p>

            <div className="flex justify-end gap-3 pt-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setShowLeaveWarningModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Stay in Workspace
              </button>
              <button
                type="button"
                onClick={() => navigate('/team/dashboard')}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUIREMENT 6: COMPETITION FOCUS WARNING MODAL */}
      {focusWarning && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#031712] border-2 border-amber-400 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-[0_0_40px_rgba(245,158,11,0.35)] text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
              <AlertTriangle className="w-7 h-7 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Competition Focus Warning</h3>
              <p className="text-xs font-mono text-amber-400 font-semibold">
                Warning {focusWarning.violationCount} of {focusWarning.threshold}
              </p>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              You have left the active competition workspace. Switching tabs or leaving the competition environment is not permitted during the competition.
            </p>
            <p className="text-[11px] text-amber-300/80 font-mono">
              Please return to your workspace immediately. Continued departures will trigger official access revocation.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={clearWarning}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase font-mono text-xs tracking-wider transition-all cursor-pointer shadow-md"
              >
                I Understand & Return to Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANTI-CHEAT EXAM-LOCK OVERLAY */}
      <ExamLockOverlay
        isOpen={isLockedByProctoring}
        lockStatus={lockStatus}
        isDisqualified={isDisqualified}
        lockReason={lockReason}
        warningCount={warningCount}
        onRefreshStatus={refreshStatus}
        onReturnToDashboard={() => navigate('/team/dashboard')}
      />

      {/* REQUIREMENT 3 & 4: ROUND CONCLUDED / WORKSPACE LOCKED MODAL */}
      {showConcludedModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#02130a] border-2 border-emerald-400/60 rounded-3xl max-w-lg w-full p-7 sm:p-8 space-y-5 text-center shadow-[0_0_50px_rgba(16,185,129,0.35)]">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ROUND CONCLUDED
              </span>
              <h3 className="text-2xl font-black text-white">Workspace Locked</h3>
              <p className="text-sm text-emerald-200/90 max-w-md mx-auto leading-relaxed">
                The competition time has ended. Your workspace is now locked.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Your submitted answers have been safely recorded.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-black/60 border border-emerald-500/30 font-mono text-center">
              <span className="text-xs text-emerald-400 font-bold">
                Submission Status: <span className="text-white">Submitted</span>
              </span>
            </div>
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowConcludedModal(false);
                  setReviewMode(true);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-bold transition-colors cursor-pointer"
              >
                View Submitted Answers
              </button>
              <Link
                to="/team/dashboard"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#00F5A0] hover:bg-[#34D399] text-black font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,245,160,0.4)]"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
</div>
  );
};

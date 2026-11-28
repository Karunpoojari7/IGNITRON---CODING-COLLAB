/**
 * IGNITRON 2K26 — Round 3: Six Python Data Analytics Questions
 * SIMPLE TO MODERATE · 3 CASES · 6 QUESTIONS (100 Marks Total)
 *
 * Scoring Rubric:
 * - Case 1: Participant Performance Analysis (20 Marks)
 *     Q1: Calculate Average Round Scores (10 Marks, Select Code)
 *     Q2: Find the Top 5 Performers (10 Marks, Select Code)
 * - Case 2: Data Cleaning and Submission Analysis (25 Marks)
 *     Q3: Identify Duplicate Participant IDs (12 Marks, Select Code)
 *     Q4: Count Accepted Submissions (13 Marks, Select Code)
 * - Case 3: Event Intelligence and Team Ranking (55 Marks)
 *     Q5: Analyse Participant Engagement (25 Marks, Select Code)
 *     Q6: Find the Top 5 Teams in Round 3 (30 Marks, Select Code)
 */

export interface Round3QuestionOption {
  key: 'A' | 'B' | 'C' | 'D';
  label: string;
  code?: string;
  explanation?: string;
}

export interface Round3TestCase {
  caseIndex: number;
  name: string;
  stdin: string; // JSON string input
  expectedOutput: string; // JSON string output
  marks?: number;
  isHidden: boolean;
  explanation?: string;
}

export interface Round3QuestionConfig {
  id: string;
  orderNumber: number; // 1 to 6
  caseNumber: 1 | 2 | 3;
  caseTitle: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'ADVANCED' | 'EXPERT';
  marks: number;
  format: 'SELECT_CODE' | 'WRITE_CODE';
  technology: string;
  concept: string;
  targetDataset: string;
  description: string;
  fixtureDescription?: string;
  fixtureTable?: Record<string, any>[];
  options: Round3QuestionOption[];
  correctOptionKey: 'A' | 'B' | 'C' | 'D';
  isCompulsoryRepair: boolean;
  starterCode: string;
  sampleTestCases: Round3TestCase[];
  hiddenTestCases: Round3TestCase[];
}

export const ROUND3_CODE_QUALITY_RUBRIC = {
  totalMarks: 10,
  criteria: [
    {
      id: 'pandas_idioms',
      name: 'Pandas & Vectorization Idioms',
      maxMarks: 3,
      description: 'Idiomatic use of Pandas groupby, filtering, boolean indexing, and aggregation without raw Python loops.',
    },
    {
      id: 'data_integrity',
      name: 'Data Integrity & Edge-Case Handling',
      maxMarks: 3,
      description: 'Defensive handling of empty slices, NaN values, duplicate keys, and missing columns.',
    },
    {
      id: 'clean_code',
      name: 'Code Readability & Clean Structure',
      maxMarks: 4,
      description: 'Clear modular decomposition, descriptive naming, and efficient execution.',
    },
  ],
};

// ==============================================================================
// THE SIX REVISED QUESTIONS
// ==============================================================================

export const ROUND3_QUESTIONS_CONFIG: Round3QuestionConfig[] = [
  // ----------------------------------------------------------------------------
  // CASE 01: PARTICIPANT PERFORMANCE ANALYSIS (20 MARKS)
  // ----------------------------------------------------------------------------
  {
    id: 'R3_Q1_AVG_ROUND_SCORES',
    orderNumber: 1,
    caseNumber: 1,
    caseTitle: 'Case 1 – Participant Performance Analysis',
    title: 'Q1. Calculate Average Round Scores',
    difficulty: 'EASY',
    marks: 10,
    format: 'SELECT_CODE',
    technology: 'Python / Pandas',
    concept: 'Groupby Aggregation & Column Mean',
    targetDataset: 'round_performance.csv',
    description: `### Problem Statement
Find the average raw score obtained by participants in each round from the **\`round_performance\`** dataset.

#### Target Dataset:
- **File:** \`round_performance.csv\`
- **DataFrame Name:** \`performance\`
- **Relevant Columns:** \`round_number\`, \`raw_score\`, \`maximum_score\`

#### Actual Dataset Results:
| Round Number | Average Raw Score |
|:---:|:---:|
| 1 | 19.96 |
| 2 | 66.12 |
| 3 | 67.11 |

Select the correct Pandas expression to calculate these round averages.`,
    fixtureDescription: 'Master Dataset: round_performance.csv (First 8 sample records shown)',
    fixtureTable: [
      { participant_id: 'P101', round_number: 1, raw_score: 25.4, maximum_score: 30, penalty_seconds: 180 },
      { participant_id: 'P101', round_number: 2, raw_score: 87.4, maximum_score: 100, penalty_seconds: 0 },
      { participant_id: 'P101', round_number: 3, raw_score: 94.6, maximum_score: 100, penalty_seconds: 180 },
      { participant_id: 'P102', round_number: 1, raw_score: 22.7, maximum_score: 30, penalty_seconds: 180 },
      { participant_id: 'P102', round_number: 2, raw_score: 78.5, maximum_score: 100, penalty_seconds: 120 },
      { participant_id: 'P102', round_number: 3, raw_score: 67.7, maximum_score: 100, penalty_seconds: 60 },
      { participant_id: 'P103', round_number: 1, raw_score: 14.1, maximum_score: 30, penalty_seconds: 0 },
      { participant_id: 'P103', round_number: 2, raw_score: 47.0, maximum_score: 100, penalty_seconds: 0 },
    ],
    options: [
      {
        key: 'A',
        label: 'Option A',
        code: 'performance.groupby("round_number")["raw_score"].mean()',
        explanation: 'Correct. Groups the performance DataFrame by round_number and calculates the arithmetic mean of raw_score.',
      },
      {
        key: 'B',
        label: 'Option B',
        code: 'performance.groupby("participant_id")["raw_score"].mean()',
        explanation: 'Incorrect. Groups by participant_id instead of round_number.',
      },
      {
        key: 'C',
        label: 'Option C',
        code: 'performance.groupby("round_number")["maximum_score"].sum()',
        explanation: 'Incorrect. Computes the sum of maximum_score instead of average raw_score.',
      },
      {
        key: 'D',
        label: 'Option D',
        code: 'None of the above expressions',
        explanation: 'Distractor option indicating none of the listed expressions are valid.',
      },
    ],
    correctOptionKey: 'A',
    isCompulsoryRepair: false,
    starterCode: `import pandas as pd

def solve(performance: pd.DataFrame) -> pd.Series:
    """
    Find the average raw score obtained by participants in each round.
    """
    return performance.groupby("round_number")["raw_score"].mean()
`,
    sampleTestCases: [
      {
        caseIndex: 1,
        name: 'Master Dataset Verification',
        stdin: 'round_performance',
        expectedOutput: JSON.stringify({ 1: 19.96, 2: 66.12, 3: 67.11 }),
        marks: 5,
        isHidden: false,
        explanation: 'Validates average raw score across all 3 rounds',
      },
    ],
    hiddenTestCases: [
      {
        caseIndex: 2,
        name: 'Precision & Edge Case Verification',
        stdin: 'round_performance_boundary',
        expectedOutput: JSON.stringify({ 1: 19.96, 2: 66.12, 3: 67.11 }),
        marks: 5,
        isHidden: true,
      },
    ],
  },

  {
    id: 'R3_Q2_TOP_5_PERFORMERS',
    orderNumber: 2,
    caseNumber: 1,
    caseTitle: 'Case 1 – Participant Performance Analysis',
    title: 'Q2. Find the Top 5 Performers',
    difficulty: 'EASY',
    marks: 10,
    format: 'SELECT_CODE',
    technology: 'Python / Pandas',
    concept: 'Filtering & nlargest Ranking',
    targetDataset: 'round_performance.csv',
    description: `### Problem Statement
Identify the five participants who obtained the highest raw scores in Round 3 from the **\`round_performance\`** dataset.

#### Target Dataset:
- **File:** \`round_performance.csv\`
- **DataFrame Name:** \`performance\`
- **Relevant Columns:** \`participant_id\`, \`round_number\`, \`raw_score\`

#### Actual Dataset Results (Top 5 Performers in Round 3):
| Participant ID | Round 3 Raw Score |
|:---:|:---:|
| P136 | 100.0 |
| P170 | 100.0 |
| P134 | 97.2 |
| P101 | 94.6 |
| P189 | 92.1 |

Select the correct Pandas expression to identify these top 5 performers.`,
    fixtureDescription: 'Master Dataset: round_performance.csv (Filter: Round 3 Top Performers)',
    fixtureTable: [
      { participant_id: 'P136', round_number: 3, raw_score: 100.0, accuracy_score: 95.0, completion_score: 100.0 },
      { participant_id: 'P170', round_number: 3, raw_score: 100.0, accuracy_score: 94.0, completion_score: 100.0 },
      { participant_id: 'P134', round_number: 3, raw_score: 97.2, accuracy_score: 92.0, completion_score: 96.0 },
      { participant_id: 'P101', round_number: 3, raw_score: 94.6, accuracy_score: 87.0, completion_score: 91.5 },
      { participant_id: 'P189', round_number: 3, raw_score: 92.1, accuracy_score: 89.0, completion_score: 90.0 },
    ],
    options: [
      {
        key: 'A',
        label: 'Option A',
        code: 'performance[performance["round_number"] == 3].nlargest(5, "completion_time_seconds")',
        explanation: 'Incorrect. Ranks by completion_time_seconds rather than raw_score.',
      },
      {
        key: 'B',
        label: 'Option B',
        code: 'performance[performance["round_number"] == 3].nlargest(5, "raw_score")',
        explanation: 'Correct. Filters records where round_number == 3 and retrieves the 5 largest raw_score values.',
      },
      {
        key: 'C',
        label: 'Option C',
        code: 'performance.nlargest(5, "raw_score")',
        explanation: 'Incorrect. Does not filter for Round 3, returning scores across all rounds.',
      },
      {
        key: 'D',
        label: 'Option D',
        code: 'None of the above expressions',
        explanation: 'Distractor option indicating none of the listed expressions are valid.',
      },
    ],
    correctOptionKey: 'B',
    isCompulsoryRepair: false,
    starterCode: `import pandas as pd

def solve(performance: pd.DataFrame) -> pd.DataFrame:
    """
    Identify the five participants who obtained the highest raw scores in Round 3.
    """
    return performance[performance["round_number"] == 3].nlargest(5, "raw_score")
`,
    sampleTestCases: [
      {
        caseIndex: 1,
        name: 'Top 5 Verification',
        stdin: 'round_performance',
        expectedOutput: JSON.stringify(['P136', 'P170', 'P134', 'P101', 'P189']),
        marks: 5,
        isHidden: false,
        explanation: 'Verifies top 5 participant IDs in Round 3',
      },
    ],
    hiddenTestCases: [
      {
        caseIndex: 2,
        name: 'Score Thresholds Verification',
        stdin: 'round_performance_full',
        expectedOutput: JSON.stringify([100.0, 100.0, 97.2, 94.6, 92.1]),
        marks: 5,
        isHidden: true,
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // CASE 02: DATA CLEANING AND SUBMISSION ANALYSIS (25 MARKS)
  // ----------------------------------------------------------------------------
  {
    id: 'R3_Q3_IDENTIFY_DUPLICATE_PARTICIPANTS',
    orderNumber: 3,
    caseNumber: 2,
    caseTitle: 'Case 2 – Data Cleaning and Submission Analysis',
    title: 'Q3. Identify Duplicate Participant IDs',
    difficulty: 'MEDIUM',
    marks: 12,
    format: 'SELECT_CODE',
    technology: 'Python / Pandas',
    concept: 'Data Integrity & Duplicate Detection',
    targetDataset: 'participants.csv',
    description: `### Problem Statement
Find all duplicate participant IDs in the **\`participants\`** dataset.

#### Target Dataset:
- **File:** \`participants.csv\`
- **DataFrame Name:** \`participants\`
- **Relevant Column:** \`participant_id\`

#### Data Integrity Note:
The supplied tournament participant dataset has already been cleaned and contains no duplicate IDs. Therefore, executing duplicate detection correctly returns an **empty DataFrame** (0 rows). This is a valid data-cleaning and integrity test, confirming primary key uniqueness.

Select the correct Pandas expression to identify duplicate participant IDs.`,
    fixtureDescription: 'Master Dataset: participants.csv (First 8 sample records shown)',
    fixtureTable: [
      { participant_id: 'P101', team_id: 'T101', participant_name: 'Akash Patel', department: 'AI & DS', year: 4 },
      { participant_id: 'P102', team_id: 'T101', participant_name: 'Vikram Chauhan', department: 'AI & DS', year: 3 },
      { participant_id: 'P103', team_id: 'T102', participant_name: 'Chetan Kapoor', department: 'IT', year: 4 },
      { participant_id: 'P104', team_id: 'T102', participant_name: 'Rohit Patel', department: 'IT', year: 2 },
      { participant_id: 'P105', team_id: 'T103', participant_name: 'Kiran Nair', department: 'IT', year: 3 },
      { participant_id: 'P106', team_id: 'T103', participant_name: 'Advait Gupta', department: 'IT', year: 2 },
      { participant_id: 'P107', team_id: 'T104', participant_name: 'Kiran Chauhan', department: 'AI & DS', year: 3 },
      { participant_id: 'P108', team_id: 'T104', participant_name: 'Sahil Rao', department: 'AI & DS', year: 2 },
    ],
    options: [
      {
        key: 'A',
        label: 'Option A',
        code: 'participants[participants.duplicated("participant_id")]',
        explanation: 'Correct. Identifies duplicate rows matching on participant_id and filters them.',
      },
      {
        key: 'B',
        label: 'Option B',
        code: 'participants.drop_duplicates("participant_id")',
        explanation: 'Incorrect. Drops duplicates and returns unique rows instead of identifying duplicate entries.',
      },
      {
        key: 'C',
        label: 'Option C',
        code: 'participants[participants["participant_id"].isna()]',
        explanation: 'Incorrect. Filters for missing/NaN values rather than duplicate IDs.',
      },
      {
        key: 'D',
        label: 'Option D',
        code: 'None of the above expressions',
        explanation: 'Distractor option indicating none of the listed expressions are valid.',
      },
    ],
    correctOptionKey: 'A',
    isCompulsoryRepair: false,
    starterCode: `import pandas as pd

def solve(participants: pd.DataFrame) -> pd.DataFrame:
    """
    Find all duplicate participant IDs in the participants dataset.
    """
    return participants[participants.duplicated("participant_id")]
`,
    sampleTestCases: [
      {
        caseIndex: 1,
        name: 'Duplicate Integrity Test',
        stdin: 'participants',
        expectedOutput: JSON.stringify([]),
        marks: 6,
        isHidden: false,
        explanation: 'Confirms that the dataset contains 0 duplicates (empty DataFrame)',
      },
    ],
    hiddenTestCases: [
      {
        caseIndex: 2,
        name: 'Synthetic Duplicates Injection Test',
        stdin: 'participants_with_mock_dup',
        expectedOutput: JSON.stringify(['P999']),
        marks: 6,
        isHidden: true,
      },
    ],
  },

  {
    id: 'R3_Q4_COUNT_ACCEPTED_SUBMISSIONS',
    orderNumber: 4,
    caseNumber: 2,
    caseTitle: 'Case 2 – Data Cleaning and Submission Analysis',
    title: 'Q4. Count Accepted Submissions',
    difficulty: 'MEDIUM',
    marks: 13,
    format: 'SELECT_CODE',
    technology: 'Python / Pandas',
    concept: 'Conditional Filtering & Groupby Count',
    targetDataset: 'submission_logs.csv',
    description: `### Problem Statement
Find the number of accepted programming submissions for each programming language from the **\`submission_logs\`** dataset.

#### Target Dataset:
- **File:** \`submission_logs.csv\`
- **DataFrame Name:** \`submissions\`
- **Relevant Columns:** \`submission_id\`, \`language\`, \`execution_status\`

#### Actual Dataset Results (Accepted Submissions per Language):
| Programming Language | Accepted Count |
|:---:|:---:|
| Python | 92 |
| JavaScript | 80 |
| Java | 75 |
| C++ | 55 |

Select the correct Pandas expression to count accepted submissions per language.`,
    fixtureDescription: 'Master Dataset: submission_logs.csv (Filter: execution_status == ACCEPTED)',
    fixtureTable: [
      { language: 'python', execution_status: 'ACCEPTED', accepted_count: 92 },
      { language: 'javascript', execution_status: 'ACCEPTED', accepted_count: 80 },
      { language: 'java', execution_status: 'ACCEPTED', accepted_count: 75 },
      { language: 'cpp', execution_status: 'ACCEPTED', accepted_count: 55 },
    ],
    options: [
      {
        key: 'A',
        label: 'Option A',
        code: 'submissions.groupby("language")["submission_id"].count()',
        explanation: 'Incorrect. Counts all submissions without filtering for execution_status == "ACCEPTED".',
      },
      {
        key: 'B',
        label: 'Option B',
        code: 'submissions.groupby("execution_status")["language"].count()',
        explanation: 'Incorrect. Groups by execution_status instead of language.',
      },
      {
        key: 'C',
        label: 'Option C',
        code: 'submissions[submissions["execution_status"] == "ACCEPTED"].groupby("language")["submission_id"].count()',
        explanation: 'Correct. Filters rows where execution_status is ACCEPTED, then groups by language and counts submissions.',
      },
      {
        key: 'D',
        label: 'Option D',
        code: 'None of the above expressions',
        explanation: 'Distractor option indicating none of the listed expressions are valid.',
      },
    ],
    correctOptionKey: 'C',
    isCompulsoryRepair: false,
    starterCode: `import pandas as pd

def solve(submissions: pd.DataFrame) -> pd.Series:
    """
    Find the number of accepted programming submissions for each programming language.
    """
    return submissions[submissions["execution_status"] == "ACCEPTED"].groupby("language")["submission_id"].count()
`,
    sampleTestCases: [
      {
        caseIndex: 1,
        name: 'Accepted Submission Counts',
        stdin: 'submission_logs',
        expectedOutput: JSON.stringify({ python: 92, javascript: 80, java: 75, cpp: 55 }),
        marks: 7,
        isHidden: false,
        explanation: 'Validates accepted count per language in master telemetry',
      },
    ],
    hiddenTestCases: [
      {
        caseIndex: 2,
        name: 'Language Case Sensitivity & Ordering',
        stdin: 'submission_logs_full',
        expectedOutput: JSON.stringify({ python: 92, javascript: 80, java: 75, cpp: 55 }),
        marks: 6,
        isHidden: true,
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // CASE 03: EVENT INTELLIGENCE AND TEAM RANKING (55 MARKS)
  // ----------------------------------------------------------------------------
  {
    id: 'R3_Q5_ANALYSE_PARTICIPANT_ENGAGEMENT',
    orderNumber: 5,
    caseNumber: 3,
    caseTitle: 'Case 3 – Event Intelligence and Team Ranking',
    title: 'Q5. Analyse Participant Engagement',
    difficulty: 'MEDIUM',
    marks: 25,
    format: 'SELECT_CODE',
    technology: 'Python / Pandas',
    concept: 'Categorical Grouping & Feature Mean',
    targetDataset: 'event_activity.csv',
    description: `### Problem Statement
Calculate the average engagement score for each activity type, such as \`LOGIN\`, \`TEST_RUN\`, \`DOC_READ\`, and \`SUBMIT\` from the **\`event_activity\`** dataset.

#### Target Dataset:
- **File:** \`event_activity.csv\`
- **DataFrame Name:** \`activity\`
- **Relevant Columns:** \`activity_id\`, \`activity_type\`, \`engagement_score\`, \`duration_minutes\`

#### Actual Dataset Results (Average Engagement per Activity):
| Activity Type | Average Engagement Score |
|:---:|:---:|
| TEST_RUN | 75.06 |
| LOGIN | 73.16 |
| DRAFT_SAVE | 72.03 |
| VIEW_LEADERBOARD | 70.84 |
| DOC_READ | 69.61 |
| SUBMIT | 65.89 |

Select the correct Pandas expression to compute average engagement for each activity type.`,
    fixtureDescription: 'Master Dataset: event_activity.csv (Activity Audit Telemetry)',
    fixtureTable: [
      { activity_id: 'ACT_1001', participant_id: 'P131', activity_type: 'LOGIN', duration_minutes: 29, engagement_score: 58 },
      { activity_id: 'ACT_1002', participant_id: 'P167', activity_type: 'TEST_RUN', duration_minutes: 15, engagement_score: 89 },
      { activity_id: 'ACT_1003', participant_id: 'P120', activity_type: 'DRAFT_SAVE', duration_minutes: 11, engagement_score: 83 },
      { activity_id: 'ACT_1004', participant_id: 'P127', activity_type: 'LOGIN', duration_minutes: 19, engagement_score: 86 },
      { activity_id: 'ACT_1005', participant_id: 'P151', activity_type: 'DOC_READ', duration_minutes: 37, engagement_score: 94 },
      { activity_id: 'ACT_1006', participant_id: 'P179', activity_type: 'TEST_RUN', duration_minutes: 38, engagement_score: 89 },
    ],
    options: [
      {
        key: 'A',
        label: 'Option A',
        code: 'activity.groupby("activity_type")["duration_minutes"].mean()',
        explanation: 'Incorrect. Computes the average duration_minutes rather than engagement_score.',
      },
      {
        key: 'B',
        label: 'Option B',
        code: 'activity.groupby("activity_type")["engagement_score"].mean()',
        explanation: 'Correct. Groups the activity DataFrame by activity_type and calculates the mean engagement_score.',
      },
      {
        key: 'C',
        label: 'Option C',
        code: 'activity.groupby("participant_id")["engagement_score"].sum()',
        explanation: 'Incorrect. Groups by participant_id instead of activity_type.',
      },
      {
        key: 'D',
        label: 'Option D',
        code: 'None of the above expressions',
        explanation: 'Distractor option indicating none of the listed expressions are valid.',
      },
    ],
    correctOptionKey: 'B',
    isCompulsoryRepair: false,
    starterCode: `import pandas as pd

def solve(activity: pd.DataFrame) -> pd.Series:
    """
    Calculate the average engagement score for each activity type.
    """
    return activity.groupby("activity_type")["engagement_score"].mean()
`,
    sampleTestCases: [
      {
        caseIndex: 1,
        name: 'Activity Engagement Means',
        stdin: 'event_activity',
        expectedOutput: JSON.stringify({
          TEST_RUN: 75.06,
          LOGIN: 73.16,
          DRAFT_SAVE: 72.03,
          VIEW_LEADERBOARD: 70.84,
          DOC_READ: 69.61,
          SUBMIT: 65.89,
        }),
        marks: 13,
        isHidden: false,
        explanation: 'Validates average engagement score for each activity type',
      },
    ],
    hiddenTestCases: [
      {
        caseIndex: 2,
        name: 'Full Activity Aggregation Test',
        stdin: 'event_activity_full',
        expectedOutput: JSON.stringify({
          TEST_RUN: 75.06,
          LOGIN: 73.16,
          DRAFT_SAVE: 72.03,
          VIEW_LEADERBOARD: 70.84,
          DOC_READ: 69.61,
          SUBMIT: 65.89,
        }),
        marks: 12,
        isHidden: true,
      },
    ],
  },

  {
    id: 'R3_Q6_TOP_5_TEAMS_ROUND_3',
    orderNumber: 6,
    caseNumber: 3,
    caseTitle: 'Case 3 – Event Intelligence and Team Ranking',
    title: 'Q6. Find the Top 5 Teams in Round 3',
    difficulty: 'ADVANCED',
    marks: 30,
    format: 'SELECT_CODE',
    technology: 'Python / Pandas',
    concept: 'Multi-Table Join, Grouping, and Top-K Aggregation',
    targetDataset: 'round_performance.csv, participants.csv, teams.csv',
    description: `### Problem Statement
Find the five teams with the highest average Round 3 raw score.

#### Target Datasets:
- **\`performance\`:** \`round_performance.csv\` (\`participant_id\`, \`round_number\`, \`raw_score\`)
- **\`participants\`:** \`participants.csv\` (\`participant_id\`, \`team_id\`)
- **\`teams\`:** \`teams.csv\` (\`team_id\`, \`team_name\`)

#### Actual Dataset Results (Top 5 Teams by Average Round 3 Score):
| Team Name | Team ID | Average Round 3 Score |
|:---|:---:|:---:|
| **Code Architects** | T118 | 90.30 |
| **Syntax Ninjas** | T148 | 88.35 |
| **Recursion Crusaders** | T147 | 86.00 |
| **Algorithm Warriors** | T122 | 85.30 |
| **Matrix Sentinels** | T117 | 84.90 |

Select the correct Pandas expression to perform the relational merge, team grouping, and top-5 extraction.`,
    fixtureDescription: 'Master Dataset: Multi-table join across round_performance, participants & teams',
    fixtureTable: [
      { team_name: 'Code Architects', team_id: 'T118', average_round3_score: 90.30 },
      { team_name: 'Syntax Ninjas', team_id: 'T148', average_round3_score: 88.35 },
      { team_name: 'Recursion Crusaders', team_id: 'T147', average_round3_score: 86.00 },
      { team_name: 'Algorithm Warriors', team_id: 'T122', average_round3_score: 85.30 },
      { team_name: 'Matrix Sentinels', team_id: 'T117', average_round3_score: 84.90 },
    ],
    options: [
      {
        key: 'A',
        label: 'Option A',
        code: 'performance[performance["round_number"] == 3].groupby("participant_id")["raw_score"].mean().nlargest(5)',
        explanation: 'Incorrect. Groups by participant_id instead of team_id, missing the relational join with participants.',
      },
      {
        key: 'B',
        label: 'Option B',
        code: 'performance[performance["round_number"] == 3].merge(participants[["participant_id","team_id"]], on="participant_id").groupby("team_id")["raw_score"].sum().nlargest(5)',
        explanation: 'Incorrect. Computes the sum of raw_score instead of the mean (average score).',
      },
      {
        key: 'C',
        label: 'Option C',
        code: 'performance[performance["round_number"] == 3].merge(participants[["participant_id","team_id"]], on="participant_id").groupby("team_id")["raw_score"].mean().nlargest(5)',
        explanation: 'Correct. Filters records where round_number == 3, merges with participants on participant_id, groups by team_id, computes the mean of raw_score, and selects the 5 highest scoring teams.',
      },
      {
        key: 'D',
        label: 'Option D',
        code: 'None of the above expressions',
        explanation: 'Distractor option indicating none of the listed expressions are valid.',
      },
    ],
    correctOptionKey: 'C',
    isCompulsoryRepair: false,
    starterCode: `import pandas as pd

def solve(performance: pd.DataFrame, participants: pd.DataFrame) -> pd.Series:
    """
    Find the five teams with the highest average Round 3 raw score.
    """
    return (
        performance[performance["round_number"] == 3]
        .merge(participants[["participant_id", "team_id"]], on="participant_id")
        .groupby("team_id")["raw_score"]
        .mean()
        .nlargest(5)
    )
`,
    sampleTestCases: [
      {
        caseIndex: 1,
        name: 'Top 5 Teams Verification',
        stdin: 'multi_table_join',
        expectedOutput: JSON.stringify({ T118: 90.3, T148: 88.35, T147: 86.0, T122: 85.3, T117: 84.9 }),
        marks: 15,
        isHidden: false,
        explanation: 'Validates top 5 team IDs and average Round 3 scores',
      },
    ],
    hiddenTestCases: [
      {
        caseIndex: 2,
        name: 'Team Name Mapping Verification',
        stdin: 'multi_table_join_full',
        expectedOutput: JSON.stringify(['Code Architects', 'Syntax Ninjas', 'Recursion Crusaders', 'Algorithm Warriors', 'Matrix Sentinels']),
        marks: 15,
        isHidden: true,
      },
    ],
  },
];

/**
 * IGNITRON 2K26 — Round 3: Python Code Tracing Challenge
 * 6 Python Code-Reading & Output-Prediction MCQs · 1 Mark Each · 6 Marks Total · No Negative Marking
 *
 * Reference Dataset: round3_reference_dataset_v2 (IGNITRON_Round3_Reference_Dataset.json)
 * - Q1: Calculate Total Score – P101 (Correct: A -> 207.4)
 * - Q2: Find Highest-Scoring Participant (Correct: B -> P196)
 * - Q3: Count Accepted Submissions (Correct: C -> 302)
 * - Q4: Identify Duplicate Submission IDs (Correct: C -> 0)
 * - Q5: Find Highest-Ranked Team (Correct: C -> Syntax Ninjas)
 * - Q6: Apply Team Ranking (Correct: C -> T148)
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
  stdin: string;
  expectedOutput: string;
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
  totalMarks: 0,
  criteria: [],
};

export const ROUND3_QUESTIONS_CONFIG: Round3QuestionConfig[] = [
  // ----------------------------------------------------------------------------
  // CASE 01: PARTICIPANT SCORING & TRACING (2 MARKS)
  // ----------------------------------------------------------------------------
  {
    id: 'R3_Q1_TOTAL_SCORE_P101',
    orderNumber: 1,
    caseNumber: 1,
    caseTitle: 'Case 01 – Participant Score Tracing',
    title: 'Q1. Calculate Total Score – P101',
    difficulty: 'EASY',
    marks: 1,
    format: 'SELECT_CODE',
    technology: 'Python Code Tracing',
    concept: 'Row Filtering & Sum Aggregation',
    targetDataset: 'participants.csv',
    description: `Trace the Python snippet below against \`participants.csv\` (100 participants).
For participant **P101** (Akash Patel: Round 1 = \`25.4\`, Round 2 = \`87.4\`, Round 3 = \`94.6\`), select the option where **both the Python code and the printed output are correct**.`,
    options: [
      {
        key: 'A',
        label: 'Option A',
        code: `row = df[df["participant_id"] == "P101"].iloc[0]
total = round(row["round_1_score"] + row["round_2_score"] + row["round_3_score"], 1)
print(total)
# Output: 207.4`,
        explanation: 'Correct. Filters P101 and sums round_1_score (25.4) + round_2_score (87.4) + round_3_score (94.6) = 207.4.',
      },
      {
        key: 'B',
        label: 'Option B',
        code: `row = df[df["participant_id"] == "P101"].iloc[0]
total = round(row["round_1_score"] + row["round_2_score"], 1)
print(total)
# Output: 112.8`,
        explanation: 'Incorrect. Omits round_3_score from total score calculation.',
      },
      {
        key: 'C',
        label: 'Option C',
        code: `row = df[df["participant_id"] == "P101"].iloc[0]
total = round(row["round_2_score"] + row["round_3_score"], 1)
print(total)
# Output: 207.4`,
        explanation: 'Incorrect. Code omits round_1_score so its output would be 182.0, not 207.4.',
      },
      {
        key: 'D',
        label: 'Option D',
        code: `row = df[df["participant_id"] == "P102"].iloc[0]
total = round(row["round_1_score"] + row["round_2_score"] + row["round_3_score"], 1)
print(total)
# Output: 207.4`,
        explanation: 'Incorrect. Filters P102 instead of P101.',
      },
    ],
    correctOptionKey: 'A',
    isCompulsoryRepair: false,
    starterCode: '',
    sampleTestCases: [],
    hiddenTestCases: [],
  },
  {
    id: 'R3_Q2_HIGHEST_PARTICIPANT',
    orderNumber: 2,
    caseNumber: 1,
    caseTitle: 'Case 01 – Participant Score Tracing',
    title: 'Q2. Find Highest-Scoring Participant',
    difficulty: 'EASY',
    marks: 1,
    format: 'SELECT_CODE',
    technology: 'Python Code Tracing',
    concept: 'idxmax() & Maximum Record Lookup',
    targetDataset: 'participants.csv',
    description: `Trace the Python snippet against \`participants.csv\` to identify the participant with the highest \`total_score\` (Neha Singh, \`217.2\`).
Select the option where **both the Python code and the printed output are correct**.`,
    options: [
      {
        key: 'A',
        label: 'Option A',
        code: `top = df.loc[df["total_score"].idxmin()]
print(top["participant_id"])
# Output: P196`,
        explanation: 'Incorrect. idxmin() returns the lowest-scoring participant, not the highest.',
      },
      {
        key: 'B',
        label: 'Option B',
        code: `top = df.loc[df["total_score"].idxmax()]
print(top["participant_id"])
# Output: P196`,
        explanation: 'Correct. idxmax() on total_score locates P196 (Neha Singh, 217.2).',
      },
      {
        key: 'C',
        label: 'Option C',
        code: `top = df.sort_values("total_score", ascending=True).iloc[0]
print(top["participant_id"])
# Output: P196`,
        explanation: 'Incorrect. ascending=True sorts lowest first.',
      },
      {
        key: 'D',
        label: 'Option D',
        code: `top = df.loc[df["round_1_score"].idxmax()]
print(top["participant_id"])
# Output: P101`,
        explanation: 'Incorrect. Checks round_1_score instead of total_score and prints P101.',
      },
    ],
    correctOptionKey: 'B',
    isCompulsoryRepair: false,
    starterCode: '',
    sampleTestCases: [],
    hiddenTestCases: [],
  },

  // ----------------------------------------------------------------------------
  // CASE 02: SUBMISSION LOG TRACING (2 MARKS)
  // ----------------------------------------------------------------------------
  {
    id: 'R3_Q3_COUNT_ACCEPTED',
    orderNumber: 3,
    caseNumber: 2,
    caseTitle: 'Case 02 – Submission Audit Tracing',
    title: 'Q3. Count Accepted Submissions',
    difficulty: 'EASY',
    marks: 1,
    format: 'SELECT_CODE',
    technology: 'Python Code Tracing',
    concept: 'Status Filtering & Count Extraction',
    targetDataset: 'submission_status_summary.csv',
    description: `Trace the Python snippet against \`submission_status_summary.csv\` (1,000 total submissions across 5 statuses).
Select the option where **both the Python code and the printed output are correct**.`,
    options: [
      {
        key: 'A',
        label: 'Option A',
        code: `accepted = summary.loc[summary["execution_status"] == "WRONG_ANSWER", "count"].iloc[0]
print(int(accepted))
# Output: 302`,
        explanation: 'Incorrect. Filters WRONG_ANSWER (192) instead of ACCEPTED.',
      },
      {
        key: 'B',
        label: 'Option B',
        code: `accepted = summary["count"].sum()
print(int(accepted))
# Output: 302`,
        explanation: 'Incorrect. Sums all 1000 submissions instead of filtering ACCEPTED.',
      },
      {
        key: 'C',
        label: 'Option C',
        code: `accepted = summary.loc[summary["execution_status"] == "ACCEPTED", "count"].iloc[0]
print(int(accepted))
# Output: 302`,
        explanation: 'Correct. Filters execution_status == "ACCEPTED" and prints 302.',
      },
      {
        key: 'D',
        label: 'Option D',
        code: `accepted = summary.loc[summary["execution_status"] == "ACCEPTED", "count"].iloc[0]
print(int(accepted))
# Output: 192`,
        explanation: 'Incorrect. Predicted output 192 is wrong (ACCEPTED count is 302).',
      },
    ],
    correctOptionKey: 'C',
    isCompulsoryRepair: false,
    starterCode: '',
    sampleTestCases: [],
    hiddenTestCases: [],
  },
  {
    id: 'R3_Q4_DUPLICATE_SUBMISSION_IDS',
    orderNumber: 4,
    caseNumber: 2,
    caseTitle: 'Case 02 – Submission Audit Tracing',
    title: 'Q4. Identify Duplicate Submission IDs',
    difficulty: 'EASY',
    marks: 1,
    format: 'SELECT_CODE',
    technology: 'Python Code Tracing',
    concept: 'Duplicate Detection with duplicated().sum()',
    targetDataset: 'submission_ids.csv',
    description: `Trace the Python snippet against \`submission_ids.csv\` (1,000 submission IDs from \`SUB_10001\` to \`SUB_11000\`).
Select the option where **both the Python code and the printed output are correct**.`,
    options: [
      {
        key: 'A',
        label: 'Option A',
        code: `dup_count = int(ids["submission_id"].nunique())
print(dup_count)
# Output: 0`,
        explanation: 'Incorrect. nunique() returns 1000, not 0.',
      },
      {
        key: 'B',
        label: 'Option B',
        code: `dup_count = int(ids["submission_id"].duplicated().sum())
print(dup_count)
# Output: 1000`,
        explanation: 'Incorrect. Output 1000 is wrong; all 1000 IDs are unique.',
      },
      {
        key: 'C',
        label: 'Option C',
        code: `dup_count = int(ids["submission_id"].duplicated().sum())
print(dup_count)
# Output: 0`,
        explanation: 'Correct. duplicated().sum() counts duplicate submission_id values, returning 0.',
      },
      {
        key: 'D',
        label: 'Option D',
        code: `dup_count = len(ids) - int(ids["submission_id"].isna().sum())
print(dup_count)
# Output: 0`,
        explanation: 'Incorrect. Computes non-null count (1000), not duplicates.',
      },
    ],
    correctOptionKey: 'C',
    isCompulsoryRepair: false,
    starterCode: '',
    sampleTestCases: [],
    hiddenTestCases: [],
  },

  // ----------------------------------------------------------------------------
  // CASE 03: TEAM LEADERBOARD & RANKING TRACING (2 MARKS)
  // ----------------------------------------------------------------------------
  {
    id: 'R3_Q5_HIGHEST_RANKED_TEAM',
    orderNumber: 5,
    caseNumber: 3,
    caseTitle: 'Case 03 – Team Leaderboard Tracing',
    title: 'Q5. Find Highest-Ranked Team',
    difficulty: 'MEDIUM',
    marks: 1,
    format: 'SELECT_CODE',
    technology: 'Python Code Tracing',
    concept: 'Descending Sort & Top Team Name Extraction',
    targetDataset: 'team_leaderboard.csv',
    description: `Trace the Python snippet against \`team_leaderboard.csv\` (50 teams; Rank 1 has \`total_score = 425.6\`).
Select the option where **both the Python code and the printed output are correct**.`,
    options: [
      {
        key: 'A',
        label: 'Option A',
        code: `best = leaderboard.sort_values("total_score", ascending=True).iloc[0]
print(best["team_name"])
# Output: Syntax Ninjas`,
        explanation: 'Incorrect. ascending=True picks the lowest-ranked team (Nexus Hunters).',
      },
      {
        key: 'B',
        label: 'Option B',
        code: `best = leaderboard.sort_values("round_3_score", ascending=False).iloc[0]
print(best["team_name"])
# Output: Syntax Ninjas`,
        explanation: 'Incorrect. Sorting by round_3_score puts Code Architects (180.6) first, not Syntax Ninjas (176.7).',
      },
      {
        key: 'C',
        label: 'Option C',
        code: `best = leaderboard.sort_values("total_score", ascending=False).iloc[0]
print(best["team_name"])
# Output: Syntax Ninjas`,
        explanation: 'Correct. Sorting by total_score descending places T148 (Syntax Ninjas, 425.6) at index 0.',
      },
      {
        key: 'D',
        label: 'Option D',
        code: `best = leaderboard.sort_values("total_score", ascending=False).iloc[1]
print(best["team_name"])
# Output: Syntax Ninjas`,
        explanation: 'Incorrect. iloc[1] selects rank 2 (Recursion Crusaders), not rank 1.',
      },
    ],
    correctOptionKey: 'C',
    isCompulsoryRepair: false,
    starterCode: '',
    sampleTestCases: [],
    hiddenTestCases: [],
  },
  {
    id: 'R3_Q6_APPLY_TEAM_RANKING',
    orderNumber: 6,
    caseNumber: 3,
    caseTitle: 'Case 03 – Team Leaderboard Tracing',
    title: 'Q6. Apply Team Ranking',
    difficulty: 'MEDIUM',
    marks: 1,
    format: 'SELECT_CODE',
    technology: 'Python Code Tracing',
    concept: 'Multi-Key Tie-Break Ranking & Top Team ID',
    targetDataset: 'team_round_scores.csv',
    description: `Trace the Python snippet against \`team_round_scores.csv\` (50 teams) applying ranking by \`total_score\`, then \`round_3_score\`, then \`round_2_score\` descending.
Select the option where **both the Python code and the printed output are correct**.`,
    options: [
      {
        key: 'A',
        label: 'Option A',
        code: `ranked = scores.sort_values(
    by=["total_score", "round_3_score", "round_2_score"],
    ascending=[True, True, True]
).reset_index(drop=True)
print(ranked.loc[0, "team_id"])
# Output: T148`,
        explanation: 'Incorrect. ascending=[True, True, True] places the lowest team (T102) at index 0.',
      },
      {
        key: 'B',
        label: 'Option B',
        code: `ranked = scores.sort_values(
    by=["round_3_score", "total_score", "round_2_score"],
    ascending=[False, False, False]
).reset_index(drop=True)
print(ranked.loc[0, "team_id"])
# Output: T148`,
        explanation: 'Incorrect. Primary key round_3_score puts T118 (180.6) ahead of T148 (176.7).',
      },
      {
        key: 'C',
        label: 'Option C',
        code: `ranked = scores.sort_values(
    by=["total_score", "round_3_score", "round_2_score"],
    ascending=[False, False, False]
).reset_index(drop=True)
print(ranked.loc[0, "team_id"])
# Output: T148`,
        explanation: 'Correct. Sorts descending by total_score -> round_3_score -> round_2_score, placing T148 at rank 1.',
      },
      {
        key: 'D',
        label: 'Option D',
        code: `ranked = scores.sort_values(
    by=["total_score", "round_3_score", "round_2_score"],
    ascending=[False, False, False]
).reset_index(drop=True)
print(ranked.loc[0, "team_id"])
# Output: T147`,
        explanation: 'Incorrect. Rank 1 team_id is T148 (Syntax Ninjas), while T147 is rank 2.',
      },
    ],
    correctOptionKey: 'C',
    isCompulsoryRepair: false,
    starterCode: '',
    sampleTestCases: [],
    hiddenTestCases: [],
  },
];

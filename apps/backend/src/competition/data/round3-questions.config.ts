/**
 * IGNITRON 2K26 — Round 3: IGNITRON Event Analytics Engine
 * Complete 6-Question Configuration, Answer Keys & Test Suites
 *
 * Scoring Rubric (100 Marks Total):
 * - Case 1: Data Discovery & Fundamentals (20 Marks)
 *     Q1: Score Computation Lab (10 Marks, Select Code)
 *     Q2: Leaderboard Aggregator (10 Marks, Write Code)
 * - Case 2: Data Engineering & Integrity (25 Marks)
 *     Q3: Duplicate Detection Challenge (12 Marks, Select Code)
 *     Q4: Statistical Anomaly Detector (13 Marks, Write Code)
 * - Case 3: Data Intelligence & Advanced Analytics (45 Marks)
 *     Q5: Ranking Intelligence Engine (22 Marks, Select Code)
 *     Q6: Top-K Decision Challenge (23 Marks, Write Code)
 * - Code Quality Rubric (10 Marks, Admin Review across written questions)
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
  description: string;
  fixtureDescription?: string;
  fixtureTable?: Record<string, any>[];
  options: Round3QuestionOption[];
  correctOptionKey: 'A' | 'B' | 'C' | 'D';
  isCompulsoryRepair: boolean; // For Q2, Q4, Q6 -> Option D required
  starterCode: string;
  sampleTestCases: Round3TestCase[];
  hiddenTestCases: Round3TestCase[];
}

export const ROUND3_CODE_QUALITY_RUBRIC = {
  totalMarks: 10,
  criteria: [
    {
      id: 'clean_structure',
      name: 'Clean Function Structure & Naming',
      maxMarks: 2,
      description: 'Clear modular decomposition, descriptive variable and function names, PEP-8 compliance.',
    },
    {
      id: 'data_structures',
      name: 'Data Structures & Library Idioms',
      maxMarks: 2,
      description: 'Idiomatic use of NumPy vectorized operations, Pandas DataFrames, and Python collections.',
    },
    {
      id: 'input_validation',
      name: 'Input Validation & Missing Values',
      maxMarks: 2,
      description: 'Defensive handling of nulls, NaNs, missing keys, and unexpected input types.',
    },
    {
      id: 'algorithmic_efficiency',
      name: 'Algorithmic Efficiency & Complexity',
      maxMarks: 2,
      description: 'Avoidance of nested quadratic loops; efficient grouping, sorting, and indexing.',
    },
    {
      id: 'edge_cases',
      name: 'Edge-Case & Boundary Robustness',
      maxMarks: 2,
      description: 'Proper handling of empty datasets, tied scores at Top-K boundaries, and zero denominators.',
    },
  ],
};

// ==============================================================================
// THE SIX QUESTIONS
// ==============================================================================

export const ROUND3_QUESTIONS_CONFIG: Round3QuestionConfig[] = [
  // ----------------------------------------------------------------------------
  // CASE 01: DATA DISCOVERY & FUNDAMENTALS (20 MARKS)
  // ----------------------------------------------------------------------------
  {
    id: 'R3_Q1_SCORE_COMPUTATION_LAB',
    orderNumber: 1,
    caseNumber: 1,
    caseTitle: 'Case 1 – Data Discovery and Fundamentals',
    title: 'Q1 – The Score Computation Lab',
    difficulty: 'EASY',
    marks: 10,
    format: 'SELECT_CODE',
    technology: 'NumPy',
    concept: 'Matrix vectorization and axis weighting',
    description: `### Operational Briefing
You are tasked with calculating the composite score for tournament participants across three rounds.
The tournament rules define the round weighting formula as follows:
- **Round 1:** 30% (0.30)
- **Round 2:** 30% (0.30)
- **Round 3:** 40% (0.40)

Given a 2D NumPy array \`data\` of shape \`(N, 3)\` where each row represents a participant's percentage scores across Round 1, Round 2, and Round 3, select the correct vectorized NumPy expression that calculates the weighted score for every participant.

#### Sample Data:
| Participant | Round 1 (%) | Round 2 (%) | Round 3 (%) |
|:---:|:---:|:---:|:---:|
| P101 | 80 | 75 | 90 |
| P102 | 65 | 85 | 70 |
| P103 | 95 | 60 | 80 |
| P104 | 70 | 70 | 75 |

Expected weighted scores: \`[82.5, 73.0, 78.5, 72.0]\``,
    fixtureTable: [
      { Participant: 'P101', 'Round 1': 80, 'Round 2': 75, 'Round 3': 90, Expected: 82.5 },
      { Participant: 'P102', 'Round 1': 65, 'Round 2': 85, 'Round 3': 70, Expected: 73.0 },
      { Participant: 'P103', 'Round 1': 95, 'Round 2': 60, 'Round 3': 80, Expected: 78.5 },
      { Participant: 'P104', 'Round 1': 70, 'Round 2': 70, 'Round 3': 75, Expected: 72.0 },
    ],
    options: [
      {
        key: 'A',
        label: 'Vectorized Row-wise Dot-Product Sum along Axis 1',
        code: `scores = np.sum(data * [0.3, 0.3, 0.4], axis=1)`,
        explanation: 'Correctly multiplies each row across columns by [0.3, 0.3, 0.4] and sums along axis=1 (across columns for each participant).',
      },
      {
        key: 'B',
        label: 'Unweighted Column Mean along Axis 0',
        code: `scores = np.mean(data, axis=0)`,
        explanation: 'Incorrect. Computes the average score per round across all participants, reducing rows rather than columns.',
      },
      {
        key: 'C',
        label: 'Unweighted Column Sum along Axis 0',
        code: `scores = np.sum(data, axis=0)`,
        explanation: 'Incorrect. Computes the column-wise sum across all participants without applying weights.',
      },
      {
        key: 'D',
        label: 'Analyst Correction Mode (Write Custom Code)',
        code: `# Select Option D if none of the above are valid or if you wish to provide an evaluated analytical function.`,
        explanation: 'Allows participant to write custom Python code evaluated against test cases.',
      },
    ],
    correctOptionKey: 'A',
    isCompulsoryRepair: false,
    starterCode: `import numpy as np

def solve(data):
    """
    Args:
        data (list[list[float]]): 2D array of shape (N, 3)
    Returns:
        list[float]: Weighted scores for each participant
    """
    arr = np.array(data)
    scores = np.sum(arr * [0.3, 0.3, 0.4], axis=1)
    return scores.round(2).tolist()
`,
    sampleTestCases: [
      {
        caseIndex: 1,
        name: 'Sample 4 Participants',
        stdin: JSON.stringify([[80, 75, 90], [65, 85, 70], [95, 60, 80], [70, 70, 75]]),
        expectedOutput: JSON.stringify([82.5, 73.0, 78.5, 72.0]),
        marks: 5,
        isHidden: false,
        explanation: 'Standard sample from problem briefing',
      },
    ],
    hiddenTestCases: [
      {
        caseIndex: 2,
        name: 'Hidden Boundary & Precision Test',
        stdin: JSON.stringify([[100, 100, 100], [0, 0, 0], [50, 50, 50], [90.5, 82.2, 74.8]]),
        expectedOutput: JSON.stringify([100.0, 0.0, 50.0, 81.73]),
        marks: 5,
        isHidden: true,
      },
    ],
  },

  {
    id: 'R3_Q2_LEADERBOARD_AGGREGATOR',
    orderNumber: 2,
    caseNumber: 1,
    caseTitle: 'Case 1 – Data Discovery and Fundamentals',
    title: 'Q2 – The Leaderboard Aggregator',
    difficulty: 'MEDIUM',
    marks: 10,
    format: 'WRITE_CODE',
    technology: 'Pandas & NumPy',
    concept: 'Multi-table normalization, grouping, and weighted aggregation',
    description: `### Operational Briefing
You must build an analytical aggregation function that computes each team's average weighted performance across all three competition rounds.

#### Normalization Rules:
Raw round scores must be normalized to a 100-point scale using the official maximums:
- **Round 1:** percentage = \`raw_score / 30.0 * 100.0\`
- **Round 2:** percentage = \`raw_score / 100.0 * 100.0\`
- **Round 3:** percentage = \`raw_score / 100.0 * 100.0\`

#### Participant Weighted Score:
\`participant_weighted_score = (r1_pct * 0.30) + (r2_pct * 0.30) + (r3_pct * 0.40)\`

#### Team Aggregation:
- Each team has 2 participants.
- Compute the team's average weighted score: arithmetic mean of its members' weighted scores.
- Return a list of team dictionaries sorted by \`average_weighted_score\` in **descending order**. If tied, sort by \`team_id\` ascending.

#### Required Output Format:
\`\`\`json
[
  {
    "team_id": "T101",
    "team_name": "Binary Ninjas",
    "participant_count": 2,
    "average_weighted_score": 84.5
  }
]
\`\`\`
Round \`average_weighted_score\` to 2 decimal places.`,
    options: [
      {
        key: 'A',
        label: 'Flawed: Direct raw score sum without normalizing Round 1 max (30)',
        code: `# Flawed: treats Round 1 out of 100 instead of 30, severely skewing weights
team_scores = df.groupby('team_id')['raw_score'].mean()`,
        explanation: 'Fails to normalize Round 1 (out of 30), resulting in incorrect weighting.',
      },
      {
        key: 'B',
        label: 'Flawed: Arithmetic mean of raw rounds without applying 30/30/40 weights',
        code: `# Flawed: unweighted average of round percentages
df['weighted'] = (df['r1'] + df['r2'] + df['r3']) / 3.0`,
        explanation: 'Does not apply the 0.30, 0.30, 0.40 official weighting formula.',
      },
      {
        key: 'C',
        label: 'Flawed: Ascending sort instead of descending leaderboard order',
        code: `# Flawed: sorts lowest performing teams first
teams.sort_values(by='average_weighted_score', ascending=True)`,
        explanation: 'Sorts in ascending order, inverting the leaderboard.',
      },
      {
        key: 'D',
        label: 'Analyst Correction Mode (Required Written Solution)',
        code: `# Option D is required. Implement the complete, normalized aggregation pipeline.`,
        explanation: 'Candidate approaches A, B, and C contain intentional analytical flaws. Write the corrected function in Option D.',
      },
    ],
    correctOptionKey: 'D',
    isCompulsoryRepair: true,
    starterCode: `import json
import pandas as pd
import numpy as np

def solve(data):
    """
    Args:
        data (dict): Contains 'participants', 'teams', 'round_performance'
    Returns:
        list[dict]: Sorted team summaries (descending by average_weighted_score)
    """
    # 1. Load dataframes
    participants_df = pd.DataFrame(data['participants'])
    teams_df = pd.DataFrame(data['teams'])
    rp_df = pd.DataFrame(data['round_performance'])
    
    # 2. Normalize scores per round
    # Round 1 max: 30, Round 2 max: 100, Round 3 max: 100
    # Weighted score: r1_norm * 0.30 + r2_norm * 0.30 + r3_norm * 0.40
    
    # Write your aggregation logic below
    
    return []
`,
    sampleTestCases: [
      {
        caseIndex: 1,
        name: 'Sample Two-Team Normalized Aggregator',
        stdin: JSON.stringify({
          teams: [
            { team_id: 'T101', team_name: 'Binary Ninjas' },
            { team_id: 'T102', team_name: 'Cyber Titans' },
          ],
          participants: [
            { participant_id: 'P101', team_id: 'T101' },
            { participant_id: 'P102', team_id: 'T101' },
            { participant_id: 'P103', team_id: 'T102' },
            { participant_id: 'P104', team_id: 'T102' },
          ],
          round_performance: [
            { participant_id: 'P101', round_number: 1, raw_score: 24 }, // 80% * 0.3 = 24
            { participant_id: 'P101', round_number: 2, raw_score: 80 }, // 80% * 0.3 = 24
            { participant_id: 'P101', round_number: 3, raw_score: 80 }, // 80% * 0.4 = 32 -> 80.0
            { participant_id: 'P102', round_number: 1, raw_score: 27 }, // 90% * 0.3 = 27
            { participant_id: 'P102', round_number: 2, raw_score: 90 }, // 90% * 0.3 = 27
            { participant_id: 'P102', round_number: 3, raw_score: 90 }, // 90% * 0.4 = 36 -> 90.0 (T101 avg = 85.0)
            { participant_id: 'P103', round_number: 1, raw_score: 15 }, // 50% * 0.3 = 15
            { participant_id: 'P103', round_number: 2, raw_score: 60 }, // 60% * 0.3 = 18
            { participant_id: 'P103', round_number: 3, raw_score: 70 }, // 70% * 0.4 = 28 -> 61.0
            { participant_id: 'P104', round_number: 1, raw_score: 21 }, // 70% * 0.3 = 21
            { participant_id: 'P104', round_number: 2, raw_score: 70 }, // 70% * 0.3 = 21
            { participant_id: 'P104', round_number: 3, raw_score: 80 }, // 80% * 0.4 = 32 -> 74.0 (T102 avg = 67.5)
          ],
        }),
        expectedOutput: JSON.stringify([
          { team_id: 'T101', team_name: 'Binary Ninjas', participant_count: 2, average_weighted_score: 85.0 },
          { team_id: 'T102', team_name: 'Cyber Titans', participant_count: 2, average_weighted_score: 67.5 },
        ]),
        marks: 5,
        isHidden: false,
        explanation: 'Verifies correct normalization and descending order',
      },
    ],
    hiddenTestCases: [
      {
        caseIndex: 2,
        name: 'Hidden Multi-Team Incomplete Rounds & Ties Test',
        stdin: JSON.stringify({
          teams: [
            { team_id: 'T101', team_name: 'Alpha' },
            { team_id: 'T102', team_name: 'Beta' },
            { team_id: 'T103', team_name: 'Gamma' },
          ],
          participants: [
            { participant_id: 'P1', team_id: 'T101' },
            { participant_id: 'P2', team_id: 'T101' },
            { participant_id: 'P3', team_id: 'T102' },
            { participant_id: 'P4', team_id: 'T102' },
            { participant_id: 'P5', team_id: 'T103' },
            { participant_id: 'P6', team_id: 'T103' },
          ],
          round_performance: [
            { participant_id: 'P1', round_number: 1, raw_score: 30 },
            { participant_id: 'P1', round_number: 2, raw_score: 100 },
            { participant_id: 'P1', round_number: 3, raw_score: 100 }, // 100.0
            { participant_id: 'P2', round_number: 1, raw_score: 30 },
            { participant_id: 'P2', round_number: 2, raw_score: 100 },
            { participant_id: 'P2', round_number: 3, raw_score: 100 }, // 100.0 -> T101 avg = 100.0
            { participant_id: 'P3', round_number: 1, raw_score: 30 },
            { participant_id: 'P3', round_number: 2, raw_score: 100 },
            { participant_id: 'P3', round_number: 3, raw_score: 100 },
            { participant_id: 'P4', round_number: 1, raw_score: 30 },
            { participant_id: 'P4', round_number: 2, raw_score: 100 },
            { participant_id: 'P4', round_number: 3, raw_score: 100 }, // 100.0 -> T102 avg = 100.0 (tied with T101, tiebreak by team_id)
            { participant_id: 'P5', round_number: 1, raw_score: 0 },
            { participant_id: 'P5', round_number: 2, raw_score: 0 },
            { participant_id: 'P5', round_number: 3, raw_score: 0 },
            { participant_id: 'P6', round_number: 1, raw_score: 0 },
            { participant_id: 'P6', round_number: 2, raw_score: 0 },
            { participant_id: 'P6', round_number: 3, raw_score: 0 }, // 0.0 -> T103 avg = 0.0
          ],
        }),
        expectedOutput: JSON.stringify([
          { team_id: 'T101', team_name: 'Alpha', participant_count: 2, average_weighted_score: 100.0 },
          { team_id: 'T102', team_name: 'Beta', participant_count: 2, average_weighted_score: 100.0 },
          { team_id: 'T103', team_name: 'Gamma', participant_count: 2, average_weighted_score: 0.0 },
        ]),
        marks: 5,
        isHidden: true,
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // CASE 02: DATA ENGINEERING & INTEGRITY (25 MARKS)
  // ----------------------------------------------------------------------------
  {
    id: 'R3_Q3_DUPLICATE_DETECTION_CHALLENGE',
    orderNumber: 3,
    caseNumber: 2,
    caseTitle: 'Case 2 – Data Engineering and Integrity',
    title: 'Q3 – The Duplicate Detection Challenge',
    difficulty: 'MEDIUM',
    marks: 12,
    format: 'SELECT_CODE',
    technology: 'Pandas',
    concept: 'Deduplication, boolean indexing, and data validation',
    description: `### Operational Briefing
During ingestion, event telemetry records occasionally suffer from duplicate transmissions, out-of-range sensor values, and missing attributes.

Inspect the following fixture table:
| ID | Name | Score |
|:---:|:---:|:---:|
| P101 | Arun | 85 |
| P102 | Ravi | 90 |
| P101 | Arun | 85 |
| P103 | Neha | 110 |
| P104 | Priya | NaN |

#### Questions:
1. Which Pandas method identifies duplicate participant records based on the \`ID\` column?
2. Note the analytical distinction:
   - \`df.duplicated(subset=['ID'])\` marks subsequent occurrences as \`True\`.
   - Score \`110\` is an invalid out-of-range observation (score > 100).
   - Score \`NaN\` is a missing value.
   - Genuine valid records: exactly 2 distinct valid participants (P101: 85, P102: 90).`,
    fixtureTable: [
      { ID: 'P101', Name: 'Arun', Score: 85, Classification: 'Original Valid' },
      { ID: 'P102', Name: 'Ravi', Score: 90, Classification: 'Valid' },
      { ID: 'P101', Name: 'Arun', Score: 85, Classification: 'Duplicate Record' },
      { ID: 'P103', Name: 'Neha', Score: 110, Classification: 'Invalid Score (>100)' },
      { ID: 'P104', Name: 'Priya', Score: 'NaN', Classification: 'Missing Value (Null)' },
    ],
    options: [
      {
        key: 'A',
        label: 'Subset Key Deduplication via df.duplicated(subset=["ID"])',
        code: `is_duplicate = df.duplicated(subset=['ID'])`,
        explanation: 'Correct. df.duplicated(subset=["ID"]) flags repeated occurrences of the primary identifier.',
      },
      {
        key: 'B',
        label: 'Missing Value Check via df.isnull()',
        code: `is_missing = df.isnull()`,
        explanation: 'Incorrect. Identifies NaN values (like Priya), not duplicate participant identities.',
      },
      {
        key: 'C',
        label: 'Row Drop via df.dropna()',
        code: `cleaned_df = df.dropna()`,
        explanation: 'Incorrect. Removes rows containing NaN, ignoring repeated records like P101.',
      },
      {
        key: 'D',
        label: 'Analyst Correction Mode (Write Custom Code)',
        code: `# Select Option D if providing custom analytical filtering.`,
        explanation: 'Option D allows custom code submission.',
      },
    ],
    correctOptionKey: 'A',
    isCompulsoryRepair: false,
    starterCode: `import pandas as pd

def solve(data):
    """
    Args:
        data (list[dict]): Fixture records
    Returns:
        dict: Summary of duplicates, missing, and invalid records
    """
    df = pd.DataFrame(data)
    dup_mask = df.duplicated(subset=['ID'])
    return {
        "duplicate_ids": df[dup_mask]['ID'].tolist(),
        "valid_count": int((~dup_mask & (df['Score'] >= 0) & (df['Score'] <= 100) & df['Score'].notnull()).sum())
    }
`,
    sampleTestCases: [
      {
        caseIndex: 1,
        name: 'Sample Fixture Deduplication',
        stdin: JSON.stringify([
          { ID: 'P101', Name: 'Arun', Score: 85 },
          { ID: 'P102', Name: 'Ravi', Score: 90 },
          { ID: 'P101', Name: 'Arun', Score: 85 },
          { ID: 'P103', Name: 'Neha', Score: 110 },
          { ID: 'P104', Name: 'Priya', Score: null },
        ]),
        expectedOutput: JSON.stringify({ duplicate_ids: ['P101'], valid_count: 2 }),
        marks: 6,
        isHidden: false,
      },
    ],
    hiddenTestCases: [
      {
        caseIndex: 2,
        name: 'Hidden Multi-Duplicate & Null Mix',
        stdin: JSON.stringify([
          { ID: 'A1', Score: 50 },
          { ID: 'A2', Score: 70 },
          { ID: 'A1', Score: 50 },
          { ID: 'A1', Score: 50 },
          { ID: 'A3', Score: 120 },
          { ID: 'A4', Score: -10 },
        ]),
        expectedOutput: JSON.stringify({ duplicate_ids: ['A1', 'A1'], valid_count: 2 }),
        marks: 6,
        isHidden: true,
      },
    ],
  },

  {
    id: 'R3_Q4_STATISTICAL_ANOMALY_DETECTOR',
    orderNumber: 4,
    caseNumber: 2,
    caseTitle: 'Case 2 – Data Engineering and Integrity',
    title: 'Q4 – The Statistical Anomaly Detector',
    difficulty: 'MEDIUM',
    marks: 13,
    format: 'WRITE_CODE',
    technology: 'NumPy & Pandas',
    concept: 'IQR outlier detection and multi-class anomaly taxonomy',
    description: `### Operational Briefing
Write a robust anomaly detection pipeline that segregates records into three mutually exclusive error/anomaly categories:

1. **Invalid Records (\`invalid_record_ids\`):**
   - Scores strictly less than \`0\` or strictly greater than \`100\`.
2. **Missing Records (\`missing_record_ids\`):**
   - Records where \`score\` is \`null\`, \`None\`, or \`NaN\`.
3. **Statistical Outliers (\`outlier_record_ids\`):**
   - A valid score (\`0 <= score <= 100\`) that lies outside the Interquartile Range (IQR) fences.
   - Missing and invalid scores **MUST NOT** enter the IQR calculation.
   - Use Pandas default quantile interpolation (linear):
     - \`Q1 = series.quantile(0.25)\`
     - \`Q3 = series.quantile(0.75)\`
     - \`IQR = Q3 - Q1\`
     - \`Lower Fence = Q1 - 1.5 * IQR\`
     - \`Upper Fence = Q3 + 1.5 * IQR\`
   - An outlier is a **valid** observation where \`score < Lower Fence\` or \`score > Upper Fence\`.

#### Return Format:
\`\`\`json
{
  "invalid_record_ids": ["R102"],
  "missing_record_ids": ["R105"],
  "outlier_record_ids": ["R108"]
}
\`\`\`
All lists of record IDs must be returned in **sorted order**.`,
    options: [
      {
        key: 'A',
        label: 'Flawed: Includes invalid and missing values in quantile calculation',
        code: `# Flawed: NaNs and negative values distort Q1/Q3 boundaries
q1 = df['score'].quantile(0.25)
q3 = df['score'].quantile(0.75)`,
        explanation: 'Fails to filter out invalid (-5, 150) before computing quartiles.',
      },
      {
        key: 'B',
        label: 'Flawed: Automatically labels statistical outliers as invalid records',
        code: `# Flawed: treats genuine high performers as corrupted records
invalid_records = df[(df['score'] < 0) | (df['score'] > 100) | (df['score'] > upper_fence)]`,
        explanation: 'Confuses data invalidity with statistical anomalies.',
      },
      {
        key: 'C',
        label: 'Flawed: Hardcodes static 3-sigma Z-score assuming normal distribution',
        code: `# Flawed: assumes normal distribution on non-Gaussian competition scores
z = (x - mean) / std`,
        explanation: 'Contest specification requires non-parametric IQR fences, not Z-scores.',
      },
      {
        key: 'D',
        label: 'Analyst Correction Mode (Required Written Solution)',
        code: `# Option D is required. Implement defensive filtering, quantile fences, and sorted outputs.`,
        explanation: 'Candidate approaches contain intentional statistical mistakes. Write the corrected function in Option D.',
      },
    ],
    correctOptionKey: 'D',
    isCompulsoryRepair: true,
    starterCode: `import json
import pandas as pd
import numpy as np

def solve(records):
    """
    Args:
        records (list[dict]): Each record has 'id' and 'score'
    Returns:
        dict: {"invalid_record_ids": [], "missing_record_ids": [], "outlier_record_ids": []}
    """
    # Write your IQR outlier & invalid filter here
    
    return {
        "invalid_record_ids": [],
        "missing_record_ids": [],
        "outlier_record_ids": []
    }
`,
    sampleTestCases: [
      {
        caseIndex: 1,
        name: 'Sample Anomaly Dataset (8 Valid + Invalid/Missing)',
        stdin: JSON.stringify([
          { id: 'REC_01', score: 40 },
          { id: 'REC_02', score: 42 },
          { id: 'REC_03', score: 43 },
          { id: 'REC_04', score: 45 },
          { id: 'REC_05', score: 47 },
          { id: 'REC_06', score: 48 },
          { id: 'REC_07', score: 49 },
          { id: 'REC_08', score: 98 }, // Statistical outlier!
          { id: 'REC_09', score: -5 }, // Invalid
          { id: 'REC_10', score: 150 }, // Invalid
          { id: 'REC_11', score: null }, // Missing
        ]),
        expectedOutput: JSON.stringify({
          invalid_record_ids: ['REC_09', 'REC_10'],
          missing_record_ids: ['REC_11'],
          outlier_record_ids: ['REC_08'],
        }),
        marks: 6,
        isHidden: false,
        explanation: 'Valid scores [40, 42, 43, 45, 47, 48, 49, 98] yield Q1=42.75, Q3=48.25, IQR=5.5, Upper Fence=56.5. 98 > 56.5 -> Outlier.',
      },
    ],
    hiddenTestCases: [
      {
        caseIndex: 2,
        name: 'Hidden No-Outliers Clean Distribution',
        stdin: JSON.stringify([
          { id: 'R1', score: 50 },
          { id: 'R2', score: 52 },
          { id: 'R3', score: 54 },
          { id: 'R4', score: 56 },
          { id: 'R5', score: 58 },
          { id: 'R6', score: -1 },
          { id: 'R7', score: 101 },
          { id: 'R8', score: null },
        ]),
        expectedOutput: JSON.stringify({
          invalid_record_ids: ['R6', 'R7'],
          missing_record_ids: ['R8'],
          outlier_record_ids: [],
        }),
        marks: 7,
        isHidden: true,
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // CASE 03: DATA INTELLIGENCE & ADVANCED ANALYTICS (45 MARKS)
  // ----------------------------------------------------------------------------
  {
    id: 'R3_Q5_RANKING_INTELLIGENCE_ENGINE',
    orderNumber: 5,
    caseNumber: 3,
    caseTitle: 'Case 3 – Data Intelligence and Advanced Analytics',
    title: 'Q5 – The Ranking Intelligence Engine',
    difficulty: 'ADVANCED',
    marks: 22,
    format: 'SELECT_CODE',
    technology: 'Pandas & NumPy',
    concept: 'Multi-tiered tie-breaking and rank equivalence',
    description: `### Operational Briefing
The IGNITRON Championship requires a multi-criteria ranking algorithm.
Each participant has normalized scores (\`0 <= score <= 100\`) in three metrics:
- **Accuracy Score**
- **Speed Score** (higher represents faster/better execution)
- **Completion Score**

#### Formula:
\`weighted_score = (accuracy_score * 0.50) + (speed_score * 0.20) + (completion_score * 0.30)\`

#### Tie-Breaking Hierarchy (in exact order):
1. **Higher weighted score** (descending)
2. **Higher accuracy score** (descending)
3. **Higher completion score** (descending)
4. **Higher speed score** (descending)
5. **Earlier submission timestamp** (ascending)

#### Competition Ranking vs. Display Order:
- If all five criteria are identical, participants **share the same numerical rank** (e.g. both are Rank 2).
- \`participant_id\` may be used only for deterministic display sorting and **must not break a legitimate numerical competition tie**.

Which sorting specification correctly establishes this hierarchy?`,
    options: [
      {
        key: 'A',
        label: 'Inverted Accuracy Sort Order',
        code: `df.sort_values(by=['weighted_score', 'accuracy_score'], ascending=[False, True])`,
        explanation: 'Incorrect: Sorts accuracy in ascending order rather than descending.',
      },
      {
        key: 'B',
        label: 'Full Canonical Multi-Criterion Lexicographical Sort',
        code: `df.sort_values(
    by=['weighted_score', 'accuracy_score', 'completion_score', 'speed_score', 'submitted_at'],
    ascending=[False, False, False, False, True]
)`,
        explanation: 'Correct: Follows the exact tie-breaking sequence specified in the competition rules.',
      },
      {
        key: 'C',
        label: 'Penalty Seconds with Inverted Completion',
        code: `df.sort_values(by=['total_score', 'penalty_seconds', 'completion'], ascending=[False, False, True])`,
        explanation: 'Incorrect: Uses non-existent fields and inverted completion order.',
      },
      {
        key: 'D',
        label: 'Analyst Correction Mode (Write Custom Code)',
        code: `# Select Option D if providing custom ranking implementation.`,
        explanation: 'Allows participant to write custom Python ranking code.',
      },
    ],
    correctOptionKey: 'B',
    isCompulsoryRepair: false,
    starterCode: `import pandas as pd

def solve(participants):
    """
    Args:
        participants (list[dict]): Each record has id, accuracy, speed, completion, submitted_at
    Returns:
        list[dict]: Ranked participant list with calculated weighted_score and rank
    """
    df = pd.DataFrame(participants)
    df['weighted_score'] = (df['accuracy'] * 0.50 + df['speed'] * 0.20 + df['completion'] * 0.30).round(2)
    df = df.sort_values(
        by=['weighted_score', 'accuracy', 'completion', 'speed', 'submitted_at'],
        ascending=[False, False, False, False, True]
    )
    # Dense / min rank logic
    df['rank'] = df['weighted_score'].rank(method='min', ascending=False).astype(int)
    return df[['id', 'weighted_score', 'rank']].to_dict(orient='records')
`,
    sampleTestCases: [
      {
        caseIndex: 1,
        name: 'Sample 4 Participants Tie-Breaking',
        stdin: JSON.stringify([
          { id: 'P101', accuracy: 90, speed: 80, completion: 95, submitted_at: '2026-11-19T10:00:00Z' }, // 45 + 16 + 28.5 = 89.5
          { id: 'P102', accuracy: 95, speed: 70, completion: 90, submitted_at: '2026-11-19T10:01:00Z' }, // 47.5 + 14 + 27 = 88.5
          { id: 'P103', accuracy: 90, speed: 85, completion: 95, submitted_at: '2026-11-19T10:02:00Z' }, // 45 + 17 + 28.5 = 90.5
          { id: 'P104', accuracy: 85, speed: 90, completion: 80, submitted_at: '2026-11-19T10:03:00Z' }, // 42.5 + 18 + 24 = 84.5
        ]),
        expectedOutput: JSON.stringify([
          { id: 'P103', weighted_score: 90.5, rank: 1 },
          { id: 'P101', weighted_score: 89.5, rank: 2 },
          { id: 'P102', weighted_score: 88.5, rank: 3 },
          { id: 'P104', weighted_score: 84.5, rank: 4 },
        ]),
        marks: 11,
        isHidden: false,
      },
    ],
    hiddenTestCases: [
      {
        caseIndex: 2,
        name: 'Hidden Identical Scores Timestamp Tie-Break',
        stdin: JSON.stringify([
          { id: 'A', accuracy: 90, speed: 80, completion: 90, submitted_at: '2026-11-19T10:05:00Z' },
          { id: 'B', accuracy: 90, speed: 80, completion: 90, submitted_at: '2026-11-19T10:02:00Z' }, // earlier -> ranks higher in display
        ]),
        expectedOutput: JSON.stringify([
          { id: 'B', weighted_score: 88.0, rank: 1 },
          { id: 'A', weighted_score: 88.0, rank: 1 }, // Equal competition rank!
        ]),
        marks: 11,
        isHidden: true,
      },
    ],
  },

  {
    id: 'R3_Q6_TOP_K_DECISION_CHALLENGE',
    orderNumber: 6,
    caseNumber: 3,
    caseTitle: 'Case 3 – Data Intelligence and Advanced Analytics',
    title: 'Q6 – The Top-K Decision Challenge',
    difficulty: 'EXPERT',
    marks: 23,
    format: 'WRITE_CODE',
    technology: 'Python 3, Pandas & NumPy',
    concept: 'End-to-end competition analytics engine, Top-K tie boundaries, and executive reporting',
    description: `### Operational Briefing (Final Tournament Climax)
Build the final **IGNITRON Event Analytics Engine Report**.

Using the simulated event dataset (participants, teams, and performance records), compute:
1. **Weighted Scores:**
   \`weighted_score = (accuracy_score * 0.50) + (speed_score * 0.20) + (completion_score * 0.30)\`
2. **Canonical Ranking:** Apply the exact 5 tie-breaking criteria from Q5.
3. **Top 5 Leaderboard (\`top_5\`):**
   - Include all participants with \`competition_rank <= 5\`.
   - **Critical Tie Rule:** If multiple participants tie at rank 5, **include all of them**!
4. **Top 5 Average Score (\`top_5_average_score\`):**
   - Arithmetic mean of the weighted scores of all participants included in the \`top_5\` group.
5. **Highest Performing Team (\`highest_performing_team\`):**
   - The team with the highest average weighted score of its two participants.
   - If tied, resolve by \`team_id\` ascending.
6. **First-to-Fifth Score Difference (\`first_to_fifth_score_difference\`):**
   - \`weighted_score(rank 1) - weighted_score(rank 5)\`.
7. **Complete Leaderboard (\`leaderboard\`):**
   - All participants sorted canonically.

#### Required Output JSON:
\`\`\`json
{
  "top_5": [
    { "participant_id": "P103", "team_id": "T102", "weighted_score": 90.5, "rank": 1 }
  ],
  "top_5_average_score": 87.25,
  "highest_performing_team": {
    "team_id": "T101",
    "team_name": "Binary Ninjas",
    "average_score": 85.5
  },
  "first_to_fifth_score_difference": 8.5,
  "leaderboard": [ ... ]
}
\`\`\`
All floating-point numbers rounded to 2 decimal places.`,
    options: [
      {
        key: 'A',
        label: 'Flawed: Hard slice [:5] without including ties at rank 5',
        code: `# Flawed: arbitrarily cuts off tied 5th place participants
top_5 = leaderboard[:5]`,
        explanation: 'Violates competition rulebook: all participants tied at rank 5 must be included.',
      },
      {
        key: 'B',
        label: 'Flawed: Calculates team score using sum instead of arithmetic mean of members',
        code: `# Flawed: sums team members instead of computing average
team_score = team_df['weighted_score'].sum()`,
        explanation: 'Rule requires arithmetic mean of members.',
      },
      {
        key: 'C',
        label: 'Flawed: First-to-fifth difference taken from index 0 to index 4 regardless of rank',
        code: `# Flawed: uses row indices rather than numerical rank 1 and rank 5
diff = leaderboard[0]['score'] - leaderboard[4]['score']`,
        explanation: 'Fails when there are multiple ties before or at rank 5.',
      },
      {
        key: 'D',
        label: 'Analyst Correction Mode (Required Written Solution)',
        code: `# Option D is required. Implement the complete end-to-end analytics report engine.`,
        explanation: 'Candidate approaches A, B, and C contain deliberate analytical flaws. Write the corrected function in Option D.',
      },
    ],
    correctOptionKey: 'D',
    isCompulsoryRepair: true,
    starterCode: `import json
import pandas as pd
import numpy as np

def solve(data):
    """
    Args:
        data (dict): Contains 'participants', 'teams', 'round_performance'
    Returns:
        dict: {
            "top_5": list[dict],
            "top_5_average_score": float,
            "highest_performing_team": dict,
            "first_to_fifth_score_difference": float,
            "leaderboard": list[dict]
        }
    """
    participants = pd.DataFrame(data['participants'])
    teams = pd.DataFrame(data['teams'])
    perf = pd.DataFrame(data['round_performance'])
    
    # Write your end-to-end event analytics engine here
    
    return {
        "top_5": [],
        "top_5_average_score": 0.0,
        "highest_performing_team": {},
        "first_to_fifth_score_difference": 0.0,
        "leaderboard": []
    }
`,
    sampleTestCases: [
      {
        caseIndex: 1,
        name: 'Sample 6-Participant Top-5 with Rank 5 Tie',
        stdin: JSON.stringify({
          teams: [
            { team_id: 'T1', team_name: 'Team One' },
            { team_id: 'T2', team_name: 'Team Two' },
            { team_id: 'T3', team_name: 'Team Three' },
          ],
          participants: [
            { participant_id: 'P1', team_id: 'T1' },
            { participant_id: 'P2', team_id: 'T1' },
            { participant_id: 'P3', team_id: 'T2' },
            { participant_id: 'P4', team_id: 'T2' },
            { participant_id: 'P5', team_id: 'T3' },
            { participant_id: 'P6', team_id: 'T3' },
          ],
          round_performance: [
            { participant_id: 'P1', accuracy_score: 100, speed_score: 100, completion_score: 100, submitted_at: '2026-11-19T10:00:00Z' }, // 100.0 (Rank 1)
            { participant_id: 'P2', accuracy_score: 90, speed_score: 90, completion_score: 90, submitted_at: '2026-11-19T10:00:00Z' },   // 90.0 (Rank 2)
            { participant_id: 'P3', accuracy_score: 80, speed_score: 80, completion_score: 80, submitted_at: '2026-11-19T10:00:00Z' },   // 80.0 (Rank 3)
            { participant_id: 'P4', accuracy_score: 70, speed_score: 70, completion_score: 70, submitted_at: '2026-11-19T10:00:00Z' },   // 70.0 (Rank 4)
            { participant_id: 'P5', accuracy_score: 60, speed_score: 60, completion_score: 60, submitted_at: '2026-11-19T10:00:00Z' },   // 60.0 (Rank 5)
            { participant_id: 'P6', accuracy_score: 60, speed_score: 60, completion_score: 60, submitted_at: '2026-11-19T10:00:00Z' },   // 60.0 (Rank 5 - TIED! Both included!)
          ],
        }),
        expectedOutput: JSON.stringify({
          top_5: [
            { participant_id: 'P1', team_id: 'T1', weighted_score: 100.0, rank: 1 },
            { participant_id: 'P2', team_id: 'T1', weighted_score: 90.0, rank: 2 },
            { participant_id: 'P3', team_id: 'T2', weighted_score: 80.0, rank: 3 },
            { participant_id: 'P4', team_id: 'T2', weighted_score: 70.0, rank: 4 },
            { participant_id: 'P5', team_id: 'T3', weighted_score: 60.0, rank: 5 },
            { participant_id: 'P6', team_id: 'T3', weighted_score: 60.0, rank: 5 },
          ],
          top_5_average_score: 76.67,
          highest_performing_team: {
            team_id: 'T1',
            team_name: 'Team One',
            average_score: 95.0,
          },
          first_to_fifth_score_difference: 40.0,
          leaderboard: [
            { participant_id: 'P1', team_id: 'T1', weighted_score: 100.0, rank: 1 },
            { participant_id: 'P2', team_id: 'T1', weighted_score: 90.0, rank: 2 },
            { participant_id: 'P3', team_id: 'T2', weighted_score: 80.0, rank: 3 },
            { participant_id: 'P4', team_id: 'T2', weighted_score: 70.0, rank: 4 },
            { participant_id: 'P5', team_id: 'T3', weighted_score: 60.0, rank: 5 },
            { participant_id: 'P6', team_id: 'T3', weighted_score: 60.0, rank: 5 },
          ],
        }),
        marks: 11,
        isHidden: false,
        explanation: '6 participants returned because P5 and P6 tie at rank 5. Top-5 average includes all 6.',
      },
    ],
    hiddenTestCases: [
      {
        caseIndex: 2,
        name: 'Hidden Multi-Team Complex Tie Boundaries',
        stdin: JSON.stringify({
          teams: [
            { team_id: 'T1', team_name: 'Team 1' },
            { team_id: 'T2', team_name: 'Team 2' },
            { team_id: 'T3', team_name: 'Team 3' },
            { team_id: 'T4', team_name: 'Team 4' },
          ],
          participants: [
            { participant_id: 'P1', team_id: 'T1' },
            { participant_id: 'P2', team_id: 'T1' },
            { participant_id: 'P3', team_id: 'T2' },
            { participant_id: 'P4', team_id: 'T2' },
            { participant_id: 'P5', team_id: 'T3' },
            { participant_id: 'P6', team_id: 'T3' },
            { participant_id: 'P7', team_id: 'T4' },
            { participant_id: 'P8', team_id: 'T4' },
          ],
          round_performance: [
            { participant_id: 'P1', accuracy_score: 95, speed_score: 90, completion_score: 85, submitted_at: '2026-11-19T10:00:00Z' }, // 47.5+18+25.5 = 91.0 (Rank 1)
            { participant_id: 'P2', accuracy_score: 90, speed_score: 85, completion_score: 80, submitted_at: '2026-11-19T10:00:00Z' }, // 45+17+24 = 86.0 (Rank 2)
            { participant_id: 'P3', accuracy_score: 85, speed_score: 80, completion_score: 75, submitted_at: '2026-11-19T10:00:00Z' }, // 42.5+16+22.5 = 81.0 (Rank 3)
            { participant_id: 'P4', accuracy_score: 80, speed_score: 75, completion_score: 70, submitted_at: '2026-11-19T10:00:00Z' }, // 40+15+21 = 76.0 (Rank 4)
            { participant_id: 'P5', accuracy_score: 75, speed_score: 70, completion_score: 65, submitted_at: '2026-11-19T10:00:00Z' }, // 37.5+14+19.5 = 71.0 (Rank 5)
            { participant_id: 'P6', accuracy_score: 70, speed_score: 65, completion_score: 60, submitted_at: '2026-11-19T10:00:00Z' }, // 35+13+18 = 66.0 (Rank 6)
            { participant_id: 'P7', accuracy_score: 65, speed_score: 60, completion_score: 55, submitted_at: '2026-11-19T10:00:00Z' }, // 32.5+12+16.5 = 61.0 (Rank 7)
            { participant_id: 'P8', accuracy_score: 60, speed_score: 55, completion_score: 50, submitted_at: '2026-11-19T10:00:00Z' }, // 30+11+15 = 56.0 (Rank 8)
          ],
        }),
        expectedOutput: JSON.stringify({
          top_5: [
            { participant_id: 'P1', team_id: 'T1', weighted_score: 91.0, rank: 1 },
            { participant_id: 'P2', team_id: 'T1', weighted_score: 86.0, rank: 2 },
            { participant_id: 'P3', team_id: 'T2', weighted_score: 81.0, rank: 3 },
            { participant_id: 'P4', team_id: 'T2', weighted_score: 76.0, rank: 4 },
            { participant_id: 'P5', team_id: 'T3', weighted_score: 71.0, rank: 5 },
          ],
          top_5_average_score: 81.0,
          highest_performing_team: {
            team_id: 'T1',
            team_name: 'Team 1',
            average_score: 88.5,
          },
          first_to_fifth_score_difference: 20.0,
          leaderboard: [
            { participant_id: 'P1', team_id: 'T1', weighted_score: 91.0, rank: 1 },
            { participant_id: 'P2', team_id: 'T1', weighted_score: 86.0, rank: 2 },
            { participant_id: 'P3', team_id: 'T2', weighted_score: 81.0, rank: 3 },
            { participant_id: 'P4', team_id: 'T2', weighted_score: 76.0, rank: 4 },
            { participant_id: 'P5', team_id: 'T3', weighted_score: 71.0, rank: 5 },
            { participant_id: 'P6', team_id: 'T3', weighted_score: 66.0, rank: 6 },
            { participant_id: 'P7', team_id: 'T4', weighted_score: 61.0, rank: 7 },
            { participant_id: 'P8', team_id: 'T4', weighted_score: 56.0, rank: 8 },
          ],
        }),
        marks: 12,
        isHidden: true,
      },
    ],
  },
];

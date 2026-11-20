require('dotenv').config({ path: './.env' });
const fs = require('fs');
const path = require('path');
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { ROUND3_QUESTIONS_CONFIG, ROUND3_CODE_QUALITY_RUBRIC } = require('../apps/backend/dist/competition/data/round3-questions.config.js');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function executeJudge0(sourceCode, stdin) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      source_code: sourceCode,
      language_id: 71,
      stdin: stdin,
      cpu_time_limit: 5,
      memory_limit: 128000,
    });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 2358,
      path: '/submissions?wait=true&base64_encoded=false',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function wrapHarness(code) {
  if (code.includes("if __name__ == '__main__':")) return code;
  return `${code}

if __name__ == '__main__':
    import sys, json
    try:
        _raw = sys.stdin.read().strip()
        _data = json.loads(_raw) if _raw else {}
    except Exception as _e:
        _data = {}
    try:
        _res = solve(_data)
        print(json.dumps(_res, default=str))
    except Exception as _e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
`;
}

function compareObjects(a, b, tol = 1e-2) {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= tol;
  }
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!compareObjects(a[i], b[i], tol)) return false;
    }
    return true;
  }
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
      if (!compareObjects(a[k], b[k], tol)) return false;
    }
    return true;
  }
  return String(a).trim() === String(b).trim();
}

async function runTests() {
  console.log('================================================================');
  console.log('IGNITRON 2K26 — ROUND 3: EVENT ANALYTICS ENGINE TEST SUITE');
  console.log('================================================================\n');

  // TEST 1: Master Dataset File Verification
  console.log('[SECTION 1] Master Dataset Verification:');
  const datasetDir = path.resolve(__dirname, '../apps/backend/src/competition/data/master_dataset');
  const expectedFiles = [
    { name: 'participants.csv', minRows: 100 },
    { name: 'teams.csv', minRows: 50 },
    { name: 'round_performance.csv', minRows: 300 },
    { name: 'submission_logs.csv', minRows: 1000 },
    { name: 'event_activity.csv', minRows: 500 },
    { name: 'master_dataset.json', minRows: 1 },
  ];

  for (const f of expectedFiles) {
    const fullPath = path.join(datasetDir, f.name);
    assert(fs.existsSync(fullPath), `Dataset file exists: ${f.name}`);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      assert(lines.length >= f.minRows, `${f.name} contains valid records (Found: ${lines.length} lines)`);
    }
  }

  // TEST 2: Database Question Bank Verification for Round 3
  console.log('\n[SECTION 2] Database Round 3 Question Bank Verification:');
  const r3 = await prisma.competitionRound.findFirst({ where: { roundNumber: 3 } });
  assert(!!r3, 'Round 3 exists in competition_rounds');

  const questions = await prisma.question.findMany({
    where: { roundId: r3.id },
    orderBy: { orderNumber: 'asc' },
  });
  assert(questions.length === 6, `Round 3 contains exactly 6 questions (Found: ${questions.length})`);

  const expectedMarks = [10, 10, 12, 13, 22, 23];
  const expectedCases = [1, 1, 2, 2, 3, 3];
  let sumMarks = 0;

  questions.forEach((q, idx) => {
    const marksNum = Number(q.marks);
    sumMarks += marksNum;
    assert(q.orderNumber === idx + 1, `Question #${idx + 1} has orderNumber=${idx + 1}`);
    assert(q.caseNumber === expectedCases[idx], `Question #${idx + 1} is assigned to Case ${expectedCases[idx]}`);
    assert(marksNum === expectedMarks[idx], `Question #${idx + 1} marks=${marksNum} (Expected: ${expectedMarks[idx]})`);
    assert(q.language === 'python', `Question #${idx + 1} runtime is python`);
  });

  assert(sumMarks === 90, `Sum of question marks is exactly 90 (Found: ${sumMarks})`);
  assert(ROUND3_CODE_QUALITY_RUBRIC.totalMarks === 10, 'Code quality rubric allocates exactly 10 marks');
  assert(sumMarks + ROUND3_CODE_QUALITY_RUBRIC.totalMarks === 100, 'Total official Round 3 marks = 100');

  // TEST 3: Judge0 Python Runtime Environment Verification
  console.log('\n[SECTION 3] Judge0 Python 3 Runtime (Language 71) Verification:');
  const pyCheckCode = `
import numpy as np
import pandas as pd

arr = np.array([1, 2, 3])
df = pd.DataFrame({'a': arr, 'b': arr * 2})
print(f"NUMPY={np.__version__} PANDAS={pd.__version__} ROWS={len(df)}")
`;
  const pyCheckRes = await executeJudge0(pyCheckCode, '');
  assert(pyCheckRes?.status?.id === 3, `Judge0 Python 3 execution status=3 (Accepted)`);
  assert(pyCheckRes?.stdout?.includes('NUMPY=1.24.4'), `NumPy 1.24.4 verified in runtime`);
  assert(pyCheckRes?.stdout?.includes('PANDAS=2.0.3'), `Pandas 2.0.3 verified in runtime`);

  // TEST 4: Reference Execution for All 6 Questions on Sample Inputs
  console.log('\n[SECTION 4] Reference Solution Verification across Q1..Q6:');

  // Q1: Score Computation
  const q1 = ROUND3_QUESTIONS_CONFIG[0];
  const q1Code = wrapHarness(q1.starterCode);
  const q1Res = await executeJudge0(q1Code, q1.sampleTestCases[0].stdin);
  assert(q1Res?.status?.id === 3, 'Q1: Judge0 executed successfully');
  const q1Passed = compareObjects(JSON.parse(q1Res?.stdout || 'null'), JSON.parse(q1.sampleTestCases[0].expectedOutput));
  assert(q1Passed, 'Q1: Sample output matches expected weighted scores');

  // Q2: Leaderboard Aggregator
  const q2 = ROUND3_QUESTIONS_CONFIG[1];
  const q2RefCode = `
import pandas as pd
import numpy as np

def solve(data):
    participants = pd.DataFrame(data['participants'])
    teams = pd.DataFrame(data['teams'])
    rp = pd.DataFrame(data['round_performance'])
    
    r1 = rp[rp['round_number'] == 1].set_index('participant_id')['raw_score'] / 30.0 * 100.0
    r2 = rp[rp['round_number'] == 2].set_index('participant_id')['raw_score'] / 100.0 * 100.0
    r3 = rp[rp['round_number'] == 3].set_index('participant_id')['raw_score'] / 100.0 * 100.0
    
    part_weighted = {}
    for pid in participants['participant_id']:
        s1 = r1.get(pid, 0.0)
        s2 = r2.get(pid, 0.0)
        s3 = r3.get(pid, 0.0)
        part_weighted[pid] = s1 * 0.30 + s2 * 0.30 + s3 * 0.40
        
    participants['weighted_score'] = participants['participant_id'].map(part_weighted)
    
    res = []
    team_dict = teams.set_index('team_id')['team_name'].to_dict()
    for tid, grp in participants.groupby('team_id'):
        res.append({
            "team_id": tid,
            "team_name": team_dict.get(tid, tid),
            "participant_count": len(grp),
            "average_weighted_score": round(float(grp['weighted_score'].mean()), 2)
        })
        
    res.sort(key=lambda x: x['average_weighted_score'], reverse=True)
    return res
`;
  const q2Res = await executeJudge0(wrapHarness(q2RefCode), q2.sampleTestCases[0].stdin);
  assert(q2Res?.status?.id === 3, 'Q2: Judge0 executed successfully');
  const q2Passed = compareObjects(JSON.parse(q2Res?.stdout || 'null'), JSON.parse(q2.sampleTestCases[0].expectedOutput));
  assert(q2Passed, 'Q2: Leaderboard aggregation logic matches expected output');

  // Q3: Duplicate Detection Challenge
  const q3 = ROUND3_QUESTIONS_CONFIG[2];
  const q3Code = wrapHarness(q3.starterCode);
  const q3Res = await executeJudge0(q3Code, q3.sampleTestCases[0].stdin);
  assert(q3Res?.status?.id === 3, 'Q3: Judge0 executed successfully');
  const q3Passed = compareObjects(JSON.parse(q3Res?.stdout || 'null'), JSON.parse(q3.sampleTestCases[0].expectedOutput));
  assert(q3Passed, 'Q3: Duplicate detection logic matches expected output');

  // Q4: Statistical Anomaly Detector
  const q4 = ROUND3_QUESTIONS_CONFIG[3];
  const q4RefCode = `
import pandas as pd
import numpy as np

def solve(records):
    invalid = []
    missing = []
    valid = []
    
    for r in records:
        rid = r.get('id')
        score = r.get('score')
        if score is None:
            missing.append(rid)
        elif not isinstance(score, (int, float)) or score < 0 or score > 100:
            invalid.append(rid)
        else:
            valid.append((rid, float(score)))
            
    outliers = []
    if len(valid) >= 4:
        scores = np.array([v[1] for v in valid])
        q25 = np.percentile(scores, 25)
        q75 = np.percentile(scores, 75)
        iqr = q75 - q25
        low_bound = q25 - 1.5 * iqr
        high_bound = q75 + 1.5 * iqr
        for rid, s in valid:
            if s < low_bound or s > high_bound:
                outliers.append(rid)
                
    return {
        "invalid_record_ids": sorted(invalid),
        "missing_record_ids": sorted(missing),
        "outlier_record_ids": sorted(outliers)
    }
`;
  const q4Res = await executeJudge0(wrapHarness(q4RefCode), q4.sampleTestCases[0].stdin);
  assert(q4Res?.status?.id === 3, 'Q4: Judge0 executed successfully');
  const q4Passed = compareObjects(JSON.parse(q4Res?.stdout || 'null'), JSON.parse(q4.sampleTestCases[0].expectedOutput));
  assert(q4Passed, 'Q4: Statistical anomaly detector matches expected output');

  // Q5: Ranking Intelligence Engine
  const q5 = ROUND3_QUESTIONS_CONFIG[4];
  const q5RefCode = `
import pandas as pd

def solve(participants):
    df = pd.DataFrame(participants)
    df['weighted_score'] = (df['accuracy'] * 0.50 + df['speed'] * 0.20 + df['completion'] * 0.30).round(2)
    df = df.sort_values(
        by=['weighted_score', 'accuracy', 'completion', 'speed', 'submitted_at'],
        ascending=[False, False, False, False, True]
    )
    df['rank'] = range(1, len(df) + 1)
    return df[['id', 'weighted_score', 'rank']].to_dict(orient='records')
`;
  const q5Res = await executeJudge0(wrapHarness(q5RefCode), q5.sampleTestCases[0].stdin);
  assert(q5Res?.status?.id === 3, 'Q5: Judge0 executed successfully');
  const q5Passed = compareObjects(JSON.parse(q5Res?.stdout || 'null'), JSON.parse(q5.sampleTestCases[0].expectedOutput));
  assert(q5Passed, 'Q5: Multi-tier ranking engine matches expected output');

  // Q6: Top-K Decision Challenge
  const q6 = ROUND3_QUESTIONS_CONFIG[5];
  const q6RefCode = `
import pandas as pd
import numpy as np

def solve(data):
    participants = pd.DataFrame(data['participants'])
    teams = pd.DataFrame(data['teams'])
    rp = pd.DataFrame(data['round_performance'])
    
    # Calculate weighted score per participant: accuracy 50%, speed 20%, completion 30%
    rp['weighted_score'] = (rp['accuracy_score'] * 0.50 + rp['speed_score'] * 0.20 + rp['completion_score'] * 0.30).round(2)
    
    # Merge with team info
    merged = participants.merge(rp, on='participant_id')
    merged = merged.sort_values(
        by=['weighted_score', 'accuracy_score', 'completion_score', 'speed_score', 'submitted_at'],
        ascending=[False, False, False, False, True]
    )
    
    # Min rank
    merged['rank'] = merged['weighted_score'].rank(method='min', ascending=False).astype(int)
    
    # Filter top 5 (including all ties at rank 5)
    fifth_rank_score = merged[merged['rank'] <= 5]['weighted_score'].min()
    top_5_df = merged[merged['weighted_score'] >= fifth_rank_score]
    
    top5_records = top_5_df[['participant_id', 'team_id', 'weighted_score', 'rank']].to_dict(orient='records')
    leaderboard = merged[['participant_id', 'team_id', 'weighted_score', 'rank']].to_dict(orient='records')
    
    # Average score of top 5
    top5_avg = round(float(top_5_df['weighted_score'].mean()), 2)
    score_diff = round(float(merged.iloc[0]['weighted_score'] - fifth_rank_score), 2)
    
    # Highest performing team
    team_dict = teams.set_index('team_id')['team_name'].to_dict()
    team_scores = merged.groupby('team_id')['weighted_score'].mean().reset_index()
    team_scores = team_scores.sort_values(by='weighted_score', ascending=False)
    best_team_row = team_scores.iloc[0]
    best_team = {
        "team_id": best_team_row['team_id'],
        "team_name": team_dict.get(best_team_row['team_id'], best_team_row['team_id']),
        "average_score": round(float(best_team_row['weighted_score']), 2)
    }
    
    return {
        "top_5": top5_records,
        "top_5_average_score": top5_avg,
        "highest_performing_team": best_team,
        "first_to_fifth_score_difference": score_diff,
        "leaderboard": leaderboard
    }
`;
  const q6Res = await executeJudge0(wrapHarness(q6RefCode), q6.sampleTestCases[0].stdin);
  assert(q6Res?.status?.id === 3, 'Q6: Judge0 executed successfully');
  const q6Passed = compareObjects(JSON.parse(q6Res?.stdout || 'null'), JSON.parse(q6.sampleTestCases[0].expectedOutput));
  assert(q6Passed, 'Q6: Top-K decision analytics matches expected output');

  // TEST 5: Regression Check on Round 1 and Round 2
  console.log('\n[SECTION 5] Regression Verification for Round 1 & Round 2:');
  const r1 = await prisma.competitionRound.findFirst({ where: { roundNumber: 1 } });
  assert(!!r1, 'Round 1 (MCQ Arena) preserved in database');
  const r1Qs = await prisma.question.findMany({ where: { roundId: r1.id } });
  assert(r1Qs.length >= 15, `Round 1 questions intact (Found: ${r1Qs.length} MCQs)`);

  const r2 = await prisma.competitionRound.findFirst({ where: { roundNumber: 2 } });
  assert(!!r2, 'Round 2 (Bug Hunt Arena) preserved in database');
  const r2Qs = await prisma.question.findMany({ where: { roundId: r2.id } });
  assert(r2Qs.length >= 1, `Round 2 questions intact (Found: ${r2Qs.length} Bug Hunt questions)`);
  if (r2Qs.length > 0) {
    const bugs = r2Qs[0].plantedBugs;
    assert(Array.isArray(bugs) && bugs.length > 0, `Round 2 planted bugs intact (${bugs?.length} bugs configured)`);
  }

  console.log('\n================================================================');
  console.log(`TEST RUN COMPLETE: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());

/**
 * IGNITRON 2K26 — Master Event Intelligence Dataset Generator
 *
 * Dataset Name: IGNITRON_EVENT_INTELLIGENCE_DATASET_2026
 *
 * Generates 5 deterministic, interconnected CSV datasets:
 * 1. participants.csv (100 records: 2 participants per team, 50 teams)
 * 2. teams.csv (50 records: team_size=2)
 * 3. round_performance.csv (300 records: 100 participants × 3 rounds)
 * 4. submission_logs.csv (1,000 records)
 * 5. event_activity.csv (500 records)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ParticipantRecord {
  participant_id: string;
  team_id: string;
  participant_name: string;
  department: string;
  year: number;
  college: string;
}

export interface TeamRecord {
  team_id: string;
  team_name: string;
  department: string;
  team_size: number;
}

export interface RoundPerformanceRecord {
  participant_id: string;
  round_number: number;
  raw_score: number;
  maximum_score: number;
  accuracy_score: number;
  speed_score: number;
  completion_score: number;
  completion_time_seconds: number;
  penalty_seconds: number;
  submitted_at: string;
}

export interface SubmissionLogRecord {
  submission_id: string;
  participant_id: string;
  language: string;
  execution_status: string;
  execution_time: number;
  memory_used: number;
  submitted_at: string;
}

export interface EventActivityRecord {
  activity_id: string;
  participant_id: string;
  activity_type: string;
  duration_minutes: number;
  engagement_score: number;
  activity_timestamp: string;
}

// Pseudo-random deterministic number generator (LCG)
class DeterministicRNG {
  private seed: number;

  constructor(seed = 20260214) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number, decimals = 2): number {
    const val = this.next() * (max - min) + min;
    return parseFloat(val.toFixed(decimals));
  }

  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

export function generateMasterDataset(targetDir: string) {
  const rng = new DeterministicRNG(20261119);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const FIRST_NAMES = [
    'Aarav', 'Aditi', 'Advait', 'Akash', 'Ananya', 'Arjun', 'Arun', 'Bhavya',
    'Chetan', 'Deepika', 'Dev', 'Diya', 'Gaurav', 'Isha', 'Ishaan', 'Kavya',
    'Kiran', 'Manish', 'Meera', 'Neha', 'Nikhil', 'Pooja', 'Pranav', 'Priya',
    'Rahul', 'Rhea', 'Rohan', 'Rohit', 'Sahil', 'Sakshi', 'Sameer', 'Sanjay',
    'Siddharth', 'Sneha', 'Tanvi', 'Tarun', 'Varun', 'Vidya', 'Vikram', 'Yash'
  ];

  const LAST_NAMES = [
    'Sharma', 'Verma', 'Patel', 'Iyer', 'Menon', 'Nair', 'Reddy', 'Rao',
    'Poojari', 'Deshmukh', 'Joshi', 'Kulkarni', 'Bhat', 'Shetty', 'Hegde',
    'Gupta', 'Aggarwal', 'Chopra', 'Malhotra', 'Kapoor', 'Singh', 'Chauhan'
  ];

  const DEPARTMENTS = [
    'Computer Science & Engineering',
    'Information Technology',
    'Artificial Intelligence & Data Science',
    'Electronics & Communication'
  ];

  const COLLEGES = [
    'Institute of Technology & Science',
    'National Engineering College',
    'University College of Engineering',
    'Metropolitan Technical Institute',
    'Academy of Computer Studies'
  ];

  const TEAM_PREFIXES = [
    'Binary', 'Cyber', 'Neural', 'Quantum', 'Algorithm', 'Silicon', 'Code',
    'Syntax', 'Logic', 'Recursion', 'Matrix', 'Terminal', 'Bit', 'Stack',
    'Tensor', 'Async', 'Kernel', 'Vector', 'Echo', 'Nexus', 'Vertex', 'Apex',
    'Vanguard', 'Titan', 'Specter', 'Helios', 'Hyperion', 'Zero', 'Omega', 'Nova'
  ];

  const TEAM_SUFFIXES = [
    'Ninjas', 'Titans', 'Pioneers', 'Knights', 'Wizards', 'Architects',
    'Crusaders', 'Masters', 'Warriors', 'Hunters', 'Phantoms', 'Sharks',
    'Wolves', 'Gladiators', 'Sentinels', 'Hawks', 'Legion', 'Commanders'
  ];

  // 1. Teams (50 teams)
  const teams: TeamRecord[] = [];
  const teamNamesSet = new Set<string>();

  for (let i = 1; i <= 50; i++) {
    const teamId = `T${String(100 + i)}`;
    let teamName = '';
    do {
      teamName = `${rng.choice(TEAM_PREFIXES)} ${rng.choice(TEAM_SUFFIXES)}`;
    } while (teamNamesSet.has(teamName));
    teamNamesSet.add(teamName);

    teams.push({
      team_id: teamId,
      team_name: teamName,
      department: rng.choice(DEPARTMENTS),
      team_size: 2,
    });
  }

  // 2. Participants (100 participants: 2 per team)
  const participants: ParticipantRecord[] = [];
  let pIndex = 1;

  for (const team of teams) {
    for (let m = 1; m <= 2; m++) {
      const pId = `P${String(100 + pIndex)}`;
      const pName = `${rng.choice(FIRST_NAMES)} ${rng.choice(LAST_NAMES)}`;
      participants.push({
        participant_id: pId,
        team_id: team.team_id,
        participant_name: pName,
        department: team.department,
        year: rng.nextInt(2, 4),
        college: rng.choice(COLLEGES),
      });
      pIndex++;
    }
  }

  // 3. Round Performance (300 records: 100 participants × 3 rounds)
  // Maximums: Round 1: 30, Round 2: 100, Round 3: 100
  const roundPerformance: RoundPerformanceRecord[] = [];
  const baseTime = new Date('2026-11-19T09:00:00Z').getTime();

  for (const p of participants) {
    // Generate an inherent skill rating for the participant (0.4 to 0.98)
    const skill = rng.nextFloat(0.45, 0.96);

    for (let r = 1; r <= 3; r++) {
      const maxScore = r === 1 ? 30 : 100;
      // Raw score based on skill + slight round variance
      const roundFactor = rng.nextFloat(0.85, 1.10);
      const rawScore = Math.min(maxScore, Math.max(0, parseFloat((skill * maxScore * roundFactor).toFixed(1))));

      // Component metrics (0-100 scale)
      const accuracyScore = parseFloat(Math.min(100, Math.max(30, (skill * 100 + rng.nextFloat(-8, 8)))).toFixed(1));
      const speedScore = parseFloat(Math.min(100, Math.max(30, (skill * 100 + rng.nextFloat(-12, 12)))).toFixed(1));
      const completionScore = parseFloat(Math.min(100, Math.max(40, (skill * 100 + rng.nextFloat(-5, 5)))).toFixed(1));

      const durationMinutes = r === 1 ? 30 : r === 2 ? 40 : 60;
      const completionTimeSeconds = rng.nextInt(durationMinutes * 30, durationMinutes * 58);
      const penaltySeconds = rng.nextInt(0, 3) * 60;

      const submissionTimestamp = new Date(baseTime + (r * 7200 + completionTimeSeconds) * 1000).toISOString();

      roundPerformance.push({
        participant_id: p.participant_id,
        round_number: r,
        raw_score: rawScore,
        maximum_score: maxScore,
        accuracy_score: accuracyScore,
        speed_score: speedScore,
        completion_score: completionScore,
        completion_time_seconds: completionTimeSeconds,
        penalty_seconds: penaltySeconds,
        submitted_at: submissionTimestamp,
      });
    }
  }

  // 4. Submission Logs (1,000 records)
  const submissionLogs: SubmissionLogRecord[] = [];
  const LANGUAGES = ['python', 'cpp', 'java', 'javascript'];
  const STATUSES = ['ACCEPTED', 'ACCEPTED', 'WRONG_ANSWER', 'COMPILATION_ERROR', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR'];

  for (let s = 1; s <= 1000; s++) {
    const p = rng.choice(participants);
    const subId = `SUB_${String(10000 + s)}`;
    const status = rng.choice(STATUSES);
    const execTime = rng.nextFloat(0.015, 2.450, 3);
    const memory = rng.nextInt(18400, 78500);
    const subTime = new Date(baseTime + rng.nextInt(100, 25000) * 1000).toISOString();

    submissionLogs.push({
      submission_id: subId,
      participant_id: p.participant_id,
      language: rng.choice(LANGUAGES),
      execution_status: status,
      execution_time: execTime,
      memory_used: memory,
      submitted_at: subTime,
    });
  }

  // 5. Event Activity (500 records)
  const eventActivity: EventActivityRecord[] = [];
  const ACTIVITIES = ['LOGIN', 'TEST_RUN', 'DRAFT_SAVE', 'SUBMIT', 'VIEW_LEADERBOARD', 'DOC_READ'];

  for (let a = 1; a <= 500; a++) {
    const p = rng.choice(participants);
    const actId = `ACT_${String(1000 + a)}`;
    const actType = rng.choice(ACTIVITIES);
    const duration = rng.nextInt(2, 45);
    const engagement = rng.nextInt(40, 100);
    const actTime = new Date(baseTime + rng.nextInt(100, 25000) * 1000).toISOString();

    eventActivity.push({
      activity_id: actId,
      participant_id: p.participant_id,
      activity_type: actType,
      duration_minutes: duration,
      engagement_score: engagement,
      activity_timestamp: actTime,
    });
  }

  // Write CSV helper
  const toCsv = <T extends Record<string, any>>(records: T[]): string => {
    if (records.length === 0) return '';
    const headers = Object.keys(records[0]);
    const lines = [headers.join(',')];
    for (const r of records) {
      const line = headers.map((h) => {
        const val = r[h];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val ?? '');
      }).join(',');
      lines.push(line);
    }
    return lines.join('\n');
  };

  fs.writeFileSync(path.join(targetDir, 'participants.csv'), toCsv(participants), 'utf8');
  fs.writeFileSync(path.join(targetDir, 'teams.csv'), toCsv(teams), 'utf8');
  fs.writeFileSync(path.join(targetDir, 'round_performance.csv'), toCsv(roundPerformance), 'utf8');
  fs.writeFileSync(path.join(targetDir, 'submission_logs.csv'), toCsv(submissionLogs), 'utf8');
  fs.writeFileSync(path.join(targetDir, 'event_activity.csv'), toCsv(eventActivity), 'utf8');

  // Also write a master JSON bundle for fast in-memory access and testing
  const masterJson = {
    dataset_name: 'IGNITRON_EVENT_INTELLIGENCE_DATASET_2026',
    generated_at: new Date().toISOString(),
    participants,
    teams,
    round_performance: roundPerformance,
    submission_logs: submissionLogs,
    event_activity: eventActivity,
  };
  fs.writeFileSync(path.join(targetDir, 'master_dataset.json'), JSON.stringify(masterJson, null, 2), 'utf8');

  console.log(`[DatasetGenerator] Master dataset generated in ${targetDir}`);
  console.log(`  - participants.csv: ${participants.length} records`);
  console.log(`  - teams.csv: ${teams.length} records`);
  console.log(`  - round_performance.csv: ${roundPerformance.length} records`);
  console.log(`  - submission_logs.csv: ${submissionLogs.length} records`);
  console.log(`  - event_activity.csv: ${eventActivity.length} records`);

  return masterJson;
}

// CLI runner if executed directly
if (require.main === module) {
  const defaultDir = path.resolve(__dirname, 'master_dataset');
  generateMasterDataset(defaultDir);
}

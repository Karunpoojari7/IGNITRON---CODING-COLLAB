const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

const dir = path.resolve(__dirname, '../apps/backend/src/competition/data/master_dataset');

function verifyDataset() {
  console.log('Verifying Master Dataset Integrity in:', dir);

  const files = ['participants.csv', 'teams.csv', 'round_performance.csv', 'submission_logs.csv', 'event_activity.csv', 'master_dataset.json'];
  for (const f of files) {
    assert(fs.existsSync(path.join(dir, f)), `File ${f} exists`);
  }

  const raw = fs.readFileSync(path.join(dir, 'master_dataset.json'), 'utf8');
  const data = JSON.parse(raw);

  // Teams
  assert(data.teams.length === 50, `Exactly 50 teams found (got: ${data.teams.length})`);
  const teamIdSet = new Set(data.teams.map((t) => t.team_id));
  assert(teamIdSet.size === 50, 'All 50 team IDs are unique');

  // Participants
  assert(data.participants.length === 100, `Exactly 100 participants found (got: ${data.participants.length})`);
  const participantIdSet = new Set(data.participants.map((p) => p.participant_id));
  assert(participantIdSet.size === 100, 'All 100 participant IDs are unique');

  // Verify 2 participants per team
  const participantsPerTeam = {};
  for (const p of data.participants) {
    assert(teamIdSet.has(p.team_id), `Participant ${p.participant_id} references valid team ${p.team_id}`);
    participantsPerTeam[p.team_id] = (participantsPerTeam[p.team_id] || 0) + 1;
  }
  for (const [tId, count] of Object.entries(participantsPerTeam)) {
    assert(count === 2, `Team ${tId} has exactly 2 participants (got: ${count})`);
  }

  // Round Performance
  assert(data.round_performance.length === 300, `Exactly 300 round performance records (got: ${data.round_performance.length})`);
  const participantRounds = {};
  for (const rp of data.round_performance) {
    assert(participantIdSet.has(rp.participant_id), `Round record references valid participant ${rp.participant_id}`);
    assert([1, 2, 3].includes(rp.round_number), `Round number ${rp.round_number} is 1, 2, or 3`);
    if (rp.round_number === 1) {
      assert(rp.maximum_score === 30, 'Round 1 max score is 30');
      assert(rp.raw_score >= 0 && rp.raw_score <= 30, `Round 1 raw score in 0..30 (got: ${rp.raw_score})`);
    } else {
      assert(rp.maximum_score === 100, `Round ${rp.round_number} max score is 100`);
      assert(rp.raw_score >= 0 && rp.raw_score <= 100, `Round ${rp.round_number} raw score in 0..100 (got: ${rp.raw_score})`);
    }
    const key = `${rp.participant_id}_R${rp.round_number}`;
    assert(!participantRounds[key], `Participant round ${key} is unique`);
    participantRounds[key] = true;
  }

  // Submission logs
  assert(data.submission_logs.length === 1000, `Exactly 1,000 submission logs (got: ${data.submission_logs.length})`);
  for (const sl of data.submission_logs) {
    assert(participantIdSet.has(sl.participant_id), `Submission log references valid participant ${sl.participant_id}`);
    assert(['python', 'cpp', 'java', 'javascript'].includes(sl.language), `Language ${sl.language} is valid`);
  }

  // Event activity
  assert(data.event_activity.length === 500, `Exactly 500 event activity logs (got: ${data.event_activity.length})`);
  for (const ea of data.event_activity) {
    assert(participantIdSet.has(ea.participant_id), `Activity log references valid participant ${ea.participant_id}`);
  }

  console.log('🎉 ALL DATASET INTEGRITY CHECKS PASSED PERFECTLY!\n');
}

verifyDataset();

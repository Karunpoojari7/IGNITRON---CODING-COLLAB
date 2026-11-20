/**
 * IGNITRON 2K26 — Round 2 Bug Hunt Arena Targeted Test Suite
 *
 * Verifies:
 * 1. GET /api/arena/bug-hunt/state returns mission briefing, faulty code, 4 required defects, and strictly omits planted answers.
 * 2. Active participant session mutex is strictly enforced for bug reporting.
 * 3. Token selection validation:
 *    - Incorrect selections are rejected (isCorrect: false).
 *    - Valid selections are accepted (isCorrect: true) and advance the counter.
 *    - Duplicate selections are rejected with duplicate indicator (isDuplicate: true).
 *    - Line disambiguation: valid branch (line 55) rejected; faulty branch (line 60) accepted.
 * 4. Anti-bypass protection:
 *    - Saving workspace draft or submitting final code is strictly blocked (HTTP 403) until all 4 defects are identified.
 * 5. Relay handover & team state synchronization:
 *    - Participant handover persists all identified defects and unlocked repair status.
 * 6. Code repair, testing & final submission (Official 100 Marks):
 *    - Automated evaluation awards Bug Identification (20) + Test Correctness (50) + Edge Cases (20) + Code Quality (10) = 100 Marks.
 *    - Duplicate submissions are rejected.
 *    - Hidden test inputs and expected outputs are strictly masked from contestants.
 */

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:4000/api';

let backendProcess = null;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

function getErrorMessage(resData) {
  if (typeof resData?.message === 'string') return resData.message;
  if (typeof resData?.error?.message === 'string') return resData.error.message;
  if (typeof resData?.error === 'string') return resData.error;
  return JSON.stringify(resData || '');
}

function request(method, endpoint, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }

        const setCookie = res.headers['set-cookie'];
        let sessionCookie = null;
        if (setCookie) {
          const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
          const match = cookieStr.match(/ignitron_session=([^;]+)/);
          if (match) sessionCookie = `ignitron_session=${match[1]}`;
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
          sessionCookie,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function waitForServer(retries = 35, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await request('GET', '/health');
      if (res.statusCode === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

async function startServer() {
  const isUp = await waitForServer(2, 500);
  if (isUp) {
    console.log('Detected existing running backend on port 4000.');
    return;
  }

  console.log('Spawning backend NestJS server...');
  backendProcess = spawn('node', ['apps/backend/dist/main.js'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test', PORT: '4000' },
  });

  const ready = await waitForServer(35, 1000);
  if (!ready) {
    throw new Error('Backend server failed to start within timeout.');
  }
  console.log('Backend server successfully started.');
}

function stopServer() {
  if (backendProcess) {
    console.log('Stopping spawned backend server...');
    backendProcess.kill('SIGTERM');
  }
}

// Clean solution for final submission test
const CLEAN_ROUND2_SOLUTION = `
class TokenBucketLimiter {
  constructor(capacity, refillRatePerSecond) {
    this.capacity = capacity;
    this.refillRatePerSecond = refillRatePerSecond;
    this.tokens = capacity;
    this.lastRefillTimestamp = Date.now();
  }

  refill() {
    const now = Date.now();
    const elapsedSeconds = Math.max(0, (now - this.lastRefillTimestamp) / 1000);
    const addedTokens = elapsedSeconds * this.refillRatePerSecond;
    this.tokens = Math.min(this.capacity, this.tokens + addedTokens);
    this.lastRefillTimestamp = now;
  }

  tryConsume(tokensRequested = 1) {
    this.refill();

    if (this.tokens >= tokensRequested) {
      this.tokens -= tokensRequested;
      return true;
    }

    return false;
  }

  getAvailableTokens() {
    return this.tokens;
  }
}

const fs = require('fs');

function main() {
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf-8').trim();
  } catch (e) {
    input = '';
  }
  if (!input) {
    input = 'CAPACITY=10 REFILL=2 CONSUME=5';
  }

  const params = {};
  input.split(/\\s+/).forEach((pair) => {
    const [key, val] = pair.split('=');
    if (key && val !== undefined) {
      params[key.toUpperCase()] = parseFloat(val);
    }
  });

  const capacity = params.CAPACITY !== undefined ? params.CAPACITY : 10;
  const refillRate = params.REFILL !== undefined ? params.REFILL : 1;
  const consume = params.CONSUME !== undefined ? params.CONSUME : 1;

  let mockTime = 1000000;
  Date.now = () => mockTime;

  const limiter = new TokenBucketLimiter(capacity, refillRate);

  if (params.ELAPSED_MS) {
    mockTime += params.ELAPSED_MS;
  }
  if (params.CLOCK_SKEW_NEGATIVE) {
    mockTime += params.CLOCK_SKEW_NEGATIVE;
  }

  const consumed = limiter.tryConsume(consume);
  const remaining = limiter.getAvailableTokens();

  console.log(\`CONSUMED: \${consumed}, REMAINING: \${remaining}\`);
}

main();
`;

async function runTests() {
  console.log('================================================================');
  console.log('IGNITRON 2K26 — Round 2 (Bug Hunt Arena) Interactive Workflow Test');
  console.log('================================================================\n');

  await startServer();

  try {
    // -------------------------------------------------------------------------
    // 1. Setup Dedicated Test Team with Participants A & B
    // -------------------------------------------------------------------------
    console.log('[1/7] Registering fresh test team...');
    const rand = Math.floor(Math.random() * 90000 + 10000);
    const regRes = await request('POST', '/auth/team/register', {
      teamName: `Bug Hunters ${rand}`,
      institution: 'Ignitron Tech Institute',
      password: 'TournamentPass@2026',
      participants: [
        { fullName: `Investigator A ${rand}`, email: `inva_${rand}@ignitron.local` },
        { fullName: `Repairer B ${rand}`, email: `repb_${rand}@ignitron.local` },
      ],
    });
    assert(regRes.statusCode === 201, 'Team registration returned HTTP 201');
    const { teamId, teamCode } = regRes.data.data;

    const participants = await prisma.participant.findMany({
      where: { teamId },
      orderBy: { createdAt: 'asc' },
    });
    const [participantA, participantB] = participants;

    // Login Participant A
    const loginResA = await request('POST', '/auth/team/login', {
      teamCode,
      password: 'TournamentPass@2026',
      participantId: participantA.id,
    });
    assert(loginResA.statusCode === 200, 'Participant A logged in successfully');
    const cookieA = loginResA.sessionCookie;

    // Ensure Round 2 is ACTIVE and team is ELIGIBLE
    const r2Round = await prisma.competitionRound.findFirst({ where: { roundNumber: 2 } });
    assert(Boolean(r2Round), 'Round 2 CompetitionRound exists in database');

    await prisma.competitionState.update({
      where: { id: 'global' },
      data: {
        status: 'ROUND_2_ACTIVE',
        currentRoundNumber: 2,
        isPaused: false,
        countdownEndsAt: null,
        deadlineAt: new Date(Date.now() + 3600000),
      },
    });

    await prisma.teamRoundProgress.upsert({
      where: { teamId_roundId: { teamId, roundId: r2Round.id } },
      update: { eligibilityStatus: 'ELIGIBLE', participationStatus: 'IN_PROGRESS', score: 0 },
      create: { teamId, roundId: r2Round.id, eligibilityStatus: 'ELIGIBLE', participationStatus: 'IN_PROGRESS', score: 0 },
    });

    // -------------------------------------------------------------------------
    // 2. Test GET /api/arena/bug-hunt/state
    // -------------------------------------------------------------------------
    console.log('\n[2/7] Verifying Mission Briefing & State Sanitization...');
    const stateRes = await request('GET', '/arena/bug-hunt/state', null, cookieA);
    if (stateRes.statusCode !== 200) {
      console.error(`State endpoint failed with status ${stateRes.statusCode}:`, stateRes.data);
    }
    assert(stateRes.statusCode === 200, 'GET /arena/bug-hunt/state returned HTTP 200');
    const state = stateRes.data.data;
    assert(state.roundNumber === 2, 'State reports roundNumber = 2');
    assert(state.totalRequired === 4, `State reports exactly 4 required planted bugs (got: ${state.totalRequired})`);
    assert(state.identifiedCount === 0, 'Initial identifiedCount is 0');
    assert(state.isInvestigationComplete === false, 'isInvestigationComplete is false');
    assert(state.isRepairUnlocked === false, 'isRepairUnlocked is false');
    assert(Boolean(state.faultyCode), 'Faulty starter code is provided');
    assert(state.plantedBugs === undefined, 'plantedBugs answer array strictly sanitized / not leaked');
    console.log('Mission briefing loaded and answer locations confirmed strictly server-side.');

    const questionId = state.questionId;

    // -------------------------------------------------------------------------
    // 3. Test Anti-Bypass Guarding (Lock before completing investigation)
    // -------------------------------------------------------------------------
    console.log('\n[3/7] Testing Anti-Bypass: Lock on Code Repair Before Investigation...');
    const earlyDraftRes = await request('POST', '/arena/workspace/draft', {
      roundNumber: 2,
      caseNumber: 1,
      sourceCode: 'console.log("premature edit");',
      language: 'javascript',
    }, cookieA);
    assert(earlyDraftRes.statusCode === 403, 'Premature draft save rejected with HTTP 403 Forbidden');
    assert(getErrorMessage(earlyDraftRes.data).includes('locked'), 'Error indicates Code repair is locked');

    const earlySubmitRes = await request('POST', '/arena/workspace/submit', {
      roundNumber: 2,
      caseNumber: 1,
      sourceCode: 'console.log("premature submit");',
      language: 'javascript',
    }, cookieA);
    assert(earlySubmitRes.statusCode === 403, 'Premature final submission rejected with HTTP 403 Forbidden');
    assert(getErrorMessage(earlySubmitRes.data).includes('locked'), 'Error indicates submission is locked');
    console.log('Anti-bypass protections verified: contestants cannot edit or submit before isolating bugs.');

    // -------------------------------------------------------------------------
    // 4. Test Defect Reporting & Selection Validation
    // -------------------------------------------------------------------------
    console.log('\n[4/7] Testing Defect Reporting & Token Selection Validation...');

    // 4.1 Incorrect selection & edge cases (comments, whitespace, unrelated code)
    const whitespaceBugRes = await request('POST', '/arena/bug-hunt/report-bug', {
      questionId,
      selectedText: '    ',
      lineNumber: 10,
      startOffset: 200,
      endOffset: 204,
    }, cookieA);
    assert(whitespaceBugRes.statusCode === 200, 'Whitespace report returned HTTP 200');
    assert(whitespaceBugRes.data.data.isCorrect === false, 'Whitespace selection rejected with isCorrect = false');

    const commentBugRes = await request('POST', '/arena/bug-hunt/report-bug', {
      questionId,
      selectedText: '* Refills tokens based on elapsed wall-clock seconds.',
      lineNumber: 15,
      startOffset: 340,
      endOffset: 390,
    }, cookieA);
    assert(commentBugRes.statusCode === 200, 'Comment report returned HTTP 200');
    assert(commentBugRes.data.data.isCorrect === false, 'Comment selection rejected with isCorrect = false');

    const invalidBugRes = await request('POST', '/arena/bug-hunt/report-bug', {
      questionId,
      selectedText: 'class TokenBucketLimiter',
      lineNumber: 6,
      startOffset: 80,
      endOffset: 104,
    }, cookieA);
    assert(invalidBugRes.statusCode === 200, 'Bug report returned HTTP 200');
    assert(invalidBugRes.data.data.isCorrect === false, 'Incorrect token rejected with isCorrect = false');
    assert(invalidBugRes.data.data.identifiedCount === 0, 'Identified count did not increment on incorrect token');

    // 4.2 Valid selection: Bug 1 (Integer Truncation) via Exact Token & Source Range
    const bug1Res = await request('POST', '/arena/bug-hunt/report-bug', {
      questionId,
      selectedText: 'Math.floor',
      lineNumber: 19,
      startOffset: 466,
      endOffset: 476,
    }, cookieA);
    assert(bug1Res.statusCode === 200, 'Valid Bug 1 report returned HTTP 200');
    assert(bug1Res.data.data.isCorrect === true, 'Bug 1 confirmed with isCorrect = true');
    assert(bug1Res.data.data.bugKey === 'BUG_INTEGER_TRUNCATION', 'Bug 1 identified as BUG_INTEGER_TRUNCATION');
    assert(bug1Res.data.data.identifiedCount === 1, 'Identified count incremented to 1');
    console.log(`Defect 1 isolated: ${bug1Res.data.data.bugName} (1/4)`);

    // 4.3 Duplicate selection: Bug 1 reported again
    const dupRes = await request('POST', '/arena/bug-hunt/report-bug', {
      questionId,
      selectedText: 'Math.floor((now - this.lastRefillTimestamp) / 1000)',
      lineNumber: 19,
      startOffset: 466,
      endOffset: 517,
    }, cookieA);
    assert(dupRes.statusCode === 200, 'Duplicate report returned HTTP 200');
    assert(dupRes.data.data.isCorrect === false, 'Duplicate isCorrect is false');
    assert(dupRes.data.data.isDuplicate === true, 'Duplicate isDuplicate is true');
    assert(dupRes.data.data.identifiedCount === 1, 'Identified count unchanged on duplicate');
    console.log('Duplicate defect report handled gracefully.');

    // 4.4 Disambiguation: Valid consumption branch on Line 33 vs Buggy branch on Line 37
    const validBranchRes = await request('POST', '/arena/bug-hunt/report-bug', {
      questionId,
      selectedText: 'this.tokens -= tokensRequested',
      lineNumber: 33, // Valid branch inside if
      startOffset: 755,
      endOffset: 785,
    }, cookieA);
    assert(validBranchRes.data.data.isCorrect === false, 'Line 33 valid consumption rejected as non-bug');

    const buggyBranchRes = await request('POST', '/arena/bug-hunt/report-bug', {
      questionId,
      selectedText: 'this.tokens -= tokensRequested',
      lineNumber: 37, // Buggy branch outside if
      startOffset: 881,
      endOffset: 911,
    }, cookieA);
    assert(buggyBranchRes.data.data.isCorrect === true, 'Line 37 defect confirmed as BUG_ILLEGAL_CONSUME_DEDUCTION');
    assert(buggyBranchRes.data.data.identifiedCount === 2, 'Identified count incremented to 2');
    console.log(`Defect 2 isolated: ${buggyBranchRes.data.data.bugName} (2/4)`);

    // 4.5 Isolate Bug 2 (Clock skew) and Bug 3 (Capacity overflow)
    const bug2Res = await request('POST', '/arena/bug-hunt/report-bug', {
      questionId,
      selectedText: 'elapsedSeconds * this.refillRatePerSecond',
      lineNumber: 21,
      startOffset: 544,
      endOffset: 585,
    }, cookieA);
    assert(bug2Res.data.data.isCorrect === true, 'Bug 2 confirmed as BUG_CLOCK_SKEW_NEGATIVE');
    assert(bug2Res.data.data.identifiedCount === 3, 'Identified count incremented to 3');

    const bug3Res = await request('POST', '/arena/bug-hunt/report-bug', {
      questionId,
      selectedText: 'this.tokens += addedTokens;',
      lineNumber: 22,
      startOffset: 591,
      endOffset: 618,
    }, cookieA);
    if (!bug3Res.data?.data?.isCorrect) {
      console.log('Bug 3 debug response:', JSON.stringify(bug3Res.data));
    }
    assert(bug3Res.data.data.isCorrect === true, 'Bug 3 confirmed as BUG_CAPACITY_OVERFLOW');
    assert(bug3Res.data.data.identifiedCount === 4, 'All 4 defects successfully isolated!');
    assert(bug3Res.data.data.isInvestigationComplete === true, 'isInvestigationComplete is now TRUE');
    console.log('All 4 defects confirmed! 20/20 Bug Identification points awarded.');

    // -------------------------------------------------------------------------
    // 5. Test Relay Handover & Team Progress Synchronization
    // -------------------------------------------------------------------------
    console.log('\n[5/7] Testing Participant Relay Handover & Synchronized State...');

    // Logout Participant A
    await prisma.teamSession.updateMany({
      where: { teamId, participantId: participantA.id, status: 'ACTIVE' },
      data: { status: 'ENDED', terminationReason: 'USER_LOGOUT' },
    });

    // Login Participant B
    const loginResB = await request('POST', '/auth/team/login', {
      teamCode,
      password: 'TournamentPass@2026',
      participantId: participantB.id,
    });
    assert(loginResB.statusCode === 200, 'Participant B logged in with active terminal session');
    const cookieB = loginResB.sessionCookie;

    // Participant B fetches state: verify team sync
    const stateBRes = await request('GET', '/arena/bug-hunt/state', null, cookieB);
    assert(stateBRes.statusCode === 200, 'Participant B fetched state');
    const stateB = stateBRes.data.data;
    assert(stateB.identifiedCount === 4, 'Participant B sees all 4 defects identified by Participant A');
    assert(stateB.isInvestigationComplete === true, 'Participant B sees investigation complete');
    assert(stateB.isRepairUnlocked === true, 'Participant B sees Code Repair unlocked');
    assert(Number(stateB.score) === 20, `Participant B sees intermediate bug score of 20 (got: ${stateB.score})`);
    console.log('Relay Handover verified: team defects, unlocked status and score are 100% synchronized.');

    // -------------------------------------------------------------------------
    // 6. Test Code Repair Autosave & Execution
    // -------------------------------------------------------------------------
    console.log('\n[6/7] Testing Unlocked Code Repair Autosave & Execution...');

    // Now draft save MUST succeed
    const saveDraftRes = await request('POST', '/arena/workspace/draft', {
      roundNumber: 2,
      caseNumber: 1,
      sourceCode: CLEAN_ROUND2_SOLUTION,
      language: 'javascript',
    }, cookieB);
    assert(saveDraftRes.statusCode === 200, 'Workspace draft save succeeded after unlock');

    // Retrieve draft
    const getDraftRes = await request('GET', '/arena/workspace/draft?roundNumber=2&caseNumber=1', null, cookieB);
    assert(getDraftRes.statusCode === 200, 'Workspace draft retrieved');
    assert(getDraftRes.data.data.sourceCode.includes('TokenBucketLimiter'), 'Draft contains repair code');

    // Test run against Judge0
    const testRunRes = await request('POST', '/execution/run', {
      sourceCode: CLEAN_ROUND2_SOLUTION,
      languageKey: 'javascript',
      stdin: 'CAPACITY=10 REFILL=2 CONSUME=5',
      isTestRun: true,
    }, cookieB);
    assert(testRunRes.statusCode === 200, 'Judge0 test run returned HTTP 200');
    const runOutput = (testRunRes.data?.data?.result || testRunRes.data?.result)?.stdout || '';
    assert(runOutput.includes('CONSUMED: true, REMAINING: 5'), 'Sample test 1 passed in Judge0');
    console.log('Judge0 test run execution verified.');

    // -------------------------------------------------------------------------
    // 7. Test Final Submission, Official 100 Marks Rubric & Post-Lock
    // -------------------------------------------------------------------------
    console.log('\n[7/7] Testing Final Submission & Official 100 Marks Rubric...');

    const submitRes = await request('POST', '/arena/workspace/submit', {
      roundNumber: 2,
      caseNumber: 1,
      sourceCode: CLEAN_ROUND2_SOLUTION,
      language: 'javascript',
    }, cookieB);

    assert(submitRes.statusCode === 200, 'Final submission returned HTTP 200');
    const submitData = submitRes.data.data;
    assert(submitData.status === 'ACCEPTED', 'Submission status is ACCEPTED');
    assert(submitData.score === 100, `Official 100 Marks awarded for full solution (got: ${submitData.score}/100)`);
    assert(submitData.passedTestCases === submitData.totalTestCases, 'All test cases passed');

    // Verify test case sanitization
    for (const tc of submitData.testCaseResults || []) {
      if (tc.isHidden) {
        assert(tc.stdin === undefined, 'Hidden test case strictly omits stdin');
        assert(tc.expectedOutput === undefined, 'Hidden test case strictly omits expectedOutput');
        assert(tc.actualOutput === undefined, 'Hidden test case strictly omits actualOutput');
        assert(tc.passed === true, 'Hidden test case passed flag is reported');
      }
    }
    console.log('Hidden test sanitization verified: internal inputs/outputs are never leaked.');

    // Verify TeamRoundProgress in database
    const finalProgress = await prisma.teamRoundProgress.findUnique({
      where: { teamId_roundId: { teamId, roundId: r2Round.id } },
    });
    assert(finalProgress.participationStatus === 'SUBMITTED', 'TeamRoundProgress status is SUBMITTED');
    assert(Number(finalProgress.score) === 100, `TeamRoundProgress score is 100 (got: ${finalProgress.score})`);
    assert(finalProgress.scoreBreakdown.bugIdentification === 20, 'Breakdown: Bug Identification = 20');
    assert(finalProgress.scoreBreakdown.testCorrectness === 50, 'Breakdown: Test Correctness = 50');
    assert(finalProgress.scoreBreakdown.edgeCases === 20, 'Breakdown: Edge Cases = 20');
    assert(finalProgress.scoreBreakdown.codeQuality === 10, 'Breakdown: Code Quality = 10');
    console.log('Official rubric breakdown verified: 20 Bug ID + 50 Correctness + 20 Edge Cases + 10 Quality = 100 Marks.');

    // Duplicate submission guard: re-submitting must fail
    const reSubmitRes = await request('POST', '/arena/workspace/submit', {
      roundNumber: 2,
      caseNumber: 1,
      sourceCode: CLEAN_ROUND2_SOLUTION,
      language: 'javascript',
    }, cookieB);
    assert(reSubmitRes.statusCode === 400 || reSubmitRes.statusCode === 403, 'Re-submission strictly rejected with HTTP 403 Forbidden (locked)');
    assert(getErrorMessage(reSubmitRes.data).includes('already been submitted'), 'Error confirms round already submitted');
    console.log('Duplicate submission guard verified: workspace is locked.');

    console.log('\n================================================================');
    console.log('🏆 ALL ROUND 2 BUG HUNT ARENA TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================');
  } finally {
    stopServer();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED WITH EXCEPTION:', err);
  stopServer();
  process.exit(1);
});

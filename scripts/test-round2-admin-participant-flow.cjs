/**
 * IGNITRON 2K26 — Round 2 Admin Question Management & Participant Flow Verification Suite
 *
 * Verifies all 9 scenarios:
 * 1. Admin creates a new custom Round 2 mission (Python).
 * 2. Admin edits an unpublished mission.
 * 3. Participant fetches GET /api/arena/bug-hunt/state and receives the newly published mission (NOT Token Bucket).
 * 4. Direct click-to-identify on correct tokens turns RED and increments counter.
 * 5. Incorrect click is rejected.
 * 6. Identifying all bugs unlocks Code Repair editor.
 * 7. Test run and submission execute against Judge0 with the mission's language and 100-mark rubric.
 * 8. Team relay handover preserves progress.
 * 9. Round 1 and Round 3 remain completely unaffected.
 */

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://127.0.0.1:4000/api';
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

// Faulty Python starter code for custom mission
const PYTHON_FAULTY_STARTER = `import sys

class Cache:
    def __init__(self, ttl):
        self.ttl = ttl
        self.store = {}
        self.timestamps = {}

    def set(self, key, val, now):
        self.store[key] = val
        self.timestamps[key] = now - self.ttl

    def get(self, key, now):
        if key not in self.store:
            return "MISS"
        if now - self.timestamps[key] < self.ttl:
            return "EXPIRED"
        return self.store[key]

def main():
    lines = sys.stdin.read().split()
    if not lines:
        print("OK")
        return
    cache = Cache(int(lines[0]))
    cache.set(lines[1], lines[2], int(lines[3]))
    print(cache.get(lines[1], int(lines[4])))

if __name__ == '__main__':
    main()
`;

// Corrected Python code
const PYTHON_REPAIRED_CODE = `import sys

class Cache:
    def __init__(self, ttl):
        self.ttl = ttl
        self.store = {}
        self.timestamps = {}

    def set(self, key, val, now):
        self.store[key] = val
        self.timestamps[key] = now

    def get(self, key, now):
        if key not in self.store:
            return "MISS"
        if now - self.timestamps[key] > self.ttl:
            return "EXPIRED"
        return self.store[key]

def main():
    lines = sys.stdin.read().split()
    if not lines:
        print("OK")
        return
    cache = Cache(int(lines[0]))
    cache.set(lines[1], lines[2], int(lines[3]))
    print(cache.get(lines[1], int(lines[4])))

if __name__ == '__main__':
    main()
`;

async function run() {
  console.log('====================================================================');
  console.log('  IGNITRON 2K26 — ROUND 2 DYNAMIC MISSIONS & PARTICIPANT VERIFICATION');
  console.log('====================================================================\n');

  try {
    await startServer();

    // Clean up any test mission from previous runs
    await prisma.question.deleteMany({
      where: {
        round: { roundNumber: 2 },
        title: { contains: 'Distributed Cache TTL' },
      },
    });

    // -------------------------------------------------------------------------
    // 0. Authenticate Admin
    // -------------------------------------------------------------------------
    console.log('\n[Step 0] Logging in as Admin...');
    const adminPass = process.env.ADMIN_PASSWORD || 'admin@123';
    let adminLoginRes = await request('POST', '/auth/admin/login', {
      email: process.env.ADMIN_EMAIL || 'admin@ignitron.local',
      password: adminPass,
    });
    if (adminLoginRes.statusCode !== 200) {
      adminLoginRes = await request('POST', '/auth/admin/login', {
        email: 'admin@ignitron.local',
        password: 'Ignitron@Admin2026',
      });
    }
    if (adminLoginRes.statusCode !== 200) {
      console.log('Admin login response:', adminLoginRes.statusCode, adminLoginRes.data);
    }
    assert(adminLoginRes.statusCode === 200, 'Admin login succeeded');
    const adminCookie = adminLoginRes.sessionCookie;

    // -------------------------------------------------------------------------
    // Scenario 1: Admin creates a new custom Round 2 mission (Python)
    // -------------------------------------------------------------------------
    console.log('\n[Scenario 1] Admin creates custom Round 2 Python mission...');
    const createMissionRes = await request(
      'POST',
      '/competition/questions',
      {
        roundNumber: 2,
        type: 'BUG_HUNT',
        orderNumber: 2,
        title: 'Distributed Cache TTL Eviction Flaw',
        description: 'Diagnose and repair flawed cache TTL arithmetic in Python subsystem.',
        marks: 100,
        starterCode: PYTHON_FAULTY_STARTER,
        language: 'python',
        isActive: false, // Initially unpublished
        rubric: {
          difficulty: 'HARD',
        },
        plantedBugs: [
          {
            key: 'BUG_TIMESTAMP_SUBTRACTION',
            name: 'Premature TTL Deduction',
            description: 'Subtracts TTL on insertion instead of storing insertion timestamp',
            lineNumber: 11,
            expression: 'now - self.ttl',
            correctedExpression: 'now',
            acceptableTokens: ['now - self.ttl', 'self.ttl', '-'],
          },
          {
            key: 'BUG_INVERTED_EXPIRATION',
            name: 'Inverted Expiration Comparison',
            description: 'Inverted TTL expiration check treats valid entries as expired',
            lineNumber: 16,
            expression: '< self.ttl',
            correctedExpression: '> self.ttl',
            acceptableTokens: ['< self.ttl', '<'],
          },
        ],
        sampleTestCases: [
          {
            stdin: '10 alpha value1 100 105',
            expectedOutput: 'value1',
            explanation: 'Entry within TTL should return cached value',
          },
        ],
        hiddenTestCases: [
          {
            stdin: '10 alpha value1 100 115',
            expectedOutput: 'EXPIRED',
            marks: 50,
            isEdgeCase: false,
          },
          {
            stdin: '5 beta val2 50 55',
            expectedOutput: 'val2',
            marks: 20,
            isEdgeCase: true,
          },
        ],
      },
      adminCookie,
    );
    assert(createMissionRes.statusCode === 201, 'Admin created mission successfully (HTTP 201)');
    const createdMission = createMissionRes.data.data;
    assert(createdMission.id !== undefined, 'Mission ID returned');
    assert(createdMission.language === 'python', 'Mission language is python');
    assert(createdMission.plantedBugs.length === 2, 'Mission has 2 planted bugs');

    // -------------------------------------------------------------------------
    // Scenario 2: Admin edits an unpublished mission & then publishes it
    // -------------------------------------------------------------------------
    console.log('\n[Scenario 2] Admin edits unpublished mission and publishes it...');
    const updateRes = await request(
      'PUT',
      `/competition/questions/${createdMission.id}`,
      {
        title: 'Distributed Cache TTL Eviction Defect (v2)',
        description: 'Diagnose and repair flawed cache TTL arithmetic in Python subsystem (Updated).',
        orderNumber: 2,
        isActive: true, // Now published!
      },
      adminCookie,
    );
    assert(updateRes.statusCode === 200, 'Admin updated and published mission successfully (HTTP 200)');
    assert(updateRes.data.data.title.includes('(v2)'), 'Updated title saved');
    assert(updateRes.data.data.isActive === true, 'Mission is now published (isActive: true)');

    // Unpublish the legacy order 1 question so the new published mission is active
    await prisma.question.updateMany({
      where: {
        round: { roundNumber: 2 },
        id: { not: createdMission.id },
      },
      data: { isActive: false },
    });

    // -------------------------------------------------------------------------
    // Setup Team for Participant Flow
    // -------------------------------------------------------------------------
    console.log('\nRegistering clean test team...');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const regRes = await request('POST', '/auth/team/register', {
      teamName: `Python Debuggers ${rand}`,
      institution: 'IGNITRON Lab',
      password: 'TournamentPass@2026',
      participants: [
        { fullName: `Member A ${rand}`, email: `mema_${rand}@ignitron.local` },
        { fullName: `Member B ${rand}`, email: `memb_${rand}@ignitron.local` },
      ],
    });
    assert(regRes.statusCode === 201, 'Team registered successfully');
    const { teamId, teamCode } = regRes.data.data;

    const participants = await prisma.participant.findMany({
      where: { teamId },
      orderBy: { createdAt: 'asc' },
    });
    const [participantA, participantB] = participants;

    // Login Member A
    const loginA = await request('POST', '/auth/team/login', {
      teamCode,
      password: 'TournamentPass@2026',
      participantId: participantA.id,
    });
    assert(loginA.statusCode === 200, 'Member A logged in');
    const cookieA = loginA.sessionCookie;

    // Set competition state to Round 2 Active
    const r2Round = await prisma.competitionRound.findFirst({ where: { roundNumber: 2 } });
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
    // Scenario 3: Participant fetches state and receives newly published mission (NOT Token Bucket)
    // -------------------------------------------------------------------------
    console.log('\n[Scenario 3] Participant fetches Round 2 state...');
    const stateRes = await request('GET', '/arena/bug-hunt/state', null, cookieA);
    assert(stateRes.statusCode === 200, 'GET /arena/bug-hunt/state returned HTTP 200');
    const state = stateRes.data.data;
    assert(state.questionId === createdMission.id, 'State loaded custom published question');
    assert(state.title === 'Distributed Cache TTL Eviction Defect (v2)', 'Title matches custom mission (NOT Token Bucket)');
    assert(state.language === 'python', 'Language is python');
    assert(state.totalRequired === 2, `State reports 2 required defects (got: ${state.totalRequired})`);
    assert(state.identifiedCount === 0, 'Initial identified count is 0');
    assert(state.isInvestigationComplete === false, 'isInvestigationComplete is false');
    assert(state.isRepairUnlocked === false, 'isRepairUnlocked is false');
    assert(state.faultyCode.includes('class Cache:'), 'Faulty code contains Python Cache class');
    assert(state.plantedBugs === undefined, 'plantedBugs answers are strictly omitted from participant payload');

    // -------------------------------------------------------------------------
    // Scenario 5: Incorrect click is rejected
    // -------------------------------------------------------------------------
    console.log('\n[Scenario 5] Participant clicks non-faulty code token...');
    const wrongClickRes = await request(
      'POST',
      '/arena/bug-hunt/report-bug',
      {
        questionId: createdMission.id,
        selectedText: 'def __init__',
        lineNumber: 4,
      },
      cookieA,
    );
    assert(wrongClickRes.statusCode === 200, 'Report endpoint returned HTTP 200');
    assert(wrongClickRes.data.data.isCorrect === false, 'Incorrect click rejected with isCorrect: false');
    assert(wrongClickRes.data.data.identifiedCount === 0, 'Counter remains 0');

    // -------------------------------------------------------------------------
    // Scenario 4: Direct click on correct tokens turns RED & increments counter
    // -------------------------------------------------------------------------
    console.log('\n[Scenario 4] Participant clicks first defect (now - self.ttl)...');
    const correctClick1 = await request(
      'POST',
      '/arena/bug-hunt/report-bug',
      {
        questionId: createdMission.id,
        selectedText: 'now - self.ttl',
        lineNumber: 11,
      },
      cookieA,
    );
    assert(correctClick1.statusCode === 200, 'Defect 1 reported HTTP 200');
    assert(correctClick1.data.data.isCorrect === true, 'Defect 1 accepted with isCorrect: true');
    assert(correctClick1.data.data.identifiedCount === 1, 'Counter incremented to 1/2');

    // Duplicate click
    const dupClick = await request(
      'POST',
      '/arena/bug-hunt/report-bug',
      {
        questionId: createdMission.id,
        selectedText: 'now - self.ttl',
        lineNumber: 11,
      },
      cookieA,
    );
    assert(dupClick.data.data.isDuplicate === true, 'Duplicate click flagged with isDuplicate: true');
    assert(dupClick.data.data.identifiedCount === 1, 'Counter unchanged after duplicate');

    // Correct click 2
    console.log('Participant clicks second defect (< self.ttl)...');
    const correctClick2 = await request(
      'POST',
      '/arena/bug-hunt/report-bug',
      {
        questionId: createdMission.id,
        selectedText: '< self.ttl',
        lineNumber: 16,
      },
      cookieA,
    );
    assert(correctClick2.statusCode === 200, 'Defect 2 reported HTTP 200');
    assert(correctClick2.data.data.isCorrect === true, 'Defect 2 accepted with isCorrect: true');
    assert(correctClick2.data.data.identifiedCount === 2, 'Counter incremented to 2/2');

    // -------------------------------------------------------------------------
    // Scenario 6: Identifying all bugs unlocks Code Repair editor
    // -------------------------------------------------------------------------
    console.log('\n[Scenario 6] Verifying Code Repair unlocked after all bugs identified...');
    assert(correctClick2.data.data.isInvestigationComplete === true, 'isInvestigationComplete is true');
    assert(correctClick2.data.data.isRepairUnlocked === true, 'isRepairUnlocked is true');

    // Draft save now succeeds (no longer 403)
    const draftRes = await request(
      'POST',
      '/arena/workspace/draft',
      {
        roundNumber: 2,
        caseNumber: 1,
        sourceCode: PYTHON_REPAIRED_CODE,
        language: 'python',
      },
      cookieA,
    );
    assert(draftRes.statusCode === 200, 'Draft saved successfully after unlocking repair');

    // -------------------------------------------------------------------------
    // Scenario 7: Judge0 Execution and Submission with 100-mark rubric
    // -------------------------------------------------------------------------
    console.log('\n[Scenario 7] Executing test run and final submission against Judge0...');
    // Public sample test execution
    const testRunRes = await request(
      'POST',
      '/execution/run',
      {
        languageKey: 'python',
        sourceCode: PYTHON_REPAIRED_CODE,
        stdin: '10 alpha value1 100 105',
        isTestRun: true,
      },
      cookieA,
    );
    assert(testRunRes.statusCode === 200, 'Sample test executed in Judge0 (HTTP 200)');
    const execResult = testRunRes.data.result || testRunRes.data.data;
    assert(execResult.status.isSuccess === true, 'Judge0 returned status: Success');
    assert(execResult.stdout.trim() === 'value1', `Sample output matches value1 (got: ${execResult.stdout.trim()})`);

    // Final submission
    const submitRes = await request(
      'POST',
      '/arena/workspace/submit',
      {
        roundNumber: 2,
        caseNumber: 1,
        sourceCode: PYTHON_REPAIRED_CODE,
        language: 'python',
      },
      cookieA,
    );
    assert(submitRes.statusCode === 200, 'Submission succeeded (HTTP 200)');
    const subResult = submitRes.data.data;
    assert(subResult.score === 100, `Official rubric awarded 100 marks (got: ${subResult.score})`);

    // Verify rubric breakdown in teamRoundProgress
    const savedProgress = await prisma.teamRoundProgress.findFirst({
      where: { teamId, roundId: r2Round.id },
    });
    const breakdown = savedProgress.scoreBreakdown;
    console.log('Saved round progress score breakdown:', breakdown);
    assert(breakdown.bugIdentification === 20, 'Bug Identification: 20 pts');
    assert(breakdown.testCorrectness === 50, 'Test Correctness: 50 pts');
    assert(breakdown.edgeCases === 20, 'Edge Cases: 20 pts');
    assert(breakdown.codeQuality === 10, 'Code Quality: 10 pts');

    // -------------------------------------------------------------------------
    // Scenario 8: Team Relay Handover & Session Mutex Preserves Progress
    // -------------------------------------------------------------------------
    console.log('\n[Scenario 8] Testing relay session handover to Member B...');
    // Member B attempts login while Member A is active -> must be rejected with 409 Conflict
    const blockedLoginB = await request('POST', '/auth/team/login', {
      teamCode,
      password: 'TournamentPass@2026',
      participantId: participantB.id,
    });
    assert(blockedLoginB.statusCode === 409, 'Member B login blocked with 409 Conflict while Member A holds active session');

    // Member A logs out
    const logoutA = await request('POST', '/auth/logout', {}, cookieA);
    assert(logoutA.statusCode === 200, 'Member A logged out cleanly (HTTP 200)');

    // Login Member B now succeeds
    const loginB = await request('POST', '/auth/team/login', {
      teamCode,
      password: 'TournamentPass@2026',
      participantId: participantB.id,
    });
    assert(loginB.statusCode === 200, 'Member B logged in successfully after handover');
    const cookieB = loginB.sessionCookie;

    const stateB = await request('GET', '/arena/bug-hunt/state', null, cookieB);
    assert(stateB.statusCode === 200, 'Member B fetched arena state');
    assert(stateB.data.data.identifiedCount === 2, 'Member B sees 2/2 identified defects preserved');
    assert(stateB.data.data.isRepairUnlocked === true, 'Member B has code repair unlocked');
    assert(stateB.data.data.isSubmitted === true, 'Member B sees submission status preserved');
    assert(stateB.data.data.score === 100, 'Member B sees 100 marks preserved on team progress');

    // -------------------------------------------------------------------------
    // Scenario 9: Round 1 and Round 3 remain completely unaffected
    // -------------------------------------------------------------------------
    console.log('\n[Scenario 9] Verifying Round 1 and Round 3 remain unaffected...');
    // Round 1 check
    const r1Questions = await request('GET', '/competition/questions?roundNumber=1', null, adminCookie);
    assert(r1Questions.statusCode === 200, 'Admin fetched Round 1 questions');
    assert(r1Questions.data.data.length >= 15, `Round 1 questions preserved (Found: ${r1Questions.data.data.length})`);
    const r1TotalMarks = r1Questions.data.data.reduce((sum, q) => sum + q.marks, 0);
    assert(r1TotalMarks === 30, `Round 1 total marks = 30 (got: ${r1TotalMarks})`);

    // Round 3 check
    const r3Questions = await request('GET', '/competition/questions?roundNumber=3', null, adminCookie);
    assert(r3Questions.statusCode === 200, 'Admin fetched Round 3 questions');
    assert(r3Questions.data.data.length === 6 || r3Questions.data.data.length === 3, `Round 3 questions preserved (Found: ${r3Questions.data.data.length})`);
    const totalR3Marks = r3Questions.data.data.reduce((sum, q) => sum + q.marks, 0);
    assert(totalR3Marks === 90 || totalR3Marks === 100, `Round 3 total marks = 90 (+10 quality = 100) (got: ${totalR3Marks})`);

    console.log('\n====================================================================');
    console.log('🎉 ALL 9 VERIFICATION SCENARIOS PASSED WITH ZERO ERRORS!');
    console.log('====================================================================\n');
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err);
    process.exit(1);
  } finally {
    try {
      await prisma.question.updateMany({
        where: { round: { roundNumber: 2 }, orderNumber: 1 },
        data: { isActive: true },
      });
      await prisma.question.deleteMany({
        where: {
          round: { roundNumber: 2 },
          title: { contains: 'Distributed Cache TTL' },
        },
      });
    } catch {}
    stopServer();
    await prisma.$disconnect();
  }
}

run();

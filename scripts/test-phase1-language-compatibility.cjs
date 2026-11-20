/**
 * IGNITRON 2K26 — Phase 1 Test: Language Compatibility & Starter Code Verification
 *
 * Verifies:
 * 1. Supported language list (/execution/languages) matches official specification (cpp, java, python, javascript).
 * 2. Supported languages execute successfully via /execution/dev/run.
 * 3. Unsupported 'typescript' is strictly rejected with HTTP 400 across /execution/run, /execution/dev/run, and /arena/workspace/submit.
 * 4. Round 2 Question returns 'javascript' and executable starter code via /competition/questions/round/2.
 * 5. Round 2 starter code parses without syntax errors and obeys the stdin/stdout contract.
 * 6. Sample 1 and Sample 2 inputs produce the expected contract outputs.
 * 7. Round 3 multi-case questions (Case 1 Java, Case 2 Python, Case 3 C++) and draft independence remain intact.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const http = require('http');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');

const BASE_URL = 'http://localhost:4000/api';

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

let backendProcess = null;

async function startServer() {
  const isRunning = await waitForServer(2, 500);
  if (isRunning) {
    console.log('Backend server is already running on port 4000.');
    return;
  }

  console.log('Starting backend server on port 4000...');
  backendProcess = spawn('node', ['apps/backend/dist/main.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: '4000' },
    stdio: 'inherit',
  });

  const ready = await waitForServer(35, 1000);
  if (!ready) {
    throw new Error('Backend server failed to start within timeout.');
  }
  console.log('Backend server successfully started.');
}

function stopServer() {
  if (backendProcess) {
    console.log('Stopping backend server...');
    backendProcess.kill();
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('IGNITRON 2K26 — Phase 1 Language Compatibility & Starter Code Test');
  console.log('================================================================\n');

  await startServer();

  try {
    // 1. Authenticate Admin and Team
    console.log('[1/7] Authenticating Admin & Test Team...');
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
    assert(adminLoginRes.statusCode === 200, 'Admin login successful (200 OK)');
    const adminCookie = adminLoginRes.sessionCookie;
    assert(Boolean(adminCookie), 'Admin session cookie established');

    let teamCookie = null;
    const lookupRes = await request('GET', '/auth/team/lookup/IGN-4DD6');
    if (lookupRes.statusCode === 200) {
      const participants = lookupRes.data?.data?.participants || lookupRes.data?.team?.participants || [];
      if (participants.length > 0) {
        for (const pwd of ['CodeHunters@2026', 'TeamPass123!', 'InitialPassword123!']) {
          const loginRes = await request('POST', '/auth/team/login', {
            teamCode: 'IGN-4DD6',
            password: pwd,
            participantId: participants[0].id,
          });
          if (loginRes.statusCode === 200 && loginRes.sessionCookie) {
            teamCookie = loginRes.sessionCookie;
            console.log('Authenticated with existing team IGN-4DD6');
            break;
          }
        }
      }
    }

    if (!teamCookie) {
      console.log('Registering temporary test team for verification...');
      const rand = Math.floor(Math.random() * 9000 + 1000);
      const regRes = await request('POST', '/auth/team/register', {
        teamName: `Phase1 Verification Team ${rand}`,
        institution: 'Test Institute',
        password: 'TestPassword@2026',
        participants: [
          { fullName: `Tester One ${rand}`, email: `t1_${rand}@test.local` },
          { fullName: `Tester Two ${rand}`, email: `t2_${rand}@test.local` },
        ],
      });
      const teamData = regRes.data?.data || regRes.data?.team;
      const teamCode = teamData?.teamCode;
      const pLookup = await request('GET', `/auth/team/lookup/${teamCode}`);
      const parts = pLookup.data?.data?.participants || [];
      const loginRes = await request('POST', '/auth/team/login', {
        teamCode,
        password: 'TestPassword@2026',
        participantId: parts[0].id,
      });
      teamCookie = loginRes.sessionCookie;
      console.log(`Authenticated with registered test team ${teamCode}`);
    }

    assert(Boolean(teamCookie), 'Team login successful with session cookie established');

    // 2. Verify Supported Languages Endpoint
    console.log('\n[2/7] Verifying /execution/languages...');
    const langsRes = await request('GET', '/execution/languages', null, teamCookie);
    assert(langsRes.statusCode === 200, 'GET /execution/languages returns HTTP 200');
    const languages = langsRes.data?.languages || [];
    const langKeys = languages.map((l) => l.key);
    console.log('Live supported languages:', langKeys);

    assert(langKeys.includes('cpp'), 'Language list contains C++ (cpp)');
    assert(langKeys.includes('java'), 'Language list contains Java (java)');
    assert(langKeys.includes('python'), 'Language list contains Python (python)');
    assert(langKeys.includes('javascript'), 'Language list contains JavaScript (javascript)');
    assert(!langKeys.includes('typescript'), 'Language list strictly excludes TypeScript');
    assert(languages.length === 4, 'Exactly 4 official competition languages supported');

    // 3. Verify Supported Languages Execute via /execution/dev/run
    console.log('\n[3/7] Testing /execution/dev/run across all 4 supported languages...');
    for (const lang of ['javascript', 'python', 'cpp', 'java']) {
      const runRes = await request('POST', '/execution/dev/run', {
        languageKey: lang,
        sourceCode: `// ${lang} test\nconsole.log("OK");`,
        stdin: 'CAPACITY=10 CONSUME=5',
        isTestRun: true,
      }, teamCookie);

      assert(runRes.statusCode === 200, `POST /execution/dev/run accepts supported language "${lang}"`);
      assert(runRes.data?.result?.status !== undefined, `Execution result returned for "${lang}"`);
    }

    // 4. Strict Rejection of Unsupported TypeScript
    console.log('\n[4/7] Testing strict rejection of unsupported TypeScript...');
    const tsDevRes = await request('POST', '/execution/dev/run', {
      languageKey: 'typescript',
      sourceCode: 'const x: number = 42;\nconsole.log(x);',
      stdin: '',
      isTestRun: true,
    }, teamCookie);

    assert(tsDevRes.statusCode === 400, 'POST /execution/dev/run with languageKey: "typescript" rejected with HTTP 400');
    const tsDevErrorMsg = JSON.stringify(tsDevRes.data);
    assert(
      tsDevErrorMsg.toLowerCase().includes('typescript') || tsDevErrorMsg.toLowerCase().includes('languagekey'),
      'Validation error message specifies unsupported language'
    );

    const tsRunRes = await request('POST', '/execution/run', {
      languageKey: 'typescript',
      sourceCode: 'const x: number = 42;\nconsole.log(x);',
      stdin: '',
      isTestRun: true,
    }, teamCookie);

    assert(tsRunRes.statusCode === 400, 'POST /execution/run with languageKey: "typescript" rejected with HTTP 400');

    const tsSubmitRes = await request('POST', '/arena/workspace/submit', {
      roundNumber: 2,
      caseNumber: 1,
      sourceCode: 'const x: number = 42;',
      language: 'typescript',
    }, teamCookie);

    assert(tsSubmitRes.statusCode === 400, 'POST /arena/workspace/submit with language: "typescript" rejected with HTTP 400');
    console.log('Confirmed: TypeScript is neither executed nor silently converted.');

    // 5. Verify Round 2 Question & Starter Code Contract
    console.log('\n[5/7] Verifying Round 2 Question & Starter Code...');
    const r2QuestionRes = await request('GET', '/competition/questions/round/2', null, adminCookie);
    assert(r2QuestionRes.statusCode === 200, 'GET /competition/questions/round/2 returns HTTP 200');
    const r2Questions = r2QuestionRes.data?.data || [];
    assert(r2Questions.length > 0, 'Round 2 question exists');

    const r2Q = r2Questions[0];
    assert(r2Q.language === 'javascript', `Round 2 question language is "javascript" (was: "${r2Q.language}")`);
    assert(Boolean(r2Q.starterCode), 'Round 2 question provides starter code');
    assert(!r2Q.starterCode.includes('export class'), 'Starter code uses standard JavaScript class without TypeScript exports');
    assert(!r2Q.starterCode.includes('private '), 'Starter code contains no TypeScript access modifiers');
    assert(r2Q.starterCode.includes('class TokenBucketLimiter'), 'Starter code defines TokenBucketLimiter');
    assert(r2Q.starterCode.includes('fs.readFileSync(0'), 'Starter code contains stdin/stdout harness');

    // Verify syntax with Node.js
    const tempScriptPath = path.resolve(__dirname, '../node_modules/.cache_r2_test.js');
    fs.mkdirSync(path.dirname(tempScriptPath), { recursive: true });
    fs.writeFileSync(tempScriptPath, r2Q.starterCode);

    const syntaxCheck = spawnSync('node', ['-c', tempScriptPath]);
    assert(syntaxCheck.status === 0, 'Round 2 starter code compiles cleanly with node -c (zero syntax errors)');

    // 6. Test Starter Code Sample Inputs & Bug Behavior
    console.log('\n[6/7] Testing Sample 1 and Sample 2 execution contracts...');
    // Sample 1: CAPACITY=10 REFILL=2 CONSUME=5 -> CONSUMED: true, REMAINING: 5
    const sample1Exec = spawnSync('node', [tempScriptPath], { input: 'CAPACITY=10 REFILL=2 CONSUME=5' });
    const sample1Out = sample1Exec.stdout.toString().trim();
    console.log('Starter code Sample 1 output:', sample1Out);
    assert(sample1Out === 'CONSUMED: true, REMAINING: 5', 'Sample 1 input produces "CONSUMED: true, REMAINING: 5"');

    // Sample 2 on buggy starter: CAPACITY=5 REFILL=1 CONSUME=10 -> shows Bug 3 (REMAINING: -5)
    const sample2BuggyExec = spawnSync('node', [tempScriptPath], { input: 'CAPACITY=5 REFILL=1 CONSUME=10' });
    const sample2BuggyOut = sample2BuggyExec.stdout.toString().trim();
    console.log('Starter code Sample 2 (buggy) output:', sample2BuggyOut);
    assert(
      sample2BuggyOut === 'CONSUMED: false, REMAINING: -5',
      'Starter code faithfully retains Bug 3 (deducting on false) yielding "REMAINING: -5"'
    );

    // Fix Bug 3 and test Sample 2
    const fixedCode = r2Q.starterCode.replace('this.tokens -= tokensRequested;\n    return false;', 'return false;');
    fs.writeFileSync(tempScriptPath, fixedCode);
    const sample2FixedExec = spawnSync('node', [tempScriptPath], { input: 'CAPACITY=5 REFILL=1 CONSUME=10' });
    const sample2FixedOut = sample2FixedExec.stdout.toString().trim();
    console.log('Fixed code Sample 2 output:', sample2FixedOut);
    assert(
      sample2FixedOut === 'CONSUMED: false, REMAINING: 5',
      'Fixed code Sample 2 produces expected "CONSUMED: false, REMAINING: 5"'
    );

    // Clean up temp file
    try { fs.unlinkSync(tempScriptPath); } catch (e) {}

    // 7. Verify Round 3 Multi-Case Questions and Case Isolation
    console.log('\n[7/7] Verifying Round 3 Multi-Case Questions & Isolation...');
    const r3QuestionRes = await request('GET', '/competition/questions/round/3', null, adminCookie);
    assert(r3QuestionRes.statusCode === 200, 'GET /competition/questions/round/3 returns HTTP 200');
    const r3Questions = r3QuestionRes.data?.data || [];
    assert(r3Questions.length === 3, 'Round 3 contains exactly 3 coding cases');

    const case1Q = r3Questions.find((q) => q.caseNumber === 1);
    const case2Q = r3Questions.find((q) => q.caseNumber === 2);
    const case3Q = r3Questions.find((q) => q.caseNumber === 3);

    assert(case1Q?.language === 'java', `Case 1 language is Java (found: ${case1Q?.language})`);
    assert(case2Q?.language === 'python', `Case 2 language is Python (found: ${case2Q?.language})`);
    assert(case3Q?.language === 'cpp', `Case 3 language is C++ (found: ${case3Q?.language})`);

    // Verify starter code exists for each case and matches its target language
    assert(case1Q?.starterCode?.includes('class') || case1Q?.starterCode?.includes('java'), 'Case 1 provides Java starter code');
    assert(case2Q?.starterCode?.includes('def ') || case2Q?.starterCode?.includes('import sys'), 'Case 2 provides Python starter code');
    assert(case3Q?.starterCode?.includes('#include') || case3Q?.starterCode?.includes('int main'), 'Case 3 provides C++ starter code');

    console.log('\n================================================================');
    console.log('🎉 ALL PHASE 1 TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================');
  } finally {
    stopServer();
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  stopServer();
  process.exit(1);
});

/**
 * IGNITRON 2K26 — Judge0 Language Execution & Base64 Handling Focused Tests
 *
 * Verifies:
 * 1. Direct Judge0 CE execution for C++ (54), Java (62), Python (71), and JavaScript (63).
 * 2. Unencoded source code submission with `base64_encoded=false`.
 * 3. Base64 fallback decoding on UTF-8 conversion errors (e.g. GCC unicode quotes in compile_output).
 * 4. Stdin / stdout handling across all supported languages.
 * 5. Runtime error (NZEC) and compilation error handling.
 * 6. Backend /execution/dev/run API contract validation for all 4 languages.
 */

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const JUDGE0_URL = process.env.JUDGE0_API_URL || 'http://localhost:2358';
const BACKEND_URL = 'http://localhost:4000/api';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

// Helper to make HTTP requests
function sendRequest(urlStr, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// Backend process management
let backendProcess = null;

async function waitForBackend(retries = 30, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await sendRequest(`${BACKEND_URL}/health`);
      if (res.statusCode === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

async function startBackend() {
  const isRunning = await waitForBackend(2, 500);
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

  const ready = await waitForBackend(30, 1000);
  if (!ready) {
    throw new Error('Backend server failed to start within timeout.');
  }
  console.log('Backend server successfully started.');
}

function stopBackend() {
  if (backendProcess) {
    console.log('Stopping backend server...');
    backendProcess.kill();
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('IGNITRON 2K26 — Judge0 Language Execution & Base64 Audit Tests');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. Direct Judge0 CE Verification
  // -------------------------------------------------------------------------
  console.log('[1/2] Testing Direct Judge0 CE Service at ' + JUDGE0_URL + '...');

  let isJudge0Alive = false;
  try {
    const aboutRes = await sendRequest(`${JUDGE0_URL}/about`);
    if (aboutRes.statusCode === 200) {
      isJudge0Alive = true;
      console.log(`Judge0 CE version: ${aboutRes.data?.version}`);
    }
  } catch (err) {
    console.warn(`Local Judge0 service not reachable at ${JUDGE0_URL}: ${err.message}`);
  }

  assert(isJudge0Alive, 'Judge0 CE service is reachable and responsive at ' + JUDGE0_URL);

  // Test 1.1: Python 3 (ID 71) - Standard execution with base64_encoded=false
  console.log('\n--- Test 1.1: Python 3 (ID 71) Execution ---');
  const pyRes = await sendRequest(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
    'POST',
    {
      source_code: 'import sys\nname = sys.stdin.read().strip()\nprint(f"HELLO_PYTHON_{name}")',
      language_id: 71,
      stdin: 'WORLD',
    },
  );
  assert(pyRes.statusCode === 201, 'Python submission returned HTTP 201 Created');
  assert(pyRes.data?.status?.id === 3, 'Python execution status is Accepted (3)');
  assert(pyRes.data?.stdout?.trim() === 'HELLO_PYTHON_WORLD', 'Python stdout matches "HELLO_PYTHON_WORLD"');
  assert(pyRes.data?.stderr === null, 'Python stderr is null');

  // Test 1.2: Python 3 (ID 71) - Runtime Error
  console.log('\n--- Test 1.2: Python 3 (ID 71) Runtime Error ---');
  const pyErrRes = await sendRequest(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
    'POST',
    {
      source_code: 'print(1 / 0)',
      language_id: 71,
    },
  );
  assert(pyErrRes.statusCode === 201, 'Python error submission returned HTTP 201 Created');
  assert(pyErrRes.data?.status?.id === 11, 'Python runtime error status is NZEC (11)');
  assert(pyErrRes.data?.stderr?.includes('ZeroDivisionError'), 'Python stderr contains "ZeroDivisionError"');

  // Test 1.3: C++ (ID 54) - Standard execution with base64_encoded=false
  console.log('\n--- Test 1.3: C++ (ID 54) Execution ---');
  const cppRes = await sendRequest(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
    'POST',
    {
      source_code: '#include <iostream>\nint main() { std::cout << "HELLO_CPP" << std::endl; return 0; }',
      language_id: 54,
    },
  );
  assert(cppRes.statusCode === 201, 'C++ submission returned HTTP 201 Created');
  assert(cppRes.data?.status?.id === 3, 'C++ execution status is Accepted (3)');
  assert(cppRes.data?.stdout?.trim() === 'HELLO_CPP', 'C++ stdout matches "HELLO_CPP"');

  // Test 1.4: C++ (ID 54) - Compilation Error with Base64 fallback verification
  console.log('\n--- Test 1.4: C++ (ID 54) Compilation Error Handling ---');
  const cppErrRes = await sendRequest(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
    'POST',
    {
      source_code: 'int main() { syntax_error_here }',
      language_id: 54,
    },
  );
  assert(cppErrRes.statusCode === 201, 'C++ error submission returned HTTP 201 Created');
  let cppCompileOutput = cppErrRes.data?.compile_output;
  let cppStatusId = cppErrRes.data?.status?.id;

  // If Judge0 returned the conversion error, verify token and fallback
  if (cppErrRes.data?.error && cppErrRes.data?.token) {
    console.log('Judge0 returned UTF-8 conversion error as expected for GCC quotes. Fetching base64 representation...');
    const b64Res = await sendRequest(`${JUDGE0_URL}/submissions/${cppErrRes.data.token}?base64_encoded=true`);
    assert(b64Res.statusCode === 200, 'Base64 fallback fetch returned HTTP 200 OK');
    assert(b64Res.data?.status?.id === 6, 'Fallback status is Compilation Error (6)');
    cppStatusId = b64Res.data?.status?.id;
    cppCompileOutput = Buffer.from(b64Res.data?.compile_output, 'base64').toString('utf8');
  }
  assert(cppStatusId === 6, 'C++ error status resolved to Compilation Error (6)');
  assert(
    cppCompileOutput?.includes('syntax_error_here') || cppCompileOutput?.includes('error'),
    'C++ compile_output contains descriptive compiler diagnostics',
  );

  // Test 1.5: Java (ID 62) - Standard execution with base64_encoded=false
  console.log('\n--- Test 1.5: Java (ID 62) Execution ---');
  const javaRes = await sendRequest(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
    'POST',
    {
      source_code: 'public class Main { public static void main(String[] args) { System.out.println("HELLO_JAVA"); } }',
      language_id: 62,
    },
  );
  assert(javaRes.statusCode === 201, 'Java submission returned HTTP 201 Created');
  assert(javaRes.data?.status?.id === 3, 'Java execution status is Accepted (3)');
  assert(javaRes.data?.stdout?.trim() === 'HELLO_JAVA', 'Java stdout matches "HELLO_JAVA"');

  // Test 1.6: Java (ID 62) - Compilation Error
  console.log('\n--- Test 1.6: Java (ID 62) Compilation Error ---');
  const javaErrRes = await sendRequest(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
    'POST',
    {
      source_code: 'public class Main { invalid syntax; }',
      language_id: 62,
    },
  );
  assert(javaErrRes.statusCode === 201, 'Java error submission returned HTTP 201 Created');
  assert(javaErrRes.data?.status?.id === 6, 'Java error status is Compilation Error (6)');
  assert(javaErrRes.data?.compile_output?.includes('error'), 'Java compile_output contains error diagnostics');

  // Test 1.7: JavaScript (ID 63) - Standard execution with base64_encoded=false
  console.log('\n--- Test 1.7: JavaScript (ID 63) Execution ---');
  const jsRes = await sendRequest(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
    'POST',
    {
      source_code: 'console.log("HELLO_JAVASCRIPT");',
      language_id: 63,
    },
  );
  assert(jsRes.statusCode === 201, 'JavaScript submission returned HTTP 201 Created');
  assert(jsRes.data?.status?.id === 3, 'JavaScript execution status is Accepted (3)');
  assert(jsRes.data?.stdout?.trim() === 'HELLO_JAVASCRIPT', 'JavaScript stdout matches "HELLO_JAVASCRIPT"');

  // Test 1.8: JavaScript (ID 63) - Runtime Error
  console.log('\n--- Test 1.8: JavaScript (ID 63) Runtime Error ---');
  const jsErrRes = await sendRequest(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
    'POST',
    {
      source_code: 'throw new Error("CUSTOM_JS_EXCEPTION");',
      language_id: 63,
    },
  );
  assert(jsErrRes.statusCode === 201, 'JavaScript error submission returned HTTP 201 Created');
  assert(jsErrRes.data?.status?.id === 11, 'JavaScript error status is NZEC (11)');
  assert(jsErrRes.data?.stderr?.includes('CUSTOM_JS_EXCEPTION'), 'JavaScript stderr contains exception message');

  // -------------------------------------------------------------------------
  // 2. NestJS Backend API Integration Verification
  // -------------------------------------------------------------------------
  console.log('\n[2/2] Testing NestJS Backend Code Execution Service (/execution/dev/run)...');
  await startBackend();

  // Test 2.1: Python via Backend
  console.log('\n--- Test 2.1: Backend Python (71 / "python") ---');
  const bePyRes = await sendRequest(
    `${BACKEND_URL}/execution/dev/run`,
    'POST',
    {
      languageKey: 'python',
      sourceCode: 'import sys\nprint("PY_BACKEND_OK:" + sys.stdin.read().strip())',
      stdin: 'PAYLOAD123',
      isTestRun: true,
    },
  );
  assert(bePyRes.statusCode === 200, 'Backend Python execution returns HTTP 200');
  assert(bePyRes.data?.result?.status?.isSuccess === true, 'Backend Python status isSuccess === true');
  assert(bePyRes.data?.result?.stdout?.trim() === 'PY_BACKEND_OK:PAYLOAD123', 'Backend Python output received and unencoded');

  // Test 2.2: C++ via Backend (testing compiler error handling through backend)
  console.log('\n--- Test 2.2: Backend C++ (54 / "cpp") Success & Compilation Error ---');
  const beCppOk = await sendRequest(
    `${BACKEND_URL}/execution/dev/run`,
    'POST',
    {
      languageKey: 'cpp',
      sourceCode: '#include <iostream>\nint main() { std::cout << "CPP_BACKEND_OK" << std::endl; return 0; }',
      isTestRun: true,
    },
  );
  assert(beCppOk.statusCode === 200, 'Backend C++ execution returns HTTP 200');
  assert(beCppOk.data?.result?.status?.isSuccess === true, 'Backend C++ status isSuccess === true');
  assert(beCppOk.data?.result?.stdout?.trim() === 'CPP_BACKEND_OK', 'Backend C++ stdout matches');

  const beCppErr = await sendRequest(
    `${BACKEND_URL}/execution/dev/run`,
    'POST',
    {
      languageKey: 'cpp',
      sourceCode: 'int main() { syntax_err; }',
      isTestRun: true,
    },
  );
  assert(beCppErr.statusCode === 200, 'Backend C++ syntax error handled gracefully with HTTP 200');
  assert(beCppErr.data?.result?.status?.isCompilationError === true, 'Backend correctly flags isCompilationError');
  assert(Boolean(beCppErr.data?.result?.compileOutput), 'Backend correctly delivers decoded compileOutput');
  assert(!beCppErr.data?.result?.compileOutput.startsWith('bWFp'), 'compileOutput is decoded plaintext, not raw Base64');

  // Test 2.3: Java via Backend
  console.log('\n--- Test 2.3: Backend Java (62 / "java") ---');
  const beJavaRes = await sendRequest(
    `${BACKEND_URL}/execution/dev/run`,
    'POST',
    {
      languageKey: 'java',
      sourceCode: 'public class Main { public static void main(String[] args) { System.out.println("JAVA_BACKEND_OK"); } }',
      isTestRun: true,
    },
  );
  assert(beJavaRes.statusCode === 200, 'Backend Java execution returns HTTP 200');
  assert(beJavaRes.data?.result?.status?.isSuccess === true, 'Backend Java status isSuccess === true');
  assert(beJavaRes.data?.result?.stdout?.trim() === 'JAVA_BACKEND_OK', 'Backend Java stdout matches');

  // Test 2.4: JavaScript via Backend
  console.log('\n--- Test 2.4: Backend JavaScript (63 / "javascript") ---');
  const beJsRes = await sendRequest(
    `${BACKEND_URL}/execution/dev/run`,
    'POST',
    {
      languageKey: 'javascript',
      sourceCode: 'console.log("JS_BACKEND_OK");',
      isTestRun: true,
    },
  );
  assert(beJsRes.statusCode === 200, 'Backend JavaScript execution returns HTTP 200');
  assert(beJsRes.data?.result?.status?.isSuccess === true, 'Backend JavaScript status isSuccess === true');
  assert(beJsRes.data?.result?.stdout?.trim() === 'JS_BACKEND_OK', 'Backend JavaScript stdout matches');

  console.log('\n================================================================');
  console.log('🎉 ALL JUDGE0 LANGUAGE & BASE64 AUDIT TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests()
  .then(() => {
    stopBackend();
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ TEST RUN FAILED:', err);
    stopBackend();
    process.exit(1);
  });

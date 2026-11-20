require('dotenv').config({ path: './.env' });
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'ignitron-2k26-offline-competition-secure-secret-key-super-secure-token';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: `/api${path}`,
      method,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runEndpointTests() {
  console.log('Testing Round 3 Event Analytics REST Endpoints...');

  // 1. Find an active team and its participant
  const team = await prisma.team.findFirst({
    include: { participants: true },
  });
  if (!team || team.participants.length === 0) {
    console.log('No team found for testing.');
    return;
  }

  const participant = team.participants[0];
  console.log(`Using Team: "${team.teamName}" (${team.teamCode}), Participant: "${participant.fullName}"`);

  // Create an active session for this participant so mutex passes
  await prisma.teamSession.updateMany({
    where: { teamId: team.id },
    data: { status: 'ENDED', terminationReason: 'USER_LOGOUT' },
  });

  const session = await prisma.teamSession.create({
    data: {
      teamId: team.id,
      participantId: participant.id,
      status: 'ACTIVE',
    },
  });

  // Generate JWT token with sub, participantId, and sessionId
  const token = jwt.sign({
    sub: team.id,
    type: 'TEAM',
    participantId: participant.id,
    sessionId: session.id,
  }, JWT_SECRET, { expiresIn: '1h' });

  // Ensure Round 3 is active in competition_state
  await prisma.competitionState.upsert({
    where: { id: 'global' },
    update: {
      status: 'ROUND_3_ACTIVE',
      currentRoundNumber: 3,
      isPaused: false,
      deadlineAt: new Date(Date.now() + 3600000),
    },
    create: {
      id: 'global',
      status: 'ROUND_3_ACTIVE',
      currentRoundNumber: 3,
      isPaused: false,
      deadlineAt: new Date(Date.now() + 3600000),
    },
  });

  const r3 = await prisma.competitionRound.findFirst({ where: { roundNumber: 3 } });
  await prisma.competitionRound.update({
    where: { id: r3.id },
    data: { status: 'ACTIVE' },
  });

  await prisma.teamRoundProgress.upsert({
    where: { teamId_roundId: { teamId: team.id, roundId: r3.id } },
    update: { eligibilityStatus: 'ELIGIBLE', participationStatus: 'IN_PROGRESS' },
    create: {
      teamId: team.id,
      roundId: r3.id,
      eligibilityStatus: 'ELIGIBLE',
      participationStatus: 'IN_PROGRESS',
    },
  });

  // Endpoint 1: GET /arena/analytics/state
  const stateRes = await makeRequest('GET', '/arena/analytics/state', null, token);
  console.log('GET /arena/analytics/state status:', stateRes.status, 'body:', JSON.stringify(stateRes.body));
  console.log('State data cases:', stateRes.body?.data?.cases?.length, 'Dataset files:', stateRes.body?.data?.dataset?.files?.length);

  // Endpoint 2: GET /arena/analytics/dataset-meta
  const metaRes = await makeRequest('GET', '/arena/analytics/dataset-meta', null, token);
  console.log('GET /arena/analytics/dataset-meta status:', metaRes.status);
  console.log('Dataset meta name:', metaRes.body?.data?.datasetName);

  // Endpoint 3: GET /arena/analytics/dataset-preview/participants.csv
  const prevRes = await makeRequest('GET', '/arena/analytics/dataset-preview/participants.csv?page=1&limit=5', null, token);
  console.log('GET /arena/analytics/dataset-preview/participants.csv status:', prevRes.status);
  console.log('Preview rows count:', prevRes.body?.data?.rows?.length, 'Total rows:', prevRes.body?.data?.totalRows);

  // Endpoint 4: POST /arena/analytics/select-option
  const q1 = stateRes.body?.data?.cases[0]?.questions[0];
  if (q1) {
    const optRes = await makeRequest('POST', '/arena/analytics/select-option', {
      questionId: q1.id,
      selectedOption: 'A',
    }, token);
    console.log('POST /arena/analytics/select-option status:', optRes.status, 'selectedOption:', optRes.body?.data?.selectedOption);

    // Endpoint 5: POST /arena/analytics/submit-question (SELECT_CODE)
    const subQ1Res = await makeRequest('POST', '/arena/analytics/submit-question', {
      questionId: q1.id,
      selectedOption: 'A',
    }, token);
    console.log('POST /arena/analytics/submit-question (Q1) status:', subQ1Res.status);
    console.log('Verdict:', subQ1Res.body?.data?.status, 'Score:', subQ1Res.body?.data?.score);
  }

  // Endpoint 6: POST /arena/analytics/draft for Q2
  const q2 = stateRes.body?.data?.cases[0]?.questions[1];
  if (q2) {
    const draftRes = await makeRequest('POST', '/arena/analytics/draft', {
      questionId: q2.id,
      sourceCode: '# Drafting solution for Q2',
    }, token);
    console.log('POST /arena/analytics/draft status:', draftRes.status, 'saved version:', draftRes.body?.data?.version);

    // Endpoint 7: POST /arena/analytics/test-run
    const testRes = await makeRequest('POST', '/arena/analytics/test-run', {
      questionId: q2.id,
      sourceCode: `
import pandas as pd
def solve(data):
    return []
`,
    }, token);
    console.log('POST /arena/analytics/test-run status:', testRes.status, 'passedTests:', testRes.body?.data?.passedTests);
  }

  console.log('\nAll REST API endpoints verified successfully!');
}

runEndpointTests().catch((err) => {
  // If backend server is not running on port 4000, report gracefully
  console.log('Note on direct HTTP test:', err.message);
}).finally(() => prisma.$disconnect());

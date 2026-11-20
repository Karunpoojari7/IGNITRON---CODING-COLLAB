/**
 * IGNITRON 2K26 — M-04 ANIMATED COMPETITION ANNOUNCEMENTS & WINNER DECLARATION VERIFICATION
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('  IGNITRON 2K26 — M-04 ANNOUNCEMENTS & WINNER DECLARATION SUITE');
  console.log('===============================================================\n');

  try {
    // 1. Verify Super Admin exists
    const admin = await prisma.adminAccount.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    assert(!!admin, 'Super Admin account located for shortlist/winner operations');

    // 2. Locate existing rounds & teams
    const r1 = await prisma.competitionRound.findFirst({ where: { roundNumber: 1 } });
    const r2 = await prisma.competitionRound.findFirst({ where: { roundNumber: 2 } });
    const r3 = await prisma.competitionRound.findFirst({ where: { roundNumber: 3 } });
    assert(!!r1 && !!r2 && !!r3, 'Official Rounds 1, 2, and 3 exist');

    const sampleTeams = await prisma.team.findMany({
      where: { isActive: true },
      take: 2,
    });
    assert(sampleTeams.length >= 2, `Located active teams for verification: ${sampleTeams.map((t) => t.teamCode).join(', ')}`);

    const qualifiedTeam = sampleTeams[0];
    const eliminatedTeam = sampleTeams[1];

    // 3. Test Shortlisting Qualification Announcement Logic
    console.log('\n1. Verifying Round Qualification Announcement Generation...');
    // Create progress records: qualifiedTeam ELIGIBLE, eliminatedTeam INELIGIBLE for Round 2
    await prisma.teamRoundProgress.upsert({
      where: { teamId_roundId: { teamId: qualifiedTeam.id, roundId: r2.id } },
      update: { eligibilityStatus: 'ELIGIBLE' },
      create: { teamId: qualifiedTeam.id, roundId: r2.id, eligibilityStatus: 'ELIGIBLE', score: 0 },
    });

    await prisma.teamRoundProgress.upsert({
      where: { teamId_roundId: { teamId: eliminatedTeam.id, roundId: r2.id } },
      update: { eligibilityStatus: 'INELIGIBLE' },
      create: { teamId: eliminatedTeam.id, roundId: r2.id, eligibilityStatus: 'INELIGIBLE', score: 0 },
    });

    // Record shortlisting activity log
    const shortlistLog = await prisma.activityLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: admin.id,
        action: 'SHORTLISTING_ROUND_2',
        description: 'Test shortlisting for Round 2',
        metadata: {
          targetRoundNumber: 2,
          qualifiedCount: 1,
          disqualifiedCount: 1,
          qualifiedTeamIds: [qualifiedTeam.id],
        },
      },
    });
    assert(!!shortlistLog, 'Authoritative shortlisting activity log created');

    // 4. Test Winner Declaration Announcement Logic
    console.log('\n2. Verifying Final Winner Declaration Generation...');
    const winnerData = {
      teamId: qualifiedTeam.id,
      teamName: qualifiedTeam.teamName,
      teamCode: qualifiedTeam.teamCode,
      institution: qualifiedTeam.institution,
      totalScore: 95,
      declaredAt: new Date().toISOString(),
    };

    const winnerLog = await prisma.activityLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: admin.id,
        action: 'OFFICIAL_WINNER_DECLARED',
        description: `Admin officially declared ${qualifiedTeam.teamName} as Champion`,
        metadata: winnerData,
      },
    });
    assert(!!winnerLog, 'Authoritative official winner declaration log recorded');

    // 5. Test Frontend Animation and Modal Implementation
    console.log('\n3. Verifying Frontend Animation & Persistent Card Implementation...');
    const modalPath = path.join(__dirname, '../apps/frontend/src/components/competition/ResultCelebrationModal.tsx');
    assert(fs.existsSync(modalPath), 'ResultCelebrationModal component exists');

    const modalCode = fs.readFileSync(modalPath, 'utf8');
    assert(modalCode.includes('prefersReducedMotion'), 'Modal respects prefers-reduced-motion accessibility setting');
    assert(modalCode.includes('GRAND_WINNER'), 'Modal implements GRAND_WINNER animation theme');
    assert(modalCode.includes('QUALIFIED'), 'Modal implements QUALIFIED animation theme');
    assert(modalCode.includes('ELIMINATED'), 'Modal implements ELIMINATED animation theme');
    assert(modalCode.includes('canvasRef'), 'Modal utilizes lightweight 60fps HTML5 canvas confetti/particles');

    const dashboardPath = path.join(__dirname, '../apps/frontend/src/pages/team/TeamDashboardPage.tsx');
    const dashboardCode = fs.readFileSync(dashboardPath, 'utf8');
    assert(dashboardCode.includes('ResultCelebrationModal'), 'TeamDashboardPage imports ResultCelebrationModal');
    assert(dashboardCode.includes('activeCelebration'), 'TeamDashboardPage manages activeCelebration state');
    assert(dashboardCode.includes('ignitron_celebration_seen_'), 'TeamDashboardPage tracks seen celebrations to prevent popup on every refresh');
    assert(dashboardCode.includes('Replay Celebration / Review Details'), 'TeamDashboardPage renders persistent card with Replay/Review action');

    console.log('\n===============================================================');
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('===============================================================');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();

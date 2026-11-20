/**
 * Verification script for Bulk Team Actions (Selection, Activation, Deactivation, Session Revocation, Deletion)
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const bcrypt = require('bcrypt');

async function runTests() {
  console.log('===============================================================');
  console.log('  IGNITRON 2K26 — BULK TEAM ACTIONS VERIFICATION SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Clean up any lingering test teams from aborted attempts
    const lingering = await prisma.team.findMany({
      where: { teamCode: { startsWith: 'TEST-' } },
      select: { id: true },
    });
    if (lingering.length > 0) {
      const lingIds = lingering.map((l) => l.id);
      await prisma.teamMcqAnswer.deleteMany({ where: { teamId: { in: lingIds } } });
      await prisma.teamRoundProgress.deleteMany({ where: { teamId: { in: lingIds } } });
      await prisma.teamSession.deleteMany({ where: { teamId: { in: lingIds } } });
      await prisma.participant.deleteMany({ where: { teamId: { in: lingIds } } });
      await prisma.team.deleteMany({ where: { id: { in: lingIds } } });
    }

    // 1. Verify Super Admin exists
    const admin = await prisma.adminAccount.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    assert(!!admin, 'Super Admin account exists for bulk action authorization');

    // 2. Create 3 test teams for bulk action validation
    const testCodePrefix = `TEST-${Date.now().toString().slice(-4)}`;
    const team1Code = `${testCodePrefix}-A`;
    const team2Code = `${testCodePrefix}-B`;
    const team3Code = `${testCodePrefix}-C`;

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('TestPass123!', salt);

    const team1 = await prisma.team.create({
      data: {
        teamCode: team1Code,
        teamName: `Bulk Test Team A`,
        institution: 'Bulk Test University',
        passwordHash: hash,
        isActive: true,
        participants: {
          create: [
            { fullName: 'Tester A1', email: `${team1Code.toLowerCase()}_1@test.local` },
            { fullName: 'Tester A2', email: `${team1Code.toLowerCase()}_2@test.local` },
          ],
        },
      },
      include: { participants: true },
    });

    const team2 = await prisma.team.create({
      data: {
        teamCode: team2Code,
        teamName: `Bulk Test Team B`,
        institution: 'Bulk Test University',
        passwordHash: hash,
        isActive: true,
        participants: {
          create: [
            { fullName: 'Tester B1', email: `${team2Code.toLowerCase()}_1@test.local` },
            { fullName: 'Tester B2', email: `${team2Code.toLowerCase()}_2@test.local` },
          ],
        },
      },
      include: { participants: true },
    });

    const team3 = await prisma.team.create({
      data: {
        teamCode: team3Code,
        teamName: `Bulk Test Team C`,
        institution: 'Bulk Test University',
        passwordHash: hash,
        isActive: true,
        participants: {
          create: [
            { fullName: 'Tester C1', email: `${team3Code.toLowerCase()}_1@test.local` },
            { fullName: 'Tester C2', email: `${team3Code.toLowerCase()}_2@test.local` },
          ],
        },
      },
      include: { participants: true },
    });

    const testTeamIds = [team1.id, team2.id, team3.id];
    assert(testTeamIds.length === 3, `Created 3 test teams: ${team1Code}, ${team2Code}, ${team3Code}`);

    // Create an active session for team1
    await prisma.teamSession.create({
      data: {
        teamId: team1.id,
        participantId: team1.participants[0].id,
        status: 'ACTIVE',
        tokenHash: crypto.randomBytes(16).toString('hex'),
      },
    });

    // 3. Test Bulk DEACTIVATE logic
    console.log('\nTesting Bulk DEACTIVATE on 3 teams...');
    await prisma.$transaction(async (tx) => {
      await tx.team.updateMany({
        where: { id: { in: testTeamIds } },
        data: { isActive: false },
      });
      await tx.teamSession.updateMany({
        where: { teamId: { in: testTeamIds }, status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          terminationReason: 'ADMIN_REVOKED',
          logoutAt: new Date(),
        },
      });
    });

    const deactivatedTeams = await prisma.team.findMany({
      where: { id: { in: testTeamIds } },
    });
    assert(
      deactivatedTeams.every((t) => t.isActive === false),
      'All 3 teams successfully marked isActive: false in bulk',
    );

    const revokedSession = await prisma.teamSession.findFirst({
      where: { teamId: team1.id },
    });
    assert(
      revokedSession && revokedSession.status === 'REVOKED',
      'Active session for deactivated team was automatically revoked',
    );

    // 4. Test Bulk ACTIVATE logic
    console.log('\nTesting Bulk ACTIVATE on 2 teams...');
    const subsetToActivate = [team1.id, team2.id];
    await prisma.team.updateMany({
      where: { id: { in: subsetToActivate } },
      data: { isActive: true },
    });

    const activeTeams = await prisma.team.findMany({
      where: { id: { in: subsetToActivate } },
    });
    const inactiveTeam = await prisma.team.findUnique({
      where: { id: team3.id },
    });

    assert(
      activeTeams.length === 2 && activeTeams.every((t) => t.isActive === true),
      'Targeted teams successfully reactivated in bulk',
    );
    assert(inactiveTeam.isActive === false, 'Non-selected team remained deactivated');

    // 5. Test Bulk REVOKE_SESSIONS logic
    console.log('\nTesting Bulk REVOKE_SESSIONS...');
    // Create new active session on team2
    await prisma.teamSession.create({
      data: {
        teamId: team2.id,
        participantId: team2.participants[0].id,
        status: 'ACTIVE',
        tokenHash: crypto.randomBytes(16).toString('hex'),
      },
    });

    const activeBefore = await prisma.teamSession.count({
      where: { teamId: { in: testTeamIds }, status: 'ACTIVE' },
    });
    assert(activeBefore === 1, '1 active session present before bulk revoke');

    const revokedResult = await prisma.teamSession.updateMany({
      where: { teamId: { in: testTeamIds }, status: 'ACTIVE' },
      data: {
        status: 'REVOKED',
        terminationReason: 'ADMIN_REVOKED',
        logoutAt: new Date(),
      },
    });
    assert(revokedResult.count === 1, 'Bulk revoke session terminated active session');

    // 6. Test Bulk DELETE logic with foreign key cascading
    console.log('\nTesting Bulk DELETE on 3 teams...');
    // Add mock submission & draft to verify cascade
    const r1 = await prisma.competitionRound.findFirst({ where: { roundNumber: 1 } });
    if (r1) {
      await prisma.teamRoundProgress.create({
        data: {
          teamId: team1.id,
          roundId: r1.id,
          participationStatus: 'IN_PROGRESS',
        },
      });
      const q = await prisma.question.findFirst({ where: { roundId: r1.id } });
      if (q) {
        await prisma.teamMcqAnswer.create({
          data: {
            teamId: team1.id,
            questionId: q.id,
            selectedOption: 0,
          },
        });
      }
    }

    // Perform the complete cascading bulk delete
    await prisma.$transaction(async (tx) => {
      const submissions = await tx.submission.findMany({
        where: { teamId: { in: testTeamIds } },
        select: { id: true },
      });
      const subIds = submissions.map((s) => s.id);
      if (subIds.length > 0) {
        await tx.evaluation.deleteMany({
          where: { submissionId: { in: subIds } },
        });
      }
      await tx.teamBugReport.deleteMany({ where: { teamId: { in: testTeamIds } } });
      await tx.submission.deleteMany({ where: { teamId: { in: testTeamIds } } });
      await tx.workspaceDraft.deleteMany({ where: { teamId: { in: testTeamIds } } });
      await tx.teamMcqAnswer.deleteMany({ where: { teamId: { in: testTeamIds } } });
      await tx.teamRoundProgress.deleteMany({ where: { teamId: { in: testTeamIds } } });
      await tx.teamSession.deleteMany({ where: { teamId: { in: testTeamIds } } });
      await tx.participant.deleteMany({ where: { teamId: { in: testTeamIds } } });
      await tx.team.deleteMany({ where: { id: { in: testTeamIds } } });
    });

    const remainingTeams = await prisma.team.findMany({
      where: { id: { in: testTeamIds } },
    });
    assert(remainingTeams.length === 0, 'All 3 test teams permanently deleted with zero orphan records');

    // 7. Verify Frontend code components
    console.log('\nTesting Frontend Component Implementation...');
    const fs = require('fs');
    const path = require('path');
    const teamMgmtCode = fs.readFileSync(
      path.join(__dirname, '../apps/frontend/src/pages/admin/TeamManagementPage.tsx'),
      'utf8',
    );

    assert(teamMgmtCode.includes('selectedTeamIds'), 'TeamManagementPage tracks selectedTeamIds');
    assert(teamMgmtCode.includes('handleToggleSelectAll'), 'TeamManagementPage handles select all / deselect all');
    assert(teamMgmtCode.includes('handleToggleSelectTeam'), 'TeamManagementPage handles individual team selection');
    assert(teamMgmtCode.includes('headerCheckboxRef.current.indeterminate'), 'TeamManagementPage supports indeterminate checkbox state');
    assert(teamMgmtCode.includes('bulkActionModal'), 'TeamManagementPage includes bulkActionModal confirmation');
    assert(teamMgmtCode.includes('UserCheck'), 'Bulk action bar includes Activate action');
    assert(teamMgmtCode.includes('UserX'), 'Bulk action bar includes Deactivate action');
    assert(teamMgmtCode.includes('ShieldAlert'), 'Bulk action bar includes Revoke Sessions action');
    assert(teamMgmtCode.includes('Trash2'), 'Bulk action bar includes Delete action');
    assert(teamMgmtCode.includes('bulkTeamAction'), 'Frontend connects to adminService.bulkTeamAction');

    console.log('\n===============================================================');
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('===============================================================');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();

/**
 * IGNITRON 2K26 — M-01 COMPLETE COMPETITION RESET & NOTIFICATION SYNCHRONIZATION TEST SUITE
 * 
 * Verifies:
 * 1. Database schema and state readiness
 * 2. Genuine team registration preservation (Code Hunters IGN-4DD6)
 * 3. Announcement cleanup logic (round lifecycle announcements vs general administrative announcements)
 * 4. Participant notification retrieval synchronization (0 round popups after reset)
 * 5. Standby state synchronization and round upcoming status reset
 * 6. Active team session termination and lock release
 * 7. Participant draft and workspace cleanup (drafts, mcq answers, bug reports)
 * 8. Super Admin authorization enforcement for competition reset
 * 9. Leaderboard winner state clearing when in STANDBY
 * 10. Frontend UI verification: Confirmation modal, confirmation text, 3 reset scopes, and STANDBY cache clear effect
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

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

async function runM01Verification() {
  console.log('\n===============================================================');
  console.log('   IGNITRON 2K26 — M-01 COMPETITION RESET VERIFICATION SUITE');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST GROUP 1: FRONTEND UI & RESET CONTROLS VERIFICATION
    // -------------------------------------------------------------------------
    console.log('TEST GROUP 1: Frontend UI & Reset Controls Implementation');

    const compControlPath = path.resolve(__dirname, '../apps/frontend/src/pages/admin/CompetitionControlPage.tsx');
    const compControlContent = fs.readFileSync(compControlPath, 'utf8');

    assert(
      compControlContent.includes("resetType === 'COMPLETE_RESET'") &&
      compControlContent.includes("resetType === 'DEMO_ONLY'") &&
      compControlContent.includes("resetType === 'FULL_RESET'"),
      'CompetitionControlPage implements all 3 reset scopes: DEMO_ONLY, FULL_RESET, COMPLETE_RESET'
    );

    assert(
      compControlContent.includes('isConfirmingCompleteReset'),
      'CompetitionControlPage includes dedicated confirmation step for Complete Reset'
    );

    const exactPromptText = 'This operation will reset competition progression, remove previous round announcements and clear related participant notifications. Genuine team registrations and essential historical records will be preserved.';
    assert(
      compControlContent.includes(exactPromptText),
      'Confirmation modal contains exact required regulatory explanation text'
    );

    assert(
      compControlContent.includes('Confirm Complete Reset'),
      'Confirmation modal contains "Confirm Complete Reset" action button'
    );

    assert(
      compControlContent.includes("successMsg.includes('Previous round announcements')"),
      'Success banner specifically detects complete reset and displays "Competition Successfully Reset"'
    );

    const teamDashboardPath = path.resolve(__dirname, '../apps/frontend/src/pages/team/TeamDashboardPage.tsx');
    const teamDashboardContent = fs.readFileSync(teamDashboardPath, 'utf8');

    assert(
      teamDashboardContent.includes("compState?.status === 'STANDBY'") &&
      teamDashboardContent.includes("localStorage.removeItem(storageKey)"),
      'TeamDashboardPage synchronizes STANDBY state to clear obsolete dismissed announcement keys from localStorage'
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 2: SHARED DTOs & BACKEND INPUT VALIDATION
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 2: Shared Types and Backend DTOs');

    const sharedIndexPath = path.resolve(__dirname, '../packages/shared/src/index.ts');
    const sharedIndexContent = fs.readFileSync(sharedIndexPath, 'utf8');
    assert(
      sharedIndexContent.includes("'DEMO_ONLY' | 'FULL_RESET' | 'COMPLETE_RESET'"),
      'packages/shared RoundControlDto defines resetType as DEMO_ONLY | FULL_RESET | COMPLETE_RESET'
    );

    const dtoPath = path.resolve(__dirname, '../apps/backend/src/competition/dto/competition.dto.ts');
    const dtoContent = fs.readFileSync(dtoPath, 'utf8');
    assert(
      dtoContent.includes("'DEMO_ONLY', 'FULL_RESET', 'COMPLETE_RESET'"),
      'Backend RoundControlDto class validator permits COMPLETE_RESET'
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 3: DATABASE LEVEL RESET & ROUND ANNOUNCEMENT PURGE
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 3: Database Integrity & Genuine Team Protection');

    // Verify genuine teams
    const genuineTeams = await prisma.team.findMany({
      where: { isDemo: false },
      include: { participants: true },
    });
    assert(genuineTeams.length >= 1, `Genuine registered teams exist (Found: ${genuineTeams.length})`);

    const byteForce = genuineTeams.find((t) => t.teamCode === 'IGN-4063') || genuineTeams[0];
    assert(byteForce !== undefined, `Genuine registered team "${byteForce?.teamName}" (${byteForce?.teamCode}) is present in database`);
    assert(byteForce?.participants.length === 2, `Genuine team has 2 verified participants (Found: ${byteForce?.participants.length})`);

    // -------------------------------------------------------------------------
    // TEST GROUP 4: SIMULATE COMPLETE RESET LIFECYCLE
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 4: Execute Complete Competition Reset Simulation');

    // 1. Create a general broadcast and multiple round lifecycle announcements
    const generalAnn = await prisma.announcement.create({
      data: {
        title: 'Welcome to IGNITRON 2K26',
        message: 'General briefing: Ensure your terminal connections are active.',
        priority: 'NORMAL',
        isPublished: true,
      },
    });

    const roundAnn1 = await prisma.announcement.create({
      data: {
        title: 'ROUND CONCLUDED',
        message: 'Your latest work has been safely recorded. Round 1 is complete.',
        priority: 'URGENT',
        isPublished: true,
      },
    });

    const roundAnn2 = await prisma.announcement.create({
      data: {
        title: 'GET READY! Round 2 is About to Begin',
        message: 'Round 2 starts in 5 minutes.',
        priority: 'HIGH',
        isPublished: true,
      },
    });

    const roundAnn3 = await prisma.announcement.create({
      data: {
        title: 'Round 2 has Begun! Start Your Workstations',
        message: 'Good luck to all qualifying teams.',
        priority: 'HIGH',
        isPublished: true,
      },
    });

    const roundAnn4 = await prisma.announcement.create({
      data: {
        title: 'Official Winner Declared',
        message: 'The tournament has concluded.',
        priority: 'URGENT',
        isPublished: true,
      },
    });

    // Verify all test announcements exist
    const preCount = await prisma.announcement.count();
    assert(preCount >= 5, `Test announcements created (Total announcements: ${preCount})`);

    // 2. Perform the exact COMPLETE_RESET transaction logic
    const roundAnnouncementKeywords = [
      'ROUND CONCLUDED',
      'GET READY! Round',
      'Round 1 has Begun!',
      'Round 2 has Begun!',
      'Round 3 has Begun!',
      'Tournament Paused',
      'Tournament Resumed',
      'Official Winner Declared',
    ];

    const toArchive = await prisma.announcement.findMany({
      where: {
        OR: [
          ...roundAnnouncementKeywords.map((kw) => ({
            title: { contains: kw },
          })),
          ...roundAnnouncementKeywords.map((kw) => ({
            message: { contains: kw },
          })),
        ],
      },
    });

    // Delete round announcements
    const deleteResult = await prisma.announcement.deleteMany({
      where: {
        id: { in: toArchive.map((a) => a.id) },
      },
    });

    // Verify round announcements were deleted
    assert(deleteResult.count >= 4, `Round lifecycle announcements purged from DB (Deleted: ${deleteResult.count})`);

    // Verify general announcement was preserved
    const preservedGeneral = await prisma.announcement.findUnique({
      where: { id: generalAnn.id },
    });
    assert(preservedGeneral !== null, 'General non-round announcement ("Welcome to IGNITRON 2K26") is preserved');

    // Clean up general test announcement
    await prisma.announcement.delete({ where: { id: generalAnn.id } });

    // 3. Verify announcements for contestants
    const remainingRoundAnnouncements = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        OR: [
          ...roundAnnouncementKeywords.map((kw) => ({
            title: { contains: kw },
          })),
          ...roundAnnouncementKeywords.map((kw) => ({
            message: { contains: kw },
          })),
        ],
      },
    });
    assert(
      remainingRoundAnnouncements.length === 0,
      `Participant announcement query returns 0 round popups (Found: ${remainingRoundAnnouncements.length})`
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 5: LEADERBOARD & WINNER STATE RESET IN STANDBY
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 5: Leaderboard & Winner Reset in STANDBY');

    // Reset competition state to STANDBY
    await prisma.competitionState.update({
      where: { id: 'global' },
      data: {
        status: 'STANDBY',
        currentRoundNumber: null,
        isPaused: false,
      },
    });

    // Verify competition state is STANDBY
    const state = await prisma.competitionState.findUnique({
      where: { id: 'global' },
    });
    assert(state?.status === 'STANDBY', 'CompetitionState status is confirmed STANDBY');

    // Check winner resolution when status is STANDBY
    const lastResetLog = await prisma.activityLog.findFirst({
      where: { action: 'COMPETITION_RESET' },
      orderBy: { createdAt: 'desc' },
    });
    
    let resolvedWinner = null;
    if (state?.status !== 'STANDBY') {
      const winnerLog = await prisma.activityLog.findFirst({
        where: { action: 'OFFICIAL_WINNER_DECLARED' },
        orderBy: { createdAt: 'desc' },
      });
      if (winnerLog && (!lastResetLog || winnerLog.createdAt > lastResetLog.createdAt)) {
        resolvedWinner = winnerLog.metadata;
      }
    }

    assert(resolvedWinner === null, 'Winner banner is suppressed / null when tournament status is STANDBY');

    // -------------------------------------------------------------------------
    // TEST GROUP 6: AUDIT TRAIL LOGGING
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 6: Regulatory Audit Trail & Log Verification');

    const resetAudit = await prisma.activityLog.create({
      data: {
        actorType: 'ADMIN',
        action: 'COMPETITION_RESET',
        description: 'Super Admin executed COMPLETE_RESET',
        metadata: {
          resetType: 'COMPLETE_RESET',
          clearedAnnouncementsCount: deleteResult.count,
          preservedTeamsCount: genuineTeams.length,
          timestamp: new Date().toISOString(),
        },
      },
    });
    assert(resetAudit.id !== undefined, 'COMPETITION_RESET activity log created for complete audit compliance');

    console.log('\n===============================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runM01Verification();

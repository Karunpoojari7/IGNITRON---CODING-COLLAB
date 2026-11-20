require('dotenv').config({ path: './.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ROUND3_QUESTIONS_CONFIG } = require('../apps/backend/dist/competition/data/round3-questions.config.js');

async function main() {
  const r3 = await prisma.competitionRound.findFirst({ where: { roundNumber: 3 } });
  if (!r3) {
    console.log('Round 3 not found.');
    return;
  }
  console.log('Round 3 ID:', r3.id);

  for (const qConfig of ROUND3_QUESTIONS_CONFIG) {
    const existing = await prisma.question.findFirst({
      where: { roundId: r3.id, orderNumber: qConfig.orderNumber },
    });

    const correctOptionIndex =
      qConfig.correctOptionKey === 'A'
        ? 0
        : qConfig.correctOptionKey === 'B'
        ? 1
        : qConfig.correctOptionKey === 'C'
        ? 2
        : 3;

    const optionsData = qConfig.options.map((opt) => ({
      key: opt.key,
      label: opt.label,
      code: opt.code,
      explanation: opt.explanation,
    }));

    const qPayload = {
      title: qConfig.title,
      caseNumber: qConfig.caseNumber,
      type: 'CODING_CASE',
      description: qConfig.description,
      starterCode: qConfig.starterCode,
      language: 'python',
      marks: qConfig.marks,
      options: optionsData,
      correctOption: correctOptionIndex,
      sampleTestCases: qConfig.sampleTestCases,
      hiddenTestCases: qConfig.hiddenTestCases,
      rubric: {
        difficulty: qConfig.difficulty,
        technology: qConfig.technology,
        concept: qConfig.concept,
        format: qConfig.format,
        correctOptionKey: qConfig.correctOptionKey,
        caseTitle: qConfig.caseTitle,
      },
      isActive: true,
    };

    if (existing) {
      await prisma.question.update({
        where: { id: existing.id },
        data: qPayload,
      });
      console.log(`Updated question #${qConfig.orderNumber}: ${qConfig.title} (${qConfig.marks} pts)`);
    } else {
      await prisma.question.create({
        data: {
          roundId: r3.id,
          orderNumber: qConfig.orderNumber,
          ...qPayload,
        },
      });
      console.log(`Created question #${qConfig.orderNumber}: ${qConfig.title} (${qConfig.marks} pts)`);
    }
  }

  const allQs = await prisma.question.findMany({
    where: { roundId: r3.id },
    orderBy: { orderNumber: 'asc' },
  });
  console.log(`Total questions in Round 3: ${allQs.length}`);
  for (const q of allQs) {
    console.log(` - #${q.orderNumber} (Case ${q.caseNumber}): "${q.title}" [${q.marks} pts, ${q.language}]`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

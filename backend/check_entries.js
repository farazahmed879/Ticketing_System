const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const entries = await prisma.timesheetEntry.findMany({
    select: { id: true, status: true, isManagerApproved: true, isHrApproved: true }
  });
  console.log('All entries:', entries);
}

main().finally(() => prisma.$disconnect());

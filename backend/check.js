const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hrUser = await prisma.user.findFirst({
    where: { role: { name: 'HR' } },
    include: { role: true }
  });
  console.log('HR User:', hrUser);

  const entries = await prisma.timesheetEntry.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Recent entries:', entries);
}

main().finally(() => prisma.$disconnect());

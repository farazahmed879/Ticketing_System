const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Scanning tickets with groupId set but no projectId...');

  const tickets = await prisma.ticket.findMany({
    where: { groupId: { not: null }, projectId: null },
    select: { id: true, uid: true, groupId: true },
  });

  if (tickets.length === 0) {
    console.log('No tickets to migrate. Done.');
    return;
  }

  const projectIds = new Set(
    (await prisma.project.findMany({ select: { id: true } })).map((p) => p.id),
  );

  let migrated = 0;
  let skipped = 0;
  for (const t of tickets) {
    if (t.groupId && projectIds.has(t.groupId)) {
      await prisma.ticket.update({
        where: { id: t.id },
        data: { projectId: t.groupId, groupId: null },
      });
      migrated++;
    } else {
      skipped++;
    }
  }

  console.log(
    `Migrated ${migrated} of ${tickets.length} candidate tickets. Skipped ${skipped} (their groupId did not match any Project).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const totalTickets = await prisma.ticket.count({ where: { deleted: false } });
  const withProject = await prisma.ticket.count({
    where: { deleted: false, projectId: { not: null } },
  });
  const withGroup = await prisma.ticket.count({
    where: { deleted: false, groupId: { not: null } },
  });
  const withNeither = await prisma.ticket.count({
    where: { deleted: false, projectId: null, groupId: null },
  });

  console.log('=== Ticket linkage summary ===');
  console.log(`Total non-deleted tickets : ${totalTickets}`);
  console.log(`  with projectId set      : ${withProject}`);
  console.log(`  with groupId set        : ${withGroup}`);
  console.log(`  with neither            : ${withNeither}`);
  console.log('');

  const projects = await prisma.project.findMany({
    where: { deleted: false },
    select: { id: true, name: true, _count: { select: { tickets: true } } },
  });

  console.log('=== Projects and ticket counts ===');
  if (projects.length === 0) {
    console.log('(no projects in the database)');
  } else {
    projects.forEach((p) => {
      console.log(`  ${p.name.padEnd(40)} | id=${p.id} | tickets=${p._count.tickets}`);
    });
  }
  console.log('');

  console.log('=== Last 5 tickets (newest first) ===');
  const recent = await prisma.ticket.findMany({
    where: { deleted: false },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      uid: true,
      subject: true,
      groupId: true,
      projectId: true,
      project: { select: { id: true, name: true } },
    },
  });
  recent.forEach((t) => {
    console.log(
      `  #${t.uid} ${t.subject.padEnd(35)} groupId=${t.groupId ?? 'null'} projectId=${t.projectId ?? 'null'} projectName=${t.project?.name ?? '-'}`,
    );
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// "Returned" == Failed status id (see src/utils/constants.ts TICKET_STATUSES).
const FAILED_STATUS_ID = '69e7608bc5508c8356cd4e0f';

async function main() {
  console.log('Backfilling wasFailed flag on existing tickets...');

  // 1) Tickets currently in the Returned/Failed status. (No wasFailed filter:
  // on MongoDB the field is physically absent on legacy docs and a
  // `{ not: true }` filter does not match missing fields.)
  const currentlyFailed = await prisma.ticket.findMany({
    where: { statusId: FAILED_STATUS_ID },
    select: { id: true },
  });

  // 2) Tickets that were moved to "Returned" at some point in their history.
  const failedHistory = await prisma.history.findMany({
    where: {
      action: 'STATUS_CHANGED',
      description: { contains: 'to "Returned"' },
    },
    select: { ticketId: true },
  });

  const idsToFlag = new Set([
    ...currentlyFailed.map((t) => t.id),
    ...failedHistory.map((h) => h.ticketId),
  ]);

  if (idsToFlag.size === 0) {
    console.log('No tickets needed the wasFailed flag. Done.');
    return;
  }

  const result = await prisma.ticket.updateMany({
    where: { id: { in: [...idsToFlag] } },
    data: { wasFailed: true },
  });

  console.log(`Flagged ${result.count} ticket(s) as wasFailed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

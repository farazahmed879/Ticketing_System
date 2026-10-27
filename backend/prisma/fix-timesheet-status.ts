/// <reference types="node" />
/**
 * One-off migration: normalize TimesheetEntry.status to UPPERCASE
 * ("Pending" → "PENDING", "Approved" → "APPROVED", "Rejected" → "REJECTED").
 *
 * Older code wrote title-case statuses (reusing the ticket StatusName
 * constants), while the schema/frontend expect uppercase. New writes are
 * uppercase; this fixes the rows that already exist.
 *
 * Run with: npx ts-node prisma/fix-timesheet-status.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  for (const status of ["PENDING", "APPROVED", "REJECTED"]) {
    const result = await prisma.timesheetEntry.updateMany({
      where: {
        status: { equals: status, mode: "insensitive" },
        NOT: { status },
      },
      data: { status },
    });
    console.log(`${status}: normalized ${result.count} entr(y|ies)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

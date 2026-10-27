/// <reference types="node" />
/*
 * Production fix: guarantee the Type collection contains a document for each
 * canonical ticket type with its FIXED ObjectId (the ids the frontend sends on
 * ticket creation). Ticket.type is a real relation (connect), so a ticket can
 * only be created when a Type with the sent id exists.
 *
 * Safe + idempotent:
 *  - If the canonical id already exists  -> just ensure the name, done.
 *  - If a same-name Type exists with a DIFFERENT id (the usual prod state, where
 *    the old seed auto-generated ids) -> re-point every ticket from the old id
 *    to the canonical id, delete the stale Type (frees the unique name), then
 *    create the canonical Type.
 *  - If neither exists -> create the canonical Type.
 *
 * Run with:  npx ts-node prisma/fix-type-ids.ts   (or: npm run fix:type-ids)
 */
import { PrismaClient } from "@prisma/client";
import { TICKET_TYPES } from "../src/utils/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Fixing ticket Type ids...");

  for (const t of TICKET_TYPES) {
    const byId = await prisma.type.findUnique({ where: { id: t.id } });
    if (byId) {
      if (byId.name !== t.name) {
        await prisma.type.update({
          where: { id: t.id },
          data: { name: t.name },
        });
      }
      console.log(`  ✅ "${t.name}" already has canonical id ${t.id}`);
      continue;
    }

    // No doc with the canonical id. Is the unique name held by a stale doc?
    const byName = await prisma.type.findFirst({ where: { name: t.name } });
    if (byName) {
      // Move any tickets off the stale id, then remove the stale doc so the
      // unique `name` is free for the canonical document.
      const moved = await prisma.ticket.updateMany({
        where: { typeId: byName.id },
        data: { typeId: t.id },
      });
      await prisma.type.delete({ where: { id: byName.id } });
      console.log(
        `  ↪︎ "${t.name}": re-pointed ${moved.count} ticket(s) ${byName.id} → ${t.id}, removed stale Type`,
      );
    }

    await prisma.type.create({ data: { id: t.id, name: t.name } });
    console.log(`  ✅ Created "${t.name}" with canonical id ${t.id}`);
  }

  console.log("🎉 Type ids fixed.");
}

main()
  .catch((e) => {
    console.error("❌ fix-type-ids failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

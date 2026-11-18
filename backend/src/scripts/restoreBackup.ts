/**
 * Restore a database backup made by services/dbBackupService.ts.
 *
 *   DATABASE_URL=... npx ts-node src/scripts/restoreBackup.ts <backup.ndjson.gz> [--drop]
 *   (in the container: node dist/scripts/restoreBackup.js <file> [--drop])
 *
 * Without --drop it refuses to touch a collection that already has data.
 * With --drop every collection in the backup is emptied first. Point
 * DATABASE_URL at the database you mean to overwrite.
 */
import fs from "fs";
import zlib from "zlib";
import readline from "readline";
import dotenv from "dotenv";
dotenv.config();
import { basePrisma as prisma } from "../prisma";

const BATCH = 200;
// Mongo rejects commands over 16MB, so also cap each insert by size.
const BATCH_BYTES = 8 * 1024 * 1024;

async function countDocs(name: string): Promise<number> {
  const res: any = await prisma.$runCommandRaw({ count: name });
  return Number(res.n ?? 0);
}

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  const drop = flags.includes("--drop");
  if (!file || !fs.existsSync(file)) {
    console.error("Usage: restoreBackup <backup.ndjson.gz> [--drop]");
    process.exit(1);
  }

  const lines = readline.createInterface({
    input: fs.createReadStream(file).pipe(zlib.createGunzip()),
    crlfDelay: Infinity,
  });

  let meta: any = null;
  const pending = new Map<string, any[]>();
  const pendingBytes = new Map<string, number>();
  const restored: Record<string, number> = {};

  const flush = async (name: string) => {
    const docs = pending.get(name);
    if (!docs || docs.length === 0) return;
    await prisma.$runCommandRaw({ insert: name, documents: docs, ordered: true });
    restored[name] = (restored[name] || 0) + docs.length;
    pending.set(name, []);
    pendingBytes.set(name, 0);
  };

  for await (const line of lines) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);

    if (!meta) {
      if (row.type !== "meta" || row.version !== 1) {
        throw new Error("Not a recognised backup file (missing meta header)");
      }
      meta = row;
      console.log(`Backup created at ${meta.createdAt}, ${meta.collections.length} collection(s).`);
      for (const name of meta.collections as string[]) {
        const existing = await countDocs(name);
        if (existing > 0 && !drop) {
          throw new Error(`Collection "${name}" already has ${existing} document(s). Re-run with --drop to overwrite.`);
        }
        if (drop) await prisma.$runCommandRaw({ delete: name, deletes: [{ q: {}, limit: 0 }] });
      }
      continue;
    }

    // Flush first if this document would push the batch over the size cap.
    if ((pendingBytes.get(row.c) || 0) + line.length > BATCH_BYTES) await flush(row.c);
    const list = pending.get(row.c) || [];
    list.push(row.d);
    pending.set(row.c, list);
    pendingBytes.set(row.c, (pendingBytes.get(row.c) || 0) + line.length);
    if (list.length >= BATCH) await flush(row.c);
  }
  for (const name of pending.keys()) await flush(name);

  console.log("Restored:", restored);
}

main()
  .catch((err) => {
    console.error("Restore failed:", err.message || err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

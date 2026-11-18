/**
 * Database backups to Google Drive.
 *
 * A backup is a gzipped NDJSON file:
 *   line 1:   {"type":"meta","version":1,"createdAt":...,"collections":{name:count}}
 *   then:     {"c":"<collection>","d":<document as MongoDB Extended JSON>}
 * Extended JSON keeps ObjectIds/dates intact, so the file restores exactly
 * (see src/scripts/restoreBackup.ts).
 *
 * Collections are read in _id order, page by page, and streamed straight to a
 * temp file, so memory stays flat even with large attachment documents. The
 * file is then uploaded to Drive as a PRIVATE file and the temp file removed.
 *
 * Runs weekly (Sunday 02:00 PKT) and on demand from Settings (admin/manager).
 * Only one backup runs at a time.
 */
import fs from "fs";
import os from "os";
import path from "path";
import zlib from "zlib";
import { once } from "events";
import { basePrisma as prisma } from "../prisma";
import {
  uploadPrivateFileToDrive,
  deleteFromGoogleDrive,
  isDriveBackupConfigured,
} from "./googleDriveService";

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, no DST
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SCHEDULE_DAY_PKT = 0; // Sunday
const SCHEDULE_HOUR_PKT = 2; // 02:00
const PAGE_SIZE = 500;

/** How many backup files to keep in Drive (older ones are deleted). */
const retentionCount = () => {
  const n = parseInt(process.env.BACKUP_RETENTION_COUNT || "", 10);
  return Number.isFinite(n) && n > 0 ? n : 8;
};

export class BackupInProgressError extends Error {
  constructor() {
    super("A backup is already running");
  }
}

let running = false;

/** Milliseconds from `now` until the next Sunday 02:00 PKT. */
export function msUntilNextBackup(now: Date = new Date()): number {
  const pktNow = new Date(now.getTime() + PKT_OFFSET_MS);
  const target = new Date(pktNow);
  target.setUTCHours(SCHEDULE_HOUR_PKT, 0, 0, 0);
  const daysAhead = (SCHEDULE_DAY_PKT - pktNow.getUTCDay() + 7) % 7;
  target.setTime(target.getTime() + daysAhead * ONE_DAY_MS);
  if (target.getTime() <= pktNow.getTime()) {
    target.setTime(target.getTime() + 7 * ONE_DAY_MS);
  }
  return target.getTime() - pktNow.getTime();
}

function backupFileName(now: Date): string {
  // backup-2026-11-22_02-00-00-PKT.ndjson.gz
  const pkt = new Date(now.getTime() + PKT_OFFSET_MS).toISOString();
  return `backup-${pkt.slice(0, 10)}_${pkt.slice(11, 19).replace(/:/g, "-")}-PKT.ndjson.gz`;
}

async function listCollectionNames(): Promise<string[]> {
  const res: any = await prisma.$runCommandRaw({
    listCollections: 1,
    nameOnly: true,
    filter: { type: "collection" },
  });
  return (res.cursor?.firstBatch ?? [])
    .map((c: any) => c.name as string)
    .filter((n: string) => !n.startsWith("system."))
    .sort();
}

/** Write one line to the gzip stream, honouring backpressure. */
async function writeLine(out: zlib.Gzip, obj: unknown) {
  if (!out.write(JSON.stringify(obj) + "\n")) {
    await once(out, "drain");
  }
}

/** Dump the whole database to `filePath`; returns per-collection counts. */
export async function dumpToFile(filePath: string): Promise<Record<string, number>> {
  const names = await listCollectionNames();
  const gzip = zlib.createGzip({ level: 6 });
  const file = fs.createWriteStream(filePath);
  gzip.pipe(file);
  const finished = once(file, "finish");

  const counts: Record<string, number> = {};
  try {
    // Header first (counts are filled in from the data lines on restore).
    await writeLine(gzip, {
      type: "meta",
      version: 1,
      createdAt: new Date().toISOString(),
      collections: names,
    });

    for (const name of names) {
      let lastId: unknown = undefined;
      let count = 0;
      for (;;) {
        const res: any = await prisma.$runCommandRaw({
          find: name,
          filter: lastId === undefined ? {} : { _id: { $gt: lastId as any } },
          sort: { _id: 1 },
          limit: PAGE_SIZE,
          batchSize: PAGE_SIZE,
          singleBatch: true,
        });
        const docs: any[] = res.cursor?.firstBatch ?? [];
        if (docs.length === 0) break;
        for (const d of docs) {
          await writeLine(gzip, { c: name, d });
        }
        count += docs.length;
        lastId = docs[docs.length - 1]._id;
        // A short page can also mean the 16MB reply cap was hit, so only
        // stop once a page comes back empty.
      }
      counts[name] = count;
    }
  } finally {
    gzip.end();
    await finished;
  }
  return counts;
}

/** Delete Drive files of older successful backups beyond the retention count. */
async function applyRetention() {
  const keep = retentionCount();
  const old = await prisma.dbBackup.findMany({
    where: { status: "SUCCESS", fileDeleted: false, driveFileId: { not: null } },
    orderBy: { startedAt: "desc" },
    skip: keep,
    select: { id: true, driveFileId: true },
  });
  for (const b of old) {
    try {
      await deleteFromGoogleDrive(b.driveFileId!);
    } catch (err: any) {
      // Already gone from Drive is fine; anything else, try again next time.
      if (err?.code !== 404) {
        console.error(`[DbBackup] Could not delete old backup ${b.id} from Drive:`, err?.message || err);
        continue;
      }
    }
    await prisma.dbBackup.update({ where: { id: b.id }, data: { fileDeleted: true } });
  }
}

async function runBackup(backupId: string, fileName: string) {
  const tmpPath = path.join(os.tmpdir(), `${backupId}-${fileName}`);
  try {
    const collections = await dumpToFile(tmpPath);
    const sizeBytes = fs.statSync(tmpPath).size;
    const driveFileId = await uploadPrivateFileToDrive(tmpPath, fileName, "application/gzip");
    const documentCount = Object.values(collections).reduce((a, b) => a + b, 0);

    await prisma.dbBackup.update({
      where: { id: backupId },
      data: {
        status: "SUCCESS",
        driveFileId,
        sizeBytes,
        documentCount,
        collections,
        completedAt: new Date(),
      },
    });
    console.log(`[DbBackup] ${fileName}: ${documentCount} docs, ${sizeBytes} bytes uploaded.`);
    await applyRetention();
  } catch (err: any) {
    console.error(`[DbBackup] ${fileName} failed:`, err);
    await prisma.dbBackup
      .update({
        where: { id: backupId },
        data: {
          status: "FAILED",
          error: String(err?.message || err).slice(0, 500),
          completedAt: new Date(),
        },
      })
      .catch(() => {});
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
}

/**
 * Start a backup in the background and return its history row right away.
 * Throws BackupInProgressError if one is already running.
 */
export async function startBackup(
  trigger: "SCHEDULED" | "MANUAL",
  by?: { id: string; name: string },
) {
  if (running) throw new BackupInProgressError();
  running = true;

  try {
    const now = new Date();
    const fileName = backupFileName(now);
    const configured = isDriveBackupConfigured();
    const record = await prisma.dbBackup.create({
      data: {
        fileName,
        trigger,
        triggeredById: by?.id,
        triggeredByName: by?.name,
        ...(configured
          ? {}
          : {
              status: "FAILED",
              error: "Google Drive is not configured on the server",
              completedAt: now,
            }),
      },
    });
    if (!configured) {
      running = false;
      return record;
    }

    void runBackup(record.id, fileName).finally(() => {
      running = false;
    });
    return record;
  } catch (err) {
    running = false;
    throw err;
  }
}

export async function listBackups(page: number, limit: number) {
  const [items, total] = await Promise.all([
    prisma.dbBackup.findMany({
      orderBy: { startedAt: "desc" },
      skip: page * limit,
      take: limit,
    }),
    prisma.dbBackup.count(),
  ]);
  return { items, total, nextScheduledAt: new Date(Date.now() + msUntilNextBackup()) };
}

/** Call once at server startup. */
export function startDbBackupScheduler() {
  // A backup still marked RUNNING was cut off by a restart/crash.
  prisma.dbBackup
    .updateMany({
      where: { status: "RUNNING" },
      data: { status: "FAILED", error: "Interrupted by server restart", completedAt: new Date() },
    })
    .catch((err) => console.error("[DbBackup] Could not clean up interrupted backups:", err));

  const scheduleNext = () => {
    setTimeout(async () => {
      try {
        await startBackup("SCHEDULED");
      } catch (err) {
        console.error("[DbBackup] Scheduled backup not started:", (err as Error).message);
      }
      scheduleNext();
    }, msUntilNextBackup());
  };
  scheduleNext();

  console.log(
    `[DbBackup] Scheduler started – next backup in ${Math.round(msUntilNextBackup() / 3600000)}h (weekly, Sunday 02:00 PKT).`,
  );
}

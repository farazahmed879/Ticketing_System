import dotenv from "dotenv";
import path from "path";
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env";
const envPath = path.resolve(__dirname, `../${envFile}`);
dotenv.config({ path: envPath });
dotenv.config(); // fallback

import prisma from "./prisma";
import {
  startResumeJobWorker,
  drainResumeJobWorker,
} from "./services/resumeJobWorker";

/**
 * Background worker entrypoint — a SEPARATE process from the web server
 * (deployed as its own service; start with `npm run worker`).
 *
 * Why a separate process: OS-level isolation. If a resume blows up memory or
 * pegs the CPU, only this process dies/stalls and gets restarted — the web
 * server keeps serving client tickets untouched. When running this, set
 * DISABLE_IN_PROCESS_WORKER=true on the web server.
 *
 * The polling/leasing loop itself lives in services/resumeJobWorker.ts (shared
 * with the in-process mode) — this file only adds process lifecycle:
 * graceful shutdown on SIGTERM/SIGINT stops leasing, lets in-flight jobs
 * finish (up to 60s), then exits, so deploys don't strand "processing" jobs.
 */

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] ${signal} received — finishing in-flight jobs...`);
  const left = await drainResumeJobWorker(60_000);
  if (left > 0) {
    console.warn(`[worker] ${left} job(s) still running; they'll be retried after their lease expires`);
  }
  await prisma.$disconnect().catch(() => {});
  console.log("[worker] shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

startResumeJobWorker({ dedicated: true });

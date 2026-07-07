import "dotenv/config";
import prisma from "./prisma";
import { resumeJobRepository } from "./repositories/resumeJob.repository";
import { processResumeJob } from "./services/resumeJobProcessor";

/**
 * Background worker entrypoint — a SEPARATE process from the web server
 * (deployed as its own service; start with `npm run worker`).
 *
 * Why a separate process: OS-level isolation. If a resume blows up memory or
 * pegs the CPU, only this process dies/stalls and gets restarted — the web
 * server keeps serving client tickets untouched. That's the blast-radius
 * protection the async design exists for.
 *
 * Mechanics:
 * - Polls the ResumeJob queue (Mongo) every POLL_MS, leasing atomically.
 * - Bounded concurrency (CONCURRENCY slots) so a big batch drains steadily
 *   with flat memory instead of all at once.
 * - Graceful shutdown: on SIGTERM/SIGINT stop leasing, let in-flight jobs
 *   finish (up to 60s), then exit — deploys don't strand "processing" jobs.
 */

const POLL_MS = 3000;
const CONCURRENCY = 2;

let shuttingDown = false;
let inFlight = 0;

type LeasedJob = NonNullable<
  Awaited<ReturnType<typeof resumeJobRepository.leaseNext>>
>;

async function handleJob(job: LeasedJob): Promise<void> {
  const label = `${job.originalName} (job ${job.id}, attempt ${job.attempts})`;
  console.log(`[worker] processing ${label}`);
  try {
    const { candidateId, candidateName } = await processResumeJob(job as any);
    await resumeJobRepository.markDone(job.id, candidateId, candidateName);
    console.log(`[worker] done ${label} -> candidate ${candidateId}`);
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error(`[worker] failed ${label}: ${message}`);
    try {
      await resumeJobRepository.markFailed(job.id, message, job.attempts);
    } catch (markErr) {
      console.error(`[worker] could not mark job ${job.id} failed:`, markErr);
    }
  } finally {
    inFlight--;
  }
}

async function loop() {
  console.log(
    `[worker] resume worker started (concurrency ${CONCURRENCY}, poll ${POLL_MS}ms)`,
  );
  while (!shuttingDown) {
    try {
      // Lease one job per free slot; fire-and-track each handler.
      while (inFlight < CONCURRENCY && !shuttingDown) {
        const job = await resumeJobRepository.leaseNext();
        if (!job) break;
        inFlight++;
        void handleJob(job);
      }
    } catch (err) {
      console.error("[worker] loop error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

async function shutdown(signal: string) {
  console.log(`[worker] ${signal} received — finishing in-flight jobs...`);
  shuttingDown = true;
  const deadline = Date.now() + 60_000;
  while (inFlight > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
  }
  await prisma.$disconnect().catch(() => {});
  console.log("[worker] shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

loop().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});

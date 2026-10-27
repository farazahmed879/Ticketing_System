import { resumeJobRepository } from "../repositories/resumeJob.repository";
import { processResumeJob } from "./resumeJobProcessor";

const POLL_MS = 3000;
const CONCURRENCY = 2;

let isRunning = false;
let inFlight = 0;

type LeasedJob = NonNullable<
  Awaited<ReturnType<typeof resumeJobRepository.leaseNext>>
>;

async function handleJob(job: LeasedJob): Promise<void> {
  const label = `${job.originalName} (job ${job.id}, attempt ${job.attempts})`;
  console.log(`[resume-worker] processing ${label}`);
  try {
    const result = await processResumeJob(job as any);
    if (result.needsTitle) {
      await resumeJobRepository.markNeedsTitle(
        job.id,
        result.candidateName,
        result.parsedData,
        result.parsedPosition,
      );
      console.log(`[resume-worker] needs_title ${label}`);
    } else if (result.duplicateFound) {
      await resumeJobRepository.markDuplicateFound(
        job.id,
        result.existingCandidateId || "",
        result.candidateName,
        result.parsedData,
        result.parsedPosition,
      );
      console.log(`[resume-worker] duplicate_found ${label}`);
    } else if (result.candidateId) {
      await resumeJobRepository.markDone(job.id, result.candidateId, result.candidateName);
      console.log(`[resume-worker] done ${label} -> candidate ${result.candidateId}`);
    }
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error(`[resume-worker] failed ${label}: ${message}`);
    try {
      await resumeJobRepository.markFailed(job.id, message, job.attempts);
    } catch (markErr) {
      console.error(`[resume-worker] could not mark job ${job.id} failed:`, markErr);
    }
  } finally {
    inFlight--;
  }
}

export function startResumeJobWorker() {
  if (process.env.DISABLE_IN_PROCESS_WORKER === "true") {
    console.log("[resume-worker] in-process worker disabled by DISABLE_IN_PROCESS_WORKER env");
    return;
  }

  if (isRunning) return;
  isRunning = true;

  console.log(
    `[resume-worker] queue processor started (concurrency ${CONCURRENCY}, poll ${POLL_MS}ms)`,
  );

  const loop = async () => {
    while (isRunning) {
      try {
        while (inFlight < CONCURRENCY && isRunning) {
          const job = await resumeJobRepository.leaseNext();
          if (!job) break;
          inFlight++;
          void handleJob(job);
        }
      } catch (err) {
        console.error("[resume-worker] loop error:", err);
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  };

  void loop();
}

export function stopResumeJobWorker() {
  isRunning = false;
}

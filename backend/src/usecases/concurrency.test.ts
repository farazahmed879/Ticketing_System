import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * In-memory fake of the few Prisma calls these fixes use. Each call is
 * evaluated atomically (no await inside), like a single-document Mongo write,
 * but we yield to the event loop BEFORE it runs so concurrent callers
 * interleave the way real network round-trips would.
 */
const db = vi.hoisted(() => ({
  counters: new Map<string, number>(),
  maxUid: 0 as number | null,
  users: new Map<string, { leaves: number | null }>(),
  entries: new Map<string, any>(),
  jobs: [] as any[],
}));

const tick = () => new Promise((r) => setTimeout(r, Math.random() * 3));

const matchEntry = (e: any, where: any) => {
  if (where.id && e.id !== where.id) return false;
  if (where.hrApproved !== undefined && typeof where.hrApproved === "string")
    return e.hrApproved === where.hrApproved;
  if (where.OR) {
    return where.OR.some((c: any) =>
      c.hrApproved?.not !== undefined
        ? e.hrApproved !== undefined && e.hrApproved !== c.hrApproved.not
        : c.hrApproved?.isSet === false
          ? e.hrApproved === undefined
          : false,
    );
  }
  return true;
};

vi.mock("../prisma", () => ({
  default: {
    $runCommandRaw: async (cmd: any) => {
      await tick();
      if (cmd.findAndModify === "counters") {
        const id = cmd.query._id;
        if (!db.counters.has(id)) return { value: null };
        const next = db.counters.get(id)! + cmd.update.$inc.seq;
        db.counters.set(id, next);
        return { value: { _id: id, seq: next } };
      }
      if (cmd.insert === "counters") {
        const doc = cmd.documents[0];
        if (db.counters.has(doc._id)) return { ok: 1, writeErrors: [{ code: 11000 }] };
        db.counters.set(doc._id, doc.seq);
        return { ok: 1, n: 1 };
      }
      throw new Error("unexpected raw command");
    },
    ticket: {
      findFirst: async () => (db.maxUid === null ? null : { uid: db.maxUid }),
    },
    user: {
      updateMany: async ({ where, data }: any) => {
        await tick();
        const u = db.users.get(where.id);
        if (!u || u.leaves === null || u.leaves < where.leaves.gte) return { count: 0 };
        u.leaves -= data.leaves.decrement;
        return { count: 1 };
      },
      update: async ({ where, data }: any) => {
        await tick();
        const u = db.users.get(where.id)!;
        u.leaves = (u.leaves ?? 0) + data.leaves.increment;
        return u;
      },
      findUnique: async ({ where }: any) => db.users.get(where.id) ?? null,
    },
    timesheetEntry: {
      findUnique: async ({ where }: any) => {
        await tick();
        const e = db.entries.get(where.id);
        return e ? { ...e, tasks: [] } : null;
      },
      updateMany: async ({ where, data }: any) => {
        await tick();
        const e = db.entries.get(where.id);
        if (!e || !matchEntry(e, where)) return { count: 0 };
        Object.assign(e, data);
        return { count: 1 };
      },
      update: async ({ where, data }: any) => {
        await tick();
        const e = db.entries.get(where.id)!;
        Object.assign(e, data);
        return { ...e };
      },
    },
    resumeJob: {
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const j of db.jobs) {
          if (
            j.status === where.status &&
            j.leasedAt < where.leasedAt.lt &&
            j.attempts >= where.attempts.gte
          ) {
            Object.assign(j, data);
            count++;
          }
        }
        return { count };
      },
    },
  },
}));

import { ticketRepository } from "../repositories/ticket.repository";
import { timesheetUsecase } from "./timesheet.usecase";
import { resumeJobRepository, RESUME_JOB_LEASE_MS } from "../repositories/resumeJob.repository";

beforeEach(() => {
  db.counters.clear();
  db.maxUid = 0;
  db.users.clear();
  db.entries.clear();
  db.jobs = [];
});

describe("ticket numbers", () => {
  it("20 simultaneous creates get 20 distinct, consecutive numbers", async () => {
    db.maxUid = 1041; // existing tickets go up to #1041
    const uids = await Promise.all(
      Array.from({ length: 20 }, () => ticketRepository.nextTicketUid()),
    );
    expect(new Set(uids).size).toBe(20);
    expect([...uids].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, i) => 1042 + i),
    );
  });

  it("an empty database starts at #1000", async () => {
    db.maxUid = null;
    expect(await ticketRepository.nextTicketUid()).toBe(1000);
    expect(await ticketRepository.nextTicketUid()).toBe(1001);
  });
});

describe("leave approval", () => {
  const leave = (hrApproved: string | undefined = "PENDING") => {
    db.users.set("u1", { leaves: 5 });
    db.entries.set("e1", {
      id: "e1",
      userId: "u1",
      entryType: "FULL_DAY_LEAVE",
      hrApproved,
      managerApproved: "APPROVED",
    });
  };

  it("two HR users approving at once deduct the leave only once", async () => {
    leave();
    await Promise.all([
      timesheetUsecase.approveEntry("e1", "hr1", "hr"),
      timesheetUsecase.approveEntry("e1", "hr2", "hr"),
    ]);
    expect(db.users.get("u1")!.leaves).toBe(4);
    expect(db.entries.get("e1").hrApproved).toBe("APPROVED");
  });

  it("legacy entries with no hrApproved field can still be approved", async () => {
    leave(undefined);
    await timesheetUsecase.approveEntry("e1", "hr1", "hr");
    expect(db.users.get("u1")!.leaves).toBe(4);
  });

  it("insufficient balance is rejected and the entry stays pending", async () => {
    leave();
    db.users.get("u1")!.leaves = 0;
    await expect(timesheetUsecase.approveEntry("e1", "hr1", "hr")).rejects.toThrow(
      /Insufficient leave balance.*available 0/,
    );
    expect(db.entries.get("e1").hrApproved).toBe("PENDING");
    expect(db.users.get("u1")!.leaves).toBe(0);
  });

  it("two simultaneous rejections refund an approved leave only once", async () => {
    leave("APPROVED");
    db.users.get("u1")!.leaves = 4;
    await Promise.all([
      timesheetUsecase.rejectEntry("e1", "no", "hr", "hr1"),
      timesheetUsecase.rejectEntry("e1", "no", "hr", "hr1"),
    ]);
    expect(db.users.get("u1")!.leaves).toBe(5);
    expect(db.entries.get("e1").hrApproved).toBe("REJECTED");
  });

  it("approve -> reject -> approve nets out to one deduction", async () => {
    leave();
    await timesheetUsecase.approveEntry("e1", "hr1", "hr");
    await timesheetUsecase.rejectEntry("e1", "oops", "hr", "hr1");
    await timesheetUsecase.approveEntry("e1", "hr1", "hr");
    expect(db.users.get("u1")!.leaves).toBe(4);
  });
});

describe("self-review", () => {
  beforeEach(() => {
    db.users.set("u1", { leaves: 5 });
    db.entries.set("e1", {
      id: "e1",
      userId: "u1",
      entryType: "FULL_DAY_LEAVE",
      hrApproved: "PENDING",
    });
  });

  it("a reviewer cannot approve their own leave (no deduction, still pending)", async () => {
    await expect(timesheetUsecase.approveEntry("e1", "u1", "hr")).rejects.toThrow(
      /review your own/,
    );
    expect(db.entries.get("e1").hrApproved).toBe("PENDING");
    expect(db.users.get("u1")!.leaves).toBe(5);
  });

  it("a reviewer cannot reject their own entry", async () => {
    await expect(
      timesheetUsecase.rejectEntry("e1", "x", "hr", "u1"),
    ).rejects.toThrow(/review your own/);
  });

  it("a different reviewer can", async () => {
    await timesheetUsecase.approveEntry("e1", "hr2", "hr");
    expect(db.users.get("u1")!.leaves).toBe(4);
  });
});

describe("stuck resume jobs", () => {
  it("fails exhausted jobs whose lease expired, leaves others alone", async () => {
    const old = new Date(Date.now() - RESUME_JOB_LEASE_MS - 1000);
    const fresh = new Date();
    db.jobs = [
      { id: "stuck", status: "processing", leasedAt: old, attempts: 3 },
      { id: "retryable", status: "processing", leasedAt: old, attempts: 1 },
      { id: "running", status: "processing", leasedAt: fresh, attempts: 3 },
    ];
    const res = await resumeJobRepository.failExhaustedStaleJobs();
    expect(res.count).toBe(1);
    expect(db.jobs.map((j) => j.status)).toEqual(["failed", "processing", "processing"]);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const { repo } = vi.hoisted(() => ({
  repo: { findById: vi.fn() },
}));

vi.mock("../repositories/candidate.repository", () => ({ candidateRepository: repo }));
vi.mock("../prisma", () => ({ default: {} }));

import { candidateUsecase, CANDIDATE_ACCESS_DENIED } from "./candidate.usecase";

const candidate = () => ({
  id: "c1",
  name: "Ali",
  notes: "legacy HR note",
  notesLog: [{ id: "n1", content: "HR only" }],
  interviews: [
    { id: "i1", panelMembers: [{ userId: "emp1" }, { userId: "emp2" }] },
    { id: "i2", panelMembers: [{ userId: "emp2" }] },
  ],
});

describe("candidate profile access", () => {
  beforeEach(() => {
    repo.findById.mockReset();
    repo.findById.mockResolvedValue(candidate());
  });

  it.each(["admin", "agent", "hr"])("%s gets the full profile", async (role) => {
    const result: any = await candidateUsecase.getCandidateById("c1", { id: "x", role });
    expect(result.interviews).toHaveLength(2);
    expect(result.notesLog).toHaveLength(1);
    expect(result.notes).toBe("legacy HR note");
  });

  it("panel member sees only their interviews and no HR notes", async () => {
    const result: any = await candidateUsecase.getCandidateById("c1", { id: "emp1", role: "employee" });
    expect(result.name).toBe("Ali");
    expect(result.interviews.map((i: any) => i.id)).toEqual(["i1"]);
    expect(result.notesLog).toEqual([]);
    expect(result.notes).toBeNull();
  });

  it("employee not on any panel is denied", async () => {
    await expect(
      candidateUsecase.getCandidateById("c1", { id: "emp9", role: "employee" }),
    ).rejects.toThrow(CANDIDATE_ACCESS_DENIED);
  });

  it("missing candidate is still a not-found", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(
      candidateUsecase.getCandidateById("nope", { id: "emp1", role: "employee" }),
    ).rejects.toThrow("Candidate not found");
  });
});

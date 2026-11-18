import { describe, it, expect, vi, beforeEach } from "vitest";

const { repo } = vi.hoisted(() => ({
  repo: { findById: vi.fn(), updateStatus: vi.fn() },
}));

vi.mock("../repositories/interview.repository", () => ({ interviewRepository: repo }));
vi.mock("../repositories/ticket.repository", () => ({ ticketRepository: {} }));
vi.mock("../prisma", () => ({ default: {} }));

import { interviewUsecase } from "./interview.usecase";

const employee = { id: "emp1", roleType: "employee", permissions: { interviews: { update: false } } };
const outsider = { id: "emp9", roleType: "employee", permissions: { interviews: { update: false } } };
const manager = { id: "m1", roleType: "agent", permissions: { interviews: { update: true } } };
const hr = { id: "h1", roleType: "hr", permissions: {} };

describe("interview status changes", () => {
  beforeEach(() => {
    repo.findById.mockReset();
    repo.updateStatus.mockReset();
    repo.findById.mockResolvedValue({ id: "i1", panelMembers: [{ userId: "emp1" }] });
    repo.updateStatus.mockResolvedValue({ id: "i1" });
  });

  it("employee on the panel cannot cancel", async () => {
    await expect(
      interviewUsecase.updateInterviewStatus("i1", "Cancelled", employee),
    ).rejects.toMatchObject({ httpStatus: 403 });
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it("employee on the panel can mark completed", async () => {
    await interviewUsecase.updateInterviewStatus("i1", "Completed", employee);
    expect(repo.updateStatus).toHaveBeenCalledWith("i1", "Completed");
  });

  it("employee not on the panel cannot mark completed", async () => {
    await expect(
      interviewUsecase.updateInterviewStatus("i1", "Completed", outsider),
    ).rejects.toMatchObject({ httpStatus: 403 });
  });

  it.each([manager, hr])("%o can cancel", async (caller) => {
    await interviewUsecase.updateInterviewStatus("i1", "Cancelled", caller);
    expect(repo.updateStatus).toHaveBeenCalledWith("i1", "Cancelled");
  });

  it("rejects unknown statuses", async () => {
    await expect(
      interviewUsecase.updateInterviewStatus("i1", "Deleted", manager),
    ).rejects.toMatchObject({ httpStatus: 400 });
  });
});

import { describe, it, expect, vi } from "vitest";

vi.mock("../prisma", () => ({ default: {} }));

import { requestUsecase, type ReviewContext } from "./request.usecase";
import { RoleType } from "../utils/constants";

const emptyCtx = (): ReviewContext => ({
  ledMemberIds: new Set(),
  orgManagersByMember: new Map(),
});

const can = (
  reviewerRole: string,
  requesterRole: string,
  ctx: ReviewContext = emptyCtx(),
  reviewerId = "reviewer",
) =>
  requestUsecase.canReview({ id: reviewerId, role: reviewerRole }, "requester", ctx, {
    isLeave: true,
    requesterRole,
  }).allowed;

describe("leave approval hierarchy", () => {
  it("employee leave: Manager, HR and Admin can approve; other employees cannot", () => {
    expect(can(RoleType.AGENT, RoleType.EMPLOYEE)).toBe(true);
    expect(can(RoleType.HR, RoleType.EMPLOYEE)).toBe(true);
    expect(can(RoleType.ADMIN, RoleType.EMPLOYEE)).toBe(true);
    expect(can(RoleType.EMPLOYEE, RoleType.EMPLOYEE)).toBe(false);
    expect(can(RoleType.QA, RoleType.EMPLOYEE)).toBe(false);
  });

  it("an employee team lead cannot approve a member's leave", () => {
    const ctx = emptyCtx();
    ctx.ledMemberIds.add("requester");
    expect(can(RoleType.EMPLOYEE, RoleType.EMPLOYEE, ctx)).toBe(false);
  });

  it("employee in an organizational team: only their manager (plus HR/Admin)", () => {
    const ctx = emptyCtx();
    ctx.orgManagersByMember.set("requester", new Set(["their-manager"]));
    expect(can(RoleType.AGENT, RoleType.EMPLOYEE, ctx, "other-manager")).toBe(false);
    expect(can(RoleType.AGENT, RoleType.EMPLOYEE, ctx, "their-manager")).toBe(true);
    expect(can(RoleType.HR, RoleType.EMPLOYEE, ctx)).toBe(true);
  });

  it("manager leave: only HR and Admin", () => {
    expect(can(RoleType.AGENT, RoleType.AGENT)).toBe(false);
    expect(can(RoleType.HR, RoleType.AGENT)).toBe(true);
    expect(can(RoleType.ADMIN, RoleType.AGENT)).toBe(true);
    expect(can(RoleType.EMPLOYEE, RoleType.AGENT)).toBe(false);
  });

  it("HR leave: only another HR or Admin", () => {
    expect(can(RoleType.HR, RoleType.HR)).toBe(true);
    expect(can(RoleType.ADMIN, RoleType.HR)).toBe(true);
    expect(can(RoleType.AGENT, RoleType.HR)).toBe(false);
    expect(can(RoleType.EMPLOYEE, RoleType.HR)).toBe(false);
  });

  it("nobody approves their own leave", () => {
    const self = requestUsecase.canReview(
      { id: "requester", role: RoleType.HR },
      "requester",
      emptyCtx(),
      { isLeave: true, requesterRole: RoleType.HR },
    );
    expect(self.allowed).toBe(false);
  });

  it("non-leave requests keep the old rules (managers can review)", () => {
    const r = requestUsecase.canReview(
      { id: "m", role: RoleType.AGENT },
      "requester",
      emptyCtx(),
      { isLeave: false, requesterRole: RoleType.AGENT },
    );
    expect(r.allowed).toBe(true);
  });
});

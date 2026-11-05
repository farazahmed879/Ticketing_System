import { describe, it, expect, vi, beforeEach } from "vitest";

const { repo, historyCreate } = vi.hoisted(() => ({
  repo: {
    count: vi.fn(),
    findClientProjectIds: vi.fn(async () => [] as string[]),
    findManagedProjectIds: vi.fn(async () => [] as string[]),
    findLedTeamMemberIds: vi.fn(async () => [] as string[]),
    findLedTeamProjectIds: vi.fn(async () => [] as string[]),
    addComment: vi.fn(),
  },
  historyCreate: vi.fn(),
}));

vi.mock("../repositories/ticket.repository", () => ({ ticketRepository: repo }));
vi.mock("../prisma", () => ({ default: { history: { create: (...a: any[]) => historyCreate(...a) } } }));

import { ticketUsecase } from "./ticket.usecase";

describe("ticket access control", () => {
  beforeEach(() => {
    repo.count.mockReset();
    repo.addComment.mockReset();
    historyCreate.mockReset();
  });

  it("admins skip the visibility query", async () => {
    await expect(
      ticketUsecase.assertCanAccessTickets(["t1"], { id: "a", role: "admin" }),
    ).resolves.toBeUndefined();
    expect(repo.count).not.toHaveBeenCalled();
  });

  it("an employee cannot open a ticket outside their visibility", async () => {
    repo.count.mockResolvedValue(0);
    await expect(
      ticketUsecase.assertCanAccessTickets(["t1"], { id: "e", role: "employee" }),
    ).rejects.toThrow("Ticket not found");
    const where = repo.count.mock.calls[0][0];
    expect(where.id).toEqual({ in: ["t1"] });
    expect(where.AND[0].OR).toEqual(
      expect.arrayContaining([{ ownerId: "e" }, { assigneeId: "e" }]),
    );
  });

  it("batch access fails if any one ticket is not visible", async () => {
    repo.count.mockResolvedValue(1);
    await expect(
      ticketUsecase.assertCanAccessTickets(["t1", "t2"], { id: "c", role: "client" }),
    ).rejects.toThrow("Ticket not found");
  });

  it("addComment ignores authorId/ticketId from the body and blocks client notes", async () => {
    repo.count.mockResolvedValue(1);
    repo.addComment.mockResolvedValue({ id: "c1", author: { fullname: "Me" } });
    await ticketUsecase.addComment(
      "t1",
      { comment: "hi", authorId: "victim", ticketId: "other", isNote: true },
      { id: "me", role: "client" },
    );
    expect(repo.addComment).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: "me", ticketId: "t1", isNote: false }),
    );
    expect(historyCreate.mock.calls[0][0].data.actorId).toBe("me");
  });
});

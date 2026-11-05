import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const roleFindFirst = vi.fn();
vi.mock("../prisma", () => ({
  default: {
    user: { findUnique: (...a: any[]) => findUnique(...a) },
    role: { findFirst: (...a: any[]) => roleFindFirst(...a) },
  },
}));

import { requirePermission, requireAdmin } from "./auth";
import { userUsecase, ForbiddenError } from "../usecases/user.usecase";

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const dbUser = (roleType: string, permissions: any = {}, extra: any = {}) => ({
  deleted: false,
  role: { roleType, permissions, deleted: false },
  ...extra,
});

describe("requirePermission", () => {
  beforeEach(() => findUnique.mockReset());

  it("lets admins through regardless of permission flags", async () => {
    findUnique.mockResolvedValue(dbUser("admin", {}));
    const next = vi.fn();
    await requirePermission("users.create")({ user: { id: "u1", role: "admin" } } as any, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it("allows a non-admin whose role has the permission", async () => {
    findUnique.mockResolvedValue(dbUser("agent", { users: { create: true } }));
    const next = vi.fn();
    await requirePermission("users.create")({ user: { id: "u1", role: "agent" } } as any, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it("rejects a client without the permission with 403", async () => {
    findUnique.mockResolvedValue(dbUser("client", { users: { create: false } }));
    const next = vi.fn();
    const res = mockRes();
    await requirePermission("users.create")({ user: { id: "u1", role: "client" } } as any, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("uses the DB role, not the (possibly stale/forged) JWT role", async () => {
    findUnique.mockResolvedValue(dbUser("client", {}));
    const next = vi.fn();
    const res = mockRes();
    await requirePermission("users.delete")({ user: { id: "u1", role: "admin" } } as any, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("rejects deleted users with 401", async () => {
    findUnique.mockResolvedValue(dbUser("admin", {}, { deleted: true }));
    const next = vi.fn();
    const res = mockRes();
    await requirePermission("users.create")({ user: { id: "u1", role: "admin" } } as any, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("requireAdmin", () => {
  it("rejects HR", async () => {
    findUnique.mockResolvedValue(dbUser("hr", { users: { create: true } }));
    const next = vi.fn();
    const res = mockRes();
    await requireAdmin({ user: { id: "u1", role: "hr" } } as any, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("assertCanAssignRole", () => {
  beforeEach(() => {
    findUnique.mockReset();
    roleFindFirst.mockReset();
  });

  it("blocks a non-admin from granting the Admin role", async () => {
    roleFindFirst.mockResolvedValue({ roleType: "admin" });
    await expect(userUsecase.assertCanAssignRole("agent", "adminRoleId")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows a non-admin to grant a non-admin role", async () => {
    roleFindFirst.mockResolvedValue({ roleType: "employee" });
    await expect(userUsecase.assertCanAssignRole("agent", "empRoleId")).resolves.toBeUndefined();
  });

  it("blocks HR from changing an existing Admin's role", async () => {
    roleFindFirst.mockResolvedValue({ roleType: "employee" });
    findUnique.mockResolvedValue({ roleId: "adminRoleId", role: { roleType: "admin" } });
    await expect(userUsecase.assertCanAssignRole("hr", "empRoleId", "target")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects unknown role ids", async () => {
    roleFindFirst.mockResolvedValue(null);
    await expect(userUsecase.assertCanAssignRole("admin", "bogus")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("lets an admin grant the Admin role", async () => {
    roleFindFirst.mockResolvedValue({ roleType: "admin" });
    await expect(userUsecase.assertCanAssignRole("admin", "adminRoleId")).resolves.toBeUndefined();
  });
});

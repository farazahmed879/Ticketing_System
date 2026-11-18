/**
 * Ensures built-in roles that were added after a database was first seeded
 * exist in every environment, without running the full seed (which resets
 * every role's permissions).
 *
 * Sub Admin: an admin-type role that can't delete (Role.canDelete = false).
 * Created once, copying this database's Admin permissions with every
 * `delete` turned off. Existing roles are never modified, and a Sub Admin
 * that an admin deleted on purpose is not brought back.
 *
 * Runs once on startup; safe to run on every boot.
 */
import { basePrisma as prisma } from "../prisma";
import { RoleName, RoleType } from "../utils/constants";

/** Admin permissions with every `delete: true` switched off. */
export const withoutDelete = (permissions: unknown): Record<string, unknown> => {
  const perms = (permissions && typeof permissions === "object" ? permissions : {}) as Record<
    string,
    unknown
  >;
  return Object.fromEntries(
    Object.entries(perms).map(([module, value]) => [
      module,
      value && typeof value === "object" && !Array.isArray(value) && "delete" in value
        ? { ...(value as object), delete: false }
        : value,
    ]),
  );
};

export async function ensureSubAdminRole() {
  try {
    // Includes soft-deleted: names are unique, and a deliberately deleted
    // Sub Admin stays deleted.
    const existing = await prisma.role.findUnique({ where: { name: RoleName.SUB_ADMIN } });
    if (existing) return;

    const admin =
      (await prisma.role.findFirst({ where: { name: RoleName.ADMIN, deleted: false } })) ||
      (await prisma.role.findFirst({ where: { roleType: RoleType.ADMIN, deleted: false } }));
    if (!admin) {
      console.warn("[SystemRoles] No Admin role found; Sub Admin not created.");
      return;
    }

    await prisma.role.create({
      data: {
        name: RoleName.SUB_ADMIN,
        description: "All admin rights except deleting",
        roleType: RoleType.ADMIN,
        permissions: withoutDelete(admin.permissions) as any,
        canDelete: false,
      },
    });
    console.log("[SystemRoles] Created the Sub Admin role.");
  } catch (err) {
    // Another instance may have created it at the same moment (unique name).
    console.error("[SystemRoles] Could not ensure the Sub Admin role:", err);
  }
}

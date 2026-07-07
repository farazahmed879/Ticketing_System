/// <reference types="node" />
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  RoleName,
  RoleType,
  StatusName,
  PriorityName,
  TicketType,
  TICKET_STATUSES,
  TICKET_TYPES,
} from "../src/utils/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ========== ROLES ==========
  const adminPermissions = {
    tickets: { view: true, create: true, update: true, delete: true, assign: true, priority: true },
    comments: { view: true, create: true },
    users: { view: true, create: true, update: true, delete: true },
    teams: { view: true, create: true, update: true, delete: true },
    groups: { view: true, create: true, update: true, delete: true },
    roles: { view: false, create: false, update: false, delete: false },
    departments: { view: true, create: true, update: true, delete: true },
    messages: { view: true, create: true },
    dashboard: { view: true },
    timesheets: { view: true, approve: true, report: true },
    candidates: { view: true, create: true, update: true, delete: true },
    interviews: { view: true, create: true, update: true, delete: true },
    requests: { view: true, create: true, update: true, delete: true },
    announcements: { view: true, create: true, update: true, delete: true },
  };

  const agentPermissions = {
    tickets: { view: true, create: true, update: true, delete: false, assign: true, priority: true },
    comments: { view: true, create: true },
    users: { view: true, create: true, update: true, delete: false },
    teams: { view: true, create: true, update: true, delete: false },
    groups: { view: true, create: true, update: true, delete: false },
    roles: { view: false, create: false, update: false, delete: false },
    departments: { view: true, create: true, update: true, delete: false },
    messages: { view: true, create: true },
    dashboard: { view: true },
    timesheets: { view: true, approve: true, report: true },
    candidates: { view: true, create: true, update: true, delete: false },
    interviews: { view: true, create: true, update: true, delete: false },
    requests: { view: true, create: true, update: true, delete: false },
    announcements: { view: true, create: true, update: true, delete: true },
  };

  const employeePermissions = {
    tickets: { view: true, create: false, update: true, delete: false, assign: false, priority: false },
    comments: { view: true, create: true },
    users: { view: false, create: false, update: false, delete: false },
    teams: { view: true, create: false, update: false, delete: false },
    groups: { view: true, create: false, update: false, delete: false },
    roles: { view: false, create: false, update: false, delete: false },
    departments: { view: false, create: false, update: false, delete: false },
    messages: { view: true, create: false },
    dashboard: { view: true },
    timesheets: { view: true, approve: false, report: true },
    candidates: { view: false, create: false, update: false, delete: false },
    interviews: { view: true, create: false, update: false, delete: false },
    requests: { view: true, create: false, update: false, delete: false },
    announcements: { view: true, create: true, update: true, delete: true },
  };

  const customerPermissions = {
    tickets: { view: true, create: true, update: true, delete: false, assign: false, priority: true },
    comments: { view: true, create: true },
    users: { view: false, create: false, update: false, delete: false },
    teams: { view: false, create: false, update: false, delete: false },
    groups: { view: false, create: false, update: false, delete: false },
    roles: { view: false, create: false, update: false, delete: false },
    departments: { view: false, create: false, update: false, delete: false },
    messages: { view: true, create: false },
    dashboard: { view: true },
    timesheets: { view: false, approve: false, report: false },
    candidates: { view: false, create: false, update: false, delete: false },
    interviews: { view: false, create: false, update: false, delete: false },
    requests: { view: false, create: false, update: false, delete: false },
    announcements: { view: true, create: true, update: true, delete: true },
  };

  const hrPermissions = {
    tickets: { view: true, create: true, update: true, delete: false, assign: false, priority: false },
    comments: { view: true, create: true },
    users: { view: true, create: true, update: true, delete: true },
    teams: { view: true, create: true, update: true, delete: true },
    groups: { view: true, create: true, update: true, delete: true },
    roles: { view: false, create: false, update: false, delete: false },
    departments: { view: true, create: true, update: true, delete: true },
    messages: { view: true, create: true },
    dashboard: { view: true },
    timesheets: { view: true, approve: true, report: true },
    candidates: { view: true, create: true, update: true, delete: true },
    interviews: { view: true, create: true, update: true, delete: true },
    requests: { view: true, create: true, update: true, delete: true },
    announcements: { view: true, create: true, update: true, delete: true },
  };

  const qaPermissions = {
    tickets: { view: true, create: true, update: true, delete: false, assign: false, priority: false },
    comments: { view: true, create: true },
    users: { view: false, create: false, update: false, delete: false },
    teams: { view: true, create: false, update: false, delete: false },
    groups: { view: true, create: false, update: false, delete: false },
    roles: { view: false, create: false, update: false, delete: false },
    departments: { view: false, create: false, update: false, delete: false },
    messages: { view: true, create: true },
    dashboard: { view: true },
    timesheets: { view: true, approve: false, report: true },
    candidates: { view: false, create: false, update: false, delete: false },
    interviews: { view: false, create: false, update: false, delete: false },
    requests: { view: false, create: false, update: false, delete: false },
    announcements: { view: true, create: true, update: true, delete: true },
  };

  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: { permissions: adminPermissions },
    create: {
      name: RoleName.ADMIN,
      description: "Full system access",
      roleType: RoleType.ADMIN,
      permissions: adminPermissions,
    },
  });

  const agentRole = await prisma.role.upsert({
    where: { name: RoleName.AGENT },
    update: { permissions: agentPermissions },
    create: {
      name: RoleName.AGENT,
      description: "Support agent with ticket management access",
      roleType: RoleType.AGENT,
      permissions: agentPermissions,
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: RoleName.EMPLOYEE },
    update: { permissions: employeePermissions },
    create: {
      name: RoleName.EMPLOYEE,
      description: "Internal employee/developer",
      roleType: RoleType.EMPLOYEE,
      permissions: employeePermissions,
    },
  });

  const customerRole = await prisma.role.upsert({
    where: { name: RoleName.CUSTOMER },
    update: { permissions: customerPermissions },
    create: {
      name: RoleName.CUSTOMER,
      description: "End-user who submits tickets",
      roleType: RoleType.CUSTOMER,
      permissions: customerPermissions,
    },
  });

  const hrRole = await prisma.role.upsert({
    where: { name: RoleName.HR },
    update: { permissions: hrPermissions },
    create: {
      name: RoleName.HR,
      description: "Human Resources",
      roleType: RoleType.HR,
      permissions: hrPermissions,
    },
  });

  const qaRole = await prisma.role.upsert({
    where: { name: RoleName.QA },
    update: { permissions: qaPermissions },
    create: {
      name: RoleName.QA,
      description: "Quality Assurance tester",
      roleType: RoleType.QA,
      permissions: qaPermissions,
    },
  });

  console.log("  ✅ Roles seeded");

  // Get statuses from constants to assign board permissions
  const statusMap = TICKET_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s.name]: s.id }),
    {} as Record<string, string>,
  );

  // Update Roles with board permissions
  await prisma.role.update({
    where: { name: RoleName.ADMIN },
    data: {
      permissions: {
        ...adminPermissions,
        boardStatuses: {
          [statusMap[StatusName.NEW]]: true,
          [statusMap[StatusName.OPEN]]: true,
          [statusMap[StatusName.TRASH]]: false,
          [statusMap[StatusName.FAILED]]: true,
          [statusMap[StatusName.IN_PROCESS]]: true,
          [statusMap[StatusName.RESOLVED]]: true,
          [statusMap[StatusName.CLOSED]]: false,
          [statusMap[StatusName.APPROVED]]: true,
        },
      },
    },
  });

  await prisma.role.update({
    where: { name: RoleName.AGENT },
    data: {
      permissions: {
        ...agentPermissions,
        boardStatuses: {
          [statusMap[StatusName.NEW]]: true,
          [statusMap[StatusName.OPEN]]: true,
          [statusMap[StatusName.TRASH]]: false,
          [statusMap[StatusName.FAILED]]: true,
          [statusMap[StatusName.IN_PROCESS]]: true,
          [statusMap[StatusName.RESOLVED]]: true,
          [statusMap[StatusName.CLOSED]]: false,
          [statusMap[StatusName.APPROVED]]: true,
        },
      },
    },
  });

  await prisma.role.update({
    where: { name: RoleName.EMPLOYEE },
    data: {
      permissions: {
        ...employeePermissions,
        boardStatuses: {
          [statusMap[StatusName.NEW]]: false,
          [statusMap[StatusName.OPEN]]: false,
          [statusMap[StatusName.TRASH]]: false,
          [statusMap[StatusName.FAILED]]: false,
          [statusMap[StatusName.IN_PROCESS]]: true,
          [statusMap[StatusName.RESOLVED]]: true,
          [statusMap[StatusName.CLOSED]]: false,
          [statusMap[StatusName.APPROVED]]: false,
        },
      },
    },
  });

  await prisma.role.update({
    where: { name: RoleName.CUSTOMER },
    data: {
      permissions: {
        ...customerPermissions,
        boardStatuses: {
          [statusMap[StatusName.NEW]]: true,
          [statusMap[StatusName.OPEN]]: false,
          [statusMap[StatusName.TRASH]]: true,
          [statusMap[StatusName.FAILED]]: true,
          [statusMap[StatusName.IN_PROCESS]]: false,
          [statusMap[StatusName.RESOLVED]]: false,
          [statusMap[StatusName.CLOSED]]: true,
          [statusMap[StatusName.APPROVED]]: false,
        },
      },
    },
  });

  await prisma.role.update({
    where: { name: RoleName.HR },
    data: {
      permissions: {
        ...hrPermissions,
        boardStatuses: {
          [statusMap[StatusName.NEW]]: true,
          [statusMap[StatusName.OPEN]]: true,
          [statusMap[StatusName.TRASH]]: false,
          [statusMap[StatusName.FAILED]]: true,
          [statusMap[StatusName.IN_PROCESS]]: true,
          [statusMap[StatusName.RESOLVED]]: true,
          [statusMap[StatusName.CLOSED]]: false,
          [statusMap[StatusName.APPROVED]]: true,
        },
      },
    },
  });

  await prisma.role.update({
    where: { name: RoleName.QA },
    data: {
      permissions: {
        ...qaPermissions,
        boardStatuses: {
          [statusMap[StatusName.NEW]]: false,
          [statusMap[StatusName.OPEN]]: false,
          [statusMap[StatusName.TRASH]]: false,
          [statusMap[StatusName.FAILED]]: true,
          [statusMap[StatusName.IN_PROCESS]]: true,
          [statusMap[StatusName.RESOLVED]]: true,
          [statusMap[StatusName.CLOSED]]: false,
          [statusMap[StatusName.APPROVED]]: true,
        },
      },
    },
  });

  console.log("  ✅ Role permissions updated with board transitions");

  // ========== TYPES ==========
  // Create each type with its fixed ObjectId (the frontend sends these exact
  // ids on ticket creation). Upsert by id so the canonical id always exists.
  for (const t of TICKET_TYPES) {
    await prisma.type.upsert({
      where: { id: t.id },
      update: { name: t.name },
      create: { id: t.id, name: t.name },
    });
  }
  console.log("  ✅ Types seeded");

  // ========== DEFAULT ADMIN USER ==========
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@nextgen.com" },
    update: {},
    create: {
      email: "admin@nextgen.com",
      // Login is only allowed via company email or username, so the admin
      // needs at least one of those set to be able to sign in.
      username: "admin",
      companyEmail: "admin@jamipartners.com",
      password: hashedPassword,
      fullname: "System Admin",
      roleId: adminRole.id,
    },
  });
  console.log("  ✅ Default admin user seeded (username: admin / admin123)");

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/// <reference types="node" />
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  RoleName,
  StatusName,
  PriorityName,
  TicketType,
} from "../src/utils/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ========== ROLES ==========
  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: {},
    create: {
      name: RoleName.ADMIN,
      description: "Full system access",
      isAdmin: true,
      isAgent: false,
      permissions: {
        tickets: {
          view: true,
          create: true,
          update: true,
          delete: true,
          priority: true,
        },
        accounts: { view: true, create: true, update: true, delete: true },
        groups: { view: true, create: true, update: true, delete: true },
        teams: { view: true, create: true, update: true, delete: true },
        departments: { view: true, create: true, update: true, delete: true },
        notices: {
          view: true,
          create: true,
          update: true,
          delete: true,
          activate: true,
          deactivate: true,
        },
        reports: { view: true },
        requests: { view: true, update: true, delete: true },
      },
    },
  });

  const agentRole = await prisma.role.upsert({
    where: { name: RoleName.AGENT },
    update: {},
    create: {
      name: RoleName.AGENT,
      description: "Support agent with ticket management access",
      isAdmin: false,
      isAgent: true,
      permissions: {
        tickets: {
          view: true,
          create: true,
          update: true,
          delete: false,
          priority: true,
        },
        accounts: { view: true, create: false, update: false, delete: false },
        groups: { view: true, create: false, update: false, delete: false },
        teams: { view: true, create: false, update: false, delete: false },
        notices: { view: true, create: false, update: false, delete: false },
        requests: { view: true, update: true },
      },
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: RoleName.EMPLOYEE },
    update: {},
    create: {
      name: RoleName.EMPLOYEE,
      description: "Internal employee/developer",
      isAdmin: false,
      isAgent: true,
      permissions: {
        tickets: {
          view: true,
          create: true,
          update: true,
          delete: false,
          priority: true,
        },
        messages: { view: true, create: true },
        groups: { view: true },
        teams: { view: true },
      },
    },
  });

  const customerRole = await prisma.role.upsert({
    where: { name: RoleName.CUSTOMER },
    update: {},
    create: {
      name: RoleName.CUSTOMER,
      description: "End-user who submits tickets",
      isAdmin: false,
      isAgent: false,
      permissions: {
        tickets: { view: true, create: true, update: false, delete: false },
      },
    },
  });

  console.log("  ✅ Roles seeded");

  // ========== STATUSES ==========
  const statuses = [
    { name: StatusName.NEW, color: "#29b955", order: 0, isResolved: false },
    { name: StatusName.OPEN, color: "#2196f3", order: 1, isResolved: false },
    {
      name: StatusName.FAILED,
      color: "#ef4444",
      order: 2,
      isResolved: true,
    },
    {
      name: StatusName.IN_PROCESS,
      color: "#ff9800",
      order: 3,
      isResolved: false,
    },
    { name: StatusName.RESOLVED, color: "#4caf50", order: 4, isResolved: true },
    {
      name: StatusName.APPROVED,
      color: "#00e676",
      order: 5,
      isResolved: true,
    },
    { name: StatusName.CLOSED, color: "#9e9e9e", order: 6, isResolved: true },
    {
      name: StatusName.CANCELLED,
      color: "#ff5252",
      order: 7,
      isResolved: true,
    },
  ];

  for (const s of statuses) {
    await prisma.status.upsert({
      where: { name: s.name },
      update: { color: s.color, order: s.order, isResolved: s.isResolved },
      create: s,
    });
  }
  console.log("  ✅ Statuses seeded");

  // Get all statuses to assign board permissions
  const allStatuses = await prisma.status.findMany();
  const statusMap = allStatuses.reduce(
    (acc, s) => ({ ...acc, [s.name]: s.id }),
    {} as Record<string, string>,
  );

  // Update Agent Role with board permissions
  await prisma.role.update({
    where: { name: RoleName.AGENT },
    data: {
      permissions: {
        ...(agentRole.permissions as any),
        boardStatuses: {
          [statusMap[StatusName.NEW]]: true,
          [statusMap[StatusName.OPEN]]: true,
          [statusMap[StatusName.IN_PROCESS]]: true,
          [statusMap[StatusName.RESOLVED]]: true,
          [statusMap[StatusName.APPROVED]]: true,
        },
      },
    },
  });
  console.log("  ✅ Agent role permissions updated with board transitions");

  // ========== PRIORITIES ==========
  const priorities = [
    { name: PriorityName.LOW, color: "#4caf50", order: 0 },
    { name: PriorityName.NORMAL, color: "#2196f3", order: 1 },
    { name: PriorityName.HIGH, color: "#ff9800", order: 2 },
    { name: PriorityName.URGENT, color: "#f44336", order: 3 },
  ];

  for (const p of priorities) {
    await prisma.priority.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }
  console.log("  ✅ Priorities seeded");

  // ========== TYPES ==========
  const types = [
    { name: TicketType.ISSUE },
    { name: TicketType.TASK },
    { name: TicketType.REQUEST },
  ];

  for (const t of types) {
    await prisma.type.upsert({
      where: { name: t.name },
      update: {},
      create: t,
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
      password: hashedPassword,
      fullname: "System Admin",
      roleId: adminRole.id,
    },
  });
  console.log("  ✅ Default admin user seeded (admin@nextgen.com / admin123)");

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

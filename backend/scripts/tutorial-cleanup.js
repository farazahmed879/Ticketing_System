// Removes data created while recording tutorial videos (see /tutorials).
//
//   node scripts/tutorial-cleanup.js          → delete demo tickets, comments,
//                                               timesheets, chats, reviews,
//                                               notifications (keeps accounts)
//   node scripts/tutorial-cleanup.js --all    → also delete the demo accounts,
//                                               demo team and demo project
//
// Only touches records owned by / linked to the two demo accounts
// (*@tutorial.local) or named with the tutorial prefixes. Hard deletes, so
// nothing lingers as soft-deleted rows in the shared database.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEMO_EMAILS = ["demo.client@tutorial.local", "demo.employee@tutorial.local"];
const TEAM_NAME = "Tutorial Demo Team";
const PROJECT_NAME = "Tutorial Demo – Website Revamp";
const TICKET_PREFIX = "[Demo]";
const ALL = process.argv.includes("--all");

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: DEMO_EMAILS } },
    select: { id: true, email: true },
  });
  const userIds = users.map((u) => u.id);
  console.log(`Demo users found: ${users.map((u) => u.email).join(", ") || "none"}`);

  const project = await prisma.project.findFirst({ where: { name: PROJECT_NAME } });
  const team = await prisma.team.findFirst({ where: { name: TEAM_NAME } });

  // Safety: with no demo accounts there is nothing of ours to delete. Never fall
  // back to name/prefix matching. Real tickets can share a "[Demo]" prefix.
  if (!userIds.length) {
    console.log("No demo accounts exist, so there is nothing to clean up.");
    return;
  }

  // Tickets: everything OWNED by a demo account (incl. ones created on camera).
  const tickets = await prisma.ticket.findMany({
    where: { ownerId: { in: userIds }, deleted: false },
    select: { id: true, uid: true },
  });
  const ticketIds = tickets.map((t) => t.id);
  console.log(`Demo tickets: ${tickets.map((t) => "#" + t.uid).join(", ") || "none"}`);

  const r = {};
  // A real user's timesheet task linked to a demo ticket keeps its hours; only the link is removed.
  r.timesheetTasksUnlinked = (
    await prisma.timesheetTask.updateMany({
      where: { ticketId: { in: ticketIds } },
      data: { ticketId: null },
    })
  ).count;
  r.comments = (
    await prisma.comment.deleteMany({
      where: { OR: [{ ticketId: { in: ticketIds } }, { authorId: { in: userIds } }] },
    })
  ).count;
  r.history = (
    await prisma.history.deleteMany({
      where: { OR: [{ ticketId: { in: ticketIds } }, { actorId: { in: userIds } }] },
    })
  ).count;
  // Tickets are SOFT-deleted, never removed: the backend numbers new tickets as
  // count + 1000, so removing rows makes the next number collide and breaks
  // ticket creation for everyone.
  r.ticketsHidden = (
    await prisma.ticket.updateMany({
      where: { id: { in: ticketIds } },
      data: { deleted: true, subject: "[Demo] removed tutorial ticket", issue: "-" },
    })
  ).count;

  // Timesheets (tasks cascade from entries).
  const entries = await prisma.timesheetEntry.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  await prisma.timesheetTask.deleteMany({ where: { entryId: { in: entries.map((e) => e.id) } } });
  r.timesheetEntries = (
    await prisma.timesheetEntry.deleteMany({ where: { userId: { in: userIds } } })
  ).count;

  // Chat rooms the demo users are in (1:1 rooms and groups they created for the demo).
  const rooms = await prisma.chatRoom.findMany({
    where: { memberIds: { hasSome: userIds } },
    select: { id: true, memberIds: true, isGroup: true },
  });
  // Only delete rooms whose members are all demo users (+ admin-free), otherwise
  // just remove the demo users' messages so real conversations stay intact.
  // The tutorials chat with the admin account ("System Admin"), so a 1:1 room
  // between a demo user and admin counts as demo-only too.
  const adminUser = await prisma.user.findFirst({ where: { username: "admin" }, select: { id: true } });
  const demoOrAdmin = [...userIds, ...(adminUser ? [adminUser.id] : [])];
  const demoOnlyRooms = rooms.filter(
    (rm) =>
      rm.memberIds.every((m) => demoOrAdmin.includes(m)) &&
      (rm.isGroup ? rm.memberIds.every((m) => userIds.includes(m)) : true),
  );
  const demoRoomIds = demoOnlyRooms.map((rm) => rm.id);
  await prisma.chatMessage.updateMany({
    where: { roomId: { in: demoRoomIds }, replyToId: { not: null } },
    data: { replyToId: null },
  });
  r.chatMessages = (
    await prisma.chatMessage.deleteMany({
      where: { OR: [{ roomId: { in: demoRoomIds } }, { senderId: { in: userIds } }] },
    })
  ).count;
  r.chatRooms = (await prisma.chatRoom.deleteMany({ where: { id: { in: demoRoomIds } } })).count;

  r.announcements = (
    await prisma.announcement.deleteMany({ where: { authorId: { in: userIds } } })
  ).count;

  // Notifications addressed to the demo users only.
  r.notifications = (
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } })
  ).count;
  r.requests = (await prisma.userRequest.deleteMany({ where: { userId: { in: userIds } } })).count;

  if (ALL) {
    // Only remove the demo project/team if every client/member is a demo account.
    if (project && project.clientIds.some((id) => !userIds.includes(id))) {
      console.log("Demo project has non-demo clients; leaving it in place.");
    } else if (project) {
      await prisma.project.update({
        where: { id: project.id },
        data: { teams: { set: [] }, clientIds: [] },
      });
      await prisma.project.delete({ where: { id: project.id } });
      r.project = 1;
    }
    if (team && team.memberIds.some((id) => !userIds.includes(id))) {
      console.log("Demo team has non-demo members; leaving it in place.");
    } else if (team) {
      await prisma.team.update({ where: { id: team.id }, data: { members: { set: [] } } });
      await prisma.team.delete({ where: { id: team.id } });
      r.team = 1;
    }
    // Hidden demo tickets stay (for numbering), so hand them to the admin account
    // before the demo users disappear.
    const admin = await prisma.user.findFirst({ where: { username: "admin" }, select: { id: true } });
    await prisma.ticket.updateMany({
      where: { ownerId: { in: userIds } },
      data: { ownerId: admin.id, assigneeId: null, deleted: true },
    });
    await prisma.ticket.updateMany({
      where: { assigneeId: { in: userIds } },
      data: { assigneeId: null },
    });
    // Detach demo users from any other many-to-many relations, then delete them.
    for (const id of userIds) {
      await prisma.user.update({
        where: { id },
        data: {
          teams: { set: [] },
          groups: { set: [] },
          projects: { set: [] },
          chatRooms: { set: [] },
        },
      });
    }
    r.users = (await prisma.user.deleteMany({ where: { id: { in: userIds } } })).count;
  }

  console.log("Deleted:", r);
}

main()
  .catch((e) => {
    console.error("Cleanup failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

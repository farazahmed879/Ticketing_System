// Removes data created while recording tutorial videos (see /tutorials).
//
//   node scripts/tutorial-cleanup.js          → delete demo tickets, comments,
//                                               timesheets, chats, reviews,
//                                               requests, candidates, interviews,
//                                               notifications (keeps accounts)
//   node scripts/tutorial-cleanup.js --all    → also delete the demo accounts,
//                                               demo team and demo project
//   add --dry-run to only print what would be removed
//
// Only touches records owned by / linked to demo accounts and demo candidates,
// i.e. emails ending in @tutorial.local (a reserved, non-routable domain no real
// user can have). Never matches on names or subject prefixes.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEMO_DOMAIN = "@tutorial.local";
const TEAM_NAME = "Tutorial Demo Team";
const PROJECT_NAME = "Tutorial Demo – Website Revamp";
const ALL = process.argv.includes("--all");
const DRY = process.argv.includes("--dry-run");

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_DOMAIN } },
    select: { id: true, email: true },
  });
  const userIds = users.map((u) => u.id);
  console.log(`Demo users found: ${users.map((u) => u.email).join(", ") || "none"}`);

  // Safety: with no demo accounts there is nothing of ours to delete. Never fall
  // back to name/prefix matching. Real tickets can share a "[Demo]" prefix.
  if (!userIds.length) {
    console.log("No demo accounts exist, so there is nothing to clean up.");
    return;
  }

  const project = await prisma.project.findFirst({ where: { name: PROJECT_NAME } });
  const team = await prisma.team.findFirst({ where: { name: TEAM_NAME } });

  // Demo candidates (by email) and every interview for them or scheduled by a demo user.
  const candidates = await prisma.candidate.findMany({
    where: { OR: [{ email: { endsWith: DEMO_DOMAIN } }, { createdById: { in: userIds } }] },
    select: { id: true, email: true },
  });
  const candidateIds = candidates.map((c) => c.id);
  const interviews = await prisma.interview.findMany({
    where: { OR: [{ candidateId: { in: candidateIds } }, { scheduledById: { in: userIds } }] },
    select: { id: true, candidateId: true },
  });
  const interviewIds = interviews.map((i) => i.id);
  // An interview a demo user scheduled for a REAL candidate is still ours, but the candidate is not.
  const strayCandidates = interviews.filter((i) => !candidateIds.includes(i.candidateId));
  if (strayCandidates.length) {
    console.log(`Note: ${strayCandidates.length} demo interview(s) belong to non-demo candidates; only the interviews are removed.`);
  }

  // Tickets: everything OWNED by a demo account (incl. ones created on camera) plus
  // the per-panelist tickets generated for demo interviews.
  const tickets = await prisma.ticket.findMany({
    where: {
      deleted: false,
      OR: [{ ownerId: { in: userIds } }, { interviewId: { in: interviewIds } }],
    },
    select: { id: true, uid: true },
  });
  const ticketIds = tickets.map((t) => t.id);
  const requests = await prisma.userRequest.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const requestIds = requests.map((r) => r.id);

  console.log(`Demo tickets: ${tickets.map((t) => "#" + t.uid).join(", ") || "none"}`);
  console.log(`Demo candidates: ${candidates.map((c) => c.email).join(", ") || "none"}; interviews: ${interviewIds.length}; requests: ${requestIds.length}`);
  if (DRY) {
    console.log("Dry run: nothing deleted.");
    return;
  }

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
      data: { deleted: true, subject: "[Demo] removed tutorial ticket", issue: "-", interviewId: null },
    })
  ).count;

  // Interviews (panel rows and feedback cascade) and demo candidates.
  await prisma.interviewPanel.deleteMany({ where: { interviewId: { in: interviewIds } } });
  await prisma.interviewFeedback.deleteMany({ where: { interviewId: { in: interviewIds } } });
  r.interviews = (await prisma.interview.deleteMany({ where: { id: { in: interviewIds } } })).count;
  await prisma.candidateNote.deleteMany({ where: { candidateId: { in: candidateIds } } });
  r.candidates = (await prisma.candidate.deleteMany({ where: { id: { in: candidateIds } } })).count;

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

  // Notifications addressed to demo users, plus ones sent to REAL users (e.g. every
  // admin is notified of new requests and interviews) about demo items.
  r.notifications = (
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } })
  ).count;
  const refs = [
    ["data.ticketId", ticketIds],
    ["data.requestId", requestIds],
    ["data.interviewId", interviewIds],
  ].filter(([, ids]) => ids.length);
  if (refs.length) {
    const res = await prisma.$runCommandRaw({
      delete: "Notification",
      deletes: [{ q: { $or: refs.map(([field, ids]) => ({ [field]: { $in: ids } })) }, limit: 0 }],
    });
    r.notificationsAboutDemoItems = res.n;
  }
  r.requests = (await prisma.userRequest.deleteMany({ where: { id: { in: requestIds } } })).count;

  if (ALL) {
    // Only remove the demo project/team if every client/member is a demo account.
    if (project && project.clientIds.some((id) => !userIds.includes(id))) {
      console.log("Demo project has non-demo clients; leaving it in place.");
    } else if (project) {
      await prisma.project.update({
        where: { id: project.id },
        data: { teams: { set: [] }, clientIds: [], managerId: null },
      });
      await prisma.project.delete({ where: { id: project.id } });
      r.project = 1;
    }
    if (team && team.memberIds.some((id) => !userIds.includes(id))) {
      console.log("Demo team has non-demo members; leaving it in place.");
    } else if (team) {
      await prisma.team.update({ where: { id: team.id }, data: { members: { set: [] }, teamLeadId: null } });
      await prisma.team.delete({ where: { id: team.id } });
      r.team = 1;
    }
    // Demo users must not stay referenced by anything that survives.
    await prisma.project.updateMany({ where: { managerId: { in: userIds } }, data: { managerId: null } });
    await prisma.team.updateMany({ where: { teamLeadId: { in: userIds } }, data: { teamLeadId: null } });
    await prisma.interviewPanel.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.interviewFeedback.deleteMany({ where: { interviewerId: { in: userIds } } });
    await prisma.candidateNote.updateMany({ where: { authorId: { in: userIds } }, data: { authorId: null } });
    // Hidden demo tickets stay (for numbering), so hand them to the admin account
    // before the demo users disappear.
    await prisma.ticket.updateMany({
      where: { ownerId: { in: userIds } },
      data: { ownerId: adminUser.id, assigneeId: null, qaId: null, deleted: true },
    });
    await prisma.ticket.updateMany({ where: { assigneeId: { in: userIds } }, data: { assigneeId: null } });
    await prisma.ticket.updateMany({ where: { qaId: { in: userIds } }, data: { qaId: null } });
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

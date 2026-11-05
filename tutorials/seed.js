// Seeds demo data for the tutorial videos on the shared database.
//
//   Accounts / team / project  → find-or-create (reused across runs)
//   Tickets, timesheets, requests, candidate → created fresh every run
//
// Always run `npm run cleanup` before seeding so each recording starts from the
// same state. Writes ids to .demo-state.json for the journeys to use.
import fs from "node:fs";
import { config } from "./config.js";
import { api, login, asArray, idOf } from "./lib/api.js";

const D = config.demo;
const log = (...a) => console.log("  •", ...a);

// Preferred role names per roleType (falls back to any role of that type).
const ROLE_NAMES = {
  client: /^(client|customer)$/i,
  employee: /^employee$/i,
  qa: /^qa$/i,
  agent: /^(manager|project manager|agent)$/i,
  hr: /^hr$/i,
};

async function findRole(adminToken, roleType) {
  const roles = asArray(await api("GET", "/roles?limit=200", { token: adminToken }));
  const live = roles.filter((r) => r.roleType === roleType && !r.deleted);
  const match = live.find((r) => ROLE_NAMES[roleType]?.test(r.name)) || live[0];
  if (!match) throw new Error(`No role with roleType "${roleType}" found`);
  return match;
}

async function ensureUser(adminToken, key, roleType) {
  const u = D[key];
  try {
    const { token, user } = await login(u.username, D.password);
    log(`${u.fullname}: reusing existing account`);
    return { token, id: user?.id };
  } catch (e) {
    if (e.status !== 401 && e.status !== 404 && e.status !== 400) throw e;
  }

  // A previous run may have created the account but stopped before the password change.
  try {
    const temp = await login(u.username, D.tempPassword);
    await api("POST", "/users/profile/password", {
      token: temp.token,
      body: { currentPassword: D.tempPassword, newPassword: D.password },
    });
    const { token, user } = await login(u.username, D.password);
    log(`${u.fullname}: finished setting up a half-created account`);
    return { token, id: user?.id };
  } catch (e) {
    if (e.status !== 401 && e.status !== 404 && e.status !== 400) throw e;
  }

  const role = await findRole(adminToken, roleType);
  try {
    await api("POST", "/users", {
      token: adminToken,
      body: { ...u, password: D.tempPassword, roleId: role.id, employeeType: "Onsite" },
    });
  } catch (e) {
    if (e.status === 409) {
      throw new Error(
        `${u.email} already exists (possibly soft-deleted or with another password). ` +
          `Run "npm run cleanup -- --all" and seed again.`,
      );
    }
    throw e;
  }
  // First login → change password so the "change default password" modal never shows.
  const temp = await login(u.username, D.tempPassword);
  await api("POST", "/users/profile/password", {
    token: temp.token,
    body: { currentPassword: D.tempPassword, newPassword: D.password },
  });
  const { token, user } = await login(u.username, D.password);
  log(`${u.fullname}: created with role "${role.name}"`);
  return { token, id: user?.id };
}

async function ensureTeam(adminToken, leadId, memberIds) {
  const teams = asArray(await api("GET", "/teams?limit=500", { token: adminToken }));
  const existing = teams.find((t) => t.name === D.teamName && !t.deleted);
  if (existing) {
    await api("PUT", `/teams/${existing.id}`, {
      token: adminToken,
      body: { teamLeadId: leadId, memberIds },
    });
    return existing.id;
  }
  const res = await api("POST", "/teams", {
    token: adminToken,
    body: {
      name: D.teamName,
      description: "Team used for tutorial recordings",
      teamLeadId: leadId,
      memberIds,
    },
  });
  log("team created");
  return idOf(res, "team");
}

async function ensureProject(adminToken, clientId, teamId, managerId) {
  const projects = asArray(await api("GET", "/projects?all=true&limit=500", { token: adminToken }));
  const existing = projects.find((p) => p.name === D.projectName && !p.deleted);
  if (existing) {
    await api("PUT", `/projects/${existing.id}`, {
      token: adminToken,
      body: { managerId, teamIds: [teamId], clientIds: [clientId] },
    });
    return existing.id;
  }
  const res = await api("POST", "/projects", {
    token: adminToken,
    body: {
      name: D.projectName,
      description: "Demo project used in the tutorial videos",
      status: "Active",
      clientIds: [clientId],
      teamIds: [teamId],
      managerId,
    },
  });
  log("project created");
  return idOf(res, "project");
}

function byName(list, name) {
  const item = list.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  if (!item) throw new Error(`"${name}" not found in [${list.map((x) => x.name).join(", ")}]`);
  return item.id;
}

const ymd = (d) => d.toISOString().slice(0, 10);

/** The `n` most recent weekdays before today (oldest first). */
function recentWeekdays(n) {
  const out = [];
  const d = new Date();
  while (out.length < n) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) out.unshift(ymd(d));
  }
  return out;
}

/** The next weekday at least `days` days from today. */
function weekdayFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return ymd(d);
}

async function main() {
  console.log("Seeding tutorial demo data →", config.apiUrl);
  const admin = await login(config.admin.identifier, config.admin.password);

  const client = await ensureUser(admin.token, "client", "client");
  const employee = await ensureUser(admin.token, "employee", "employee");
  const lead = await ensureUser(admin.token, "lead", "employee");
  const qa = await ensureUser(admin.token, "qa", "qa");
  const manager = await ensureUser(admin.token, "manager", "agent");
  const hr = await ensureUser(admin.token, "hr", "hr");

  const teamId = await ensureTeam(admin.token, lead.id, [employee.id, lead.id, qa.id]);
  const projectId = await ensureProject(admin.token, client.id, teamId, manager.id);
  // A known leave balance, so the HR video can show it going down.
  await api("PUT", `/users/${employee.id}`, { token: admin.token, body: { leaves: 12 } });
  log("team lead, project manager and leave balance set");

  const [statuses, priorities, types] = await Promise.all(
    ["statuses", "priorities", "types"].map(async (k) =>
      asArray(await api("GET", `/common/${k}`, { token: admin.token })),
    ),
  );
  const status = (n) => byName(statuses, n);
  const priority = (n) => byName(priorities, n);
  const type = (n) => byName(types, n);

  const newTicket = async (subject, issue, prio, typ) =>
    idOf(
      await api("POST", "/tickets", {
        token: client.token,
        body: { subject: `${D.ticketPrefix} ${subject}`, issue, priorityId: priority(prio), typeId: type(typ), projectId },
      }),
      "ticket",
    );

  // Ticket A — already being worked on, with a reply from the employee.
  const ticketA = await newTicket(
    "Login page shows an error on mobile",
    "When I try to log in from my phone (iOS Safari) I get a red 'Something went wrong' banner. Desktop works fine.",
    "High",
    "Issue",
  );
  await api("PUT", `/tickets/${ticketA}`, { token: admin.token, body: { assigneeId: employee.id } });
  await api("PUT", `/tickets/${ticketA}`, {
    token: employee.token,
    body: { statusId: status("In Process") },
  }).catch((e) => log("could not set In Process:", e.message));
  await api("POST", `/tickets/${ticketA}/comments`, {
    token: employee.token,
    body: {
      comment: "Hi Sarah, thanks for reporting this. I can reproduce it on iOS Safari and I'm working on a fix now.",
      isNote: false,
    },
  });
  log("ticket A created (In Process, with a reply)");

  // Ticket B — freshly assigned to the employee, not started yet.
  const ticketB = await newTicket(
    "Add CSV export to the reports page",
    "Our finance team needs to download the monthly report as a CSV file.",
    "Normal",
    "Request",
  );
  await api("PUT", `/tickets/${ticketB}`, {
    token: admin.token,
    body: { assigneeId: employee.id, statusId: status("Assigned") },
  });
  log("ticket B created (assigned)");

  // Ticket C — unassigned; the team lead assigns it on camera.
  const ticketC = await newTicket(
    "Contact form doesn't send a confirmation email",
    "After submitting the contact form, customers don't receive the confirmation email.",
    "Normal",
    "Issue",
  );
  // Ticket F — unassigned; the project manager assigns it and picks QA on camera.
  const ticketF = await newTicket(
    "Add dark mode to the customer dashboard",
    "Several customers asked for a dark theme on the dashboard.",
    "Low",
    "Request",
  );
  log("tickets C and F created (unassigned)");

  // Ticket D — Done and waiting for QA (QA video approves it).
  const ticketD = await newTicket(
    "Footer links point to the old blog",
    "The Blog and Careers links in the footer still open the old website.",
    "Normal",
    "Issue",
  );
  await api("PUT", `/tickets/${ticketD}`, {
    token: admin.token,
    body: { assigneeId: employee.id, qaId: qa.id, statusId: status("Resolved") },
  });
  await api("POST", `/tickets/${ticketD}/comments`, {
    token: employee.token,
    body: { comment: "Updated both footer links to the new site. Ready for QA.", isNote: true },
  });

  // Ticket E — Done, no QA; the team lead approves it on camera.
  const ticketE = await newTicket(
    "Typo on the pricing page",
    "The Business plan says 'anually' instead of 'annually'.",
    "Low",
    "Issue",
  );
  await api("PUT", `/tickets/${ticketE}`, {
    token: admin.token,
    body: { assigneeId: employee.id, statusId: status("Resolved") },
  });
  log("tickets D (Done, QA assigned) and E (Done) created");

  // Timesheets awaiting review: a work day and a full-day leave for the employee.
  const [workDay, leaveDay] = recentWeekdays(2);
  await api("POST", "/timesheets/entries", {
    token: employee.token,
    body: {
      date: workDay,
      totalHours: "8",
      notes: "",
      entryType: "WORK_FROM_HOME",
      tasks: [
        { description: "Fixed the mobile login error on iOS Safari", hours: "5", projectId },
        { description: "Code review and stand-up", hours: "3", projectId },
      ],
    },
  });
  await api("POST", "/timesheets/entries", {
    token: employee.token,
    body: { date: leaveDay, totalHours: "0", notes: "Family event", entryType: "FULL_DAY_LEAVE", tasks: [] },
  });
  log(`timesheets created (${workDay} work, ${leaveDay} full-day leave)`);

  // Leave requests: the team lead approves the employee's; the manager approves QA's.
  const leaveStart = weekdayFromNow(7);
  const empRequest = idOf(
    await api("POST", "/requests", {
      token: employee.token,
      body: {
        type: "FULLDAY_LEAVE",
        message: "Doctor's appointment",
        data: { startDate: leaveStart, endDate: leaveStart },
      },
    }),
    "request",
  );
  const vacStart = weekdayFromNow(14);
  const qaRequest = idOf(
    await api("POST", "/requests", {
      token: qa.token,
      body: {
        type: "VACATION",
        message: "Family trip",
        data: { startDate: vacStart, endDate: weekdayFromNow(16) },
      },
    }),
    "request",
  );
  log("leave requests created");

  // Candidate for the HR interview video (the HR candidate video adds another on camera).
  let candidateId = null;
  try {
    candidateId = idOf(
      await api("POST", "/candidates", {
        token: hr.token,
        body: {
          name: "Fatima Noor",
          email: "fatima.candidate@tutorial.local",
          position: "QA Engineer",
          phone: "0300 1234567",
          status: "Active",
          city: "Lahore",
        },
      }),
      "candidate",
    );
    log("candidate created");
  } catch (e) {
    log("could not create candidate:", e.message);
  }

  const state = {
    clientId: client.id,
    employeeId: employee.id,
    leadId: lead.id,
    qaId: qa.id,
    managerId: manager.id,
    hrId: hr.id,
    teamId,
    projectId,
    tickets: {
      inProcess: ticketA,
      assigned: ticketB,
      unassignedLead: ticketC,
      unassignedManager: ticketF,
      awaitingQa: ticketD,
      doneForLead: ticketE,
    },
    timesheets: { workDay, leaveDay },
    requests: { employee: empRequest, qa: qaRequest },
    candidateId,
    seededAt: new Date().toISOString(),
  };
  fs.writeFileSync(new URL("./.demo-state.json", import.meta.url), JSON.stringify(state, null, 2));
  console.log("Done. State written to tutorials/.demo-state.json");
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});

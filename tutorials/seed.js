// Seeds demo data for the tutorial videos on the shared database.
//
//   Accounts / team / project  → find-or-create (reused across runs)
//   Tickets, comments, chat    → created fresh every run
//
// Always run `npm run cleanup` before seeding so each recording starts from the
// same state. Writes ids to .demo-state.json for the journeys to use.
import fs from "node:fs";
import { config } from "./config.js";
import { api, login, asArray, idOf } from "./lib/api.js";

const D = config.demo;
const log = (...a) => console.log("  •", ...a);

async function findRole(adminToken, roleType) {
  const roles = asArray(await api("GET", "/roles?limit=200", { token: adminToken }));
  const match =
    roles.find((r) => r.roleType === roleType && !r.deleted && /^(client|customer|employee)$/i.test(r.name)) ||
    roles.find((r) => r.roleType === roleType && !r.deleted);
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

async function ensureTeam(adminToken, employeeId) {
  const teams = asArray(await api("GET", "/teams?limit=500", { token: adminToken }));
  const existing = teams.find((t) => t.name === D.teamName && !t.deleted);
  if (existing) return existing.id;
  const res = await api("POST", "/teams", {
    token: adminToken,
    body: { name: D.teamName, description: "Team used for tutorial recordings", memberIds: [employeeId] },
  });
  log("team created");
  return idOf(res, "team");
}

async function ensureProject(adminToken, clientId, teamId) {
  const projects = asArray(await api("GET", "/projects?all=true&limit=500", { token: adminToken }));
  const existing = projects.find((p) => p.name === D.projectName && !p.deleted);
  if (existing) return existing.id;
  const res = await api("POST", "/projects", {
    token: adminToken,
    body: {
      name: D.projectName,
      description: "Demo project used in the tutorial videos",
      status: "Active",
      clientIds: [clientId],
      teamIds: [teamId],
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

async function main() {
  console.log("Seeding tutorial demo data →", config.apiUrl);
  const admin = await login(config.admin.identifier, config.admin.password);

  const client = await ensureUser(admin.token, "client", "client");
  const employee = await ensureUser(admin.token, "employee", "employee");
  const teamId = await ensureTeam(admin.token, employee.id);
  const projectId = await ensureProject(admin.token, client.id, teamId);

  const [statuses, priorities, types] = await Promise.all(
    ["statuses", "priorities", "types"].map(async (k) =>
      asArray(await api("GET", `/common/${k}`, { token: admin.token })),
    ),
  );

  // Ticket A — already being worked on, with a reply from the employee.
  const a = await api("POST", "/tickets", {
    token: client.token,
    body: {
      subject: `${D.ticketPrefix} Login page shows an error on mobile`,
      issue:
        "When I try to log in from my phone (iOS Safari) I get a red 'Something went wrong' banner. Desktop works fine.",
      priorityId: byName(priorities, "High"),
      typeId: byName(types, "Issue"),
      projectId,
    },
  });
  const ticketA = idOf(a, "ticket");
  await api("PUT", `/tickets/${ticketA}`, {
    token: admin.token,
    body: { assigneeId: employee.id },
  });
  await api("PUT", `/tickets/${ticketA}`, {
    token: employee.token,
    body: { statusId: byName(statuses, "In Process") },
  }).catch((e) => log("could not set In Process:", e.message));
  await api("POST", `/tickets/${ticketA}/comments`, {
    token: employee.token,
    body: {
      comment:
        "Hi Sarah, thanks for reporting this. I can reproduce it on iOS Safari and I'm working on a fix now.",
      isNote: false,
    },
  });
  log("ticket A created (In Process, with a reply)");

  // Ticket B — freshly assigned to the employee, not started yet.
  const b = await api("POST", "/tickets", {
    token: client.token,
    body: {
      subject: `${D.ticketPrefix} Add CSV export to the reports page`,
      issue: "Our finance team needs to download the monthly report as a CSV file.",
      priorityId: byName(priorities, "Normal"),
      typeId: byName(types, "Request"),
      projectId,
    },
  });
  const ticketB = idOf(b, "ticket");
  await api("PUT", `/tickets/${ticketB}`, {
    token: admin.token,
    body: { assigneeId: employee.id, statusId: byName(statuses, "Assigned") },
  });
  log("ticket B created (assigned)");

  // No chat is seeded: clients may only message support (admin/agent) and
  // employees may not message clients, so the videos start chats themselves.

  const state = {
    clientId: client.id,
    employeeId: employee.id,
    teamId,
    projectId,
    tickets: { inProcess: ticketA, assigned: ticketB },
    seededAt: new Date().toISOString(),
  };
  fs.writeFileSync(new URL("./.demo-state.json", import.meta.url), JSON.stringify(state, null, 2));
  console.log("Done. State written to tutorials/.demo-state.json");
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});

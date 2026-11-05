// Administrator tutorial journeys. Recorded with the real admin account, so
// every list runs behind the privacy filter, and settings/roles are only SHOWN
// (never saved): they change behaviour for every real user.
import { config } from "../config.js";

const KICKER = "Administrator Guide";
const D = config.demo;
const EDIT_BTN =
  '[data-tooltip="Edit"] button, [data-tooltip="Edit"], button:has(svg[class*="pen"]), button:has(svg[class*="edit"])';

export default [
  {
    id: "admin-01-adding-users",
    title: "Adding users",
    as: "admin",
    async run(s, page) {
      await s.privacy(["@tutorial.local"]);
      await s.goto("/users", { quick: true });
      await s.titleCard(KICKER, "Adding users", "Give new staff and clients their accounts", 3200, {
        during: async () => {
          const search = page.getByPlaceholder("Search users...").first();
          await search.waitFor({ timeout: 15000 });
          await search.fill("tutorial.local");
          await page.waitForLoadState("networkidle").catch(() => {});
          await page.waitForTimeout(800);
        },
      });
      await s.caption("Users lists every account. Search or filter by role to find someone.", 3000);
      await s.click(page.getByRole("button", { name: /add new user/i }).first(), { after: 1400 });
      await s.caption("Enter their name, email and a temporary password.", 1000);
      await s.type(page.locator('input[name="fullname"]').last(), D.newHire.fullname);
      const username = page.locator('input[name="username"]').last();
      if (await username.count()) await s.type(username, D.newHire.username);
      await s.type(page.locator('input[name="email"]').last(), D.newHire.email);
      await s.type(page.locator('input[name="password"]').last(), D.tempPassword, { delay: 60 });
      await s.caption("They'll be asked to choose their own password the first time they log in.", 2400);
      await s.caption("Then go to step two, Professional Details.", 1000);
      await s.click(page.getByRole("button", { name: /next: professional details/i }).first(), { after: 1500 });
      await s.caption("Pick their System Role. This decides what they can see and do.", 1200);
      await s.pickByLabel("System Role", "Employee");
      const title = page.locator('input[name="title"]').last();
      if (await title.count()) await s.type(title, D.newHire.title);
      await s.caption("Click Create New User Account.", 1200);
      await s.click(page.getByRole("button", { name: /create new user account/i }).last(), { after: 2500 });
      const row = page.locator("tbody tr").filter({ hasText: D.newHire.fullname }).first();
      if (await row.count()) await s.highlight(row, "The new account is ready. Share the login details with them.", 3000);
      await s.clearCaption();
      await s.titleCard(KICKER, "User created", "Next: roles & permissions", 2500);
    },
  },

  {
    id: "admin-02-roles-and-permissions",
    title: "Roles & permissions",
    as: "admin",
    async run(s, page) {
      await s.goto("/roles");
      await s.titleCard(KICKER, "Roles & permissions", "Control who can see and do what");
      await s.caption("Each role, like Employee, QA or HR, has its own set of permissions.", 3000);
      const row = page.locator("tbody tr, [class*='card']").filter({ hasText: /^\s*QA\b/ }).first();
      const target = (await row.count()) ? row : page.locator("tbody tr").filter({ hasText: "QA" }).first();
      await s.caption("Click Edit to see what a role is allowed to do.", 1000);
      await s.click(target.locator(EDIT_BTN).first(), { after: 1500 });
      const transitions = page.getByText("Board Transitions").filter({ visible: true }).first();
      if (await transitions.count()) {
        await s.highlight(transitions, "Board Transitions: which ticket columns this role can move tickets into.", 3400);
      }
      const matrix = page.getByText("Permissions Matrix").filter({ visible: true }).first();
      if (await matrix.count()) {
        await s.highlight(matrix, "The Permissions Matrix: view, create, update and delete, page by page.", 3400);
        await page.mouse.wheel(0, 400);
        await s.wait(1200);
      }
      await s.caption("Changes apply to everyone with this role, so edit roles with care.", 3000);
      await s.closeModal();
      await s.clearCaption();
      await s.titleCard(KICKER, "That's roles", "Next: teams & projects", 2500);
    },
  },

  {
    id: "admin-03-teams-and-projects",
    title: "Teams & projects",
    as: "admin",
    async run(s, page) {
      await s.privacy([D.teamName, D.projectName]);
      await s.goto("/teams", { quick: true });
      await s.titleCard(KICKER, "Teams & projects", "Organise people and link them to client work", 3200, {
        during: () => page.waitForLoadState("networkidle").catch(() => {}),
      });
      await s.caption("A team groups people under a Team Lead.", 2400);
      const team = page.locator("tbody tr").filter({ hasText: D.teamName }).first();
      if (await team.count()) {
        await s.click(team.locator(EDIT_BTN).first(), { after: 1500 });
        const lead = page.getByText("Team Lead").filter({ visible: true }).first();
        if (await lead.count()) {
          await s.highlight(lead.locator("xpath=.."), "The Team Lead can assign tickets and approve the team's leave.", 3200);
        }
        await s.caption("Add or remove members here, then click Update Team.", 2600);
        await s.closeModal();
      }

      await s.goto("/projects");
      await s.caption("A project links clients to the teams doing the work.", 2600);
      const project = page.locator("tbody tr").filter({ hasText: D.projectName }).first();
      if (await project.count()) {
        await s.click(project.locator(EDIT_BTN).first(), { after: 1500 });
        const pm = page.getByText("Project Manager").filter({ visible: true }).first();
        if (await pm.count()) {
          await s.highlight(pm.locator("xpath=.."), "Set a Project Manager: they assign tickets and approve timesheets.", 3200);
        }
        await s.caption("Pick the clients and teams, then click Update Project.", 2600);
        await s.closeModal();
      }
      await s.clearCaption();
      await s.titleCard(KICKER, "Teams & projects", "Next: system settings", 2500);
    },
  },

  {
    id: "admin-04-system-settings",
    title: "System settings",
    as: "admin",
    async run(s, page) {
      await s.goto("/settings");
      await s.titleCard(KICKER, "System settings", "Options that apply to the whole company");
      await s.caption("Settings opens from the gear icon at the top right.", 2400);
      const ticketTab = page.locator('[class*="tabBtn"]').filter({ hasText: "Ticket Settings" }).first();
      if (await ticketTab.count()) {
        await s.click(ticketTab, { after: 1500 });
        await s.caption("Ticket Settings: choose whether resolved tickets close automatically.", 3400);
      }
      // The settings tab, not the notification bell in the header.
      const notif = page.locator('[class*="tabBtn"]').filter({ hasText: /^\s*Notifications\s*$/ }).first();
      if (await notif.count()) {
        await s.click(notif, { after: 1500 });
        const retention = page.getByText(/Global Notification Retention/i).filter({ visible: true }).first();
        if (await retention.count()) {
          await s.highlight(retention, "Admins can also set how long notifications are kept for everyone.", 3400);
        } else {
          await s.caption("Admins can also set how long notifications are kept for everyone.", 3400);
        }
      }
      await s.caption("These settings affect every user, so change them carefully.", 3000);
      await s.clearCaption();
      await s.titleCard(KICKER, "You're all set!", "Thanks for keeping things running", 3000);
    },
  },
];

// Employee tutorial journeys. Each entry becomes one short video.
// QA users share almost the same screens, so these work for QA onboarding too.
import { config } from "../config.js";

const E = config.demo.employee;
const KICKER = "Employee Guide";

export default [
  {
    id: "employee-01-login-and-dashboard",
    title: "Logging in & finding your way around",
    as: null,
    async run(s, page) {
      await s.goto("/login");
      await s.titleCard(KICKER, "Getting started", "Log in and tour the workspace");
      await s.caption("Log in with the username and password HR gave you.", 1200);
      await s.type(page.locator('input[name="identifier"]'), E.username);
      await s.type(page.locator('input[name="password"]'), config.demo.password, { delay: 70 });
      await s.click(page.locator('button[type="submit"]').first(), { after: 2500 });
      await s.dismissPopups();
      await s.caption("On first login you'll be asked to change your default password.", 3000);
      await s.caption("The dashboard shows your tickets, hours and team announcements.", 3200);
      await s.tourSidebar([
        ["Tickets", "Tickets: the board with the work assigned to you."],
        ["Requests", "Requests: track the status of things you've asked for."],
        ["Messages", "Messages: chat with teammates and clients."],
        ["Teams", "Teams: see who's on your team."],
        ["Projects", "Projects: the projects you're working on."],
        ["Timesheet", "Timesheet: log your daily hours and leave."],
        ["Interviews", "Interviews: interviews you're on the panel for."],
        ["Shoutouts", "Shoutouts: celebrate your colleagues."],
      ]);
      await s.clearCaption();
      await s.titleCard(KICKER, "Welcome aboard!", "Next: working on your tickets", 2500);
    },
  },

  {
    id: "employee-02-working-on-tickets",
    title: "Working on your tickets",
    as: "employee",
    async run(s, page, state) {
      await s.goto("/tickets/board");
      await s.titleCard(KICKER, "Working on tickets", "Pick up work, update status, talk to the client");
      await s.caption("The board shows the tickets assigned to you, grouped by status.", 3000);
      const card = page.getByText("Add CSV export to the reports page").first();
      await s.highlight(card, "Here's a new ticket assigned to you. Open it to start.", 2600);
      await s.goto(`/tickets/${state.tickets.assigned}`);

      await s.caption("Read the client's description, then move the ticket to In Process.", 1500);
      const statusTrigger = page
        .locator('span[class*="sidebarLabel"]', { hasText: "Status" })
        .locator("xpath=..")
        .locator('[class*="trigger"]')
        .first();
      await s.click(statusTrigger, { after: 800 });
      await s.click(
        page.locator('[class*="dropdown"] [class*="option"]').filter({ hasText: "In Process" }).first(),
        { after: 800 },
      );
      await s.caption("Click Update Ticket to save the change.", 1400);
      await s.click(page.getByRole("button", { name: /update ticket/i }).first(), { after: 2000 });

      await s.caption("Use comments to keep the client updated.", 1200);
      const box = page.getByPlaceholder("Type your message here...");
      await s.type(box, "Hi Sarah, I've started on the CSV export. Expect it in the next release.");
      await page.keyboard.press("Enter");
      await s.wait(900);
      const confirm = page.getByRole("button", { name: /yes, post comment/i });
      if (await confirm.count()) {
        await s.caption("Public comments are visible to the client, so the app asks you to confirm.", 2200);
        await s.click(confirm.first(), { after: 800 });
      }
      await page.waitForFunction(
        () => !document.querySelector('textarea[placeholder="Type your message here..."]')?.value,
        null,
        { timeout: 15000 },
      ).catch(() => {});
      await s.wait(1200);
      const internal = page.getByText(/^\s*internal/i).filter({ visible: true }).first();
      if (await internal.count()) {
        await s.highlight(internal, "Use the Internal tab for notes only your team should see.", 2800);
      }
      await s.caption("When you're done, set the status to Resolved so QA or the client can verify it.", 3400);
      await s.clearCaption();
      await s.titleCard(KICKER, "Ticket updated", "Next: filling in your timesheet", 2500);
    },
  },

  {
    id: "employee-03-timesheet",
    title: "Filling in your timesheet",
    as: "employee",
    async run(s, page) {
      await s.goto("/timesheet");
      await s.titleCard(KICKER, "Your timesheet", "Log hours every day and record leave");
      await s.caption("The calendar shows each day's status: Pending, Approved or Rejected.", 3000);
      const today = page.locator('[class*="dayCell"][class*="today"]').first();
      if (await today.count()) await s.click(today, { after: 1200 });

      await s.caption("Choose where you worked today.", 1000);
      await s.pickOption("Day Type", "Work From Home");
      await s.caption("The same list has Weekend, Public Holiday, and Half or Full Day Leave.", 3000);

      // The app pre-fills one task per ticket assigned to you.
      const tasksHeader = page.getByText("Tasks", { exact: true }).filter({ visible: true }).first();
      await s.highlight(
        tasksHeader.locator("xpath=.."),
        "Tickets assigned to you are added as tasks automatically.",
        3000,
      );
      const expandAll = page.getByRole("button", { name: /expand all/i }).first();
      if (await expandAll.count()) await s.click(expandAll, { after: 1000 });

      const project = page.locator("label", { hasText: /^\s*Project\s*$/ }).filter({ visible: true }).first();
      if (await project.count()) {
        await s.highlight(project.locator("xpath=.."), "Each task already has its project and linked ticket.", 2800);
      }

      await s.caption("Add a note on what you did…", 800);
      const editor = page.locator('[contenteditable="true"]').filter({ visible: true }).first();
      await s.click(editor, { after: 200 });
      await page.keyboard.press("Control+End");
      await page.keyboard.type(" Reproduced on iOS Safari and fixed the login form.", { delay: 40 });
      await s.wait(500);

      await s.caption("…and enter the hours for each task.", 800);
      const hours = page.locator('input[type="number"]').filter({ visible: true });
      const split = ["5", "3"];
      const n = Math.min(await hours.count(), split.length);
      for (let i = 0; i < n; i++) {
        await s.click(hours.nth(i), { after: 200 });
        await hours.nth(i).fill("");
        await hours.nth(i).pressSequentially(split[i], { delay: 120 });
        await s.wait(500);
      }

      const addTask = page.getByRole("button", { name: /add another task/i }).first();
      if (await addTask.count()) await s.highlight(addTask, "Worked on several things? Add another task.", 2400);

      await s.caption("Click Save Timesheet. Your manager and HR will review it.", 1400);
      await s.click(page.getByRole("button", { name: /save timesheet/i }).first(), { after: 2500 });
      await s.caption("Leave is deducted from your balance only after HR approves it.", 3200);
      await s.clearCaption();
      await s.titleCard(KICKER, "Timesheet saved", "Remember to log every working day", 2500);
    },
  },

  {
    id: "employee-04-teams-projects-requests",
    title: "Teams, projects & requests",
    as: "employee",
    async run(s, page) {
      await s.goto("/teams");
      await s.titleCard(KICKER, "Your team & projects", "Who you work with and what you work on");
      await s.caption("Teams lists your team, its lead and members.", 2400);
      const team = page.getByText(config.demo.teamName).first();
      if (await team.count()) await s.highlight(team, "Click a team to see its members.", 2200);

      await s.goto("/projects");
      await s.caption("Projects shows every project you're part of.", 2400);
      const project = page.getByText(config.demo.projectName).first();
      if (await project.count()) await s.highlight(project, "Open a project to see its tickets and team.", 2400);

      await s.goto("/requests");
      await s.caption("Requests shows the status of anything you've asked HR or admin for.", 3000);

      await s.goto("/interviews");
      await s.caption("If you're on an interview panel, your interviews show up here.", 3000);
      await s.clearCaption();
      await s.titleCard(KICKER, "That's the tour", "Next: messages & shoutouts", 2500);
    },
  },

  {
    id: "employee-05-messages-and-shoutouts",
    title: "Messages & shoutouts",
    as: "employee",
    async run(s, page) {
      await s.goto("/messages");
      await s.titleCard(KICKER, "Messages & shoutouts", "Stay connected with your colleagues");
      await s.caption("Click New Chat to message a colleague.", 1400);
      await s.click(page.getByRole("button", { name: /new chat/i }).first(), { after: 1200 });
      await s.type(page.getByPlaceholder("Search by name or email..."), "System Admin");
      await s.click(page.locator('[class*="userSelectItem"]').filter({ hasText: "System Admin" }).first(), { after: 1500 });
      await s.caption("Type your message and press Enter to send.", 1200);
      await s.type(
        page.getByPlaceholder("Type a message..."),
        "Hi! The mobile login fix is ready for review.",
      );
      await page.keyboard.press("Enter");
      await s.wait(1500);
      const group = page.locator('[title="New Group Chat"]').first();
      if (await group.count()) await s.highlight(group, "Start a group chat for a whole project team.", 2400);

      await s.goto("/announcements");
      await s.caption("Shoutouts: thank a colleague in front of the whole company.", 1400);
      await s.click(page.getByRole("button", { name: /create shoutout/i }).first(), { after: 1200 });
      await s.type(page.getByPlaceholder("Title").last(), "Thanks to the QA team!");
      const modal = page.locator('[role="dialog"], [class*="modal"]').filter({ hasText: "Create Shoutout" }).last();
      await s.typeInEditor("Huge thanks for testing the mobile login fix so quickly!", { scope: modal });
      const date = modal.locator('input[type="date"]').first();
      if (await date.count()) {
        await s.caption("Pick the date it should appear.", 800);
        await s.click(date, { after: 300 });
        await date.fill(new Date().toISOString().slice(0, 10));
        await s.wait(800);
      }
      await s.caption("Click Create Shoutout to post it.", 1000);
      await s.click(page.getByRole("button", { name: /^create shoutout$/i }).last(), { after: 1500 });
      // Fail loudly (with a screenshot) if the form didn't submit.
      await page.getByText("Thanks to the QA team!").filter({ visible: true }).first().waitFor({ timeout: 10000 });
      await s.caption("Your shoutout is posted for everyone to see.", 2800);
      await s.clearCaption();
      await s.titleCard(KICKER, "You're all set!", "Welcome to the team 🎉", 3000);
    },
  },
];

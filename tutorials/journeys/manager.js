// Project Manager tutorial journeys (role "Manager", roleType "agent").
// Managers can see company-wide lists, so every list screen runs behind the
// privacy filter (only demo records are shown) and loads under a title card.
import { config } from "../config.js";

const KICKER = "Project Manager Guide";
const D = config.demo;

/** "Nov 03, 2026" — how the review table shows a yyyy-mm-dd date. */
const dayLabel = (ymd) =>
  new Date(`${ymd}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

export default [
  {
    id: "manager-01-your-projects",
    title: "Your projects",
    as: "manager",
    async run(s, page, state) {
      await s.privacy([D.projectName]);
      await s.goto("/projects", { quick: true });
      await s.titleCard(KICKER, "Your projects", "Everything about a project in one place", 3200, {
        during: () => page.waitForLoadState("networkidle").catch(() => {}),
      });
      const row = page.locator("tbody tr").filter({ hasText: D.projectName }).first();
      await s.highlight(row, "Projects lists each project with its status, clients and teams.", 3000);
      await s.click(row, { after: 2500 });
      await s.privacy(null);
      await s.caption("The project page shows its manager, teams, clients and tickets.", 3200);
      const hours = page.getByText("Developer Hours").filter({ visible: true }).first();
      if (await hours.count()) {
        await s.highlight(hours, "Developer Hours shows the time each person has logged on this project.", 3400);
      }
      const edit = page.locator('[data-tooltip="Edit"] button, button[title="Edit"]').filter({ visible: true }).first();
      if (await edit.count()) {
        await s.highlight(edit, "Use Edit to change the project's status, teams or clients.", 2800);
      }
      await s.clearCaption();
      await s.titleCard(KICKER, "That's your project", "Next: assigning tickets", 2500);
    },
  },

  {
    id: "manager-02-assigning-tickets",
    title: "Assigning tickets & choosing QA",
    as: "manager",
    async run(s, page, state) {
      await s.goto("/tickets/board");
      await s.titleCard(KICKER, "Assigning tickets", "Pick who does the work, and who tests it");
      await s.caption("Your board shows every ticket in the projects you manage.", 3000);
      const card = page.getByText("Add dark mode to the customer dashboard").first();
      await s.highlight(card, "Here's a new request from the client. Let's assign it.", 2600);
      await s.goto(`/tickets/${state.tickets.unassignedManager}`);
      await s.caption("Choose the developer as the Assignee.", 1200);
      await s.pickByLabel("Assignee", D.employee.fullname);
      await s.caption("Then pick a QA Assignee to test it once it's done.", 1200);
      await s.pickByLabel("QA Assignee", D.qa.fullname);
      await s.caption("Click Update Ticket. Both of them are notified.", 1400);
      await s.click(page.getByRole("button", { name: /update ticket/i }).first(), { after: 2500 });
      await s.caption("You can also create tickets yourself and assign them straight away.", 3200);
      await s.clearCaption();
      await s.titleCard(KICKER, "Ticket assigned", "Next: approving timesheets", 2500);
    },
  },

  {
    id: "manager-03-approving-timesheets",
    title: "Approving timesheets",
    as: "manager",
    async run(s, page, state) {
      await s.goto("/timesheet");
      await s.titleCard(KICKER, "Approving timesheets", "Review the hours your team has logged");
      const review = page.getByRole("button", { name: /review pending/i }).first();
      await s.highlight(review, "On the Timesheet page, click Review Pending.", 2400);

      await s.privacy([D.employee.fullname]);
      await s.goto("/timesheet/review", { quick: true });
      await s.titleCard(KICKER, "Timesheet Approvals", "", 2600, {
        during: async () => {
          const search = page.getByPlaceholder("Search members...").first();
          await search.waitFor({ timeout: 15000 });
          await search.fill("Ali");
          await page.locator("button").filter({ hasText: D.employee.fullname }).first().click();
          await page.waitForLoadState("networkidle").catch(() => {});
        },
      });
      await s.caption("Pending shows the days waiting for you. Search on the right to pick a team member.", 3400);
      const workRow = page.locator("tbody tr").filter({ hasText: dayLabel(state.timesheets.workDay) }).first();
      await s.caption("Click the eye icon to see the tasks and hours for a day.", 1200);
      await s.click(workRow.locator("button").first(), { after: 1800 });
      await s.caption("Check the work, then click Approve. Or reject it with a reason.", 1600);
      await s.click(page.getByRole("button", { name: /^approve$/i }).last(), { after: 2000 });
      const leaveRow = page.locator("tbody tr").filter({ hasText: dayLabel(state.timesheets.leaveDay) }).first();
      if (await leaveRow.count()) {
        await s.highlight(leaveRow, "Leave days are listed too. The green tick approves without opening.", 2400);
        const tick = leaveRow.locator("button").nth(1);
        if (await tick.count()) await s.click(tick, { after: 2000 });
      }
      const tab = page.getByRole("button", { name: /^manager approved$/i }).first();
      if (await tab.count()) await s.click(tab, { after: 1500 });
      await s.caption("Approved days move to Manager Approved. HR then gives the final approval.", 3400);
      await s.clearCaption();
      await s.titleCard(KICKER, "Timesheets reviewed", "Next: leave requests", 2500);
    },
  },

  {
    id: "manager-04-leave-requests",
    title: "Approving leave requests",
    as: "manager",
    async run(s, page) {
      await s.privacy([D.qa.fullname, D.employee.fullname, D.lead.fullname]);
      await s.goto("/requests", { quick: true });
      await s.titleCard(KICKER, "Leave requests", "Approve or reject time off", 3200, {
        during: () => page.waitForLoadState("networkidle").catch(() => {}),
      });
      await s.caption("Requests lists leave and other requests waiting for a decision.", 3000);
      const row = page.locator("tbody tr").filter({ hasText: D.qa.fullname }).first();
      await s.highlight(row, "Each row shows the type, who asked and why.", 2600);
      await s.caption("Click the tick to approve, or the cross to reject.", 1200);
      await s.click(row.locator('span[data-tooltip="Approve"] button, [data-tooltip="Approve"]').first(), {
        after: 1800,
      });
      await s.caption("The person is notified, and approved leave comes off their balance.", 3000);
      await s.clearCaption();
      await s.titleCard(KICKER, "You're all set!", "Keep your projects moving", 3000);
    },
  },
];

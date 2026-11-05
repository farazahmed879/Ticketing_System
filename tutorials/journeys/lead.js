// Team Lead tutorial journeys. A team lead is an employee who leads a team, so
// these only cover what's extra on top of the employee videos.
import { config } from "../config.js";

const KICKER = "Team Lead Guide";
const EMP = config.demo.employee.fullname;

/** Opens the status dropdown in the ticket sidebar and picks `option`. */
async function setStatus(s, page, option) {
  const trigger = page
    .locator('span[class*="sidebarLabel"]', { hasText: "Status" })
    .locator("xpath=..")
    .locator('[class*="trigger"]')
    .first();
  await s.click(trigger, { after: 800 });
  await s.click(
    page.locator('[class*="dropdown"] [class*="option"]').filter({ hasText: option }).first(),
    { after: 800 },
  );
}

export default [
  {
    id: "lead-01-team-board-and-assigning",
    title: "Your team's board & assigning work",
    as: "lead",
    async run(s, page, state) {
      await s.goto("/tickets/board");
      await s.titleCard(KICKER, "Your team's board", "See your team's work and hand out new tickets");
      await s.caption("As a team lead, your board shows every ticket your team is working on.", 3000);
      const unassigned = page.getByText("Unassigned", { exact: true }).filter({ visible: true }).first();
      if (await unassigned.count()) {
        await s.highlight(unassigned, "New tickets in your team's projects land in Unassigned.", 3000);
      }
      const card = page.getByText("Contact form doesn't send a confirmation email").first();
      await s.highlight(card, "Open a new ticket to assign it to someone on your team.", 2600);
      await s.goto(`/tickets/${state.tickets.unassignedLead}`);

      await s.caption("Read the details, then pick a team member as the Assignee.", 1600);
      await s.pickByLabel("Assignee", EMP);
      await s.caption("The status changes to Assigned automatically.", 2200);
      await s.caption("Click Update Ticket to save. Your teammate is notified straight away.", 1600);
      await s.click(page.getByRole("button", { name: /update ticket/i }).first(), { after: 2500 });
      await s.clearCaption();
      await s.titleCard(KICKER, "Ticket assigned", "Next: approving finished work", 2500);
    },
  },

  {
    id: "lead-02-approving-finished-work",
    title: "Approving finished work",
    as: "lead",
    async run(s, page, state) {
      await s.goto("/tickets/board");
      await s.titleCard(KICKER, "Approving finished work", "Check what your team has completed");
      const done = page.getByText("Done", { exact: true }).filter({ visible: true }).first();
      if (await done.count()) {
        await s.highlight(done, "When a teammate finishes a ticket, it moves to Done.", 2800);
      }
      const card = page.getByText("Typo on the pricing page").first();
      await s.highlight(card, "Open it to review the work.", 2200);
      await s.goto(`/tickets/${state.tickets.doneForLead}`);

      await s.caption("Check the description, comments and history to see what was changed.", 3000);
      await s.caption("Happy with it? Set the status to Approved…", 1200);
      await setStatus(s, page, "Approved");
      await s.caption("…and click Update Ticket.", 1200);
      await s.click(page.getByRole("button", { name: /update ticket/i }).first(), { after: 2500 });
      await s.caption("If something needs fixing, leave a comment for your teammate instead.", 3200);
      await s.clearCaption();
      await s.titleCard(KICKER, "Work approved", "Next: your team's leave requests", 2500);
    },
  },

  {
    id: "lead-03-team-leave-requests",
    title: "Your team's leave requests",
    as: "lead",
    async run(s, page) {
      await s.goto("/requests");
      await s.titleCard(KICKER, "Leave requests", "Approve or reject time off for your team");
      await s.caption("Requests shows your own requests and those from your team members.", 3000);
      const row = page.locator("tbody tr").filter({ hasText: EMP }).first();
      await s.highlight(row, "Each row shows the type of leave, who asked, and why.", 3000);
      await s.caption("Click the tick to approve, or the cross to reject.", 1200);
      await s.click(row.locator('[data-tooltip="Approve"] button, span[data-tooltip="Approve"]').first(), {
        after: 1500,
      });
      await s.caption("Your teammate is notified, and approved leave comes off their balance.", 2400);
      await s.click(page.getByRole("button", { name: /^approved$/i }).first(), { after: 1000 });
      await s.caption("Approved requests move to the Approved tab.", 2600);
      await s.clearCaption();
      await s.titleCard(KICKER, "Request approved", "Next: a group chat for your team", 2500);
    },
  },

  {
    id: "lead-04-team-group-chat",
    title: "A group chat for your team",
    as: "lead",
    async run(s, page) {
      await s.goto("/messages");
      await s.titleCard(KICKER, "Team group chat", "Keep the whole team in one conversation");
      await s.caption("Team leads can create group chats. Click New Group Chat.", 1400);
      await s.click(page.locator('[title="New Group Chat"]').first(), { after: 1200 });
      await s.type(page.getByPlaceholder("Group name...").first(), "Website Revamp Team");
      await s.caption("Search for your teammates and add them.", 1000);
      await s.type(page.getByPlaceholder("Search members...").first(), "Ali");
      await s.click(page.getByText(EMP, { exact: false }).filter({ visible: true }).last(), { after: 800 });
      await s.caption("Then create the group.", 900);
      await s.click(page.getByRole("button", { name: /create group/i }).last(), { after: 2000 });
      await s.caption("Type a message and press Enter to send it to everyone.", 1000);
      await s.type(
        page.getByPlaceholder("Type a message...").first(),
        "Morning team! Please update your tickets before stand-up.",
      );
      await page.keyboard.press("Enter");
      await s.wait(1500);
      await s.caption("Clients can't be added to team group chats, so internal talk stays internal.", 3200);
      await s.clearCaption();
      await s.titleCard(KICKER, "You're all set!", "Lead your team with confidence", 3000);
    },
  },
];

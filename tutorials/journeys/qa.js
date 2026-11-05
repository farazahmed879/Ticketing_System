// QA tutorial journeys. QA staff share most screens with employees (timesheet,
// requests, messages), so these cover the testing workflow only.
const KICKER = "QA Guide";
const SUBJECT = "Footer links point to the old blog";

export default [
  {
    id: "qa-01-your-qa-board",
    title: "Your QA board",
    as: "qa",
    async run(s, page) {
      await s.goto("/tickets/board");
      await s.titleCard(KICKER, "Your QA board", "Find the work that's waiting for you to test");
      await s.caption("Your board shows the tickets where you're the QA tester.", 3000);
      const done = page.getByText("Done", { exact: true }).filter({ visible: true }).first();
      if (await done.count()) {
        await s.highlight(done, "When a developer finishes a ticket, it lands in Done, ready for you to test.", 3400);
      }
      const card = page.getByText(SUBJECT).first();
      await s.highlight(card, "Each card shows the priority, the project and who worked on it.", 3000);
      const approved = page.getByText("Approved", { exact: true }).filter({ visible: true }).first();
      if (await approved.count()) {
        await s.highlight(approved, "As QA, you move tickets to Approved once they pass your checks.", 3200);
      }
      await s.caption("The other columns are locked for you. Developers and leads manage those.", 3200);
      await s.clearCaption();
      await s.titleCard(KICKER, "That's your board", "Next: testing a ticket", 2500);
    },
  },

  {
    id: "qa-02-testing-and-feedback",
    title: "Testing a ticket & giving feedback",
    as: "qa",
    async run(s, page, state) {
      await s.goto(`/tickets/${state.tickets.awaitingQa}`);
      await s.titleCard(KICKER, "Testing a ticket", "Check the fix and tell the team what you found");
      await s.caption("Start with the description: it tells you what was broken and what to test.", 3200);
      const internalTab = page.getByText(/^\s*internal/i).filter({ visible: true }).first();
      await s.click(internalTab, { after: 1200 });
      await s.caption("The Internal tab has the developer's notes. Only staff can see these.", 3000);
      await s.caption("Found something? Leave an internal note for the developer.", 1200);
      const box = page.getByPlaceholder(/internal note/i).first();
      await s.type(
        box,
        "Tested on Chrome and Safari: Blog now opens the new site. Careers link still goes to the old page.",
      );
      await page.keyboard.press("Enter");
      await s.wait(1200);
      const confirm = page.getByRole("button", { name: /yes, post comment/i });
      if (await confirm.count()) await s.click(confirm.first(), { after: 1000 });
      await s.wait(1200);
      await s.caption("The developer is notified, fixes it, and moves the ticket back to Done.", 3200);
      const history = page.getByText("History", { exact: true }).filter({ visible: true }).first();
      if (await history.count()) {
        await s.click(history, { after: 1200 });
        await s.caption("History shows every change to the ticket and who made it.", 3000);
      }
      await s.clearCaption();
      await s.titleCard(KICKER, "Feedback sent", "Next: approving a ticket", 2500);
    },
  },

  {
    id: "qa-03-approving-a-ticket",
    title: "Approving a ticket",
    as: "qa",
    async run(s, page, state) {
      await s.goto(`/tickets/${state.tickets.awaitingQa}`);
      await s.titleCard(KICKER, "Approving a ticket", "Sign off when everything works");
      await s.caption("Everything works as expected? Open the Status menu.", 1200);
      const trigger = page
        .locator('span[class*="sidebarLabel"]', { hasText: "Status" })
        .locator("xpath=..")
        .locator('[class*="trigger"]')
        .first();
      await s.click(trigger, { after: 1000 });
      await s.caption("Pick Approved from the list.", 1400);
      await s.click(
        page.locator('[class*="dropdown"] [class*="option"]').filter({ hasText: "Approved" }).first(),
        { after: 800 },
      );
      await s.caption("Click Update Ticket to save it.", 1200);
      await s.click(page.getByRole("button", { name: /update ticket/i }).first(), { after: 2500 });
      await s.caption("The developer, their lead and the client are told it's been approved.", 3200);
      await s.goto("/tickets/board");
      const approvedCard = page.getByText(SUBJECT).first();
      if (await approvedCard.count()) {
        await s.highlight(approvedCard, "It now sits in the Approved column.", 2800);
      }
      await s.caption("Timesheets, requests and messages work just like in the Employee guide.", 3400);
      await s.clearCaption();
      await s.titleCard(KICKER, "You're all set!", "Happy testing", 3000);
    },
  },
];

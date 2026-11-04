// Client (customer) tutorial journeys. Each entry becomes one short video.
import { config } from "../config.js";

const C = config.demo.client;
const KICKER = "Client Guide";

export default [
  {
    id: "client-01-login-and-dashboard",
    title: "Logging in & your dashboard",
    as: null, // starts logged out to show the login screen
    async run(s, page) {
      await s.goto("/login");
      await s.titleCard(KICKER, "Logging in & your dashboard", "Sign in and find your way around");
      await s.caption("Open the portal link your account manager sent you.");
      await s.type(page.locator('input[name="identifier"]'), C.username);
      await s.caption("Enter your username or email…", 1200);
      await s.type(page.locator('input[name="password"]'), config.demo.password, { delay: 70 });
      await s.caption("…and your password, then click Sign In.", 1400);
      await s.click(page.locator('button[type="submit"]').first(), { after: 2500 });
      await s.dismissPopups();

      await s.caption("This is your dashboard: a quick summary of all your tickets.", 3200);
      await s.tourSidebar([
        ["Dashboard", "Dashboard: your ticket overview."],
        ["Tickets", "Tickets: raise new issues and track existing ones."],
        ["Messages", "Messages: chat directly with the team working on your project."],
        ["Reviews", "Reviews: share feedback about our service."],
      ]);
      await s.caption("First time logging in? You'll be asked to set your own password.", 3000);
      await s.clearCaption();
      await s.titleCard(KICKER, "That's it!", "Next: how to raise a ticket", 2500);
    },
  },

  {
    id: "client-02-raise-a-ticket",
    title: "Raising a ticket",
    as: "client",
    async run(s, page) {
      await s.goto("/tickets/board");
      await s.titleCard(KICKER, "Raising a ticket", "Report an issue or request a change");
      await s.caption("Go to Tickets and click Create Ticket.");
      await s.click(page.getByRole("button", { name: /create ticket/i }).first(), { after: 1200 });

      const modal = page.locator('[role="dialog"], [class*="modal"]').filter({ hasText: "Create New Ticket" }).last();
      await s.caption("Give it a short, clear subject.", 1000);
      await s.type(page.locator('input[name="subject"]'), "Checkout button not responding on Safari");

      await s.caption("Choose the project this ticket is about.", 1200);
      await s.pickOption("Project", config.demo.projectName, { scope: modal });

      await s.caption("Pick a type: Issue for problems, Request for new work.", 1500);
      await s.pickOption("Type", "Issue", { scope: modal });

      await s.caption("Set the priority so the team knows how urgent it is.", 1500);
      await s.click(modal.locator("label").filter({ hasText: /^\s*High\s*$/ }).first());

      await s.caption("Describe what happened: steps, what you expected, and what you saw.", 1200);
      await s.typeInEditor(
        "1. Add any item to the cart  2. Click Checkout on Safari (macOS)  → Nothing happens. Works in Chrome.",
        { scope: modal },
      );
      const attach = modal.getByRole("button", { name: /attach|image|file/i }).first();
      if (await attach.count()) {
        await s.highlight(attach, "Tip: attach screenshots to help us fix it faster.", 2400);
      }

      await s.caption("Click Create Ticket to submit.", 1400);
      await s.click(page.getByRole("button", { name: /^create ticket$/i }).last(), { after: 2500 });
      let created = page.getByText("Checkout button not responding on Safari").first();
      if (!(await created.isVisible().catch(() => false))) {
        await s.goto("/tickets/board");
        created = page.getByText("Checkout button not responding on Safari").first();
      }
      await s.highlight(
        created,
        "Done! Your ticket is on the board under Unassigned, and the team is notified.",
        3400,
      );
      await s.clearCaption();
      await s.titleCard(KICKER, "Ticket submitted", "Next: tracking progress & replying", 2500);
    },
  },

  {
    id: "client-03-track-and-reply",
    title: "Tracking a ticket & replying",
    as: "client",
    async run(s, page, state) {
      await s.goto("/tickets/board");
      await s.titleCard(KICKER, "Tracking your ticket", "See status updates and talk to the team");
      await s.caption("Each column on the board is a stage your ticket moves through.", 3000);

      const card = page.getByText("Login page shows an error on mobile").first();
      await s.highlight(card, "Click a ticket to open it.", 2200);
      await s.goto(`/tickets/${state.tickets.inProcess}`);

      const statusLabel = page.getByText("Status", { exact: true }).first();
      if (await statusLabel.count()) {
        await s.highlight(statusLabel.locator("xpath=.."), "Status shows where it is. This one is In Process.", 2800);
      }
      const reply = page.getByText("I can reproduce it on iOS Safari").first();
      await s.highlight(reply, "Updates from the team appear in the conversation.", 2800);

      await s.caption("Reply right here. Press Enter to send.", 1200);
      const box = page.getByPlaceholder("Type your message here...");
      await s.type(box, "Thanks Ali! It happens on iPhone 15, iOS 18. Happy to test the fix.");
      await page.keyboard.press("Enter");
      await page.waitForFunction(
        () => !document.querySelector('textarea[placeholder="Type your message here..."]')?.value,
        null,
        { timeout: 15000 },
      ).catch(() => {});
      await s.wait(1500);
      await s.caption("You'll get a notification whenever the ticket is updated or resolved.", 3200);
      await s.clearCaption();
      await s.titleCard(KICKER, "Stay in the loop", "Next: chatting with your team", 2500);
    },
  },

  {
    id: "client-04-messages",
    title: "Chatting with your team",
    as: "client",
    async run(s, page) {
      await s.goto("/messages");
      await s.titleCard(KICKER, "Messages", "Chat directly with our support team");
      await s.caption("Need help quickly? Click Contact Support.", 1400);
      await s.click(page.getByRole("button", { name: /contact support/i }).first(), { after: 1200 });
      await s.caption("Choose who you'd like to talk to.", 1000);
      await s.type(page.getByPlaceholder("Search by name or email..."), "System Admin");
      await s.click(page.locator('[class*="userSelectItem"]').filter({ hasText: "System Admin" }).first(), { after: 1500 });
      await s.caption("Type your message and press Enter to send.", 1000);
      const input = page.getByPlaceholder("Type a message...");
      await s.type(input, "Hi! Could we get a quick update on the mobile login issue?");
      await page.keyboard.press("Enter");
      await s.wait(1500);
      const emoji = page.locator('[title="Add emoji"]').first();
      if (await emoji.count()) await s.highlight(emoji, "You can also add emojis and attach files.", 2400);
      await s.caption("Your conversations stay listed on the left, so you can come back to them any time.", 3000);
      await s.caption("Use Messages for quick questions. Use tickets for issues you need tracked.", 3400);
      await s.clearCaption();
      await s.titleCard(KICKER, "That's Messages", "Next: leaving a review", 2500);
    },
  },

  {
    id: "client-05-reviews",
    title: "Leaving a review",
    as: "client",
    async run(s, page) {
      await s.goto("/announcements");
      await s.titleCard(KICKER, "Reviews", "Tell us how we're doing");
      await s.caption("Open Reviews and click Create Review.", 1400);
      await s.click(page.getByRole("button", { name: /create review/i }).first(), { after: 1200 });
      await s.type(page.getByPlaceholder("Title").last(), "Great support on the website revamp");
      const modal = page.locator('[role="dialog"], [class*="modal"]').filter({ hasText: "Create Review" }).last();
      await s.typeInEditor(
        "Ali fixed our login issue within a day and kept us updated the whole time. Thank you!",
        { scope: modal },
      );
      await s.caption("Click Create Review to post it.", 1200);
      await s.click(page.getByRole("button", { name: /^create review$/i }).last(), { after: 2200 });
      await s.caption("Your review is shared with the team, and you can edit or delete it later.", 3200);
      await s.clearCaption();
      await s.titleCard(KICKER, "You're all set!", "Questions? Message your team any time.", 3000);
    },
  },
];

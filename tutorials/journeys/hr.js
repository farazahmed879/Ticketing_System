// HR tutorial journeys. HR screens list company-wide data (all timesheets,
// candidates, users), so every list runs behind the privacy filter and loads
// under a title card; dropdowns are filtered too.
import { config } from "../config.js";

const KICKER = "HR Guide";
const D = config.demo;

/** "Nov 03, 2026" — how the review table shows a yyyy-mm-dd date. */
const dayLabel = (ymd) =>
  new Date(`${ymd}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
const DEMO_PEOPLE = [D.employee.fullname, D.lead.fullname, D.qa.fullname, D.manager.fullname, D.hr.fullname];
const CANDIDATES = [D.candidate.name, "Fatima Noor"];
// Table rows plus dropdown options (candidate and panel pickers list real people).
const PRIVATE = ["tbody tr", '[class*="dropdown"] [class*="option"]'];

export default [
  {
    id: "hr-01-final-timesheet-approval",
    title: "Final timesheet approval",
    as: "hr",
    async run(s, page, state) {
      await s.privacy([D.employee.fullname]);
      await s.goto("/timesheet/review", { quick: true });
      await s.titleCard(KICKER, "Final timesheet approval", "HR gives the last sign-off on every day", 3400, {
        during: async () => {
          const search = page.getByPlaceholder("Search members...").first();
          await search.waitFor({ timeout: 15000 });
          await search.fill("Ali");
          await page.locator("button").filter({ hasText: D.employee.fullname }).first().click();
          await page.waitForLoadState("networkidle").catch(() => {});
        },
      });
      await s.caption("Timesheet Approvals lists the days still waiting for HR approval.", 3000);
      const workRow = page.locator("tbody tr").filter({ hasText: dayLabel(state.timesheets.workDay) }).first();
      await s.highlight(workRow, "Manager Status shows whether the manager has already checked it.", 3000);
      await s.caption("Open a day with the eye icon to see the tasks and hours.", 1200);
      await s.click(workRow.locator("button").first(), { after: 1800 });
      await s.caption("Click Approve to give the final approval.", 1400);
      await s.click(page.getByRole("button", { name: /^approve$/i }).last(), { after: 2000 });
      const leaveRow = page.locator("tbody tr").filter({ hasText: dayLabel(state.timesheets.leaveDay) }).first();
      if (await leaveRow.count()) {
        await s.highlight(leaveRow, "Leave days need HR approval too.", 2200);
        const tick = leaveRow.locator("button").nth(1);
        if (await tick.count()) await s.click(tick, { after: 2000 });
        await s.caption("When HR approves a leave day, it's deducted from the person's leave balance.", 3400);
      }
      await s.clearCaption();
      await s.titleCard(KICKER, "Timesheets approved", "Next: adding a candidate", 2500);
    },
  },

  {
    id: "hr-02-adding-a-candidate",
    title: "Adding a candidate",
    as: "hr",
    async run(s, page) {
      await s.privacy(CANDIDATES, PRIVATE);
      await s.goto("/candidates", { quick: true });
      await s.titleCard(KICKER, "Candidates", "Keep every applicant in one place", 3200, {
        during: () => page.waitForLoadState("networkidle").catch(() => {}),
      });
      await s.caption("Candidates holds everyone who has applied. Search by name, skill or position.", 3200);
      await s.click(page.getByRole("button", { name: /add candidate/i }).first(), { after: 1200 });
      await s.caption("Fill in their details. Name, position and email are required.", 1200);
      await s.type(page.locator('input[name="name"]').last(), D.candidate.name);
      await s.type(page.getByPlaceholder("e.g. Senior Backend Developer").last(), D.candidate.position);
      await page.keyboard.press("Tab");
      await s.type(page.locator('input[name="email"]').last(), D.candidate.email);
      const city = page.locator('input[name="city"]').last();
      if (await city.count()) await s.type(city, "Karachi");
      await s.caption("You can also add links, a resume and notes.", 2000);
      await s.click(page.getByRole("button", { name: /create candidate/i }).last(), { after: 2500 });
      const row = page.locator("tbody tr").filter({ hasText: D.candidate.name }).first();
      await row.waitFor({ timeout: 15000 });
      await s.highlight(row, "The candidate is added to the list, ready for an interview.", 3000);
      await s.clearCaption();
      await s.titleCard(KICKER, "Candidate added", "Next: scheduling an interview", 2500);
    },
  },

  {
    id: "hr-03-scheduling-an-interview",
    title: "Scheduling an interview",
    as: "hr",
    async run(s, page) {
      await s.privacy([...CANDIDATES, ...DEMO_PEOPLE], PRIVATE);
      await s.goto("/interviews", { quick: true });
      await s.titleCard(KICKER, "Scheduling interviews", "Book a slot and choose the panel", 3200, {
        during: () => page.waitForLoadState("networkidle").catch(() => {}),
      });
      await s.caption("Interviews lists every interview: upcoming, today and completed.", 2800);
      await s.click(page.getByRole("button", { name: /schedule interview/i }).first(), { after: 1200 });
      await s.type(page.locator('input[name="title"]').last(), "Technical Round 1");
      await s.caption("Choose the candidate…", 800);
      await s.pickByLabel("Candidate", "Fatima Noor");
      // react-datepicker: open it, click a day 3 days ahead, then a time slot.
      await s.caption("…the date and time…", 800);
      const when = page
        .locator("label", { hasText: /^\s*Date & Time/ })
        .locator("xpath=..")
        .locator("input")
        .first();
      await s.click(when, { after: 800 });
      const d = new Date(Date.now() + 3 * 864e5);
      if (d.getMonth() !== new Date().getMonth()) {
        await s.click(page.locator(".react-datepicker__navigation--next").first(), { after: 600 });
      }
      const dd = String(d.getDate()).padStart(3, "0");
      await s.click(
        page.locator(`.react-datepicker__day--${dd}:not(.react-datepicker__day--outside-month)`).first(),
        { after: 600 },
      );
      const slot = page.locator(".react-datepicker__time-list-item").filter({ hasText: /^11:00/ }).first();
      if (await slot.count()) await s.click(slot, { after: 600 });
      await s.type(page.locator('input[name="location"]').last(), "Meeting Room 2");
      await s.caption("…and the interview panel.", 800);
      await s.pickByLabel("Interview Panel", D.lead.fullname);
      // Close the panel dropdown by clicking its label.
      await page.getByText("Interview Panel").filter({ visible: true }).first().click().catch(() => {});
      await s.caption("Click Schedule Interview. The panel is notified and gets a ticket for it.", 1600);
      await s.click(page.getByRole("button", { name: /^schedule interview$/i }).last(), { after: 2500 });
      const row = page.locator("tbody tr").filter({ hasText: "Fatima Noor" }).first();
      await row.waitFor({ timeout: 15000 }); // fail loudly if scheduling didn't work
      await s.highlight(row, "After the interview, the panel adds ratings and a recommendation here.", 3200);
      await s.clearCaption();
      await s.titleCard(KICKER, "Interview scheduled", "Next: managing employees", 2500);
    },
  },

  {
    id: "hr-04-employees-and-leave-balance",
    title: "Employees & leave balances",
    as: "hr",
    async run(s, page) {
      await s.privacy(["@tutorial.local"]);
      await s.goto("/users", { quick: true });
      await s.titleCard(KICKER, "Employees", "Profiles, roles and leave balances", 3200, {
        during: async () => {
          const search = page.getByPlaceholder("Search users...").first();
          await search.waitFor({ timeout: 15000 });
          await search.fill("Ali Raza");
          await page.waitForLoadState("networkidle").catch(() => {});
          await page.waitForTimeout(800);
        },
      });
      await s.caption("Users lists everyone in the company. Search to find a person.", 2800);
      const row = page.locator("tbody tr").filter({ hasText: D.employee.fullname }).first();
      await s.caption("Click Edit to update their details.", 1000);
      await s.click(row.locator('[data-tooltip="Edit"] button, [data-tooltip="Edit"]').first(), { after: 1500 });
      await s.caption("The form has two steps. Leave balance is under Professional Details.", 1400);
      await s.click(page.getByRole("button", { name: /next: professional details/i }).first(), { after: 1500 });
      const balance = page.getByText("Leave Balance (days)").filter({ visible: true }).first();
      if (await balance.count()) {
        await s.highlight(balance.locator("xpath=.."), "Leave Balance shows the days left, and HR can correct it here.", 3400);
      }
      const lead = page.getByText("Is Team Lead").filter({ visible: true }).first();
      if (await lead.count()) {
        await s.highlight(lead.locator("xpath=.."), "Is Team Lead lets someone approve their team's requests.", 3000);
      }
      await s.caption("Save with Update User Account, or close the form to leave it unchanged.", 2600);
      await s.closeModal();
      await s.clearCaption();
      await s.titleCard(KICKER, "You're all set!", "Thanks for looking after the team", 3000);
    },
  },
];

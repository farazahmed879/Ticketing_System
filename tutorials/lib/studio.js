// Recording "studio": launches a browser that records video, and gives journeys
// presentation helpers — on-screen captions, a visible cursor, slow typing and
// helpers for this app's custom components (CustomSelect, editor, etc).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { login } from "./api.js";
import { synth, voiceConfig } from "./voice.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms * config.pace));

// Injected into every page: a visible cursor that follows the mouse and pulses
// on click, plus containers for captions and title cards.
const OVERLAY_SCRIPT = () => {
  const install = () => {
    if (document.getElementById("__tut_cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      #__tut_cursor{position:fixed;z-index:2147483647;width:22px;height:22px;margin:-11px 0 0 -11px;
        border-radius:50%;background:rgba(255,196,0,.55);border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35);
        pointer-events:none;transition:transform .12s ease,background .12s ease;left:-100px;top:-100px}
      #__tut_cursor.down{transform:scale(.7);background:rgba(255,120,0,.85)}
      #__tut_caption{position:fixed;z-index:2147483646;left:50%;bottom:18px;transform:translateX(-50%);
        width:max-content;max-width:90vw;padding:12px 24px;border-radius:14px;background:rgba(10,14,28,.88);color:#fff;
        font:600 22px/1.4 Inter,Segoe UI,sans-serif;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.35);
        pointer-events:none;opacity:0;transition:opacity .3s ease}
      #__tut_caption.show{opacity:1}
      #__tut_title{position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:14px;background:linear-gradient(135deg,#0f172a,#312e81);
        color:#fff;font-family:Inter,Segoe UI,sans-serif;pointer-events:none;opacity:0;transition:opacity .4s ease}
      #__tut_title.show{opacity:1}
      #__tut_title .k{font-size:20px;letter-spacing:.2em;text-transform:uppercase;color:#a5b4fc}
      #__tut_title .t{font-size:52px;font-weight:800}
      #__tut_title .s{font-size:22px;color:#cbd5e1;max-width:900px;text-align:center}
      .__tut_hl{outline:3px solid #facc15 !important;outline-offset:4px !important;border-radius:8px;
        transition:outline-color .3s ease}
    `;
    document.documentElement.appendChild(style);
    const c = document.createElement("div");
    c.id = "__tut_cursor";
    document.documentElement.appendChild(c);
    const cap = document.createElement("div");
    cap.id = "__tut_caption";
    document.documentElement.appendChild(cap);
    const title = document.createElement("div");
    title.id = "__tut_title";
    document.documentElement.appendChild(title);
    addEventListener("mousemove", (e) => {
      c.style.left = e.clientX + "px";
      c.style.top = e.clientY + "px";
    }, true);
    addEventListener("mousedown", () => c.classList.add("down"), true);
    addEventListener("mouseup", () => c.classList.remove("down"), true);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else install();
};

export async function launchBrowser() {
  return chromium.launch({
    executablePath: config.browserPath,
    headless: config.headless,
    args: ["--hide-scrollbars", "--disable-notifications"],
  });
}

/**
 * Opens a recording session for one journey.
 * @param {object} opts
 * @param {'client'|'employee'|null} opts.as  pre-authenticate as this demo user (null = logged out)
 * @param {string} opts.videoName  output file name without extension
 */
/** `webmDir`: where the finished .webm goes (defaults to outDir; cues + storyboard stay in outDir). */
export async function openSession(browser, { as, videoName, outDir, webmDir = outDir }) {
  const rawDir = path.join(outDir, ".raw");
  fs.mkdirSync(rawDir, { recursive: true });

  let token = null;
  if (as === "admin") {
    ({ token } = await login(config.admin.identifier, config.admin.password));
  } else if (as) {
    ({ token } = await login(config.demo[as].username, config.demo.password));
  }

  const context = await browser.newContext({
    viewport: config.viewport,
    deviceScaleFactor: 1,
    colorScheme: "dark",
    recordVideo: { dir: rawDir, size: config.viewport },
  });
  await context.addInitScript(OVERLAY_SCRIPT);
  await context.addInitScript((t) => {
    try {
      if (t) localStorage.setItem("token", t);
      // Hide first-run tours / popups that would distract in a tutorial.
      sessionStorage.setItem("__tutorial", "1");
    } catch {}
  }, token);

  const page = await context.newPage();
  const t0 = Date.now(); // video recording starts with the page
  // Accounts still on a default password get a "Change Default Password" dialog
  // that blocks the page. "Remind Me Later" dismisses it without changing anything.
  await page.addLocatorHandler(
    page.getByRole("button", { name: /remind me later/i }),
    async (btn) => {
      await btn.click();
    },
  );
  // Storyboard: a screenshot at every caption, for reviewing a take quickly.
  const storyDir = path.join(outDir, "storyboard", videoName);
  fs.rmSync(storyDir, { recursive: true, force: true });
  fs.mkdirSync(storyDir, { recursive: true });
  const s = new Studio(page, storyDir, t0);

  return {
    page,
    s,
    async finish() {
      const video = page.video();
      await page.waitForTimeout(800);
      await context.close();
      if (video) {
        fs.mkdirSync(webmDir, { recursive: true });
        const target = path.join(webmDir, `${videoName}.webm`);
        await video.saveAs(target);
        await video.delete();
        // Cue sheet: when each caption/title appeared — used by voiceover.js.
        fs.writeFileSync(
          path.join(outDir, `${videoName}.cues.json`),
          JSON.stringify({ video: `${videoName}.webm`, cues: s.cues }, null, 2),
        );
        return target;
      }
    },
  };
}

export class Studio {
  constructor(page, storyDir, t0 = Date.now()) {
    this.page = page;
    this.storyDir = storyDir;
    this.shot = 0;
    this.t0 = t0;
    this.cues = [];
  }

  /** Records a narration cue; returns how long (ms) the narration needs on screen. */
  async cue(kind, text, shownAt = Date.now()) {
    let needMs = 0;
    if (voiceConfig.enabled) {
      // Generate before showing, so the cached clip's length is known up front.
      const { duration } = await synth(text);
      needMs = duration * 1000 + 350;
    }
    this.cues.push({ t: (shownAt - this.t0) / 1000, kind, text });
    return needMs;
  }

  /** Waits until at least `needMs` have passed since `start`. */
  async holdFor(start, needMs) {
    const left = needMs - (Date.now() - start);
    if (left > 0) await new Promise((r) => setTimeout(r, left));
  }

  async snap(label) {
    if (!this.storyDir) return;
    const n = String(++this.shot).padStart(2, "0");
    const name = `${n}-${label.replace(/[^a-z0-9]+/gi, "-").slice(0, 50)}.png`;
    await this.page.screenshot({ path: path.join(this.storyDir, name) }).catch(() => {});
  }

  wait(ms) {
    return wait(ms);
  }

  /** `quick`: return as soon as the HTML is parsed (show a title card over the load). */
  async goto(route, { quick = false } = {}) {
    await this.page.goto(config.appUrl + route, { waitUntil: "domcontentloaded" });
    if (this.privacyRule) await this.applyPrivacy();
    if (quick) return;
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.dismissPopups();
  }

  /**
   * Privacy filter for the shared database: hides list rows/cards that don't
   * mention one of the `allow` strings (demo names, emails, ticket subjects),
   * so real people's data never appears on camera. Stays on until
   * privacy(null); re-applied after every goto().
   */
  async privacy(allow, selectors = DEFAULT_PRIVATE_ROWS) {
    this.privacyRule = allow ? { allow, selectors } : null;
    await this.applyPrivacy();
  }

  async applyPrivacy() {
    await this.page.evaluate((rule) => {
      window.__tutPrivacy?.disconnect();
      document.querySelectorAll("[data-tut-hidden]").forEach((el) => {
        el.style.display = el.dataset.tutHidden === "-" ? "" : el.dataset.tutHidden;
        delete el.dataset.tutHidden;
      });
      if (!rule) return;
      const allow = rule.allow.map((a) => a.toLowerCase());
      const scan = () => {
        for (const el of document.querySelectorAll(rule.selectors.join(","))) {
          if (el.dataset.tutHidden !== undefined) continue;
          const text = (el.textContent || "").toLowerCase();
          if (!text.trim() || allow.some((a) => text.includes(a))) continue;
          el.dataset.tutHidden = el.style.display || "-";
          el.style.display = "none";
        }
      };
      scan();
      window.__tutPrivacy = new MutationObserver(scan);
      window.__tutPrivacy.observe(document.documentElement, { childList: true, subtree: true });
    }, this.privacyRule);
  }

  /** Closes the open modal with its X button (the app's Modal ignores Escape). */
  async closeModal() {
    const x = this.page.locator('button[class*="closeBtn"]').filter({ visible: true }).last();
    if (await x.count()) await this.click(x, { after: 800 });
  }

  /** Picks an option in the select next to a sidebar/form label (exact label text). */
  async pickByLabel(label, option, { scope } = {}) {
    const root = scope || this.page;
    const lbl = root
      .locator("label, span")
      .filter({ hasText: new RegExp("^\\s*" + escapeRe(label) + "\\s*\\*?\\s*$") })
      .filter({ visible: true })
      .first();
    const trigger = lbl.locator("xpath=..").locator('[class*="trigger"]').first();
    await this.click(trigger, { after: 700 });
    const search = this.page.locator('[class*="dropdown"] input').filter({ visible: true }).first();
    if (await search.count()) {
      await search.pressSequentially(option.split(" ")[0], { delay: 60 * config.pace });
      await wait(500);
    }
    const opt = this.page.locator('[class*="dropdown"] [class*="option"]').filter({ hasText: option }).first();
    await this.click(opt, { after: 800 });
  }

  /** Full-screen intro/outro card. */
  async titleCard(kicker, title, subtitle = "", ms = 3200, { during } = {}) {
    // Show the card first (it may be covering a page that is still loading),
    // then fetch its narration; the cue is timed from when it appeared.
    const start = Date.now();
    await this.page.evaluate(
      ([k, t, s, instant]) => {
        const el = document.getElementById("__tut_title");
        if (!el) return;
        el.innerHTML = `<div class="k">${k}</div><div class="t">${t}</div><div class="s">${s}</div>`;
        if (instant) {
          el.style.transition = "none";
          el.classList.add("show");
          el.offsetHeight; // apply without animating, then restore the fade-out
          el.style.transition = "";
        } else el.classList.add("show");
      },
      [kicker, title, subtitle, !!during],
    );
    const needMs = await this.cue(
      "title",
      !subtitle ? title : /[.!?]$/.test(title) ? `${title} ${subtitle}` : `${title}. ${subtitle}`,
      start,
    );
    // `during` runs while the card hides the page, e.g. loading and filtering a
    // list so real records never appear on camera.
    await Promise.all([wait(ms), during ? during().then(() => this.dismissPopups()) : null]);
    await this.holdFor(start, needMs);
    await this.page.evaluate(() =>
      document.getElementById("__tut_title")?.classList.remove("show"),
    );
    await wait(500);
  }

  /** Bottom-of-screen subtitle. Stays until the next caption or clearCaption(). */
  async caption(text, ms = 2600) {
    const needMs = await this.cue("caption", text);
    const start = Date.now();
    await this.page.evaluate((t) => {
      const el = document.getElementById("__tut_caption");
      if (!el) return;
      el.textContent = t;
      el.classList.add("show");
    }, text);
    await wait(Math.min(ms, 400));
    await this.snap(text);
    await wait(Math.max(0, ms - 400));
    await this.holdFor(start, needMs);
  }

  async clearCaption() {
    await this.page.evaluate(() =>
      document.getElementById("__tut_caption")?.classList.remove("show"),
    );
    await wait(300);
  }

  /** Smoothly moves the visible cursor to an element. */
  async moveTo(locator) {
    await locator.waitFor({ state: "visible", timeout: 15000 });
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) return;
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 28 });
    await wait(250);
  }

  async click(locator, { after = 700 } = {}) {
    await this.moveTo(locator);
    await locator.click();
    await wait(after);
  }

  /** Outline an element for a moment (with optional caption) without clicking. */
  async highlight(locator, text, ms = 2200) {
    await this.moveTo(locator);
    const handle = await locator.elementHandle();
    await handle?.evaluate((el) => el.classList.add("__tut_hl"));
    if (text) await this.caption(text, ms);
    else await wait(ms);
    await handle?.evaluate((el) => el.classList.remove("__tut_hl")).catch(() => {});
  }

  async type(locator, text, { delay = 45 } = {}) {
    await this.click(locator, { after: 200 });
    await locator.pressSequentially(text, { delay: delay * config.pace });
    await wait(400);
  }

  /** CustomSelect: open the select whose label starts with `label`, pick `option`. */
  async pickOption(label, option, { scope } = {}) {
    const root = scope || this.page;
    const container = root
      .locator('div[class*="container"]')
      .filter({ has: this.page.locator("label", { hasText: new RegExp(`^\\s*${escapeRe(label)}`) }) })
      .last();
    await this.click(container.locator('[class*="trigger"]').first(), { after: 600 });
    const opt = this.page
      .locator('[class*="dropdown"] [class*="option"]')
      .filter({ hasText: option })
      .first();
    await this.click(opt, { after: 600 });
  }

  /** Same as pickOption but returns the first non-placeholder option. */
  async pickFirstOption(label, { scope, skip = [] } = {}) {
    const root = scope || this.page;
    const container = root
      .locator('div[class*="container"]')
      .filter({ has: this.page.locator("label", { hasText: new RegExp(`^\\s*${escapeRe(label)}`) }) })
      .last();
    await this.click(container.locator('[class*="trigger"]').first(), { after: 600 });
    const opts = this.page.locator('[class*="dropdown"] [class*="option"]:not([class*="clearOption"])');
    const n = await opts.count();
    for (let i = 0; i < n; i++) {
      const txt = (await opts.nth(i).innerText()).trim();
      if (!skip.some((s) => txt.includes(s))) {
        await this.click(opts.nth(i), { after: 600 });
        return txt;
      }
    }
    await this.page.keyboard.press("Escape");
  }

  /** Type into the rich-text (contentEditable) description editor. */
  async typeInEditor(text, { scope, index = 0 } = {}) {
    const root = scope || this.page;
    const editor = root.locator('[contenteditable="true"]').nth(index);
    await this.click(editor, { after: 200 });
    await this.page.keyboard.type(text, { delay: 40 * config.pace });
    await wait(400);
  }

  /** Hover each sidebar item briefly to give a guided tour of the menu. */
  async tourSidebar(items) {
    for (const [label, text] of items) {
      const link = this.page.locator("nav a, aside a").filter({ hasText: label }).first();
      if (await link.count()) await this.highlight(link, text, 2000);
    }
  }

  /** Close Moments-of-Joy / announcement popups and toasts if they appear. */
  async dismissPopups() {
    await wait(600);
    // The "Default Password Detected" banner (shown to accounts on a default
    // password): close it with its own X, which only hides it for this session.
    const banner = this.page
      .locator("div")
      .filter({ hasText: "Default Password Detected" })
      .filter({ has: this.page.locator("button") })
      .last();
    if (await banner.count()) {
      await banner.locator("button").last().click().catch(() => {});
      await wait(400);
    }
    for (let i = 0; i < 3; i++) {
      const close = this.page.locator('button[title="Close"]:visible').first();
      if (await close.count()) {
        await close.click().catch(() => {});
        await wait(400);
      } else break;
    }
  }

  async toastOrWait(ms = 1500) {
    await wait(ms);
  }
}

// Rows and cards that can list real people's data.
const DEFAULT_PRIVATE_ROWS = ["tbody tr"];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

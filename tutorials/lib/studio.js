// Recording "studio": launches a browser that records video, and gives journeys
// presentation helpers — on-screen captions, a visible cursor, slow typing and
// helpers for this app's custom components (CustomSelect, editor, etc).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { login } from "./api.js";

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
export async function openSession(browser, { as, videoName, outDir }) {
  const rawDir = path.join(outDir, ".raw");
  fs.mkdirSync(rawDir, { recursive: true });

  let token = null;
  if (as) {
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
  // Storyboard: a screenshot at every caption, for reviewing a take quickly.
  const storyDir = path.join(outDir, "storyboard", videoName);
  fs.rmSync(storyDir, { recursive: true, force: true });
  fs.mkdirSync(storyDir, { recursive: true });
  const s = new Studio(page, storyDir);

  return {
    page,
    s,
    async finish() {
      const video = page.video();
      await page.waitForTimeout(800);
      await context.close();
      if (video) {
        const target = path.join(outDir, `${videoName}.webm`);
        await video.saveAs(target);
        await video.delete();
        return target;
      }
    },
  };
}

export class Studio {
  constructor(page, storyDir) {
    this.page = page;
    this.storyDir = storyDir;
    this.shot = 0;
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

  async goto(route) {
    await this.page.goto(config.appUrl + route, { waitUntil: "domcontentloaded" });
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.dismissPopups();
  }

  /** Full-screen intro/outro card. */
  async titleCard(kicker, title, subtitle = "", ms = 3200) {
    await this.page.evaluate(
      ([k, t, s]) => {
        const el = document.getElementById("__tut_title");
        if (!el) return;
        el.innerHTML = `<div class="k">${k}</div><div class="t">${t}</div><div class="s">${s}</div>`;
        el.classList.add("show");
      },
      [kicker, title, subtitle],
    );
    await wait(ms);
    await this.page.evaluate(() =>
      document.getElementById("__tut_title")?.classList.remove("show"),
    );
    await wait(500);
  }

  /** Bottom-of-screen subtitle. Stays until the next caption or clearCaption(). */
  async caption(text, ms = 2600) {
    await this.page.evaluate((t) => {
      const el = document.getElementById("__tut_caption");
      if (!el) return;
      el.textContent = t;
      el.classList.add("show");
    }, text);
    await wait(Math.min(ms, 400));
    await this.snap(text);
    await wait(Math.max(0, ms - 400));
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

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

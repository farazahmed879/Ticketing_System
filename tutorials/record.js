// Records tutorial videos.
//   node record.js                → all journeys
//   node record.js client         → only client journeys
//   node record.js employee-03    → journeys whose id contains "employee-03"
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser, openSession } from "./lib/studio.js";
import client from "./journeys/client.js";
import employee from "./journeys/employee.js";
import lead from "./journeys/lead.js";
import qa from "./journeys/qa.js";
import manager from "./journeys/manager.js";
import hr from "./journeys/hr.js";
import admin from "./journeys/admin.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "videos"); // cue sheets, storyboards, failure screenshots
const webmDir = path.join(outDir, "webm-videos"); // recordings (voiceover.js reads them here)
const filter = process.argv[2] || "";
const journeys = [...client, ...employee, ...lead, ...qa, ...manager, ...hr, ...admin].filter((j) => j.id.includes(filter));

const statePath = path.join(here, ".demo-state.json");
if (!fs.existsSync(statePath)) {
  console.error("No .demo-state.json — run `npm run cleanup && npm run seed` first.");
  process.exit(1);
}
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));

const browser = await launchBrowser();
let failed = 0;
for (const j of journeys) {
  process.stdout.write(`● ${j.id} … `);
  const session = await openSession(browser, { as: j.as, videoName: j.id, outDir, webmDir });
  try {
    await j.run(session.s, session.page, state);
    const file = await session.finish();
    console.log(`saved ${path.relative(here, file)}`);
  } catch (e) {
    failed++;
    const shot = path.join(outDir, `${j.id}.FAILED.png`);
    await session.page.screenshot({ path: shot }).catch(() => {});
    await session.finish().catch(() => {});
    try {
      fs.renameSync(path.join(webmDir, `${j.id}.webm`), path.join(webmDir, `${j.id}.FAILED.webm`));
    } catch {}
    console.log(`FAILED: ${e.message.split("\n")[0]}\n   screenshot: ${path.relative(here, shot)}`);
  }
}
await browser.close();
fs.rmSync(path.join(outDir, ".raw"), { recursive: true, force: true });
console.log(failed ? `\n${failed} journey(s) failed.` : "\nAll videos recorded → tutorials/videos/webm-videos/");
process.exit(failed ? 1 : 0);

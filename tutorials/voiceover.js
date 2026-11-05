// Adds a spoken voice-over to each recorded tutorial and exports it as MP4.
//   node voiceover.js                → every videos/*.webm
//   node voiceover.js client-02      → videos whose name contains "client-02"
//
// Narration = the on-screen captions and title cards, read by a neural TTS voice.
// Timing comes from videos/<id>.cues.json (written by record.js). For older takes
// without one, cues are rebuilt from the storyboard screenshot times + title-card
// detection. If a line is longer than the gap before the next caption, the video
// freezes on that frame until the line finishes, so the audio never overlaps.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ffmpeg, synth, closeVoice, mediaDuration } from "./lib/voice.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const videoDir = path.join(here, "videos");
// Recordings and exports may be kept in sub-folders (videos/webm-videos, videos/mp4-videos).
const sub = (name) => (fs.existsSync(path.join(videoDir, name)) ? path.join(videoDir, name) : videoDir);
const webmDir = sub("webm-videos");
const mp4Dir = sub("mp4-videos");
const filter = process.argv[2] || "";
const GAP = 0.35; // seconds of silence kept after each line

const videos = fs
  .readdirSync(webmDir)
  .filter((f) => f.endsWith(".webm") && !f.includes(".FAILED") && f.includes(filter))
  .sort();

if (!videos.length) {
  console.error("No matching .webm files in tutorials/videos/");
  process.exit(1);
}

let failed = 0;
for (const file of videos) {
  const id = file.replace(/\.webm$/, "");
  process.stdout.write(`● ${id} … `);
  try {
    const src = path.join(webmDir, file);
    const length = mediaDuration(src);
    const cues = loadCues(id, src, length);
    const out = path.join(mp4Dir, `${id}.mp4`);
    // Encode to a temporary file and rename at the end, so an interrupted run
    // never leaves a half-written (unplayable) MP4 behind.
    const tmp = path.join(mp4Dir, `.${id}.partial.mp4`);
    const info = await render(src, length, cues, tmp);
    fs.renameSync(tmp, out);
    if (process.env.TUT_DEBUG) for (const c of cues) console.log(`
   ${c.t.toFixed(2)}s → ${c.at?.toFixed(2)}s  ${c.text}`);
    console.log(`saved ${path.relative(here, out)} (${info.duration.toFixed(1)}s, ${cues.length} lines${info.frozen ? `, +${info.frozen.toFixed(1)}s freeze` : ""})`);
  } catch (e) {
    failed++;
    console.log(`FAILED: ${e.message.split("\n")[0]}`);
  }
}
closeVoice();
console.log(failed ? `\n${failed} video(s) failed.` : `\nDone → ${path.relative(here, mp4Dir)}`);
process.exit(failed ? 1 : 0);

// ---------------------------------------------------------------------------

function loadCues(id, src, length) {
  const cueFile = path.join(videoDir, `${id}.cues.json`);
  if (fs.existsSync(cueFile)) return JSON.parse(fs.readFileSync(cueFile, "utf8")).cues;
  return rebuildCues(id, src, length);
}

/** Reconstructs cues for takes recorded before cue sheets existed. */
function rebuildCues(id, src, length) {
  const storyDir = path.join(videoDir, "storyboard", id);
  if (!fs.existsSync(storyDir)) throw new Error("no cues.json and no storyboard to rebuild timing from");
  const { strings, titles } = journeySource(id);

  // The storyboard folder is created right as recording starts; each screenshot
  // is taken 400 ms after its caption appears.
  const t0 = fs.statSync(storyDir).birthtimeMs;
  const cues = [];
  for (const f of fs.readdirSync(storyDir).filter((f) => f.endsWith(".png")).sort()) {
    const label = f.replace(/^\d+-/, "").replace(/\.png$/, "");
    const text = strings.find((s) => slug(s) === label);
    if (!text) throw new Error(`can't match storyboard frame "${f}" to a caption in the journey`);
    const t = (fs.statSync(path.join(storyDir, f)).mtimeMs - t0) / 1000 - 0.45;
    cues.push({ t: Math.max(0, t), kind: "caption", text });
  }

  const runs = detectTitleCards(src);
  if (runs.length !== titles.length) {
    throw new Error(`expected ${titles.length} title cards, detected ${runs.length}`);
  }
  titles.forEach((text, i) => cues.push({ t: runs[i], kind: "title", text }));
  return cues.sort((a, b) => a.t - b.t).filter((c) => c.t < length);
}

/** Caption strings and title-card text for one journey, read from its source. */
function journeySource(id) {
  for (const f of ["client.js", "employee.js"]) {
    const src = fs.readFileSync(path.join(here, "journeys", f), "utf8");
    const start = src.indexOf(`id: "${id}"`);
    if (start < 0) continue;
    const next = src.indexOf('id: "', start + 5);
    const chunk = src.slice(start, next < 0 ? undefined : next);
    const strings = [...chunk.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
    const titles = [...chunk.matchAll(/titleCard\(\s*\w+,\s*"([^"]*)"(?:,\s*"([^"]*)")?/g)].map((m) =>
      m[2] ? joinTitle(m[1], m[2]) : m[1],
    );
    return { strings, titles };
  }
  throw new Error(`journey "${id}" not found in journeys/`);
}

function slug(s) {
  return s.replace(/[^a-z0-9]+/gi, "-").slice(0, 50);
}

/** Start times (s) of the full-screen gradient title cards, found by frame colour. */
function detectTitleCards(src) {
  const fps = 10, w = 16, h = 9;
  const r = spawnSync(
    ffmpeg,
    ["-v", "error", "-i", src, "-vf", `fps=${fps},scale=${w}:${h}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
    { maxBuffer: 1 << 28 },
  );
  if (r.status !== 0) throw new Error("frame analysis failed: " + r.stderr);
  const buf = r.stdout, size = w * h * 3;
  const px = (f, x, y) => { const o = f * size + (y * w + x) * 3; return [buf[o], buf[o + 1], buf[o + 2]]; };
  // The card is a navy → indigo gradient (#0f172a → #312e81): a dark bluish
  // top-left and a clearly blue/purple bottom-right, on light or dark pages.
  const navy = ([r, g, b]) => r < 70 && g < 80 && b - r > 15 && b < 120;
  const indigo = ([r, g, b]) => r < 110 && b - r > 50 && b - g > 50;
  const runs = [];
  let startF = -1;
  const frames = Math.floor(buf.length / size);
  for (let f = 0; f <= frames; f++) {
    const on = f < frames && navy(px(f, 0, 0)) && indigo(px(f, w - 1, h - 1));
    if (on && startF < 0) startF = f;
    if (!on && startF >= 0) {
      if (f - startF >= fps) runs.push(Math.max(0, startF / fps - 0.2)); // ≥1 s = real card
      startF = -1;
    }
  }
  return runs;
}

/** Freezes frames where needed, mixes the narration in and encodes H.264/AAC. */
async function render(src, length, cues, out) {

  for (const c of cues) Object.assign(c, await synth(c.text));
  const clips = cues;

  // Cut the video at each cue; pad a segment if its line runs past the next cue.
  const bounds = [0, ...clips.map((c) => c.t), length];
  const segs = [];
  let outT = 0, frozen = 0;
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i], b = Math.max(bounds[i], bounds[i + 1]);
    const clip = i > 0 ? clips[i - 1] : null;
    if (clip) clip.at = outT;
    const pad = clip ? Math.max(0, clip.duration + GAP - (b - a)) : 0;
    segs.push({ a, b, pad });
    outT += b - a + pad;
    frozen += pad;
  }

  const filters = segs.map(
    (s, i) =>
      `[0:v]trim=start=${s.a.toFixed(3)}:end=${s.b.toFixed(3)},setpts=PTS-STARTPTS` +
      (s.pad > 0 ? `,tpad=stop_mode=clone:stop_duration=${s.pad.toFixed(3)}` : "") +
      `[v${i}]`,
  );
  filters.push(`${segs.map((_, i) => `[v${i}]`).join("")}concat=n=${segs.length}:v=1:a=0,fps=25[v]`);
  clips.forEach((c, i) => {
    const ms = Math.round(c.at * 1000);
    filters.push(`[${i + 1}:a]aresample=48000,adelay=${ms}:all=1[a${i}]`);
  });
  filters.push(
    `${clips.map((_, i) => `[a${i}]`).join("")}amix=inputs=${clips.length}:duration=longest:normalize=0,` +
      `apad,atrim=end=${outT.toFixed(3)}[a]`,
  );

  const graph = path.join(videoDir, `.${path.basename(out)}.filter.txt`);
  fs.writeFileSync(graph, filters.join(";\n"));
  const args = [
    "-y", "-v", "error", "-i", src,
    ...clips.flatMap((c) => ["-i", c.file]),
    "-filter_complex_script", graph,
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-ac", "2",
    "-movflags", "+faststart", out,
  ];
  const r = spawnSync(ffmpeg, args, { encoding: "utf8" });
  fs.rmSync(graph, { force: true });
  if (r.status !== 0) throw new Error("ffmpeg: " + (r.stderr || "").trim().split("\n").slice(-3).join(" | "));
  return { duration: outT, frozen };
}

function joinTitle(title, subtitle) {
  return /[.!?]$/.test(title) ? `${title} ${subtitle}` : `${title}. ${subtitle}`;
}

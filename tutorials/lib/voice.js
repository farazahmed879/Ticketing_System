// Text-to-speech narration (Microsoft Edge neural voices via msedge-tts) and
// small ffmpeg helpers. Audio is cached by text+voice, so re-running is fast.
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import ffmpegPath from "ffmpeg-static";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const cacheDir = path.join(here, "..", "videos", ".tts");
export const ffmpeg = ffmpegPath;

export const voiceConfig = {
  enabled: process.env.TUT_VOICE !== "false",
  voice: process.env.TUT_VOICE_NAME || "en-US-AriaNeural",
  rate: process.env.TUT_VOICE_RATE || "+0%", // e.g. "+10%" to speak faster
};

/** Turns on-screen caption text into something that reads well aloud. */
export function speakable(text) {
  return text
    .replace(/…/g, " ")
    .replace(/&/g, " and ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let tts = null;
async function engine() {
  if (!tts) {
    tts = new MsEdgeTTS();
    await tts.setMetadata(voiceConfig.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  }
  return tts;
}

export function closeVoice() {
  try {
    tts?.close();
  } catch {}
  tts = null;
}

/** Returns { file, duration } for the spoken text, generating it if not cached. */
export async function synth(text) {
  const say = speakable(text);
  const key = crypto
    .createHash("sha1")
    .update(`${voiceConfig.voice}|${voiceConfig.rate}|${say}`)
    .digest("hex")
    .slice(0, 16);
  fs.mkdirSync(cacheDir, { recursive: true });
  const file = path.join(cacheDir, `${key}.mp3`);
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const tmp = fs.mkdtempSync(path.join(cacheDir, "tmp-"));
        const { audioFilePath } = await (await engine()).toFile(tmp, say, { rate: voiceConfig.rate });
        fs.renameSync(audioFilePath, file);
        fs.rmSync(tmp, { recursive: true, force: true });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        closeVoice(); // reconnect on the next attempt
      }
    }
    if (lastErr) throw new Error(`TTS failed for "${say}": ${lastErr.message || lastErr}`);
  }
  return { file, duration: mediaDuration(file) };
}

/** Duration in seconds, read from ffmpeg's header output. */
export function mediaDuration(file) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-i", file], { encoding: "utf8" });
  const m = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(r.stderr || "");
  if (!m) throw new Error(`Could not read duration of ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/**
 * Desktop (browser) notifications. Controlled by the Settings toggle
 * (localStorage `pref_desktop_alerts`, on by default) plus the browser's
 * Notification permission.
 */

export function desktopAlertsEnabled(): boolean {
  return (
    "Notification" in window &&
    localStorage.getItem("pref_desktop_alerts") !== "false"
  );
}

/**
 * Build a short two-note chime as a WAV data URI (synthesized locally, so no
 * network/CDN dependency). Generated once, lazily.
 */
function buildChimeDataUri(): string {
  const rate = 22050;
  const duration = 0.45;
  const n = Math.floor(rate * duration);
  const samples = new Float32Array(n);
  const notes: Array<[number, number]> = [
    [880, 0], // A5
    [1174.66, 0.12], // D6
  ];
  for (const [freq, offset] of notes) {
    const start = Math.floor(offset * rate);
    for (let i = start; i < n; i++) {
      const t = (i - start) / rate;
      samples[i] += Math.sin(2 * Math.PI * freq * t) * 0.35 * Math.exp(-6 * t);
    }
  }
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeStr(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  }
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return "data:audio/wav;base64," + btoa(bin);
}

let chimeDataUri: string | null = null;

/** Play the notification chime (respects the sound-alerts setting). */
export function playNotificationSound(): void {
  if (localStorage.getItem("pref_sound_alerts") === "false") return;
  try {
    if (!chimeDataUri) chimeDataUri = buildChimeDataUri();
    const audio = new Audio(chimeDataUri);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {
    // Audio unavailable — ignore.
  }
}

/**
 * Ask for the browser permission once after login if the user hasn't
 * decided yet. Without this, desktop alerts silently never fire unless the
 * user finds the Settings toggle.
 */
export async function ensureNotificationPermission(): Promise<void> {
  if (!desktopAlertsEnabled()) {
    console.debug(
      "[desktop-notifications] disabled (Settings toggle or unsupported browser)",
    );
    return;
  }
  if (Notification.permission !== "default") {
    console.debug(
      `[desktop-notifications] permission already ${Notification.permission}`,
    );
    return;
  }
  try {
    const result = await Notification.requestPermission();
    console.debug(`[desktop-notifications] permission prompt result: ${result}`);
  } catch {
    // Older browsers with callback-style API or blocked prompts — ignore.
  }
}

/**
 * Show a desktop notification. Only fires when the app window is NOT in
 * focus — when it is, the in-app toast already covers it.
 */
export function showDesktopNotification(
  title: string,
  body: string,
  onClick?: () => void,
): void {
  if (document.hasFocus()) {
    console.debug(
      "[desktop-notifications] skipped: app window is focused (in-app toast covers it)",
    );
    return;
  }

  // Sound accompanies background notifications even when the popup itself
  // can't show (permission denied) so alerts aren't silently lost.
  playNotificationSound();

  if (!desktopAlertsEnabled()) {
    console.debug("[desktop-notifications] skipped: disabled in Settings");
    return;
  }
  if (Notification.permission !== "granted") {
    console.debug(
      `[desktop-notifications] skipped: browser permission is "${Notification.permission}" — grant it via the prompt or the site-permissions (lock) icon`,
    );
    return;
  }

  try {
    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "jami-notification", // collapse bursts into one visible popup
    });
    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };
  } catch (e) {
    console.error("Desktop notification failed:", e);
  }
}

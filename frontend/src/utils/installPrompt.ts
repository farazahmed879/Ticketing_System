import { useSyncExternalStore } from "react";

// Chrome/Edge fire `beforeinstallprompt` once, early — often before the
// logged-in layout mounts — so it is captured at module load (imported from
// main.tsx) and kept here until the user clicks "Install App".

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Stop the browser's own mini-infobar; we show our own button instead.
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** True when the browser says the app can be installed right now. */
export const useCanInstallApp = () =>
  useSyncExternalStore(
    subscribe,
    () => deferredPrompt !== null,
    () => false,
  );

/** Opens the browser's install dialog. Resolves true if the user accepted. */
export const promptInstallApp = async (): Promise<boolean> => {
  const evt = deferredPrompt;
  if (!evt) return false;
  await evt.prompt();
  const { outcome } = await evt.userChoice;
  // A prompt event can only be used once.
  deferredPrompt = null;
  notify();
  return outcome === "accepted";
};

// ---------------------------------------------------------------------------
// Safari never fires `beforeinstallprompt`, so there is no dialog we can open.
// Instead we detect Safari and show the user how to add the app themselves:
//   iPhone / iPad  -> Share  -> "Add to Home Screen"
//   macOS Safari   -> File   -> "Add to Dock"  (Safari 17+, macOS Sonoma)
// ---------------------------------------------------------------------------

export type InstallOption = "prompt" | "ios" | "mac" | null;

/** True when the app is already running as an installed app. */
export const isRunningStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's non-standard flag for home-screen apps
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

const detectManualInstall = (): "ios" | "mac" | null => {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  // iPadOS reports itself as "Macintosh" but has a touch screen.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  // Every iOS browser can add to the home screen from the Share menu.
  if (isIOS) return "ios";
  const isMacSafari =
    /Macintosh/.test(ua) &&
    /Safari\//.test(ua) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/.test(ua);
  if (!isMacSafari) return null;
  // "Add to Dock" arrived in Safari 17.
  const v = /Version\/(\d+)/.exec(ua);
  return v && Number(v[1]) >= 17 ? "mac" : null;
};

const manualInstall = detectManualInstall();

/**
 * How this browser can install the app:
 * "prompt" (Chrome/Edge dialog), "ios" / "mac" (Safari, show instructions),
 * or null (not installable here, or already installed).
 */
export const useInstallOption = (): InstallOption => {
  const canPrompt = useCanInstallApp();
  if (isRunningStandalone()) return null;
  if (canPrompt) return "prompt";
  return manualInstall;
};

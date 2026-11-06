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

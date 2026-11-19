import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useLocation } from "react-router-dom";

const PREFIX = "listState:";
const LAST_PATH_KEY = "nav:lastPath";

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

/**
 * Remember the current pathname after every navigation. Call once in the
 * layout. Pages read it during their first render (before this effect runs
 * for the new route), so it still holds the page the user came from.
 */
export const useTrackLastPath = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      sessionStorage.setItem(LAST_PATH_KEY, pathname);
    } catch {
      /* ignore */
    }
  }, [pathname]);
};

/**
 * Should this list page restore its saved state? Only when the user is
 * coming back from one of its detail pages (`childPrefixes`, e.g.
 * "/tickets/") or reloading the page itself. Arriving from anywhere else
 * (sidebar, dashboard, another module) starts fresh. Decided once per visit.
 */
export const useShouldRestoreList = (childPrefixes: string[]) => {
  const { pathname } = useLocation();
  const [restore] = useState(() => {
    let prev: string | null = null;
    try {
      prev = sessionStorage.getItem(LAST_PATH_KEY);
    } catch {
      /* ignore */
    }
    if (!prev) return false;
    return prev === pathname || childPrefixes.some((p) => prev!.startsWith(p));
  });
  return restore;
};

/**
 * useState backed by sessionStorage (per browser tab). With `restore` true
 * the saved value is used on mount; with false the page starts from
 * `initial` (and overwrites the saved value). Logout clears sessionStorage
 * (AuthContext), so the next user always starts clean.
 */
function usePersistedState<T>(
  key: string,
  initial: T | (() => T),
  restore = true,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const init = typeof initial === "function" ? (initial as () => T)() : initial;
    return restore ? read(key, init) : init;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: state still works for this visit */
    }
  }, [key, value]);

  return [value, useCallback((v: SetStateAction<T>) => setValue(v), [])];
}

export default usePersistedState;

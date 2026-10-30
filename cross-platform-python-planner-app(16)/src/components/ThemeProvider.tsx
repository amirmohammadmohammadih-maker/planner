"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { applyTheme, DEFAULT_MODE, DEFAULT_THEME, isModeId, isThemeId, MODE_KEY, THEME_KEY, type ModeId, type ThemeId } from "@/lib/theme";
import { api } from "@/lib/api";

type Ctx = {
  theme: ThemeId;
  mode: ModeId;
  isDark: boolean;
  setTheme: (t: ThemeId) => void;
  setMode: (m: ModeId) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

/* ---------- tiny external store: localStorage + prefers-color-scheme ---------- */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", cb);
    window.removeEventListener("storage", cb);
  };
}

function readLocal(): { theme: ThemeId; mode: ModeId } {
  try {
    const t = localStorage.getItem(THEME_KEY);
    const m = localStorage.getItem(MODE_KEY);
    return { theme: isThemeId(t) ? t : DEFAULT_THEME, mode: isModeId(m) ? m : DEFAULT_MODE };
  } catch {
    return { theme: DEFAULT_THEME, mode: DEFAULT_MODE };
  }
}

/** Snapshot as a primitive string so React can compare it cheaply. */
function getSnapshot(): string {
  const { theme, mode } = readLocal();
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return `${theme}|${mode}|${dark ? 1 : 0}`;
}
const SERVER_SNAPSHOT = `${DEFAULT_THEME}|${DEFAULT_MODE}|0`;
const getServerSnapshot = () => SERVER_SNAPSHOT;

function writeLocal(patch: { theme?: ThemeId; mode?: ModeId }) {
  try {
    if (patch.theme) localStorage.setItem(THEME_KEY, patch.theme);
    if (patch.mode) localStorage.setItem(MODE_KEY, patch.mode);
  } catch {
    /* ignore (private mode etc.) */
  }
  emit();
}

async function saveRemote(patch: Record<string, string>) {
  try {
    await api("/api/settings", { method: "PUT", json: patch });
  } catch {
    /* offline — the local copy is enough */
  }
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [themeRaw, modeRaw, darkRaw] = snapshot.split("|");
  const theme = isThemeId(themeRaw) ? themeRaw : DEFAULT_THEME;
  const mode = isModeId(modeRaw) ? modeRaw : DEFAULT_MODE;
  const isDark = darkRaw === "1";

  // Keep <html data-theme / data-mode> in sync with the store.
  useEffect(() => {
    applyTheme(theme, mode);
  }, [theme, mode]);

  // Server copy is the source of truth across devices: adopt it once on mount.
  useEffect(() => {
    let cancelled = false;
    api<Record<string, string>>("/api/settings")
      .then((s) => {
        if (!s || cancelled) return;
        const local = readLocal();
        const patch: { theme?: ThemeId; mode?: ModeId } = {};
        if (isThemeId(s.theme) && s.theme !== local.theme) patch.theme = s.theme;
        if (isModeId(s.mode) && s.mode !== local.mode) patch.mode = s.mode;
        if (patch.theme || patch.mode) writeLocal(patch);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    writeLocal({ theme: t });
    saveRemote({ theme: t });
  }, []);
  const setMode = useCallback((m: ModeId) => {
    writeLocal({ mode: m });
    saveRemote({ mode: m });
  }, []);

  const value = useMemo(() => ({ theme, mode, isDark, setTheme, setMode }), [theme, mode, isDark, setTheme, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

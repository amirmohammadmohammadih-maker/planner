"use client";

import { useEffect } from "react";

export const SHELL_HOME_KEY = "planner.shellHome";

/** The Android/iOS shell opens the app as  <server>/?shellHome=<its own connector page>.
 *  We remember that address so the settings page can offer "change server". */
export default function ShellBridge() {
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const home = u.searchParams.get("shellHome");
      if (!home) return;
      localStorage.setItem(SHELL_HOME_KEY, home);
      u.searchParams.delete("shellHome");
      window.history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}

/** True when running inside the native mobile shell. */
export function shellHomeUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(SHELL_HOME_KEY);
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  return /PlannerApp/i.test(navigator.userAgent) ? "https://localhost/index.html" : null;
}

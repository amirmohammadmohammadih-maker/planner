"use client";

import { useEffect } from "react";

/** Registers the service worker in production so the app is installable
 *  (Android "Add to Home screen", Windows/Edge "Install app", PWABuilder). */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (process.env.NEXT_PUBLIC_PLANNER_TARGET === "mobile") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore registration failures (e.g. non-HTTPS origins) */
    });
  }, []);
  return null;
}

/* Theme definitions shared by the settings page, the provider and globals.css.
   Accent palettes follow Tailwind's 50..950 scale; CSS in globals.css maps them
   onto the `emerald-*` tokens used across the UI, with a separate dark mapping. */

export type ThemeId = "emerald" | "sky" | "indigo" | "violet" | "rose" | "orange" | "teal";
export type ModeId = "light" | "dark" | "system";

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: "emerald", label: "سبز", swatch: "#047857" },
  { id: "teal", label: "فیروزه‌ای", swatch: "#0f766e" },
  { id: "sky", label: "آبی", swatch: "#0369a1" },
  { id: "indigo", label: "نیلی", swatch: "#4338ca" },
  { id: "violet", label: "بنفش", swatch: "#6d28d9" },
  { id: "rose", label: "صورتی", swatch: "#be123c" },
  { id: "orange", label: "نارنجی", swatch: "#c2410c" },
];

export const MODES: { id: ModeId; label: string; hint: string }[] = [
  { id: "light", label: "روشن", hint: "پس‌زمینه‌ی روشن برای روز" },
  { id: "dark", label: "تیره", hint: "مناسب شب و چشم‌های خسته" },
  { id: "system", label: "خودکار", hint: "هماهنگ با تنظیمات دستگاه" },
];

export const THEME_KEY = "planner.theme";
export const MODE_KEY = "planner.mode";
export const DEFAULT_THEME: ThemeId = "emerald";
export const DEFAULT_MODE: ModeId = "system";

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && THEMES.some((t) => t.id === v);
}
export function isModeId(v: unknown): v is ModeId {
  return v === "light" || v === "dark" || v === "system";
}

/** Apply theme attributes to <html>. Safe to call on the client only. */
export function applyTheme(theme: ThemeId, mode: ModeId) {
  const root = document.documentElement;
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-mode", dark ? "dark" : "light");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", getComputedStyle(root).getPropertyValue("--a-700").trim() || "#047857");
}

/** Inline bootstrap script: applies the saved theme before first paint (no flash). */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)})||${JSON.stringify(DEFAULT_THEME)};var m=localStorage.getItem(${JSON.stringify(MODE_KEY)})||${JSON.stringify(DEFAULT_MODE)};var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var h=document.documentElement;h.setAttribute('data-theme',t);h.setAttribute('data-mode',d?'dark':'light');}catch(e){}})();`;

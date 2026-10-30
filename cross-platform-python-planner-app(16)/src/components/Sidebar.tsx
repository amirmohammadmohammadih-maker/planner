"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  LayoutDashboard,
  CalendarRange,
  CalendarDays,
  GanttChart,
  Clock3,
  Repeat,
  Wallet,
  GraduationCap,
  Target,
  BarChart3,
  Sparkles,
  Settings,
  Sun,
  Moon,
  UserCircle2,
} from "lucide-react";
import { cn } from "./ui";
import { formatJalali, todayISO } from "@/lib/jalali";
import { api } from "@/lib/api";
import { useTheme } from "./ThemeProvider";

export const NAV = [
  { href: "/", label: "داشبورد", icon: LayoutDashboard },
  { href: "/planner", label: "پلنر هفتگی", icon: CalendarRange },
  { href: "/calendar", label: "تقویم", icon: CalendarDays },
  { href: "/timeline", label: "تایم‌لاین روز", icon: GanttChart },
  { href: "/timesheet", label: "تایم‌شیت", icon: Clock3 },
  { href: "/habits", label: "هبیت ترکر", icon: Repeat },
  { href: "/budget", label: "ردیاب مالی", icon: Wallet },
  { href: "/study", label: "پلنر تحصیلی", icon: GraduationCap },
  { href: "/goals", label: "اهداف و برنامه‌ریزی", icon: Target },
  { href: "/review", label: "ارزیابی عملکرد", icon: BarChart3 },
  { href: "/settings", label: "تنظیمات", icon: Settings },
];

type ProfileLite = { name: string } | null;

const noopSubscribe = () => () => {};
const todaySnapshot = () => formatJalali(todayISO(), "weekday");
const serverSnapshot = () => "";

function DarkToggle({ isDark, onToggle, className }: { isDark: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      onClick={onToggle}
      className={cn("rounded-xl border border-emerald-100 bg-white p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800", className)}
      title={isDark ? "حالت روشن" : "حالت تیره"}
      aria-label="تغییر حالت روشن/تیره"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

/** Re-fetch the profile name whenever the settings page saves it. */
export const PROFILE_EVENT = "planner:profile-updated";

export default function Sidebar() {
  const pathname = usePathname();
  const { isDark, setMode } = useTheme();
  const todayLabel = useSyncExternalStore(noopSubscribe, todaySnapshot, serverSnapshot);
  const [profile, setProfile] = useState<ProfileLite>(null);

  useEffect(() => {
    const load = () =>
      api<{ name: string } | null>("/api/profile")
        .then((p) => setProfile(p && p.name ? { name: p.name } : null))
        .catch(() => undefined);
    load();
    window.addEventListener(PROFILE_EVENT, load);
    return () => window.removeEventListener(PROFILE_EVENT, load);
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const toggleDark = () => setMode(isDark ? "light" : "dark");
  const initial = profile?.name?.trim()?.charAt(0) ?? "";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 flex-col border-l border-emerald-100 bg-white lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-md">
            <Sparkles size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-extrabold text-emerald-950">پلنر جامع</div>
            <div className="truncate text-[11px] text-slate-500">{todayLabel}</div>
          </div>
          <DarkToggle isDark={isDark} onToggle={toggleDark} />
        </div>

        <Link
          href="/settings"
          className={cn(
            "mx-3 mb-2 flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition",
            isActive("/settings") ? "border-emerald-300 bg-emerald-50" : "border-emerald-100 hover:bg-emerald-50",
          )}
        >
          {initial ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-extrabold text-white">{initial}</span>
          ) : (
            <UserCircle2 size={36} className="shrink-0 text-emerald-600" strokeWidth={1.5} />
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-emerald-950">{profile?.name ?? "حساب کاربری"}</span>
            <span className="block text-[11px] text-slate-500">{profile ? "مشاهده پروفایل" : "برای ساخت پروفایل کلیک کن"}</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hero-gradient m-3 rounded-2xl p-4 text-white">
          <div className="text-sm font-bold">بهترین نسخه خودت باش ✨</div>
          <div className="mt-1 text-[11px] leading-5 text-white/80">برنامه‌ریزی، پیگیری عادت‌ها، مدیریت مالی و تحصیلی در یک‌جا.</div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-emerald-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="text-sm font-extrabold leading-tight text-emerald-950">پلنر جامع</div>
            <div className="text-[10px] text-slate-500">{todayLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DarkToggle isDark={isDark} onToggle={toggleDark} />
          <Link href="/settings" className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-sm font-extrabold text-white" aria-label="تنظیمات">
            {initial || <Settings size={16} />}
          </Link>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t border-emerald-100 bg-white px-2 py-1.5 lg:hidden [scrollbar-width:none]">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[64px] shrink-0 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold",
                active ? "bg-emerald-700 text-white" : "text-slate-500",
              )}
            >
              <Icon size={18} />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

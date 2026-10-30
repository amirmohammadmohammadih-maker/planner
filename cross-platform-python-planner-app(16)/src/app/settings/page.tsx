"use client";

import { useEffect, useRef, useState } from "react";
import {
  UserCircle2,
  Palette,
  Database,
  Info,
  Sun,
  Moon,
  Monitor,
  Download,
  Upload,
  Trash2,
  KeyRound,
  Save,
  Check,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Smartphone,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react";
import { api, IS_LOCAL_APP, useLoad } from "@/lib/api";
import { fa, formatJalali, todayISO } from "@/lib/jalali";
import { MODES, THEMES, type ModeId } from "@/lib/theme";
import { useTheme } from "@/components/ThemeProvider";
import { PROFILE_EVENT } from "@/components/Sidebar";
import { shellHomeUrl } from "@/components/ShellBridge";
import { getRemoteUrl, remoteEntryUrl, setRemoteUrl } from "@/lib/remote";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, ProgressBar, Ring, Textarea, cn } from "@/components/ui";

type Profile = { id: number; name: string; email: string | null; phone: string | null; bio: string | null; hasPassword: boolean; createdAt: string } | null;
type Stats = { counts: Record<string, number>; total: number };

const TABS = [
  { id: "account", label: "حساب کاربری", icon: UserCircle2 },
  { id: "appearance", label: "ظاهر و تم", icon: Palette },
  { id: "data", label: "داده‌ها", icon: Database },
  { id: "about", label: "درباره", icon: Info },
] as const;
type TabId = (typeof TABS)[number]["id"];

const SCOPES: { id: string; label: string; tables: string[] }[] = [
  { id: "tasks", label: "کارها (پلنر، تقویم، تایم‌لاین)", tables: ["tasks"] },
  { id: "habits", label: "عادت‌ها و سوابق", tables: ["habits", "habit_logs"] },
  { id: "finance", label: "مالی (تراکنش‌ها، بودجه، اهداف مالی)", tables: ["transactions", "budgets", "financial_goals"] },
  { id: "study", label: "تحصیلی (درس‌ها، جلسات، آزمون‌ها)", tables: ["courses", "study_sessions", "exams"] },
  { id: "timesheet", label: "تایم‌شیت", tables: ["timesheet_entries"] },
  { id: "goals", label: "اهداف", tables: ["goals"] },
  { id: "reviews", label: "خودارزیابی‌های هفتگی", tables: ["reviews"] },
];
const TABLE_LABELS: Record<string, string> = {
  tasks: "کار",
  habits: "عادت",
  habit_logs: "تیک عادت",
  transactions: "تراکنش",
  budgets: "بودجه",
  financial_goals: "هدف مالی",
  courses: "درس",
  study_sessions: "جلسه مطالعه",
  exams: "آزمون",
  timesheet_entries: "ورودی تایم‌شیت",
  goals: "هدف",
  reviews: "خودارزیابی",
};

function Notice({ kind, text }: { kind: "ok" | "error"; text: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold", kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700")}>
      {kind === "ok" ? <Check size={14} /> : <AlertTriangle size={14} />} {text}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>("account");
  const [shellHome] = useState<string | null>(() => shellHomeUrl());
  return (
    <div className="fade-up">
      <PageHeader title="تنظیمات" subtitle="حساب کاربری، ظاهر برنامه و مدیریت داده‌ها" />
      {IS_LOCAL_APP && <MobileConnectCard />}
      {shellHome && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <Smartphone className="text-emerald-700" size={20} />
          <div className="min-w-0 flex-1">
            <div className="font-bold text-emerald-950">اپ موبایل</div>
            <div className="truncate text-xs text-slate-500" dir="ltr">
              <Server size={12} className="ml-1 inline" />
              {typeof window !== "undefined" ? window.location.origin : ""}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => (window.location.href = `${shellHome}${shellHome.includes("?") ? "&" : "?"}change=1`)}>
            تغییر آدرس سرور
          </Button>
        </div>
      )}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-emerald-100 bg-white p-1 shadow-sm [scrollbar-width:none]">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                tab === t.id ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 hover:bg-emerald-50",
              )}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>
      {tab === "account" && <AccountTab />}
      {tab === "appearance" && <AppearanceTab />}
      {tab === "data" && <DataTab />}
      {tab === "about" && <AboutTab />}
    </div>
  );
}

/* =============================== Account =============================== */
function AccountTab() {
  const { data: profile, loading, reload } = useLoad(() => api<Profile>("/api/profile"), []);
  const [form, setForm] = useState({ name: "", email: "", phone: "", bio: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pwNotice, setPwNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (profile) setForm({ name: profile.name, email: profile.email ?? "", phone: profile.phone ?? "", bio: profile.bio ?? "" });
  }, [profile]);

  async function saveProfile() {
    setSaving(true);
    setNotice(null);
    try {
      await api("/api/profile", { method: "PUT", json: form });
      setNotice({ kind: "ok", text: "پروفایل ذخیره شد" });
      window.dispatchEvent(new Event(PROFILE_EVENT));
      reload(true);
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(remove = false) {
    setPwNotice(null);
    if (!form.name.trim()) return setPwNotice({ kind: "error", text: "اول نام را در پروفایل وارد و ذخیره کنید" });
    if (!remove) {
      if (pw.next.length < 4) return setPwNotice({ kind: "error", text: "رمز عبور باید حداقل ۴ کاراکتر باشد" });
      if (pw.next !== pw.confirm) return setPwNotice({ kind: "error", text: "تکرار رمز عبور یکسان نیست" });
    }
    setSaving(true);
    try {
      await api("/api/profile", { method: "PUT", json: { ...form, currentPassword: pw.current, newPassword: remove ? "" : pw.next, removePassword: remove } });
      setPw({ current: "", next: "", confirm: "" });
      setPwNotice({ kind: "ok", text: remove ? "رمز عبور حذف شد" : "رمز عبور ذخیره شد" });
      reload(true);
    } catch (e) {
      setPwNotice({ kind: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const initial = form.name.trim().charAt(0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title="پروفایل" subtitle="مشخصات شما روی این دستگاه ذخیره می‌شود" className="lg:col-span-2">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-700 text-2xl font-black text-white shadow-md">
            {initial || <UserCircle2 size={34} strokeWidth={1.5} />}
          </div>
          <div>
            <div className="text-lg font-extrabold text-emerald-950">{form.name || "کاربر جدید"}</div>
            <div className="text-xs text-slate-500">
              {profile ? `عضو از ${formatJalali(profile.createdAt.slice(0, 10), "dayMonth")}` : "هنوز پروفایلی ساخته نشده"}
              {profile?.hasPassword && (
                <Badge className="mr-2 bg-emerald-50 text-emerald-800">
                  <ShieldCheck size={11} className="ml-1" /> رمز عبور فعال
                </Badge>
              )}
            </div>
          </div>
        </div>
        {loading ? (
          <p className="text-xs text-slate-400">در حال بارگذاری…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="نام و نام خانوادگی *">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً: علی رضایی" />
            </Field>
            <Field label="ایمیل">
              <Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            </Field>
            <Field label="شماره موبایل">
              <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0912…" />
            </Field>
            <Field label="درباره من / شعار شخصی" className="sm:col-span-2">
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="min-h-[70px]" placeholder="چند کلمه درباره هدف‌هایت…" />
            </Field>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          {notice ? <Notice {...notice} /> : <span />}
          <Button onClick={saveProfile} loading={saving} disabled={!form.name.trim()}>
            <Save size={16} /> ذخیره پروفایل
          </Button>
        </div>
      </Card>

      <div className="space-y-6">
        <Card title="رمز عبور" subtitle={profile?.hasPassword ? "تغییر یا حذف رمز عبور" : "برای محافظت از داده‌ها رمز بگذار"}>
          <div className="space-y-3">
            {profile?.hasPassword && (
              <Field label="رمز عبور فعلی">
                <Input dir="ltr" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              </Field>
            )}
            <Field label="رمز عبور جدید">
              <Input dir="ltr" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </Field>
            <Field label="تکرار رمز عبور جدید">
              <Input dir="ltr" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </Field>
            {pwNotice && <Notice {...pwNotice} />}
            <div className="flex gap-2">
              <Button onClick={() => savePassword(false)} loading={saving} className="flex-1">
                <KeyRound size={16} /> {profile?.hasPassword ? "تغییر رمز" : "تنظیم رمز"}
              </Button>
              {profile?.hasPassword && (
                <Button variant="danger" onClick={() => savePassword(true)} disabled={saving} title="حذف رمز عبور">
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            فعلاً رمز عبور برای تأیید عملیات حساس (مثل پاک‌کردن داده‌ها) استفاده می‌شود. صفحه‌ی ورود بعد از راه‌اندازی سرور فعال خواهد شد.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* =============================== Appearance =============================== */
function AppearanceTab() {
  const { theme, mode, isDark, setTheme, setMode } = useTheme();
  const modeIcon: Record<ModeId, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card title="حالت نمایش" subtitle="روشن برای روز، تیره برای شب">
          <div className="grid grid-cols-3 gap-3">
            {MODES.map((m) => {
              const Icon = modeIcon[m.id];
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition",
                    active ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-300",
                  )}
                >
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", active ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500")}>
                    <Icon size={20} />
                  </span>
                  <span className="text-sm font-bold">{m.label}</span>
                  <span className="text-[10px] leading-4 text-slate-500">{m.hint}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="رنگ اصلی برنامه" subtitle="رنگ دکمه‌ها، نمودارها و منو">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
            {THEMES.map((t) => {
              const active = theme === t.id;
              return (
                <button key={t.id} onClick={() => setTheme(t.id)} className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md transition", active ? "scale-110 ring-4 ring-offset-2 ring-offset-white" : "hover:scale-105")}
                    style={{ background: t.swatch, boxShadow: active ? `0 0 0 4px ${t.swatch}33` : undefined }}
                  >
                    {active && <Check size={20} />}
                  </span>
                  <span className={cn("text-[11px] font-semibold", active ? "text-emerald-900" : "text-slate-500")}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <Card title="پیش‌نمایش" subtitle={`${THEMES.find((t) => t.id === theme)?.label} • ${isDark ? "تیره" : "روشن"}`}>
        <div className="hero-gradient mb-3 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 text-xs text-white/80">
            <Sparkles size={14} /> {formatJalali(todayISO(), "weekday")}
          </div>
          <div className="mt-1 text-lg font-extrabold">امتیاز هفته: {fa(82)}</div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 p-3">
          <Ring value={68} size={60} stroke={7} />
          <div className="flex-1">
            <div className="text-xs text-slate-500">کارهای هفته</div>
            <div className="font-extrabold text-emerald-950">{fa(17)} / {fa(25)}</div>
            <ProgressBar value={68} className="mt-1.5" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm">دکمه اصلی</Button>
          <Button size="sm" variant="outline">دکمه فرعی</Button>
          <Button size="sm" variant="soft">نرم</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge className="bg-emerald-100 text-emerald-700">انجام شده</Badge>
          <Badge className="bg-amber-100 text-amber-700">در حال انجام</Badge>
          <Badge className="bg-rose-50 text-rose-700">اولویت زیاد</Badge>
          <Badge className="bg-sky-50 text-sky-700">اولویت کم</Badge>
        </div>
        <p className="mt-4 text-[11px] leading-5 text-slate-400">تنظیمات ظاهر روی این دستگاه و در سرور ذخیره می‌شود. دکمه‌ی ماه/خورشید در منو برای تغییر سریع حالت تیره است.</p>
      </Card>
    </div>
  );
}

/* =============================== Data =============================== */
function DataTab() {
  const { data: stats, reload } = useLoad(() => api<Stats>("/api/data/stats"), []);
  const { data: profile } = useLoad(() => api<Profile>("/api/profile"), []);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [scopes, setScopes] = useState<string[]>(["all"]);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [includeProfile, setIncludeProfile] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const needsPassword = !!profile?.hasPassword;

  async function seed() {
    if (!confirm("داده‌های نمونه بارگذاری شود؟ همه‌ی داده‌های فعلی پاک می‌شوند.")) return;
    setBusy("seed");
    setNotice(null);
    try {
      await api(`/api/seed?today=${todayISO()}`, { method: "POST" });
      setNotice({ kind: "ok", text: "داده‌های نمونه بارگذاری شد" });
      reload(true);
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function exportData() {
    setBusy("export");
    try {
      const payload = await api<unknown>("/api/data/export");
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `planner-backup-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice({ kind: "ok", text: "فایل پشتیبان دانلود شد" });
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function importData() {
    if (!importFile) return;
    if (!confirm("همه‌ی داده‌های فعلی با محتوای فایل پشتیبان جایگزین می‌شود. ادامه می‌دهید؟")) return;
    setBusy("import");
    setNotice(null);
    try {
      const text = await importFile.text();
      const backup = JSON.parse(text);
      const r = await api<{ counts: Record<string, number> }>("/api/data/import", { method: "POST", json: { backup, password: importPassword } });
      const total = Object.values(r.counts).reduce((a, b) => a + b, 0);
      setNotice({ kind: "ok", text: `بازیابی انجام شد (${fa(total)} رکورد)` });
      setImportFile(null);
      setImportPassword("");
      if (fileRef.current) fileRef.current.value = "";
      reload(true);
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message === "Unexpected token" ? "فایل JSON معتبر نیست" : (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function doReset() {
    setBusy("reset");
    try {
      const r = await api<{ cleared: string[] }>("/api/data/reset", { method: "POST", json: { scopes, password, includeProfile: scopes.includes("all") && includeProfile } });
      setNotice({ kind: "ok", text: `پاک شد: ${fa(r.cleared.length)} جدول` });
      setResetOpen(false);
      setConfirmText("");
      setPassword("");
      setIncludeProfile(false);
      setScopes(["all"]);
      reload(true);
      if (includeProfile) window.dispatchEvent(new Event(PROFILE_EVENT));
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const toggleScope = (id: string) => {
    if (id === "all") return setScopes(["all"]);
    const next = scopes.filter((x) => x !== "all");
    setScopes(next.includes(id) ? next.filter((x) => x !== id) : [...next, id]);
  };
  const resetReady = confirmText.trim() === "حذف" && scopes.length > 0 && (!needsPassword || password.length > 0);

  return (
    <div className="space-y-6">
      {notice && <Notice {...notice} />}

      <Card title="آمار داده‌ها" subtitle={stats ? `در مجموع ${fa(stats.total)} رکورد` : "در حال شمارش…"}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {Object.entries(stats?.counts ?? {}).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-100 p-3 text-center">
              <div className="text-lg font-extrabold text-emerald-950">{fa(v)}</div>
              <div className="text-[11px] text-slate-500">{TABLE_LABELS[k] ?? k}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="پشتیبان‌گیری" subtitle="یک فایل JSON از همه‌ی داده‌ها">
          <p className="mb-3 text-xs leading-6 text-slate-500">
            برای انتقال به کامپیوتر دیگر یا به سرور، اول اینجا خروجی بگیر و بعد در دستگاه مقصد از بخش «بازیابی» وارد کن.
          </p>
          <Button onClick={exportData} loading={busy === "export"}>
            <Download size={16} /> دانلود فایل پشتیبان
          </Button>
        </Card>

        <Card title="بازیابی از فایل پشتیبان" subtitle="همه‌ی داده‌های فعلی جایگزین می‌شود">
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-slate-500 file:ml-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-emerald-800"
            />
            {needsPassword && (
              <Field label="رمز عبور">
                <Input dir="ltr" type="password" value={importPassword} onChange={(e) => setImportPassword(e.target.value)} />
              </Field>
            )}
            <Button variant="outline" onClick={importData} disabled={!importFile || (needsPassword && !importPassword)} loading={busy === "import"}>
              <Upload size={16} /> بازیابی
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="داده‌های نمونه" subtitle="برای آشنایی با امکانات برنامه">
          <p className="mb-3 text-xs leading-6 text-slate-500">داده‌های آزمایشی (کارها، عادت‌ها، تراکنش‌ها، درس‌ها…) ساخته می‌شود. داده‌های فعلی پاک می‌شوند؛ پروفایل و تنظیمات می‌مانند.</p>
          <Button variant="soft" onClick={seed} loading={busy === "seed"}>
            <Sparkles size={16} /> بارگذاری داده نمونه
          </Button>
        </Card>

        <Card title="منطقه خطر" subtitle="پاک‌کردن داده‌ها قابل بازگشت نیست" className="border-rose-200">
          <p className="mb-3 text-xs leading-6 text-slate-500">می‌توانی همه‌چیز را پاک کنی و از صفر شروع کنی، یا فقط بخش‌های خاصی را. قبلش پشتیبان بگیر.</p>
          <Button variant="danger" onClick={() => setResetOpen(true)}>
            <Trash2 size={16} /> پاک‌کردن داده‌ها…
          </Button>
        </Card>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="پاک‌کردن داده‌ها"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>انصراف</Button>
            <Button variant="danger" onClick={doReset} disabled={!resetReady} loading={busy === "reset"}>
              <Trash2 size={14} /> پاک کن
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-semibold text-slate-600">چه چیزی پاک شود؟</div>
            <label className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-sm font-bold text-rose-700">
              <input type="checkbox" checked={scopes.includes("all")} onChange={() => toggleScope("all")} className="accent-rose-600" /> همه‌ی داده‌ها
            </label>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {SCOPES.map((s) => (
                <label key={s.id} className={cn("flex items-center gap-2 rounded-xl border p-2 text-xs", scopes.includes("all") ? "border-slate-100 text-slate-400" : "border-slate-200")}>
                  <input type="checkbox" disabled={scopes.includes("all")} checked={!scopes.includes("all") && scopes.includes(s.id)} onChange={() => toggleScope(s.id)} className="accent-emerald-700" />
                  {s.label}
                </label>
              ))}
            </div>
            {scopes.includes("all") && (
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={includeProfile} onChange={(e) => setIncludeProfile(e.target.checked)} className="accent-rose-600" /> پروفایل و تنظیمات هم پاک شود (بازنشانی کامل)
              </label>
            )}
          </div>
          <Field label="برای تأیید، کلمه‌ی «حذف» را بنویس">
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="حذف" />
          </Field>
          {needsPassword && (
            <Field label="رمز عبور">
              <Input dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          )}
        </div>
      </Modal>
    </div>
  );
}

/* =============================== About =============================== */
function AboutTab() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="پلنر جامع" subtitle="نسخه ۱٫۰">
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• پلنر هفتگی، تقویم شمسی، تایم‌لاین روزانه و تایم‌شیت</li>
          <li>• هبیت ترکر، ردیاب مالی و پلنر تحصیلی</li>
          <li>• اهداف بلندمدت و ارزیابی عملکرد هفتگی</li>
        </ul>
        <p className="mt-4 text-xs leading-6 text-slate-400">داده‌ها روی سرور شما (دیتابیس PostgreSQL) ذخیره می‌شوند و هیچ‌جای دیگری ارسال نمی‌شوند.</p>
      </Card>
      <Card title="نکات" subtitle="میان‌برها و راهنما">
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• در نسخه ویندوز: <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">Ctrl + ,</kbd> آدرس سرور را تغییر می‌دهد و <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">F5</kbd> صفحه را تازه می‌کند.</li>
          <li>• برای نصب روی گوشی: سایت را در Chrome باز کن → «Add to Home screen».</li>
          <li>• قبل از جابه‌جایی به سرور جدید، از بخش «داده‌ها» پشتیبان بگیر و در مقصد بازیابی کن.</li>
        </ul>
      </Card>
    </div>
  );
}

/* =============================== Mobile: optional server connection =============================== */
function MobileConnectCard() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(() => getRemoteUrl() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    const clean = url.trim().replace(/\/+$/, "");
    if (!/^https?:\/\/[^\s/]+/.test(clean)) return setError("آدرس باید با http:// یا https:// شروع شود");
    setBusy(true);
    setError(null);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${clean}/api/health`, { cache: "no-store", signal: ctrl.signal });
      clearTimeout(t);
      const j = (await res.json().catch(() => null)) as { app?: string } | null;
      if (!res.ok || j?.app !== "planner") throw new Error("این آدرس یک سرور پلنر نیست");
      setRemoteUrl(clean);
      window.location.href = remoteEntryUrl(clean);
    } catch (e) {
      setError((e as Error).name === "AbortError" ? "سرور پاسخ نداد. آدرس، وای‌فای و روشن‌بودن کامپیوتر را بررسی کن." : (e as Error).message || "اتصال برقرار نشد");
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <WifiOff className="text-emerald-700" size={20} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-emerald-950">حالت آفلاین — داده‌ها روی همین گوشی ذخیره می‌شود</div>
          <div className="text-xs text-slate-500">بدون نیاز به سرور یا اینترنت. برای انتقال داده‌ها از «داده‌ها → پشتیبان‌گیری» استفاده کن.</div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Wifi size={14} /> اتصال به سرور (اختیاری)
        </Button>
      </div>
      {open && (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-3">
          <p className="mb-2 text-xs leading-6 text-slate-500">
            اگر برنامه‌ی ویندوز را داری: <b>Ctrl + ,</b> → «دسترسی گوشی در شبکه‌ی خانگی» را فعال کن و آدرسش را اینجا بزن (مثل <code dir="ltr">http://192.168.1.10:3000</code>).
            بعد از اتصال، داده‌های این گوشی با سرور یکی <b>نمی‌شود</b> — از «پشتیبان‌گیری/بازیابی» برای انتقال استفاده کن.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input dir="ltr" className="min-w-[220px] flex-1" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://192.168.1.10:3000" />
            <Button onClick={connect} loading={busy}>
              اتصال
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

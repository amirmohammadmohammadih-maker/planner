"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Circle, Plus, Wallet, GraduationCap, Clock3, Repeat, Target, Sparkles, ArrowLeft, Database, Settings } from "lucide-react";
import type { Goal, Habit, HabitLog, Task } from "@/db/schema";
import { api, create, update, useLoad } from "@/lib/api";
import { addDays, compactMoney, daysBetween, fa, formatJalali, hoursLabel, pct, todayISO, WEEKDAYS_SHORT } from "@/lib/jalali";
import type { WeekMetrics } from "@/lib/metrics";
import { BarChart, Button, Card, Empty, Loading, PRIORITY, ProgressBar, Ring, StatCard, cn } from "@/components/ui";
import TaskModal, { type TaskDraft } from "@/components/TaskModal";

type Dashboard = {
  today: string;
  weekStart: string;
  monthKey: string;
  todayTasks: Task[];
  weekTasks: Task[];
  tasksByDay: { total: number; done: number }[];
  habits: Habit[];
  todayLogs: number[];
  weekLogs: HabitLog[];
  month: { income: number; expense: number };
  study: { weekMinutes: number; byDay: number[]; upcomingExams: { id: number; title: string; date: string; courseName: string; courseColor: string }[] };
  timesheetWeekMinutes: number;
  goals: Goal[];
  metrics: WeekMetrics;
  trend: { weekStart: string; overall: number }[];
  isEmpty: boolean;
  profileName: string | null;
};

export default function DashboardPage() {
  const today = todayISO();
  const { data, loading, error, reload } = useLoad(() => api<Dashboard>(`/api/dashboard?today=${today}`), [today]);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function seed() {
    if (!confirm("داده‌های نمونه بارگذاری شود؟ (داده‌های فعلی پاک می‌شوند)")) return;
    setSeeding(true);
    await api(`/api/seed?today=${today}`, { method: "POST" });
    setSeeding(false);
    reload();
  }

  async function toggleTask(t: Task) {
    await update("tasks", t.id, { status: t.status === "done" ? "todo" : "done" });
    reload(true);
  }
  async function toggleHabit(h: Habit) {
    await create("habit_logs", { habitId: h.id, date: today });
    reload(true);
  }

  if (!data && error)
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-800">
        <div className="mb-1 font-bold">بارگذاری انجام نشد</div>
        <div className="text-xs leading-6">{error}</div>
        <Button variant="outline" className="mt-3" onClick={() => reload()}>
          تلاش مجدد
        </Button>
      </div>
    );
  if (loading || !data) return <Loading />;

  const doneToday = data.todayTasks.filter((t) => t.status === "done").length;
  const balance = data.month.income - data.month.expense;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صبح بخیر" : hour < 18 ? "ظهر بخیر" : "عصر بخیر";
  const m = data.metrics;

  return (
    <div className="fade-up space-y-6">
      {/* Hero */}
      <div className="hero-gradient relative overflow-hidden rounded-3xl p-6 text-white shadow-lg">
        <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 left-32 h-56 w-56 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-white/80">
              <Sparkles size={16} /> {greeting}
              {data.profileName ? `، ${data.profileName}` : ""}!
            </div>
            <h1 className="mt-1 text-2xl font-extrabold">{formatJalali(today)}</h1>
            <p className="mt-2 max-w-md text-sm text-white/80">
              امروز {fa(data.todayTasks.length)} کار داری که {fa(doneToday)} تای آن انجام شده. {fa(data.todayLogs.length)} از {fa(data.habits.length)} عادت امروز ثبت شده.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setDraft({ date: today })}>
                <Plus size={16} /> کار جدید
              </Button>
              {data.isEmpty ? (
                <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={seed} loading={seeding}>
                  <Database size={16} /> بارگذاری داده نمونه
                </Button>
              ) : (
                <Link href="/settings">
                  <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                    <Settings size={16} /> تنظیمات
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <Ring value={m.overall} size={110} stroke={11} color="#ffffff" track="rgba(255,255,255,.2)">
              <span className="text-3xl font-black">{fa(m.overall)}</span>
              <span className="text-[10px] text-white/80">امتیاز هفته</span>
            </Ring>
            <div className="hidden text-xs leading-6 text-white/80 sm:block">
              <div>کارها: {m.tasks.rate === null ? "—" : fa(Math.round(m.tasks.rate * 100)) + "٪"}</div>
              <div>عادت‌ها: {m.habits.rate === null ? "—" : fa(Math.round(m.habits.rate * 100)) + "٪"}</div>
              <div>مطالعه: {m.study.rate === null ? "—" : fa(Math.round(m.study.rate * 100)) + "٪"}</div>
              <div>بودجه: {m.budget.rate === null ? "—" : fa(Math.round(m.budget.rate * 100)) + "٪"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="کارهای این هفته" value={`${fa(m.tasks.done)} / ${fa(m.tasks.total)}`} sub={`${fa(pct(m.tasks.done, m.tasks.total))}٪ تکمیل`} icon={<CheckCircle2 size={22} />} />
        <StatCard label="عادت‌های هفته" value={`${fa(m.habits.done)} / ${fa(m.habits.target)}`} sub="نسبت به هدف هفتگی" icon={<Repeat size={22} />} tone="violet" />
        <StatCard label="تراز این ماه" value={compactMoney(balance)} sub={`درآمد ${compactMoney(data.month.income)} • هزینه ${compactMoney(data.month.expense)}`} icon={<Wallet size={22} />} tone={balance >= 0 ? "green" : "rose"} />
        <StatCard label="مطالعه و کار این هفته" value={hoursLabel(data.study.weekMinutes)} sub={`تایم‌شیت: ${hoursLabel(data.timesheetWeekMinutes)}`} icon={<GraduationCap size={22} />} tone="blue" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's tasks */}
        <Card
          title="کارهای امروز"
          subtitle={`${fa(doneToday)} از ${fa(data.todayTasks.length)} انجام شده`}
          className="lg:col-span-2"
          action={
            <Link href="/planner" className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
              پلنر هفتگی <ArrowLeft size={14} />
            </Link>
          }
        >
          {data.todayTasks.length === 0 ? (
            <Empty text="برای امروز کاری ثبت نشده" action={<Button size="sm" onClick={() => setDraft({ date: today })}>افزودن کار</Button>} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.todayTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <button onClick={() => toggleTask(t)} className={cn("shrink-0", t.status === "done" ? "text-emerald-600" : "text-slate-300 hover:text-emerald-500")}>
                    {t.status === "done" ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                  </button>
                  <button onClick={() => setDraft(t)} className="min-w-0 flex-1 text-right">
                    <div className={cn("truncate text-sm font-semibold", t.status === "done" && "text-slate-400 line-through")}>{t.title}</div>
                    <div className="text-[11px] text-slate-400">
                      {t.startTime ? `${fa(t.startTime)}${t.endTime ? " - " + fa(t.endTime) : ""} • ` : ""}
                      {t.category}
                    </div>
                  </button>
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", PRIORITY[t.priority]?.dot)} title={PRIORITY[t.priority]?.label} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-2 text-xs font-semibold text-slate-500">کارهای انجام‌شده در هفته</div>
            <BarChart
              height={90}
              data={data.tasksByDay.map((d, i) => ({ label: WEEKDAYS_SHORT[i], value: d.done, hint: `${fa(d.done)} از ${fa(d.total)}`, color: addDays(data.weekStart, i) === today ? "var(--accent)" : "var(--accent-soft)" }))}
            />
          </div>
        </Card>

        {/* Habits today */}
        <Card
          title="عادت‌های امروز"
          action={
            <Link href="/habits" className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
              همه <ArrowLeft size={14} />
            </Link>
          }
        >
          {data.habits.length === 0 ? (
            <Empty text="هنوز عادتی تعریف نشده" action={<Link href="/habits"><Button size="sm">افزودن عادت</Button></Link>} />
          ) : (
            <div className="space-y-2">
              {data.habits.map((h) => {
                const done = data.todayLogs.includes(h.id);
                const weekCount = data.weekLogs.filter((l) => l.habitId === h.id).length;
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleHabit(h)}
                    className={cn("flex w-full items-center gap-3 rounded-xl border p-2.5 text-right transition", done ? "border-emerald-200 bg-emerald-50" : "border-slate-100 hover:bg-slate-50")}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg text-lg" style={{ background: h.color + "22" }}>
                      {h.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{h.name}</span>
                      <span className="block text-[11px] text-slate-400">
                        این هفته {fa(weekCount)} از {fa(h.targetPerWeek)}
                      </span>
                    </span>
                    {done ? <CheckCircle2 className="text-emerald-600" size={20} /> : <Circle className="text-slate-300" size={20} />}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend */}
        <Card title="روند امتیاز عملکرد" subtitle="۶ هفته اخیر">
          <BarChart height={120} data={data.trend.map((t, i) => ({ label: i === data.trend.length - 1 ? "این هفته" : formatJalali(t.weekStart, "dayMonth"), value: t.overall, color: i === data.trend.length - 1 ? "var(--accent)" : "var(--accent-soft)" }))} format={(v) => fa(v)} />
          <Link href="/review" className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-emerald-700">
            گزارش کامل ارزیابی <ArrowLeft size={14} />
          </Link>
        </Card>

        {/* Upcoming exams */}
        <Card
          title="آزمون‌های پیش‌رو"
          action={
            <Link href="/study" className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
              پلنر تحصیلی <ArrowLeft size={14} />
            </Link>
          }
        >
          {data.study.upcomingExams.length === 0 ? (
            <Empty text="آزمونی در پیش نیست" />
          ) : (
            <ul className="space-y-2">
              {data.study.upcomingExams.map((e) => {
                const d = daysBetween(today, e.date);
                return (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                    <span className="h-10 w-1.5 rounded-full" style={{ background: e.courseColor }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{e.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {e.courseName} • {formatJalali(e.date, "weekday")}
                      </div>
                    </div>
                    <span className={cn("rounded-lg px-2 py-1 text-xs font-bold", d <= 3 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700")}>
                      {d === 0 ? "امروز" : `${fa(d)} روز`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="mb-2 text-xs font-semibold text-slate-500">دقایق مطالعه در هفته</div>
            <BarChart height={70} data={data.study.byDay.map((v, i) => ({ label: WEEKDAYS_SHORT[i], value: v }))} color="#0ea5e9" />
          </div>
        </Card>

        {/* Goals */}
        <Card
          title="اهداف فعال"
          action={
            <Link href="/goals" className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
              همه اهداف <ArrowLeft size={14} />
            </Link>
          }
        >
          {data.goals.length === 0 ? (
            <Empty text="هدفی تعریف نشده" action={<Link href="/goals"><Button size="sm"><Target size={14} /> تعریف هدف</Button></Link>} />
          ) : (
            <div className="space-y-3">
              {data.goals.map((g) => {
                const p = pct(g.currentValue, g.targetValue);
                return (
                  <div key={g.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold">{g.title}</span>
                      <span className="text-slate-500">{fa(p)}٪</span>
                    </div>
                    <ProgressBar value={p} color={p >= 100 ? "var(--accent)" : p >= 50 ? "var(--accent-mid)" : "#f59e0b"} />
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
            <Clock3 size={14} /> تایم‌شیت این هفته: <b>{hoursLabel(data.timesheetWeekMinutes)}</b>
          </div>
        </Card>
      </div>

      <TaskModal draft={draft} onClose={() => setDraft(null)} onSaved={() => reload(true)} />
    </div>
  );
}

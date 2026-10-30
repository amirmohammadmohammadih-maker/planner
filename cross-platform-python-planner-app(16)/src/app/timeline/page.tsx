"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, CheckCircle2, Circle, ArrowLeft } from "lucide-react";
import type { Task, TimesheetEntry } from "@/db/schema";
import { list, update, useLoad } from "@/lib/api";
import { addDays, fa, formatJalali, hoursLabel, minutesToHM, pct, timeToMinutes, todayISO } from "@/lib/jalali";
import { Button, Card, PageHeader, PRIORITY, RangeNav, StatCard, cn, Loading } from "@/components/ui";
import TaskModal, { type TaskDraft } from "@/components/TaskModal";

const START_HOUR = 6;
const END_HOUR = 24;
const HOUR_PX = 56;

export default function TimelinePage() {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const { data, loading, reload } = useLoad(
    async () => {
      const [tasks, entries] = await Promise.all([list<Task>("tasks", { from: date, to: date }), list<TimesheetEntry>("timesheet", { from: date, to: date })]);
      return { tasks, entries };
    },
    [date],
  );
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const tasks = data?.tasks ?? [];
  const entries = data?.entries ?? [];
  const timed = tasks.filter((t) => timeToMinutes(t.startTime) !== null);
  const untimed = tasks.filter((t) => timeToMinutes(t.startTime) === null);
  const plannedMinutes = timed.reduce((a, t) => {
    const s = timeToMinutes(t.startTime)!;
    const e = timeToMinutes(t.endTime) ?? s + 60;
    return a + Math.max(15, e - s);
  }, 0);
  const actualMinutes = entries.reduce((a, e) => a + e.minutes, 0);
  const done = tasks.filter((t) => t.status === "done").length;
  const totalPx = (END_HOUR - START_HOUR) * HOUR_PX;

  const pos = (start: string | null, end: string | null) => {
    const s = timeToMinutes(start) ?? START_HOUR * 60;
    const e = Math.max(s + 20, timeToMinutes(end) ?? s + 60);
    const top = ((s - START_HOUR * 60) / 60) * HOUR_PX;
    const height = ((e - s) / 60) * HOUR_PX;
    return { top: Math.max(0, top), height: Math.min(height, totalPx - Math.max(0, top)) };
  };

  async function toggle(t: Task) {
    await update("tasks", t.id, { status: t.status === "done" ? "todo" : "done" });
    reload(true);
  }

  return (
    <div className="fade-up">
      <PageHeader
        title="تایم‌لاین روزانه"
        subtitle="برنامه (کارها) در برابر واقعیت (تایم‌شیت) — مدیریت زمان و تمرکز"
        actions={
          <>
            <RangeNav label={formatJalali(date, "weekday")} onPrev={() => setDate(addDays(date, -1))} onNext={() => setDate(addDays(date, 1))} onToday={() => setDate(today)} />
            <Button onClick={() => setDraft({ date, startTime: "09:00", endTime: "10:00" })}>
              <Plus size={16} /> بلوک زمانی
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="زمان برنامه‌ریزی‌شده" value={hoursLabel(plannedMinutes)} sub={`${fa(timed.length)} بلوک`} />
        <StatCard label="زمان ثبت‌شده (تایم‌شیت)" value={hoursLabel(actualMinutes)} sub={`${fa(entries.length)} ورودی`} tone="blue" />
        <StatCard label="تکمیل کارها" value={`${fa(pct(done, tasks.length))}٪`} sub={`${fa(done)} از ${fa(tasks.length)}`} tone="violet" />
        <StatCard label="نسبت واقعیت به برنامه" value={plannedMinutes ? `${fa(Math.round((actualMinutes / plannedMinutes) * 100))}٪` : "—"} sub="اجرا در برابر برنامه" tone="amber" />
      </div>

      {loading && !data ? (
        <Loading />
      ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          <Card className="lg:col-span-3" padding={false}>
            <div className="grid grid-cols-[48px_1fr_1fr] border-b border-slate-100 text-center text-xs font-bold text-emerald-900">
              <div className="py-3" />
              <div className="py-3">📋 برنامه (کارها)</div>
              <div className="py-3">⏱ واقعیت (تایم‌شیت)</div>
            </div>
            <div className="scroll-x">
              <div className="relative grid grid-cols-[48px_1fr_1fr]" style={{ height: totalPx }}>
                {/* hour lines */}
                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                  <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-100" style={{ top: i * HOUR_PX }}>
                    <span className="absolute right-1 -top-2 bg-white px-1 text-[10px] text-slate-400">{fa(String(START_HOUR + i).padStart(2, "0"))}:۰۰</span>
                  </div>
                ))}
                {/* now line */}
                {date === today && now !== null && now >= START_HOUR * 60 && now <= END_HOUR * 60 && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-rose-500" style={{ top: ((now - START_HOUR * 60) / 60) * HOUR_PX }}>
                    <span className="absolute right-0 -top-2.5 rounded bg-rose-500 px-1 text-[9px] font-bold text-white">اکنون</span>
                  </div>
                )}
                <div />
                {/* planned column */}
                <div className="relative border-l border-slate-100 px-1" onDoubleClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const minutes = START_HOUR * 60 + Math.floor(((e.clientY - rect.top) / HOUR_PX) * 60 / 30) * 30;
                  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
                  const m = String(minutes % 60).padStart(2, "0");
                  const eh = String(Math.floor((minutes + 60) / 60)).padStart(2, "0");
                  setDraft({ date, startTime: `${h}:${m}`, endTime: `${eh}:${m}` });
                }}>
                  {timed.map((t) => {
                    const p = pos(t.startTime, t.endTime);
                    return (
                      <button
                        key={t.id}
                        onClick={() => setDraft(t)}
                        className={cn("absolute inset-x-1 overflow-hidden rounded-lg border-r-4 p-1.5 text-right text-[11px] shadow-sm transition hover:shadow", PRIORITY[t.priority]?.bg, t.status === "done" && "opacity-60")}
                        style={{ top: p.top, height: p.height, borderRightColor: t.priority === "high" ? "#f43f5e" : t.priority === "medium" ? "#f59e0b" : "#0ea5e9" }}
                      >
                        <div className={cn("truncate font-bold", t.status === "done" && "line-through")}>{t.title}</div>
                        <div className="text-[10px] text-slate-500">
                          {fa(t.startTime)}
                          {t.endTime ? `–${fa(t.endTime)}` : ""} • {t.category}
                        </div>
                      </button>
                    );
                  })}
                  {!timed.length && <div className="absolute inset-x-0 top-24 text-center text-xs text-slate-300">برای افزودن بلوک، دوبار کلیک کنید</div>}
                </div>
                {/* actual column */}
                <div className="relative border-l border-slate-100 px-1">
                  {entries.map((e) => {
                    const p = pos(e.startTime, e.endTime ?? null);
                    return (
                      <div key={e.id} className="absolute inset-x-1 overflow-hidden rounded-lg border border-sky-200 bg-sky-50 p-1.5 text-right text-[11px] shadow-sm" style={{ top: p.top, height: p.height }}>
                        <div className="truncate font-bold text-sky-900">{e.project}</div>
                        <div className="truncate text-[10px] text-sky-700">
                          {e.description ?? ""} • {minutesToHM(e.minutes)}
                        </div>
                      </div>
                    );
                  })}
                  {!entries.length && (
                    <div className="absolute inset-x-0 top-24 text-center text-xs text-slate-300">
                      ورودی تایم‌شیت ندارد •{" "}
                      <Link href="/timesheet" className="text-emerald-700 underline">
                        ثبت زمان
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card title="کارهای بدون زمان" subtitle="به این‌ها بلوک زمانی بده">
              {untimed.length === 0 ? (
                <p className="text-xs text-slate-400">همه کارهای امروز زمان‌بندی شده‌اند ✅</p>
              ) : (
                <ul className="space-y-2">
                  {untimed.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2">
                      <button onClick={() => toggle(t)} className={t.status === "done" ? "text-emerald-600" : "text-slate-300"}>
                        {t.status === "done" ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <button onClick={() => setDraft(t)} className="min-w-0 flex-1 truncate text-right text-xs font-semibold">
                        {t.title}
                      </button>
                      <span className={cn("h-2 w-2 rounded-full", PRIORITY[t.priority]?.dot)} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="فهرست روز">
              <ol className="relative mr-2 space-y-3 border-r-2 border-emerald-100 pr-4 text-xs">
                {[...timed].sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")).map((t) => (
                  <li key={t.id} className="relative">
                    <span className={cn("absolute -right-[23px] top-1 h-3 w-3 rounded-full border-2 border-white", t.status === "done" ? "bg-emerald-600" : "bg-slate-300")} />
                    <div className="font-semibold text-slate-700">{fa(t.startTime)} — {t.title}</div>
                    <div className="text-[10px] text-slate-400">{t.category}</div>
                  </li>
                ))}
                {!timed.length && <li className="text-slate-400">موردی نیست</li>}
              </ol>
              <Link href="/timesheet" className="mt-4 flex items-center justify-end gap-1 text-xs font-semibold text-emerald-700">
                ثبت زمان در تایم‌شیت <ArrowLeft size={14} />
              </Link>
            </Card>
          </div>
        </div>
      )}

      <TaskModal draft={draft} onClose={() => setDraft(null)} onSaved={() => reload(true)} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Plus, Clock } from "lucide-react";
import type { Task } from "@/db/schema";
import { list, update, useLoad } from "@/lib/api";
import { addDays, fa, formatJalali, pct, startOfWeek, todayISO, weekDays, weekLabel, WEEKDAYS } from "@/lib/jalali";
import { Button, Card, PageHeader, PRIORITY, ProgressBar, RangeNav, Ring, StatCard, cn, Loading } from "@/components/ui";
import TaskModal, { type TaskDraft } from "@/components/TaskModal";

export default function PlannerPage() {
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const days = weekDays(weekStart);
  const { data: tasks, loading, reload } = useLoad(() => list<Task>("tasks", { from: weekStart, to: addDays(weekStart, 6) }), [weekStart]);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");

  const all = tasks ?? [];
  const done = all.filter((t) => t.status === "done").length;
  const high = all.filter((t) => t.priority === "high");
  const highDone = high.filter((t) => t.status === "done").length;
  const byCat = Object.entries(
    all.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  async function toggle(t: Task) {
    await update("tasks", t.id, { status: t.status === "done" ? "todo" : "done" });
    reload(true);
  }

  return (
    <div className="fade-up">
      <PageHeader
        title="پلنر هفتگی"
        subtitle="برنامه‌ریزی هفتگی ساده و سریع؛ کارها را روی روزهای هفته بچین و پیشرفتت را ببین."
        actions={
          <>
            <RangeNav label={weekLabel(weekStart)} onPrev={() => setWeekStart(addDays(weekStart, -7))} onNext={() => setWeekStart(addDays(weekStart, 7))} onToday={() => setWeekStart(startOfWeek(today))} />
            <Button onClick={() => setDraft({ date: days.includes(today) ? today : weekStart })}>
              <Plus size={16} /> کار جدید
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <Ring value={pct(done, all.length)} size={64} stroke={7} />
          <div>
            <div className="text-xs text-slate-500">پیشرفت هفته</div>
            <div className="text-lg font-extrabold text-emerald-950">
              {fa(done)} / {fa(all.length)}
            </div>
          </div>
        </div>
        <StatCard label="کارهای مهم (اولویت زیاد)" value={`${fa(highDone)} / ${fa(high.length)}`} sub="انجام‌شده" tone="rose" />
        <StatCard label="باقی‌مانده" value={fa(all.length - done)} sub="کار انجام‌نشده" tone="amber" />
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs text-slate-500">دسته‌بندی‌ها</div>
          <div className="flex flex-wrap gap-1">
            {byCat.slice(0, 4).map(([c, n]) => (
              <span key={c} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                {c} {fa(n)}
              </span>
            ))}
            {!byCat.length && <span className="text-xs text-slate-400">—</span>}
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        {(["all", "todo", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn("rounded-full px-3 py-1 text-xs font-semibold", filter === f ? "bg-emerald-700 text-white" : "bg-white text-slate-600 border border-emerald-100")}
          >
            {f === "all" ? "همه" : f === "todo" ? "انجام‌نشده" : "انجام‌شده"}
          </button>
        ))}
      </div>

      {loading && !tasks ? (
        <Loading />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {days.map((d, i) => {
            const dayTasks = all.filter((t) => t.date === d && (filter === "all" || (filter === "done" ? t.status === "done" : t.status !== "done")));
            const dayAll = all.filter((t) => t.date === d);
            const dayDone = dayAll.filter((t) => t.status === "done").length;
            const isToday = d === today;
            const isPast = d < today;
            return (
              <div key={d} className={cn("flex min-h-[220px] flex-col rounded-2xl border bg-white shadow-sm", isToday ? "border-emerald-500 ring-2 ring-emerald-100" : "border-emerald-100")}>
                <div className={cn("flex items-center justify-between rounded-t-2xl px-3 py-2.5", isToday ? "bg-emerald-700 text-white" : i === 6 ? "bg-rose-50 text-rose-800" : "bg-emerald-50/70 text-emerald-950")}>
                  <div>
                    <div className="text-xs font-bold">{WEEKDAYS[i]}</div>
                    <div className={cn("text-[11px]", isToday ? "text-emerald-100" : "text-slate-500")}>{formatJalali(d, "dayMonth")}</div>
                  </div>
                  <button onClick={() => setDraft({ date: d })} className={cn("rounded-lg p-1", isToday ? "hover:bg-white/20" : "hover:bg-white")} aria-label="افزودن">
                    <Plus size={16} />
                  </button>
                </div>
                {dayAll.length > 0 && <ProgressBar value={pct(dayDone, dayAll.length)} height={3} className="rounded-none" />}
                <div className="flex-1 space-y-1.5 p-2">
                  {dayTasks.length === 0 && <div className="py-6 text-center text-[11px] text-slate-300">{isPast ? "—" : "خالی"}</div>}
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className={cn("group flex items-start gap-1.5 rounded-xl border p-2 text-right transition hover:shadow-sm", PRIORITY[t.priority]?.bg, t.status === "done" && "opacity-60")}
                    >
                      <button onClick={() => toggle(t)} className={cn("mt-0.5 shrink-0", t.status === "done" ? "text-emerald-600" : "text-slate-400 hover:text-emerald-600")}>
                        {t.status === "done" ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </button>
                      <button onClick={() => setDraft(t)} className="min-w-0 flex-1 text-right">
                        <div className={cn("text-xs font-semibold leading-5 text-slate-800", t.status === "done" && "line-through")}>{t.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                          {t.startTime && (
                            <span className="inline-flex items-center gap-0.5">
                              <Clock size={10} /> {fa(t.startTime)}
                              {t.endTime ? `–${fa(t.endTime)}` : ""}
                            </span>
                          )}
                          <span className="rounded bg-white/70 px-1">{t.category}</span>
                          {t.status === "doing" && <span className="rounded bg-amber-200/60 px-1 text-amber-800">در حال انجام</span>}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Card title="راهنمای اولویت‌ها" className="mt-6">
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          {Object.entries(PRIORITY).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-full", v.dot)} /> اولویت {v.label}
            </span>
          ))}
          <span className="text-slate-400">• برای ویرایش روی عنوان هر کار کلیک کنید، برای تکمیل روی دایره.</span>
        </div>
      </Card>

      <TaskModal draft={draft} onClose={() => setDraft(null)} onSaved={() => reload(true)} />
    </div>
  );
}

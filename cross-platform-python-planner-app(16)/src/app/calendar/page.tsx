"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus, GraduationCap } from "lucide-react";
import type { Exam, Task } from "@/db/schema";
import { list, update, useLoad } from "@/lib/api";
import { fa, formatJalali, jalaliMonthKey, monthKeyLabel, monthKeyToRange, pct, shiftMonthKey, todayISO, weekdayIndex, WEEKDAYS, WEEKDAYS_SHORT, addDays, jalaliMonthLength } from "@/lib/jalali";
import { Button, Card, PageHeader, PRIORITY, RangeNav, Ring, cn, Loading, Empty } from "@/components/ui";
import TaskModal, { type TaskDraft } from "@/components/TaskModal";

export default function CalendarPage() {
  const today = todayISO();
  const [monthKey, setMonthKey] = useState(jalaliMonthKey(today));
  const [selected, setSelected] = useState(today);
  const range = monthKeyToRange(monthKey);
  const { data, loading, reload } = useLoad(
    async () => {
      const [tasks, exams] = await Promise.all([list<Task>("tasks", { from: range.from, to: range.to }), list<Exam>("exams", { from: range.from, to: range.to })]);
      return { tasks, exams };
    },
    [monthKey],
  );
  const [draft, setDraft] = useState<TaskDraft | null>(null);

  const cells = useMemo(() => {
    const len = jalaliMonthLength(range.jy, range.jm);
    const lead = weekdayIndex(range.from);
    const out: (string | null)[] = Array(lead).fill(null);
    for (let i = 0; i < len; i++) out.push(addDays(range.from, i));
    while (out.length % 7) out.push(null);
    return out;
  }, [range.from, range.jy, range.jm]);

  const tasks = data?.tasks ?? [];
  const exams = data?.exams ?? [];
  const monthDone = tasks.filter((t) => t.status === "done").length;
  const selTasks = tasks.filter((t) => t.date === selected);
  const selExams = exams.filter((e) => e.date === selected);

  async function toggle(t: Task) {
    await update("tasks", t.id, { status: t.status === "done" ? "todo" : "done" });
    reload(true);
  }

  return (
    <div className="fade-up">
      <PageHeader
        title="تقویم کارها"
        subtitle="نمای ماهانه کارها و آزمون‌ها بر اساس تقویم شمسی"
        actions={
          <>
            <RangeNav
              label={monthKeyLabel(monthKey)}
              onPrev={() => setMonthKey(shiftMonthKey(monthKey, -1))}
              onNext={() => setMonthKey(shiftMonthKey(monthKey, 1))}
              onToday={() => {
                setMonthKey(jalaliMonthKey(today));
                setSelected(today);
              }}
            />
            <Button onClick={() => setDraft({ date: selected })}>
              <Plus size={16} /> کار جدید
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" padding={false}>
          <div className="flex items-center justify-between px-5 pt-5">
            <div className="text-sm text-slate-500">
              این ماه <b className="text-emerald-900">{fa(tasks.length)}</b> کار • <b className="text-emerald-900">{fa(monthDone)}</b> انجام‌شده • <b className="text-emerald-900">{fa(exams.length)}</b> آزمون
            </div>
            <Ring value={pct(monthDone, tasks.length)} size={48} stroke={5} />
          </div>
          {loading && !data ? (
            <Loading />
          ) : (
            <div className="p-3 sm:p-5">
              <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-bold text-slate-500">
                {WEEKDAYS.map((w, i) => (
                  <div key={w} className={cn("py-1", i === 6 && "text-rose-500")}>
                    <span className="hidden sm:inline">{w}</span>
                    <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((d, i) => {
                  if (!d) return <div key={i} className="min-h-[64px] sm:min-h-[96px]" />;
                  const dt = tasks.filter((t) => t.date === d);
                  const de = exams.filter((e) => e.date === d);
                  const isToday = d === today;
                  const isSel = d === selected;
                  return (
                    <button
                      key={d}
                      onClick={() => setSelected(d)}
                      className={cn(
                        "flex min-h-[64px] flex-col rounded-xl border p-1 text-right transition sm:min-h-[96px] sm:p-1.5",
                        isSel ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40",
                        i % 7 === 6 && !isSel && "bg-rose-50/40",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", isToday ? "bg-emerald-700 text-white" : "text-slate-700")}>
                          {fa(formatJalali(d, "dayMonth").split(" ")[0])}
                        </span>
                        {dt.length > 0 && (
                          <span className="text-[9px] text-slate-400">
                            {fa(dt.filter((t) => t.status === "done").length)}/{fa(dt.length)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 hidden flex-1 space-y-0.5 overflow-hidden sm:block">
                        {de.slice(0, 1).map((e) => (
                          <div key={"e" + e.id} className="truncate rounded bg-violet-100 px-1 text-[10px] font-semibold text-violet-700">
                            🎓 {e.title}
                          </div>
                        ))}
                        {dt.slice(0, de.length ? 2 : 3).map((t) => (
                          <div key={t.id} className={cn("truncate rounded border px-1 text-[10px]", PRIORITY[t.priority]?.bg, t.status === "done" && "line-through opacity-60")}>
                            {t.title}
                          </div>
                        ))}
                        {dt.length > 3 && <div className="text-[10px] text-slate-400">+{fa(dt.length - 3)} مورد دیگر</div>}
                      </div>
                      <div className="mt-auto flex gap-0.5 sm:hidden">
                        {de.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
                        {dt.slice(0, 4).map((t) => (
                          <span key={t.id} className={cn("h-1.5 w-1.5 rounded-full", PRIORITY[t.priority]?.dot)} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <Card title={formatJalali(selected)} subtitle={`${fa(selTasks.length)} کار`} action={<Button size="sm" onClick={() => setDraft({ date: selected })}><Plus size={14} /> افزودن</Button>}>
          {selExams.map((e) => (
            <div key={e.id} className="mb-2 flex items-center gap-2 rounded-xl bg-violet-50 p-2.5 text-xs font-semibold text-violet-800">
              <GraduationCap size={16} /> {e.title}
            </div>
          ))}
          {selTasks.length === 0 ? (
            <Empty text="برای این روز کاری ثبت نشده" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {selTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-2">
                  <button onClick={() => toggle(t)} className={t.status === "done" ? "text-emerald-600" : "text-slate-300"}>
                    {t.status === "done" ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  <button onClick={() => setDraft(t)} className="min-w-0 flex-1 text-right">
                    <div className={cn("truncate text-sm font-semibold", t.status === "done" && "text-slate-400 line-through")}>{t.title}</div>
                    <div className="text-[11px] text-slate-400">
                      {t.startTime ? `${fa(t.startTime)} • ` : ""}
                      {t.category} • اولویت {PRIORITY[t.priority]?.label}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <TaskModal draft={draft} onClose={() => setDraft(null)} onSaved={() => reload(true)} />
    </div>
  );
}

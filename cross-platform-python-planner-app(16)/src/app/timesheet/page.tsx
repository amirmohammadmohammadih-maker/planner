"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { TimesheetEntry } from "@/db/schema";
import { create, list, remove, update, useLoad } from "@/lib/api";
import { addDays, fa, formatJalali, hoursLabel, minutesToHM, startOfWeek, timeToMinutes, todayISO, weekDays, weekLabel, WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/jalali";
import { BarChart, Button, Card, Empty, Field, Input, Modal, PageHeader, RangeNav, Select, StatCard, cn, Loading, COLORS } from "@/components/ui";

type Draft = Partial<TimesheetEntry> & { date: string };

export default function TimesheetPage() {
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const days = weekDays(weekStart);
  const { data, loading, reload } = useLoad(
    async () => {
      const [entries, allProjects] = await Promise.all([list<TimesheetEntry>("timesheet", { from: weekStart, to: addDays(weekStart, 6) }), list<TimesheetEntry>("timesheet", { from: addDays(weekStart, -60), to: addDays(weekStart, 6) })]);
      return { entries, projects: [...new Set(allProjects.map((e) => e.project))] };
    },
    [weekStart],
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const entries = useMemo(() => data?.entries ?? [], [data?.entries]);
  const projects = useMemo(() => [...new Set([...entries.map((e) => e.project), ...(data?.projects ?? [])])], [entries, data?.projects]);
  const total = entries.reduce((a, e) => a + e.minutes, 0);
  const billable = entries.filter((e) => e.billable).reduce((a, e) => a + e.minutes, 0);
  const byDay = days.map((d) => entries.filter((e) => e.date === d).reduce((a, e) => a + e.minutes, 0));
  const matrixProjects = [...new Set(entries.map((e) => e.project))];
  const colorOf = (p: string) => COLORS[Math.max(0, projects.indexOf(p)) % COLORS.length];

  const computedMinutes = (() => {
    const s = timeToMinutes(draft?.startTime);
    const e = timeToMinutes(draft?.endTime);
    if (s !== null && e !== null && e > s) return e - s;
    return null;
  })();

  async function save() {
    if (!draft?.project?.trim()) return alert("نام پروژه را وارد کنید");
    const minutes = computedMinutes ?? Number(draft.minutes ?? 0);
    if (!minutes) return alert("مدت زمان معتبر نیست");
    setSaving(true);
    const payload = {
      date: draft.date,
      project: draft.project.trim(),
      description: draft.description || null,
      startTime: draft.startTime || null,
      endTime: draft.endTime || null,
      minutes,
      billable: draft.billable ?? true,
    };
    if (draft.id) await update("timesheet", draft.id, payload);
    else await create("timesheet", payload);
    setSaving(false);
    setDraft(null);
    reload(true);
  }
  async function del(id: number) {
    if (!confirm("حذف شود؟")) return;
    await remove("timesheet", id);
    reload(true);
  }

  return (
    <div className="fade-up">
      <PageHeader
        title="تایم‌شیت"
        subtitle="ثبت زمان واقعی کارها برای هر پروژه و مقایسه با برنامه"
        actions={
          <>
            <RangeNav label={weekLabel(weekStart)} onPrev={() => setWeekStart(addDays(weekStart, -7))} onNext={() => setWeekStart(addDays(weekStart, 7))} onToday={() => setWeekStart(startOfWeek(today))} />
            <Button onClick={() => setDraft({ date: days.includes(today) ? today : weekStart, billable: true, startTime: "09:00", endTime: "10:00" })}>
              <Plus size={16} /> ثبت زمان
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="مجموع هفته" value={hoursLabel(total)} sub={`هدف ${fa(40)} ساعت • ${fa(Math.round((total / 2400) * 100))}٪`} />
        <StatCard label="قابل صورتحساب" value={hoursLabel(billable)} sub={total ? `${fa(Math.round((billable / total) * 100))}٪ از کل` : "—"} tone="blue" />
        <StatCard label="میانگین روزانه" value={hoursLabel(total / Math.max(1, byDay.filter((m) => m > 0).length))} sub="روزهای کاری" tone="violet" />
        <StatCard label="پروژه‌ها" value={fa(matrixProjects.length)} sub={`${fa(entries.length)} ورودی`} tone="amber" />
      </div>

      {loading && !data ? (
        <Loading />
      ) : (
        <>
          <Card title="جدول هفتگی (پروژه × روز)" className="mb-6" padding={false}>
            <div className="scroll-x px-5 pb-5">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="text-slate-500">
                    <th className="py-2 text-right font-semibold">پروژه</th>
                    {days.map((d, i) => (
                      <th key={d} className={cn("py-2 text-center font-semibold", d === today && "text-emerald-700")}>
                        {WEEKDAYS_SHORT[i]} <span className="text-[10px] text-slate-400">{fa(formatJalali(d, "dayMonth").split(" ")[0])}</span>
                      </th>
                    ))}
                    <th className="py-2 text-center font-semibold">جمع</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixProjects.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        در این هفته زمانی ثبت نشده
                      </td>
                    </tr>
                  )}
                  {matrixProjects.map((p) => {
                    const rowTotal = entries.filter((e) => e.project === p).reduce((a, e) => a + e.minutes, 0);
                    return (
                      <tr key={p} className="border-t border-slate-100">
                        <td className="py-2 font-semibold">
                          <span className="ml-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorOf(p) }} />
                          {p}
                        </td>
                        {days.map((d) => {
                          const m = entries.filter((e) => e.project === p && e.date === d).reduce((a, e) => a + e.minutes, 0);
                          return (
                            <td key={d} className="py-2 text-center">
                              {m ? (
                                <span className="rounded-md px-1.5 py-0.5 font-semibold" style={{ background: colorOf(p) + "22", color: colorOf(p) }}>
                                  {fa((m / 60).toFixed(1).replace(/\.0$/, ""))}
                                </span>
                              ) : (
                                <span className="text-slate-200">·</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 text-center font-bold text-emerald-900">{fa((rowTotal / 60).toFixed(1).replace(/\.0$/, ""))}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-emerald-100 font-bold text-emerald-900">
                    <td className="py-2">جمع روز</td>
                    {byDay.map((m, i) => (
                      <td key={i} className="py-2 text-center">
                        {m ? fa((m / 60).toFixed(1).replace(/\.0$/, "")) : "—"}
                      </td>
                    ))}
                    <td className="py-2 text-center">{fa((total / 60).toFixed(1).replace(/\.0$/, ""))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="ورودی‌های هفته" className="lg:col-span-2">
              {entries.length === 0 ? (
                <Empty text="هنوز زمانی ثبت نشده" action={<Button size="sm" onClick={() => setDraft({ date: today, billable: true })}>ثبت اولین ورودی</Button>} />
              ) : (
                <div className="space-y-4">
                  {days.map((d, i) => {
                    const de = entries.filter((e) => e.date === d);
                    if (!de.length) return null;
                    return (
                      <div key={d}>
                        <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
                          <span>
                            {WEEKDAYS[i]} {formatJalali(d, "dayMonth")}
                          </span>
                          <span>{minutesToHM(byDay[i])}</span>
                        </div>
                        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                          {de.map((e) => (
                            <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                              <span className="h-8 w-1 rounded-full" style={{ background: colorOf(e.project) }} />
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold">
                                  {e.project}
                                  {e.description && <span className="font-normal text-slate-500"> — {e.description}</span>}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {e.startTime ? `${fa(e.startTime)}–${fa(e.endTime ?? "")} • ` : ""}
                                  {minutesToHM(e.minutes)} {e.billable ? "• قابل صورتحساب" : ""}
                                </div>
                              </div>
                              <button onClick={() => setDraft(e)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => del(e.id)} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                                <Trash2 size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
            <div className="space-y-6">
              <Card title="ساعات روزانه">
                <BarChart height={120} data={byDay.map((m, i) => ({ label: WEEKDAYS_SHORT[i], value: Math.round((m / 60) * 10) / 10, color: days[i] === today ? "var(--accent)" : "var(--accent-soft)" }))} format={(v) => fa(v) + " س"} />
              </Card>
              <Card title="سهم پروژه‌ها">
                <div className="space-y-2">
                  {matrixProjects.map((p) => {
                    const m = entries.filter((e) => e.project === p).reduce((a, e) => a + e.minutes, 0);
                    return (
                      <div key={p} className="text-xs">
                        <div className="mb-1 flex justify-between">
                          <span className="font-semibold">{p}</span>
                          <span className="text-slate-500">{fa(Math.round((m / Math.max(1, total)) * 100))}٪</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${(m / Math.max(1, total)) * 100}%`, background: colorOf(p) }} />
                        </div>
                      </div>
                    );
                  })}
                  {!matrixProjects.length && <p className="text-xs text-slate-400">—</p>}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "ویرایش ورودی" : "ثبت زمان"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>انصراف</Button>
            <Button onClick={save} loading={saving}>ذخیره</Button>
          </>
        }
      >
        {draft && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="پروژه" className="col-span-2">
              <Input list="projects" value={draft.project ?? ""} onChange={(e) => setDraft({ ...draft, project: e.target.value })} placeholder="نام پروژه" />
              <datalist id="projects">
                {projects.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </Field>
            <Field label="شرح کار" className="col-span-2">
              <Input value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="چه کاری انجام شد؟" />
            </Field>
            <Field label="تاریخ">
              <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </Field>
            <Field label="قابل صورتحساب">
              <Select value={draft.billable ? "1" : "0"} onChange={(e) => setDraft({ ...draft, billable: e.target.value === "1" })}>
                <option value="1">بله</option>
                <option value="0">خیر</option>
              </Select>
            </Field>
            <Field label="شروع">
              <Input type="time" value={draft.startTime ?? ""} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
            </Field>
            <Field label="پایان">
              <Input type="time" value={draft.endTime ?? ""} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
            </Field>
            <Field label={computedMinutes ? `مدت (محاسبه‌شده: ${minutesToHM(computedMinutes)})` : "مدت (دقیقه)"} className="col-span-2">
              <Input type="number" min={5} step={5} disabled={computedMinutes !== null} value={computedMinutes ?? draft.minutes ?? ""} onChange={(e) => setDraft({ ...draft, minutes: Number(e.target.value) })} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, Trash2, Flame, Trophy, CheckCheck } from "lucide-react";
import type { Habit, HabitLog } from "@/db/schema";
import { create, list, remove, useLoad } from "@/lib/api";
import { addDays, fa, jalaliMonthKey, jalaliMonthLength, monthKeyLabel, monthKeyToRange, pct, shiftMonthKey, todayISO, weekdayIndex, WEEKDAYS_SHORT } from "@/lib/jalali";
import { BarChart, Button, Card, Empty, Field, Input, Modal, PageHeader, RangeNav, Ring, Select, StatCard, cn, Loading, COLORS } from "@/components/ui";

const ICONS = ["✅", "🏃", "📚", "💧", "🧘", "📵", "😴", "🥗", "💪", "🧹", "✍️", "🎯", "🌅", "🚭", "💊", "🎹", "🧠", "🙏"];

export default function HabitsPage() {
  const today = todayISO();
  const [monthKey, setMonthKey] = useState(jalaliMonthKey(today));
  const range = monthKeyToRange(monthKey);
  const len = jalaliMonthLength(range.jy, range.jm);
  const days = Array.from({ length: len }, (_, i) => addDays(range.from, i));
  const { data, loading, reload, setData } = useLoad(
    async () => {
      const [habits, logs] = await Promise.all([list<Habit>("habits", { archived: false }), list<HabitLog>("habit_logs", { from: addDays(range.from, -60), to: range.to })]);
      return { habits, logs };
    },
    [monthKey],
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "✅", color: COLORS[0], targetPerWeek: 7 });
  const [saving, setSaving] = useState(false);

  const habits = data?.habits ?? [];
  const logs = data?.logs ?? [];
  const has = (habitId: number, d: string) => logs.some((l) => l.habitId === habitId && l.date === d);
  const monthDays = days.filter((d) => d <= today);
  const monthLogs = logs.filter((l) => l.date >= range.from && l.date <= range.to);
  const possible = habits.length * monthDays.length;

  function streak(habitId: number): number {
    let s = 0;
    let d = today;
    if (!has(habitId, d)) d = addDays(d, -1);
    while (has(habitId, d)) {
      s++;
      d = addDays(d, -1);
    }
    return s;
  }
  function bestStreak(habitId: number): number {
    const set = new Set(logs.filter((l) => l.habitId === habitId).map((l) => l.date));
    let best = 0;
    for (const d of set) {
      if (set.has(addDays(d, -1))) continue;
      let n = 0;
      let c = d;
      while (set.has(c)) {
        n++;
        c = addDays(c, 1);
      }
      best = Math.max(best, n);
    }
    return best;
  }

  async function toggle(habitId: number, d: string) {
    if (d > today) return;
    // optimistic
    setData((prev) =>
      prev
        ? { ...prev, logs: has(habitId, d) ? prev.logs.filter((l) => !(l.habitId === habitId && l.date === d)) : [...prev.logs, { id: -Date.now(), habitId, date: d }] }
        : prev,
    );
    await create("habit_logs", { habitId, date: d });
    reload(true);
  }
  async function addHabit() {
    if (!form.name.trim()) return;
    setSaving(true);
    await create("habits", { ...form, name: form.name.trim(), targetPerWeek: Number(form.targetPerWeek) });
    setSaving(false);
    setOpen(false);
    setForm({ name: "", icon: "✅", color: COLORS[0], targetPerWeek: 7 });
    reload(true);
  }
  async function del(h: Habit) {
    if (!confirm(`عادت «${h.name}» و همه سوابقش حذف شود؟`)) return;
    await remove("habits", h.id);
    reload(true);
  }

  const bestHabit = habits.map((h) => ({ h, n: monthLogs.filter((l) => l.habitId === h.id).length })).sort((a, b) => b.n - a.n)[0];
  const weekly = Array.from({ length: 7 }, (_, i) => ({ label: WEEKDAYS_SHORT[i], value: monthLogs.filter((l) => weekdayIndex(l.date) === i).length }));

  return (
    <div className="fade-up">
      <PageHeader
        title="هبیت ترکر"
        subtitle="ساخت عادت‌های مثبت و پایدار؛ هر روز تیک بزن و زنجیره‌ات را نشکن"
        actions={
          <>
            <RangeNav label={monthKeyLabel(monthKey)} onPrev={() => setMonthKey(shiftMonthKey(monthKey, -1))} onNext={() => setMonthKey(shiftMonthKey(monthKey, 1))} onToday={() => setMonthKey(jalaliMonthKey(today))} />
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> عادت جدید
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <Ring value={pct(monthLogs.length, possible)} size={64} stroke={7} />
          <div>
            <div className="text-xs text-slate-500">موفقیت این ماه</div>
            <div className="text-lg font-extrabold text-emerald-950">
              {fa(monthLogs.length)} / {fa(possible)}
            </div>
          </div>
        </div>
        <StatCard label="امروز" value={`${fa(logs.filter((l) => l.date === today).length)} / ${fa(habits.length)}`} sub="عادت انجام‌شده" icon={<CheckCheck size={22} />} />
        <StatCard label="بهترین زنجیره" value={fa(habits.length ? Math.max(...habits.map((h) => bestStreak(h.id))) : 0) + " روز"} sub="بلندترین استریک" icon={<Flame size={22} />} tone="amber" />
        <StatCard label="عادت برتر ماه" value={bestHabit ? `${bestHabit.h.icon} ${bestHabit.h.name}` : "—"} sub={bestHabit ? `${fa(bestHabit.n)} بار` : ""} icon={<Trophy size={22} />} tone="violet" />
      </div>

      {loading && !data ? (
        <Loading />
      ) : habits.length === 0 ? (
        <Empty text="هنوز عادتی تعریف نکرده‌ای. با یک عادت کوچک شروع کن!" action={<Button onClick={() => setOpen(true)}>افزودن عادت</Button>} />
      ) : (
        <>
          <Card padding={false} className="mb-6">
            <div className="scroll-x p-4">
              <table className="border-separate border-spacing-y-1 text-xs" style={{ minWidth: 640 + len * 28 }}>
                <thead>
                  <tr>
                    <th className="sticky right-0 z-10 bg-white py-1 pr-1 text-right font-semibold text-slate-500">عادت</th>
                    {days.map((d, idx) => {
                      const wd = weekdayIndex(d);
                      return (
                        <th key={d} className={cn("w-7 py-1 text-center font-semibold", d === today ? "text-emerald-700" : wd === 6 ? "text-rose-400" : "text-slate-400")}>
                          <div className="text-[9px]">{WEEKDAYS_SHORT[wd]}</div>
                          <div className={cn("mx-auto flex h-5 w-5 items-center justify-center rounded-full", d === today && "bg-emerald-700 text-white")}>{fa(idx + 1)}</div>
                        </th>
                      );
                    })}
                    <th className="py-1 text-center font-semibold text-slate-500">ماه</th>
                    <th className="py-1 text-center font-semibold text-slate-500">استریک</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {habits.map((h) => {
                    const n = monthLogs.filter((l) => l.habitId === h.id).length;
                    const target = Math.round((h.targetPerWeek / 7) * monthDays.length);
                    return (
                      <tr key={h.id}>
                        <td className="sticky right-0 z-10 bg-white py-1 pr-1">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-base" style={{ background: h.color + "22" }}>
                              {h.icon}
                            </span>
                            <div>
                              <div className="font-semibold">{h.name}</div>
                              <div className="text-[10px] text-slate-400">هدف {fa(h.targetPerWeek)} روز در هفته</div>
                            </div>
                          </div>
                        </td>
                        {days.map((d) => {
                          const on = has(h.id, d);
                          const future = d > today;
                          return (
                            <td key={d} className="p-0 text-center">
                              <button
                                onClick={() => toggle(h.id, d)}
                                disabled={future}
                                className={cn("mx-auto flex h-6 w-6 items-center justify-center rounded-md border text-[10px] transition", future ? "cursor-default border-slate-50" : on ? "border-transparent text-white shadow-sm" : "border-slate-200 hover:border-emerald-400")}
                                style={on ? { background: h.color } : undefined}
                              >
                                {on ? "✓" : ""}
                              </button>
                            </td>
                          );
                        })}
                        <td className="text-center">
                          <Ring value={pct(n, Math.max(1, target))} size={34} stroke={4} color={h.color}>
                            <span className="text-[9px] font-bold">{fa(n)}</span>
                          </Ring>
                        </td>
                        <td className="text-center">
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
                            <Flame size={11} /> {fa(streak(h.id))}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => del(h)} className="rounded-lg p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="sticky right-0 bg-white py-1 pr-1 text-[10px] font-semibold text-slate-400">درصد روز</td>
                    {days.map((d) => {
                      const n = logs.filter((l) => l.date === d).length;
                      const p = d > today ? 0 : pct(n, habits.length);
                      return (
                        <td key={d} className="text-center text-[9px] text-slate-400">
                          {d > today ? "" : <span style={{ color: p >= 80 ? "var(--accent)" : p >= 50 ? "#f59e0b" : "#94a3b8" }}>{fa(p)}</span>}
                        </td>
                      );
                    })}
                    <td colSpan={3} />
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            <Card title="گزارش هر عادت" className="md:col-span-2">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {habits.map((h) => {
                  const n = monthLogs.filter((l) => l.habitId === h.id).length;
                  return (
                    <div key={h.id} className="flex flex-col items-center rounded-2xl border border-slate-100 p-3 text-center">
                      <Ring value={pct(n, monthDays.length)} size={72} stroke={8} color={h.color} />
                      <div className="mt-2 text-xs font-semibold">
                        {h.icon} {h.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {fa(n)} از {fa(monthDays.length)} روز • بهترین زنجیره {fa(bestStreak(h.id))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card title="در کدام روز هفته منظم‌تری؟">
              <BarChart height={140} data={weekly} color="#8b5cf6" />
            </Card>
          </div>
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="عادت جدید"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button>
            <Button onClick={addHabit} loading={saving}>ذخیره</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="نام عادت">
            <Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً: ۱۰ دقیقه مدیتیشن" />
          </Field>
          <Field label="آیکون">
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((ic) => (
                <button key={ic} type="button" onClick={() => setForm({ ...form, icon: ic })} className={cn("flex h-9 w-9 items-center justify-center rounded-lg border text-lg", form.icon === ic ? "border-emerald-500 bg-emerald-50" : "border-slate-200")}>
                  {ic}
                </button>
              ))}
            </div>
          </Field>
          <Field label="رنگ">
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={cn("h-8 w-8 rounded-full border-4", form.color === c ? "border-slate-800" : "border-white")} style={{ background: c }} />
              ))}
            </div>
          </Field>
          <Field label="هدف هفتگی (روز)">
            <Select value={form.targetPerWeek} onChange={(e) => setForm({ ...form, targetPerWeek: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {fa(n)} روز در هفته
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

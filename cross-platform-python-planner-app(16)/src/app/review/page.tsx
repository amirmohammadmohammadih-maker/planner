"use client";

import { useState } from "react";
import { CheckCircle2, Repeat, GraduationCap, Clock3, Wallet, Lightbulb, Save } from "lucide-react";
import type { Review } from "@/db/schema";
import { api, create, useLoad } from "@/lib/api";
import { addDays, compactMoney, fa, formatJalali, hoursLabel, pct, startOfWeek, todayISO, weekLabel, WEEKDAYS_SHORT } from "@/lib/jalali";
import type { WeekMetrics } from "@/lib/metrics";
import { BarChart, Button, Card, Field, PageHeader, ProgressBar, RangeNav, Ring, Stars, Textarea, cn, Loading } from "@/components/ui";

type ReviewData = {
  weekStart: string;
  metrics: WeekMetrics;
  trend: WeekMetrics[];
  byDay: { date: string; tasksTotal: number; tasksDone: number; habitsDone: number; habitsTotal: number; studyMinutes: number; timesheetMinutes: number }[];
  byCategory: { category: string; total: number; done: number }[];
  review: Review | null;
};

function grade(score: number) {
  if (score >= 85) return { label: "عالی", color: "#16a34a", msg: "هفته‌ای درخشان! همین مسیر را ادامه بده." };
  if (score >= 70) return { label: "خوب", color: "#22c55e", msg: "عملکرد خوبی داشتی؛ با کمی تمرکز بیشتر به عالی می‌رسی." };
  if (score >= 50) return { label: "متوسط", color: "#f59e0b", msg: "نیمه‌ی راه هستی. یک یا دو حوزه را برای بهبود انتخاب کن." };
  return { label: "نیاز به بهبود", color: "#ef4444", msg: "این هفته سخت بود. برنامه را کوچک‌تر و واقع‌بینانه‌تر کن." };
}

function insights(m: WeekMetrics, byDay: ReviewData["byDay"]): string[] {
  const out: string[] = [];
  if (m.tasks.rate !== null && m.tasks.rate < 0.5) out.push("کمتر از نیمی از کارها انجام شده‌اند؛ تعداد کارهای روزانه را کمتر و اولویت‌بندی را دقیق‌تر کن.");
  if (m.tasks.rate !== null && m.tasks.rate >= 0.85) out.push("نرخ تکمیل کارها عالی است. می‌توانی هفته آینده یک هدف چالشی‌تر اضافه کنی.");
  if (m.habits.rate !== null && m.habits.rate < 0.6) out.push("عادت‌ها به هدف هفتگی نرسیده‌اند. سعی کن آن‌ها را به یک زمان ثابت در روز گره بزنی.");
  if (m.study.rate !== null && m.study.rate < 0.7) out.push(`زمان مطالعه ${hoursLabel(m.study.minutes)} از هدف ${hoursLabel(m.study.target)} بوده؛ جلسات کوتاه ۲۵ دقیقه‌ای (پومودورو) را امتحان کن.`);
  if (m.budget.rate !== null && m.budget.rate < 1) out.push(`هزینه‌ها ${compactMoney(m.budget.spent - m.budget.limit)} از سقف بودجه بیشتر شده است. دسته‌های پرخرج را بررسی کن.`);
  if (m.timesheet.rate !== null && m.timesheet.minutes > 50 * 60) out.push("بیش از ۵۰ ساعت کار ثبت شده؛ مراقب فرسودگی باش و زمان استراحت را برنامه‌ریزی کن.");
  const best = [...byDay].sort((a, b) => b.tasksDone - a.tasksDone)[0];
  if (best && best.tasksDone > 0) out.push(`پربازده‌ترین روزت ${formatJalali(best.date, "weekday")} با ${fa(best.tasksDone)} کار انجام‌شده بود.`);
  if (!out.length) out.push("داده کافی برای تحلیل وجود ندارد. با ثبت کارها، عادت‌ها و زمان مطالعه شروع کن.");
  return out;
}

export default function ReviewPage() {
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const { data, loading, reload } = useLoad(() => api<ReviewData>(`/api/review?weekStart=${weekStart}`), [weekStart]);
  if (loading && !data) return <Loading />;
  if (!data) return null;
  const m = data.metrics;
  const g = grade(m.overall);
  const metricCards = [
    { key: "tasks", label: "تکمیل کارها", icon: <CheckCircle2 size={18} />, rate: m.tasks.rate, detail: `${fa(m.tasks.done)} از ${fa(m.tasks.total)} کار`, color: "var(--accent)" },
    { key: "habits", label: "پایبندی به عادت‌ها", icon: <Repeat size={18} />, rate: m.habits.rate, detail: `${fa(m.habits.done)} از ${fa(m.habits.target)} هدف`, color: "#8b5cf6" },
    { key: "study", label: "مطالعه", icon: <GraduationCap size={18} />, rate: m.study.rate, detail: `${hoursLabel(m.study.minutes)} از ${hoursLabel(m.study.target)}`, color: "#0ea5e9" },
    { key: "timesheet", label: "ساعات کاری", icon: <Clock3 size={18} />, rate: m.timesheet.rate, detail: `${hoursLabel(m.timesheet.minutes)} از ${fa(40)} ساعت`, color: "#f59e0b" },
    { key: "budget", label: "رعایت بودجه", icon: <Wallet size={18} />, rate: m.budget.rate, detail: m.budget.limit ? `${compactMoney(m.budget.spent)} از ${compactMoney(m.budget.limit)}` : "بودجه‌ای تعیین نشده", color: "#ef4444" },
  ];

  return (
    <div className="fade-up">
      <PageHeader
        title="ارزیابی عملکرد"
        subtitle="گزارش دقیق و قابل فهم از هفته‌ات: کارها، عادت‌ها، مطالعه، کار و بودجه"
        actions={<RangeNav label={weekLabel(weekStart)} onPrev={() => setWeekStart(addDays(weekStart, -7))} onNext={() => setWeekStart(addDays(weekStart, 7))} onToday={() => setWeekStart(startOfWeek(today))} />}
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center text-center">
          <Ring value={m.overall} size={160} stroke={14} color={g.color}>
            <span className="text-4xl font-black" style={{ color: g.color }}>{fa(m.overall)}</span>
            <span className="text-xs text-slate-500">از ۱۰۰</span>
          </Ring>
          <div className="mt-3 rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: g.color }}>
            {g.label}
          </div>
          <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">{g.msg}</p>
        </Card>

        <Card title="شاخص‌های هفته" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {metricCards.map((c) => (
              <div key={c.key} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <Ring value={c.rate === null ? 0 : c.rate * 100} size={56} stroke={6} color={c.color}>
                  <span className="text-xs font-extrabold">{c.rate === null ? "—" : fa(Math.round(c.rate * 100))}</span>
                </Ring>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: c.color }}>
                    {c.icon} {c.label}
                  </div>
                  <div className="text-[11px] text-slate-500">{c.detail}</div>
                  <ProgressBar value={c.rate === null ? 0 : c.rate * 100} color={c.color} height={4} className="mt-1.5" />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-3">
              <Lightbulb className="text-emerald-600" size={22} />
              <p className="text-[11px] leading-5 text-emerald-900">امتیاز کل، میانگین شاخص‌هایی است که برایشان داده ثبت کرده‌ای. هر چه بیشتر ثبت کنی، ارزیابی دقیق‌تر می‌شود.</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card title="روند ۸ هفته اخیر" subtitle="امتیاز کل عملکرد">
          <BarChart height={150} data={data.trend.map((t, i) => ({ label: i === data.trend.length - 1 ? "این هفته" : formatJalali(t.weekStart, "dayMonth"), value: t.overall, color: i === data.trend.length - 1 ? g.color : "var(--accent-light)" }))} />
          {data.trend.length >= 2 && (
            <p className="mt-3 text-xs text-slate-500">
              نسبت به هفته قبل:{" "}
              <b className={cn(m.overall >= data.trend[data.trend.length - 2].overall ? "text-emerald-700" : "text-rose-600")}>
                {m.overall - data.trend[data.trend.length - 2].overall >= 0 ? "+" : ""}
                {fa(m.overall - data.trend[data.trend.length - 2].overall)} امتیاز
              </b>
            </p>
          )}
        </Card>

        <Card title="تفکیک روزانه" subtitle="کارهای انجام‌شده، عادت‌ها و ساعات">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="py-1 text-right font-semibold">روز</th>
                <th className="py-1 font-semibold">کارها</th>
                <th className="py-1 font-semibold">عادت‌ها</th>
                <th className="py-1 font-semibold">مطالعه</th>
                <th className="py-1 font-semibold">کار</th>
              </tr>
            </thead>
            <tbody>
              {data.byDay.map((d, i) => (
                <tr key={d.date} className={cn("border-t border-slate-50", d.date === today && "bg-emerald-50/60 font-bold")}>
                  <td className="py-1.5">{WEEKDAYS_SHORT[i]} {formatJalali(d.date, "dayMonth").split(" ")[0]}</td>
                  <td className="py-1.5 text-center">
                    <span className={cn(d.tasksTotal && d.tasksDone === d.tasksTotal ? "text-emerald-700" : "")}>{fa(d.tasksDone)}/{fa(d.tasksTotal)}</span>
                  </td>
                  <td className="py-1.5 text-center">{fa(d.habitsDone)}/{fa(d.habitsTotal)}</td>
                  <td className="py-1.5 text-center">{d.studyMinutes ? fa((d.studyMinutes / 60).toFixed(1)) : "—"}</td>
                  <td className="py-1.5 text-center">{d.timesheetMinutes ? fa((d.timesheetMinutes / 60).toFixed(1)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="تحلیل و پیشنهاد" subtitle="بر اساس داده‌های این هفته">
          <ul className="space-y-2">
            {insights(m, data.byDay).map((t, i) => (
              <li key={i} className="flex gap-2 rounded-xl bg-slate-50 p-2.5 text-xs leading-5 text-slate-700">
                <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-500" /> {t}
              </li>
            ))}
          </ul>
          {data.byCategory.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="text-xs font-semibold text-slate-500">تکمیل بر اساس دسته</div>
              {data.byCategory.map((c) => (
                <div key={c.category} className="text-[11px]">
                  <div className="flex justify-between">
                    <span>{c.category}</span>
                    <span className="text-slate-500">{fa(c.done)}/{fa(c.total)}</span>
                  </div>
                  <ProgressBar value={pct(c.done, c.total)} height={4} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <SelfReviewForm key={data.weekStart} weekStart={data.weekStart} review={data.review} overall={m.overall} onSaved={() => reload(true)} />
    </div>
  );
}

/* ---------- weekly self-review form (remounts per week via key) ---------- */
function SelfReviewForm({ weekStart, review, overall, onSaved }: { weekStart: string; review: Review | null; overall: number; onSaved: () => void }) {
  const [form, setForm] = useState(() => ({
    energy: review?.energy ?? 3,
    focus: review?.focus ?? 3,
    satisfaction: review?.satisfaction ?? 3,
    wins: review?.wins ?? "",
    challenges: review?.challenges ?? "",
    nextFocus: review?.nextFocus ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const selfAvg = (form.energy + form.focus + form.satisfaction) / 3;

  async function saveReview() {
    setSaving(true);
    await create("reviews", { weekStart, ...form });
    setSaving(false);
    setSavedAt(Date.now());
    onSaved();
  }

  return (
    <Card title="خودارزیابی هفتگی" subtitle="چند دقیقه برای مرور هفته وقت بگذار — بهترین سرمایه‌گذاری روی هفته‌ی بعد">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">سطح انرژی</span>
            <Stars value={form.energy} onChange={(v) => setForm({ ...form, energy: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">تمرکز</span>
            <Stars value={form.focus} onChange={(v) => setForm({ ...form, focus: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">رضایت کلی</span>
            <Stars value={form.satisfaction} onChange={(v) => setForm({ ...form, satisfaction: v })} />
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
            <Ring value={(selfAvg / 5) * 100} size={48} stroke={5}>
              <span className="text-xs font-bold">{fa(selfAvg.toFixed(1))}</span>
            </Ring>
            <div className="text-xs text-emerald-900">
              <div className="font-bold">امتیاز ذهنی شما</div>
              <div>امتیاز محاسبه‌شده: {fa(overall)}</div>
            </div>
          </div>
        </div>
        <Field label="✅ دستاوردهای این هفته">
          <Textarea value={form.wins} onChange={(e) => setForm({ ...form, wins: e.target.value })} className="min-h-[140px]" placeholder="چه چیزهایی خوب پیش رفت؟" />
        </Field>
        <div className="space-y-3">
          <Field label="⚠️ چالش‌ها">
            <Textarea value={form.challenges} onChange={(e) => setForm({ ...form, challenges: e.target.value })} className="min-h-[60px]" placeholder="چه چیزی مانع شد؟" />
          </Field>
          <Field label="🎯 تمرکز هفته آینده">
            <Textarea value={form.nextFocus} onChange={(e) => setForm({ ...form, nextFocus: e.target.value })} className="min-h-[60px]" placeholder="یک یا دو اولویت اصلی" />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {savedAt && <span className="text-xs text-emerald-700">ذخیره شد ✓</span>}
        <Button onClick={saveReview} loading={saving}>
          <Save size={16} /> ذخیره خودارزیابی
        </Button>
      </div>
    </Card>
  );
}

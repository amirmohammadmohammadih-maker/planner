"use client";

import { useState } from "react";
import { Plus, Trash2, BookOpen, Timer, Brain, GraduationCap, Pencil } from "lucide-react";
import type { Course, Exam, StudySession } from "@/db/schema";
import { create, list, remove, update, useLoad } from "@/lib/api";
import { addDays, daysBetween, fa, formatJalali, hoursLabel, minutesToHM, pct, startOfWeek, todayISO, weekDays, weekLabel, WEEKDAYS_SHORT } from "@/lib/jalali";
import { BarChart, Button, Card, Empty, Field, Input, Modal, PageHeader, ProgressBar, RangeNav, Ring, Select, StatCard, Stars, Textarea, cn, Loading, COLORS } from "@/components/ui";

export default function StudyPage() {
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const days = weekDays(weekStart);
  const { data, loading, reload } = useLoad(
    async () => {
      const [courses, sessions, exams] = await Promise.all([list<Course>("courses"), list<StudySession>("study_sessions", { from: addDays(weekStart, -21), to: addDays(weekStart, 6) }), list<Exam>("exams")]);
      return { courses, sessions, exams };
    },
    [weekStart],
  );
  const [courseDraft, setCourseDraft] = useState<Partial<Course> | null>(null);
  const [sessionDraft, setSessionDraft] = useState<Partial<StudySession> | null>(null);
  const [examDraft, setExamDraft] = useState<Partial<Exam> | null>(null);
  const [saving, setSaving] = useState(false);

  const courses = data?.courses ?? [];
  const allSessions = data?.sessions ?? [];
  const sessions = allSessions.filter((s) => s.date >= weekStart && s.date <= addDays(weekStart, 6));
  const exams = data?.exams ?? [];
  const courseOf = (id: number) => courses.find((c) => c.id === id);
  const weekMinutes = sessions.reduce((a, s) => a + s.minutes, 0);
  const weekTarget = courses.reduce((a, c) => a + c.weeklyTargetMinutes, 0);
  const avgFocus = sessions.length ? sessions.reduce((a, s) => a + s.focusScore, 0) / sessions.length : 0;
  const upcoming = exams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = exams.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const scored = past.filter((e) => e.score !== null);
  const avgScore = scored.length ? Math.round((scored.reduce((a, e) => a + (e.score! / e.maxScore) * 100, 0) / scored.length)) : null;
  const byDay = days.map((d) => sessions.filter((s) => s.date === d).reduce((a, s) => a + s.minutes, 0));

  async function saveCourse() {
    if (!courseDraft?.name) return alert("نام درس را وارد کنید");
    setSaving(true);
    const payload = { name: courseDraft.name, instructor: courseDraft.instructor || null, color: courseDraft.color ?? COLORS[0], credits: Number(courseDraft.credits ?? 3), weeklyTargetMinutes: Number(courseDraft.weeklyTargetMinutes ?? 300) };
    if (courseDraft.id) await update("courses", courseDraft.id, payload);
    else await create("courses", payload);
    setSaving(false);
    setCourseDraft(null);
    reload(true);
  }
  async function saveSession() {
    if (!sessionDraft?.courseId || !sessionDraft.minutes) return alert("درس و مدت زمان را وارد کنید");
    setSaving(true);
    const payload = { courseId: Number(sessionDraft.courseId), date: sessionDraft.date ?? today, minutes: Number(sessionDraft.minutes), topic: sessionDraft.topic || null, focusScore: Number(sessionDraft.focusScore ?? 3) };
    if (sessionDraft.id) await update("study_sessions", sessionDraft.id, payload);
    else await create("study_sessions", payload);
    setSaving(false);
    setSessionDraft(null);
    reload(true);
  }
  async function saveExam() {
    if (!examDraft?.courseId || !examDraft.title || !examDraft.date) return alert("درس، عنوان و تاریخ را وارد کنید");
    setSaving(true);
    const payload = { courseId: Number(examDraft.courseId), title: examDraft.title, date: examDraft.date, score: examDraft.score === null || examDraft.score === undefined || (examDraft.score as unknown) === "" ? null : Number(examDraft.score), maxScore: Number(examDraft.maxScore ?? 20), notes: examDraft.notes || null };
    if (examDraft.id) await update("exams", examDraft.id, payload);
    else await create("exams", payload);
    setSaving(false);
    setExamDraft(null);
    reload(true);
  }

  return (
    <div className="fade-up">
      <PageHeader
        title="پلنر تحصیلی"
        subtitle="برنامه‌ریزی هوشمند مطالعه، پیگیری اهداف درسی و مدیریت آزمون‌ها"
        actions={
          <>
            <RangeNav label={weekLabel(weekStart)} onPrev={() => setWeekStart(addDays(weekStart, -7))} onNext={() => setWeekStart(addDays(weekStart, 7))} onToday={() => setWeekStart(startOfWeek(today))} />
            <Button variant="outline" onClick={() => setExamDraft({ date: today, maxScore: 20, courseId: courses[0]?.id })}>
              <GraduationCap size={16} /> آزمون
            </Button>
            <Button onClick={() => setSessionDraft({ date: today, minutes: 60, focusScore: 3, courseId: courses[0]?.id })} disabled={!courses.length}>
              <Plus size={16} /> ثبت مطالعه
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <Ring value={pct(weekMinutes, weekTarget)} size={64} stroke={7} />
          <div>
            <div className="text-xs text-slate-500">مطالعه این هفته</div>
            <div className="text-lg font-extrabold text-emerald-950">{hoursLabel(weekMinutes)}</div>
            <div className="text-[10px] text-slate-400">هدف {hoursLabel(weekTarget)}</div>
          </div>
        </div>
        <StatCard label="میانگین تمرکز" value={avgFocus ? `${fa(avgFocus.toFixed(1))} / ۵` : "—"} sub={`${fa(sessions.length)} جلسه مطالعه`} icon={<Brain size={22} />} tone="violet" />
        <StatCard label="آزمون‌های پیش‌رو" value={fa(upcoming.length)} sub={upcoming[0] ? `نزدیک‌ترین: ${fa(daysBetween(today, upcoming[0].date))} روز دیگر` : "—"} icon={<GraduationCap size={22} />} tone="amber" />
        <StatCard label="میانگین نمرات" value={avgScore === null ? "—" : `${fa(avgScore)}٪`} sub={`${fa(scored.length)} آزمون نمره‌دار`} icon={<BookOpen size={22} />} tone="blue" />
      </div>

      {loading && !data ? (
        <Loading />
      ) : (
        <>
          {/* Courses */}
          <Card title="درس‌ها" subtitle="پیشرفت نسبت به هدف هفتگی هر درس" className="mb-6" action={<Button size="sm" variant="soft" onClick={() => setCourseDraft({ color: COLORS[courses.length % COLORS.length], credits: 3, weeklyTargetMinutes: 300 })}><Plus size={14} /> درس</Button>}>
            {courses.length === 0 ? (
              <Empty text="اول درس‌هایت را اضافه کن" action={<Button size="sm" onClick={() => setCourseDraft({ color: COLORS[0], credits: 3, weeklyTargetMinutes: 300 })}>افزودن درس</Button>} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {courses.map((c) => {
                  const m = sessions.filter((s) => s.courseId === c.id).reduce((a, s) => a + s.minutes, 0);
                  const nextExam = upcoming.find((e) => e.courseId === c.id);
                  return (
                    <div key={c.id} className="rounded-2xl border border-slate-100 p-4" style={{ borderTopColor: c.color, borderTopWidth: 4 }}>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="truncate font-bold">{c.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {c.instructor ?? "—"} • {fa(c.credits)} واحد
                          </div>
                        </div>
                        <Ring value={pct(m, c.weeklyTargetMinutes)} size={46} stroke={5} color={c.color} />
                      </div>
                      <div className="mt-3 text-xs text-slate-600">
                        {minutesToHM(m)} از {minutesToHM(c.weeklyTargetMinutes)}
                      </div>
                      <ProgressBar value={pct(m, c.weeklyTargetMinutes)} color={c.color} height={6} className="mt-1" />
                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">{nextExam ? `🎓 ${nextExam.title}: ${fa(daysBetween(today, nextExam.date))} روز` : "آزمونی ندارد"}</span>
                        <span className="flex gap-1">
                          <button onClick={() => setSessionDraft({ date: today, minutes: 60, focusScore: 3, courseId: c.id })} className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                            + مطالعه
                          </button>
                          <button onClick={() => setCourseDraft(c)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                            <Pencil size={12} />
                          </button>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            <Card title="دقایق مطالعه در هفته">
              <BarChart height={140} data={byDay.map((v, i) => ({ label: WEEKDAYS_SHORT[i], value: v, color: days[i] === today ? "var(--accent)" : "var(--accent-soft)" }))} format={(v) => minutesToHM(v)} />
            </Card>
            <Card title="سهم هر درس (۴ هفته اخیر)">
              <div className="space-y-2">
                {courses.map((c) => {
                  const m = allSessions.filter((s) => s.courseId === c.id).reduce((a, s) => a + s.minutes, 0);
                  const total = allSessions.reduce((a, s) => a + s.minutes, 0);
                  return (
                    <div key={c.id} className="text-xs">
                      <div className="mb-1 flex justify-between">
                        <span className="font-semibold">{c.name}</span>
                        <span className="text-slate-500">{hoursLabel(m)} • {fa(Math.round((m / Math.max(1, total)) * 100))}٪</span>
                      </div>
                      <ProgressBar value={(m / Math.max(1, total)) * 100} color={c.color} height={6} />
                    </div>
                  );
                })}
                {!courses.length && <p className="text-xs text-slate-400">—</p>}
              </div>
            </Card>
            <Card title="جلسات مطالعه هفته" subtitle={`${fa(sessions.length)} جلسه`}>
              {sessions.length === 0 ? (
                <Empty text="جلسه‌ای ثبت نشده" />
              ) : (
                <ul className="max-h-[260px] space-y-1.5 overflow-y-auto text-xs">
                  {sessions.map((s) => {
                    const c = courseOf(s.courseId);
                    return (
                      <li key={s.id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2">
                        <span className="h-8 w-1 rounded-full" style={{ background: c?.color }} />
                        <button onClick={() => setSessionDraft(s)} className="min-w-0 flex-1 text-right">
                          <div className="truncate font-semibold">
                            {c?.name} {s.topic && <span className="font-normal text-slate-400">— {s.topic}</span>}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatJalali(s.date, "weekday")} • {minutesToHM(s.minutes)} • تمرکز {fa(s.focusScore)}/۵
                          </div>
                        </button>
                        <button onClick={async () => { if (confirm("حذف شود؟")) { await remove("study_sessions", s.id); reload(true); } }} className="rounded-lg p-1 text-slate-300 hover:text-rose-600">
                          <Trash2 size={13} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="آزمون‌های پیش‌رو" subtitle="با شمارش معکوس">
              {upcoming.length === 0 ? (
                <Empty text="آزمونی ثبت نشده" />
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((e) => {
                    const d = daysBetween(today, e.date);
                    const c = courseOf(e.courseId);
                    return (
                      <li key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                        <div className={cn("flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-white", d <= 3 ? "bg-rose-500" : d <= 7 ? "bg-amber-500" : "bg-emerald-600")}>
                          <span className="text-lg font-black leading-none">{fa(d)}</span>
                          <span className="text-[9px]">روز</span>
                        </div>
                        <button onClick={() => setExamDraft(e)} className="min-w-0 flex-1 text-right">
                          <div className="truncate text-sm font-semibold">{e.title}</div>
                          <div className="text-[11px] text-slate-400">
                            <span className="ml-1 inline-block h-2 w-2 rounded-full" style={{ background: c?.color }} />
                            {c?.name} • {formatJalali(e.date)}
                          </div>
                        </button>
                        <button onClick={async () => { if (confirm("حذف شود؟")) { await remove("exams", e.id); reload(true); } }} className="rounded-lg p-1 text-slate-300 hover:text-rose-600">
                          <Trash2 size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
            <Card title="نتایج آزمون‌ها" subtitle="برای ثبت نمره روی آزمون کلیک کنید">
              {past.length === 0 ? (
                <Empty text="آزمون گذشته‌ای وجود ندارد" />
              ) : (
                <ul className="space-y-2">
                  {past.map((e) => {
                    const c = courseOf(e.courseId);
                    const p = e.score === null ? null : Math.round((e.score / e.maxScore) * 100);
                    return (
                      <li key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                        <button onClick={() => setExamDraft(e)} className="min-w-0 flex-1 text-right">
                          <div className="truncate text-sm font-semibold">{e.title}</div>
                          <div className="text-[11px] text-slate-400">
                            {c?.name} • {formatJalali(e.date, "dayMonth")}
                          </div>
                        </button>
                        {p === null ? (
                          <Button size="sm" variant="soft" onClick={() => setExamDraft(e)}>
                            ثبت نمره
                          </Button>
                        ) : (
                          <div className="text-left">
                            <div className={cn("text-sm font-black", p >= 75 ? "text-emerald-700" : p >= 50 ? "text-amber-600" : "text-rose-600")}>
                              {fa(e.score)} / {fa(e.maxScore)}
                            </div>
                            <div className="text-[10px] text-slate-400">{fa(p)}٪</div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Course modal */}
      <Modal open={!!courseDraft} onClose={() => setCourseDraft(null)} title={courseDraft?.id ? "ویرایش درس" : "درس جدید"} footer={<>
        {courseDraft?.id && <Button variant="danger" className="ml-auto" onClick={async () => { if (confirm("درس و همه جلسات/آزمون‌های آن حذف شود؟")) { await remove("courses", courseDraft.id!); setCourseDraft(null); reload(true); } }}><Trash2 size={14} /> حذف</Button>}
        <Button variant="ghost" onClick={() => setCourseDraft(null)}>انصراف</Button>
        <Button onClick={saveCourse} loading={saving}>ذخیره</Button>
      </>}>
        {courseDraft && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="نام درس" className="col-span-2"><Input autoFocus value={courseDraft.name ?? ""} onChange={(e) => setCourseDraft({ ...courseDraft, name: e.target.value })} /></Field>
            <Field label="استاد"><Input value={courseDraft.instructor ?? ""} onChange={(e) => setCourseDraft({ ...courseDraft, instructor: e.target.value })} /></Field>
            <Field label="تعداد واحد"><Input type="number" min={1} max={6} value={courseDraft.credits ?? 3} onChange={(e) => setCourseDraft({ ...courseDraft, credits: Number(e.target.value) })} /></Field>
            <Field label="هدف هفتگی (دقیقه)"><Input type="number" min={30} step={30} value={courseDraft.weeklyTargetMinutes ?? 300} onChange={(e) => setCourseDraft({ ...courseDraft, weeklyTargetMinutes: Number(e.target.value) })} /></Field>
            <Field label="رنگ">
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COLORS.map((c) => <button key={c} type="button" onClick={() => setCourseDraft({ ...courseDraft, color: c })} className={cn("h-7 w-7 rounded-full border-4", courseDraft.color === c ? "border-slate-800" : "border-white")} style={{ background: c }} />)}
              </div>
            </Field>
          </div>
        )}
      </Modal>

      {/* Session modal */}
      <Modal open={!!sessionDraft} onClose={() => setSessionDraft(null)} title={sessionDraft?.id ? "ویرایش جلسه مطالعه" : "ثبت جلسه مطالعه"} footer={<>
        <Button variant="ghost" onClick={() => setSessionDraft(null)}>انصراف</Button>
        <Button onClick={saveSession} loading={saving}>ذخیره</Button>
      </>}>
        {sessionDraft && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="درس" className="col-span-2">
              <Select value={sessionDraft.courseId ?? ""} onChange={(e) => setSessionDraft({ ...sessionDraft, courseId: Number(e.target.value) })}>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="تاریخ"><Input type="date" value={sessionDraft.date ?? today} onChange={(e) => setSessionDraft({ ...sessionDraft, date: e.target.value })} /></Field>
            <Field label="مدت (دقیقه)"><Input type="number" min={5} step={5} value={sessionDraft.minutes ?? 60} onChange={(e) => setSessionDraft({ ...sessionDraft, minutes: Number(e.target.value) })} /></Field>
            <Field label="موضوع" className="col-span-2"><Input value={sessionDraft.topic ?? ""} onChange={(e) => setSessionDraft({ ...sessionDraft, topic: e.target.value })} placeholder="مثلاً: فصل ۳ — حل تمرین" /></Field>
            <Field label="میزان تمرکز" className="col-span-2"><Stars value={sessionDraft.focusScore ?? 3} onChange={(v) => setSessionDraft({ ...sessionDraft, focusScore: v })} /></Field>
            <div className="col-span-2 flex gap-1">
              {[25, 45, 60, 90, 120].map((m) => <button key={m} type="button" onClick={() => setSessionDraft({ ...sessionDraft, minutes: m })} className={cn("rounded-full border px-2.5 py-1 text-xs", sessionDraft.minutes === m ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200")}><Timer size={10} className="ml-1 inline" />{fa(m)} دقیقه</button>)}
            </div>
          </div>
        )}
      </Modal>

      {/* Exam modal */}
      <Modal open={!!examDraft} onClose={() => setExamDraft(null)} title={examDraft?.id ? "ویرایش آزمون" : "آزمون جدید"} footer={<>
        <Button variant="ghost" onClick={() => setExamDraft(null)}>انصراف</Button>
        <Button onClick={saveExam} loading={saving}>ذخیره</Button>
      </>}>
        {examDraft && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="عنوان" className="col-span-2"><Input autoFocus value={examDraft.title ?? ""} onChange={(e) => setExamDraft({ ...examDraft, title: e.target.value })} placeholder="مثلاً: میان‌ترم" /></Field>
            <Field label="درس">
              <Select value={examDraft.courseId ?? ""} onChange={(e) => setExamDraft({ ...examDraft, courseId: Number(e.target.value) })}>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="تاریخ"><Input type="date" value={examDraft.date ?? today} onChange={(e) => setExamDraft({ ...examDraft, date: e.target.value })} /></Field>
            <Field label="نمره کسب‌شده"><Input type="number" step={0.25} min={0} value={examDraft.score ?? ""} onChange={(e) => setExamDraft({ ...examDraft, score: e.target.value === "" ? null : Number(e.target.value) })} placeholder="بعد از آزمون" /></Field>
            <Field label="نمره کل"><Input type="number" min={1} value={examDraft.maxScore ?? 20} onChange={(e) => setExamDraft({ ...examDraft, maxScore: Number(e.target.value) })} /></Field>
            <Field label="یادداشت" className="col-span-2"><Textarea value={examDraft.notes ?? ""} onChange={(e) => setExamDraft({ ...examDraft, notes: e.target.value })} className="min-h-[60px]" /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

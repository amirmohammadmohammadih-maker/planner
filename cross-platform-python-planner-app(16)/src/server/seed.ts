/* Demo data generator (isomorphic — used by the server and by the mobile app's embedded database). */
import { sql } from "drizzle-orm";
import * as s from "@/db/schema";
import type { Db } from "@/db/types";
import { addDays, jalaliMonthKey, shiftMonthKey, startOfWeek, weekdayIndex } from "@/lib/jalali";

/* deterministic pseudo random */
function rng(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

export async function seedDemoData(db: Db, today: string): Promise<void> {
  const rand = rng(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const weekStart = startOfWeek(today);

  await db.execute(sql`truncate tasks, habits, habit_logs, transactions, budgets, financial_goals, courses, study_sessions, exams, timesheet_entries, goals, reviews restart identity cascade`);

  /* ---- Habits ---- */
  const habitDefs = [
    { name: "ورزش صبحگاهی", icon: "🏃", color: "#16a34a", targetPerWeek: 5 },
    { name: "مطالعه ۳۰ دقیقه", icon: "📚", color: "#0ea5e9", targetPerWeek: 7 },
    { name: "نوشیدن ۸ لیوان آب", icon: "💧", color: "#14b8a6", targetPerWeek: 7 },
    { name: "مدیتیشن", icon: "🧘", color: "#8b5cf6", targetPerWeek: 5 },
    { name: "بدون شبکه اجتماعی بعد ۱۰ شب", icon: "📵", color: "#f59e0b", targetPerWeek: 6 },
    { name: "خواب قبل از ۱۲", icon: "😴", color: "#6366f1", targetPerWeek: 6 },
  ];
  const habits = await db.insert(s.habits).values(habitDefs).returning();
  const logs: { habitId: number; date: string }[] = [];
  for (let i = 45; i >= 0; i--) {
    const d = addDays(today, -i);
    for (const h of habits) {
      const p = 0.55 + (h.targetPerWeek / 7) * 0.3;
      if (rand() < p) logs.push({ habitId: h.id, date: d });
    }
  }
  if (logs.length) await db.insert(s.habitLogs).values(logs);

  /* ---- Tasks ---- */
  const taskPool = [
    { title: "جلسه هفتگی تیم", category: "کار", priority: "high", start: "09:00", end: "10:00" },
    { title: "پاسخ به ایمیل‌ها", category: "کار", priority: "low", start: "10:00", end: "10:30" },
    { title: "توسعه ماژول گزارش‌گیری", category: "کار", priority: "high", start: "10:30", end: "13:00" },
    { title: "بازبینی کد همکاران", category: "کار", priority: "medium", start: "14:00", end: "15:00" },
    { title: "مطالعه فصل ۴ ریاضی", category: "تحصیل", priority: "high", start: "17:00", end: "18:30" },
    { title: "تمرین برنامه‌نویسی پایتون", category: "تحصیل", priority: "medium", start: "19:00", end: "20:00" },
    { title: "مرور لغات انگلیسی", category: "تحصیل", priority: "low", start: "21:00", end: "21:30" },
    { title: "باشگاه", category: "سلامت", priority: "medium", start: "07:00", end: "08:00" },
    { title: "خرید هفتگی", category: "شخصی", priority: "low", start: "18:00", end: "19:00" },
    { title: "پرداخت قبوض", category: "مالی", priority: "high", start: "12:00", end: "12:15" },
    { title: "تماس با خانواده", category: "خانواده", priority: "medium", start: "20:30", end: "21:00" },
    { title: "برنامه‌ریزی هفته آینده", category: "شخصی", priority: "medium", start: "16:00", end: "16:45" },
    { title: "نوشتن گزارش پیشرفت پروژه", category: "کار", priority: "high", start: "15:00", end: "16:30" },
    { title: "پیاده‌روی عصر", category: "سلامت", priority: "low", start: "18:30", end: "19:15" },
  ];
  const tasks: (typeof s.tasks.$inferInsert)[] = [];
  for (let i = -28; i <= 13; i++) {
    const d = addDays(weekStart, i);
    const wd = weekdayIndex(d);
    const n = wd === 6 ? 2 : 3 + Math.floor(rand() * 3);
    const used = new Set<number>();
    for (let k = 0; k < n; k++) {
      let idx = Math.floor(rand() * taskPool.length);
      while (used.has(idx)) idx = (idx + 1) % taskPool.length;
      used.add(idx);
      const t = taskPool[idx];
      const past = d < today;
      const status = past ? (rand() < 0.78 ? "done" : rand() < 0.5 ? "doing" : "todo") : d === today ? (rand() < 0.4 ? "done" : "todo") : "todo";
      tasks.push({ title: t.title, category: t.category, priority: t.priority, startTime: t.start, endTime: t.end, date: d, status });
    }
  }
  await db.insert(s.tasks).values(tasks);

  /* ---- Finance ---- */
  const monthKey = jalaliMonthKey(today);
  const expenseCats: Record<string, [number, number]> = {
    "خوراک": [150_000, 900_000],
    "حمل‌ونقل": [50_000, 400_000],
    "قبوض": [300_000, 1_500_000],
    "تفریح": [100_000, 800_000],
    "خرید": [200_000, 2_500_000],
    "سلامت": [100_000, 1_200_000],
    "آموزش": [300_000, 2_000_000],
  };
  const tx: (typeof s.transactions.$inferInsert)[] = [];
  for (let i = 95; i >= 0; i--) {
    const d = addDays(today, -i);
    if (i % 30 === 5) tx.push({ type: "income", amount: 32_000_000, category: "حقوق", date: d, note: "حقوق ماهانه" });
    if (rand() < 0.2) tx.push({ type: "income", amount: Math.round((1_500_000 + rand() * 6_000_000) / 100_000) * 100_000, category: "پروژه آزاد", date: d, note: "درآمد پروژه" });
    const k = Math.floor(rand() * 3);
    for (let j = 0; j < k; j++) {
      const cat = pick(Object.keys(expenseCats));
      const [lo, hi] = expenseCats[cat];
      tx.push({ type: "expense", amount: Math.round((lo + rand() * (hi - lo)) / 10_000) * 10_000, category: cat, date: d });
    }
  }
  await db.insert(s.transactions).values(tx);

  const budgetLimits: Record<string, number> = { "خوراک": 6_000_000, "حمل‌ونقل": 2_000_000, "قبوض": 4_000_000, "تفریح": 2_500_000, "خرید": 5_000_000, "سلامت": 2_000_000, "آموزش": 3_000_000 };
  await db.insert(s.budgets).values(
    [monthKey, shiftMonthKey(monthKey, -1)].flatMap((mk) => Object.entries(budgetLimits).map(([category, limitAmount]) => ({ category, limitAmount, monthKey: mk }))),
  );
  await db.insert(s.financialGoals).values([
    { name: "صندوق اضطراری", targetAmount: 100_000_000, savedAmount: 62_000_000, deadline: addDays(today, 180) },
    { name: "لپ‌تاپ جدید", targetAmount: 70_000_000, savedAmount: 28_000_000, deadline: addDays(today, 90) },
    { name: "سفر تابستان", targetAmount: 30_000_000, savedAmount: 9_000_000, deadline: addDays(today, 120) },
  ]);

  /* ---- Study ---- */
  const courses = await db
    .insert(s.courses)
    .values([
      { name: "ریاضی مهندسی", instructor: "دکتر احمدی", color: "#16a34a", credits: 3, weeklyTargetMinutes: 300 },
      { name: "برنامه‌نویسی پایتون", instructor: "مهندس رضایی", color: "#0ea5e9", credits: 3, weeklyTargetMinutes: 360 },
      { name: "زبان انگلیسی", instructor: "خانم کریمی", color: "#f59e0b", credits: 2, weeklyTargetMinutes: 180 },
      { name: "فیزیک ۲", instructor: "دکتر موسوی", color: "#8b5cf6", credits: 3, weeklyTargetMinutes: 240 },
    ])
    .returning();
  const topics = ["مرور جزوه", "حل تمرین", "تماشای ویدیو آموزشی", "خلاصه‌نویسی", "حل نمونه سوال", "پروژه عملی"];
  const sessions: (typeof s.studySessions.$inferInsert)[] = [];
  for (let i = 42; i >= 0; i--) {
    const d = addDays(today, -i);
    const n = Math.floor(rand() * 3);
    for (let j = 0; j < n; j++) {
      sessions.push({ courseId: pick(courses).id, date: d, minutes: 30 + Math.floor(rand() * 5) * 15, topic: pick(topics), focusScore: 2 + Math.floor(rand() * 4) });
    }
  }
  await db.insert(s.studySessions).values(sessions);
  await db.insert(s.exams).values([
    { courseId: courses[0].id, title: "میان‌ترم ریاضی", date: addDays(today, -20), score: 16.5, maxScore: 20 },
    { courseId: courses[1].id, title: "کوئیز پایتون", date: addDays(today, -9), score: 18, maxScore: 20 },
    { courseId: courses[2].id, title: "آزمون شفاهی", date: addDays(today, -4), score: 14, maxScore: 20 },
    { courseId: courses[3].id, title: "میان‌ترم فیزیک", date: addDays(today, 6), maxScore: 20 },
    { courseId: courses[0].id, title: "پایان‌ترم ریاضی", date: addDays(today, 24), maxScore: 20 },
    { courseId: courses[1].id, title: "تحویل پروژه پایتون", date: addDays(today, 15), maxScore: 100 },
  ]);

  /* ---- Timesheet ---- */
  const projects = [
    { name: "وب‌سایت فروشگاه", desc: ["پیاده‌سازی سبد خرید", "رفع باگ پرداخت", "بهینه‌سازی صفحه محصول"] },
    { name: "اپلیکیشن موبایل", desc: ["طراحی صفحه ورود", "اتصال به API", "تست روی اندروید"] },
    { name: "جلسات و هماهنگی", desc: ["جلسه روزانه", "جلسه با کارفرما", "برنامه‌ریزی اسپرینت"] },
    { name: "مستندسازی", desc: ["نوشتن مستندات API", "به‌روزرسانی README"] },
  ];
  const ts: (typeof s.timesheetEntries.$inferInsert)[] = [];
  for (let i = -21; i <= 0; i++) {
    const d = addDays(today, i);
    const wd = weekdayIndex(d);
    if (wd >= 5) continue; // Thu/Fri off
    let cursor = 9 * 60;
    const n = 2 + Math.floor(rand() * 2);
    for (let j = 0; j < n; j++) {
      const p = pick(projects);
      const minutes = 60 + Math.floor(rand() * 5) * 30;
      const st = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`;
      const endMin = cursor + minutes;
      const en = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
      ts.push({ date: d, project: p.name, description: pick(p.desc), startTime: st, endTime: en, minutes, billable: p.name !== "جلسات و هماهنگی" });
      cursor = endMin + 30;
    }
  }
  await db.insert(s.timesheetEntries).values(ts);

  /* ---- Goals ---- */
  await db.insert(s.goals).values([
    { title: "خواندن ۱۲ کتاب در سال", area: "شخصی", targetValue: 12, currentValue: 5, unit: "کتاب", deadline: addDays(today, 200) },
    { title: "معدل بالای ۱۷", area: "تحصیل", targetValue: 17, currentValue: 16.2, unit: "معدل", deadline: addDays(today, 60) },
    { title: "پس‌انداز ۱۰۰ میلیون", area: "مالی", targetValue: 100, currentValue: 62, unit: "میلیون تومان", deadline: addDays(today, 180) },
    { title: "دویدن ۵ کیلومتر بدون توقف", area: "سلامت", targetValue: 5, currentValue: 3.2, unit: "کیلومتر", deadline: addDays(today, 45) },
    { title: "اتمام دوره طراحی رابط کاربری", area: "کار", targetValue: 100, currentValue: 70, unit: "درصد", deadline: addDays(today, 30) },
    { title: "یادگیری ۵۰۰ لغت انگلیسی", area: "تحصیل", targetValue: 500, currentValue: 500, unit: "لغت", status: "done" },
  ]);

  /* ---- Reviews ---- */
  await db.insert(s.reviews).values([
    { weekStart: addDays(weekStart, -7), energy: 4, focus: 3, satisfaction: 4, wins: "تحویل به‌موقع ماژول گزارش‌گیری؛ ۵ روز ورزش", challenges: "تمرکز کم در بعدازظهرها", nextFocus: "آماده‌سازی برای میان‌ترم فیزیک" },
    { weekStart: addDays(weekStart, -14), energy: 3, focus: 3, satisfaction: 3, wins: "شروع عادت مدیتیشن", challenges: "خرج زیاد در دسته تفریح", nextFocus: "کنترل بودجه تفریح" },
  ]);
}

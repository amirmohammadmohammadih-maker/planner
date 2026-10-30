import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { Db } from "@/db/types";
import * as s from "@/db/schema";
import { addDays, jalaliMonthKey, monthKeyToRange } from "@/lib/jalali";

export type WeekMetrics = {
  weekStart: string;
  tasks: { total: number; done: number; rate: number | null };
  habits: { target: number; done: number; rate: number | null };
  study: { minutes: number; target: number; rate: number | null };
  timesheet: { minutes: number; target: number; rate: number | null };
  budget: { spent: number; limit: number; rate: number | null };
  overall: number;
};

export type WeekContext = {
  tasks: s.Task[];
  habits: s.Habit[];
  logs: s.HabitLog[];
  courses: s.Course[];
  sessions: s.StudySession[];
  timesheet: s.TimesheetEntry[];
  transactions: s.Transaction[];
  budgets: s.Budget[];
};

const TIMESHEET_WEEKLY_TARGET = 40 * 60;

/** Load everything needed to compute metrics for weeks within [from, to]. */
export async function loadWeekContext(db: Db, from: string, to: string): Promise<WeekContext> {
  // Budgets are monthly (Jalali) — widen the transaction range to full months.
  const monthFrom = monthKeyToRange(jalaliMonthKey(from)).from;
  const monthTo = monthKeyToRange(jalaliMonthKey(to)).to;

  const [tasks, habits, logs, courses, sessions, timesheet, transactions, budgets] = await Promise.all([
    db.select().from(s.tasks).where(and(gte(s.tasks.date, from), lte(s.tasks.date, to))).orderBy(asc(s.tasks.date), asc(s.tasks.startTime)),
    db.select().from(s.habits).where(eq(s.habits.archived, false)).orderBy(asc(s.habits.id)),
    db.select().from(s.habitLogs).where(and(gte(s.habitLogs.date, from), lte(s.habitLogs.date, to))),
    db.select().from(s.courses).orderBy(asc(s.courses.id)),
    db.select().from(s.studySessions).where(and(gte(s.studySessions.date, from), lte(s.studySessions.date, to))),
    db.select().from(s.timesheetEntries).where(and(gte(s.timesheetEntries.date, from), lte(s.timesheetEntries.date, to))),
    db.select().from(s.transactions).where(and(gte(s.transactions.date, monthFrom), lte(s.transactions.date, monthTo))),
    db.select().from(s.budgets),
  ]);
  return { tasks, habits, logs, courses, sessions, timesheet, transactions, budgets };
}

const inRange = (d: string, from: string, to: string) => d >= from && d <= to;

export function computeWeekMetrics(weekStart: string, ctx: WeekContext): WeekMetrics {
  const weekEnd = addDays(weekStart, 6);

  // Tasks
  const wTasks = ctx.tasks.filter((t) => inRange(t.date, weekStart, weekEnd));
  const done = wTasks.filter((t) => t.status === "done").length;
  const taskRate = wTasks.length ? done / wTasks.length : null;

  // Habits (respect weekly targets)
  const wLogs = ctx.logs.filter((l) => inRange(l.date, weekStart, weekEnd));
  let habitTarget = 0;
  let habitDone = 0;
  for (const h of ctx.habits) {
    const target = Math.max(1, Math.min(7, h.targetPerWeek));
    const count = wLogs.filter((l) => l.habitId === h.id).length;
    habitTarget += target;
    habitDone += Math.min(target, count);
  }
  const habitRate = habitTarget ? habitDone / habitTarget : null;

  // Study
  const studyMinutes = ctx.sessions.filter((x) => inRange(x.date, weekStart, weekEnd)).reduce((a, x) => a + x.minutes, 0);
  const studyTarget = ctx.courses.reduce((a, c) => a + c.weeklyTargetMinutes, 0);
  const studyRate = studyTarget ? Math.min(1, studyMinutes / studyTarget) : null;

  // Timesheet
  const tsMinutes = ctx.timesheet.filter((x) => inRange(x.date, weekStart, weekEnd)).reduce((a, x) => a + x.minutes, 0);
  const tsRate = tsMinutes || ctx.timesheet.length ? Math.min(1, tsMinutes / TIMESHEET_WEEKLY_TARGET) : null;

  // Budget adherence for the Jalali month containing the week start
  const monthKey = jalaliMonthKey(weekStart);
  const { from: mFrom, to: mTo } = monthKeyToRange(monthKey);
  const monthBudgets = ctx.budgets.filter((b) => b.monthKey === monthKey);
  const limit = monthBudgets.reduce((a, b) => a + b.limitAmount, 0);
  const budgetedCats = new Set(monthBudgets.map((b) => b.category));
  const spent = ctx.transactions
    .filter((t) => t.type === "expense" && inRange(t.date, mFrom, mTo) && budgetedCats.has(t.category))
    .reduce((a, t) => a + t.amount, 0);
  const budgetRate = limit ? (spent <= limit ? 1 : Math.max(0, 1 - (spent - limit) / limit)) : null;

  const rates = [taskRate, habitRate, studyRate, tsRate, budgetRate].filter((r): r is number => r !== null);
  const overall = rates.length ? Math.round((rates.reduce((a, r) => a + r, 0) / rates.length) * 100) : 0;

  return {
    weekStart,
    tasks: { total: wTasks.length, done, rate: taskRate },
    habits: { target: habitTarget, done: habitDone, rate: habitRate },
    study: { minutes: studyMinutes, target: studyTarget, rate: studyRate },
    timesheet: { minutes: tsMinutes, target: TIMESHEET_WEEKLY_TARGET, rate: tsRate },
    budget: { spent, limit, rate: budgetRate },
    overall,
  };
}

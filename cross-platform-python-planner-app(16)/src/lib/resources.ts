import { asc, desc, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import * as s from "@/db/schema";

export type ResourceDef = {
  table: PgTable;
  id: PgColumn;
  /** column used for `from` / `to` range filtering */
  dateCol?: PgColumn;
  /** query-string filters mapped to columns */
  filters?: Record<string, { col: PgColumn; type: "number" | "string" | "boolean" }>;
  orderBy: SQL[];
  /** field names that must be coerced to numbers */
  numbers?: string[];
  /** field names that may be null when empty */
  nullable?: string[];
};

export const RESOURCES: Record<string, ResourceDef> = {
  tasks: {
    table: s.tasks,
    id: s.tasks.id,
    dateCol: s.tasks.date,
    filters: { status: { col: s.tasks.status, type: "string" }, category: { col: s.tasks.category, type: "string" } },
    orderBy: [asc(s.tasks.date), asc(s.tasks.startTime), asc(s.tasks.id)],
    nullable: ["description", "startTime", "endTime"],
  },
  habits: {
    table: s.habits,
    id: s.habits.id,
    filters: { archived: { col: s.habits.archived, type: "boolean" } },
    orderBy: [asc(s.habits.id)],
    numbers: ["targetPerWeek"],
  },
  habit_logs: {
    table: s.habitLogs,
    id: s.habitLogs.id,
    dateCol: s.habitLogs.date,
    filters: { habitId: { col: s.habitLogs.habitId, type: "number" } },
    orderBy: [asc(s.habitLogs.date)],
    numbers: ["habitId"],
  },
  transactions: {
    table: s.transactions,
    id: s.transactions.id,
    dateCol: s.transactions.date,
    filters: { type: { col: s.transactions.type, type: "string" }, category: { col: s.transactions.category, type: "string" } },
    orderBy: [desc(s.transactions.date), desc(s.transactions.id)],
    numbers: ["amount"],
    nullable: ["note"],
  },
  budgets: {
    table: s.budgets,
    id: s.budgets.id,
    filters: { monthKey: { col: s.budgets.monthKey, type: "string" } },
    orderBy: [asc(s.budgets.id)],
    numbers: ["limitAmount"],
  },
  financial_goals: {
    table: s.financialGoals,
    id: s.financialGoals.id,
    orderBy: [asc(s.financialGoals.id)],
    numbers: ["targetAmount", "savedAmount"],
    nullable: ["deadline"],
  },
  courses: {
    table: s.courses,
    id: s.courses.id,
    orderBy: [asc(s.courses.id)],
    numbers: ["credits", "weeklyTargetMinutes"],
    nullable: ["instructor"],
  },
  study_sessions: {
    table: s.studySessions,
    id: s.studySessions.id,
    dateCol: s.studySessions.date,
    filters: { courseId: { col: s.studySessions.courseId, type: "number" } },
    orderBy: [desc(s.studySessions.date), desc(s.studySessions.id)],
    numbers: ["courseId", "minutes", "focusScore"],
    nullable: ["topic"],
  },
  exams: {
    table: s.exams,
    id: s.exams.id,
    dateCol: s.exams.date,
    filters: { courseId: { col: s.exams.courseId, type: "number" } },
    orderBy: [asc(s.exams.date)],
    numbers: ["courseId", "score", "maxScore"],
    nullable: ["score", "notes"],
  },
  timesheet: {
    table: s.timesheetEntries,
    id: s.timesheetEntries.id,
    dateCol: s.timesheetEntries.date,
    filters: { project: { col: s.timesheetEntries.project, type: "string" } },
    orderBy: [asc(s.timesheetEntries.date), asc(s.timesheetEntries.startTime), asc(s.timesheetEntries.id)],
    numbers: ["minutes"],
    nullable: ["description", "startTime", "endTime"],
  },
  goals: {
    table: s.goals,
    id: s.goals.id,
    filters: { status: { col: s.goals.status, type: "string" }, area: { col: s.goals.area, type: "string" } },
    orderBy: [asc(s.goals.id)],
    numbers: ["targetValue", "currentValue"],
    nullable: ["deadline", "notes"],
  },
  reviews: {
    table: s.reviews,
    id: s.reviews.id,
    dateCol: s.reviews.weekStart,
    orderBy: [desc(s.reviews.weekStart)],
    numbers: ["energy", "focus", "satisfaction"],
    nullable: ["wins", "challenges", "nextFocus"],
  },
};

/** Clean an incoming JSON body before insert/update. */
export function sanitize(def: ResourceDef, body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === "id" || k === "createdAt") continue;
    let val: unknown = v;
    if (def.nullable?.includes(k) && (val === "" || val === undefined)) val = null;
    if (def.numbers?.includes(k) && val !== null && val !== undefined && val !== "") val = Number(val);
    if (def.numbers?.includes(k) && val === "") val = null;
    out[k] = val;
  }
  return out;
}

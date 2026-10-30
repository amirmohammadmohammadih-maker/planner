import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  date,
  timestamp,
  bigint,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ---------------- Weekly planner / calendar ---------------- */
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: date("date", { mode: "string" }).notNull(),
  startTime: text("start_time"), // "HH:MM"
  endTime: text("end_time"), // "HH:MM"
  priority: text("priority").notNull().default("medium"), // low | medium | high
  status: text("status").notNull().default("todo"), // todo | doing | done
  category: text("category").notNull().default("کار"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------------- Habit tracker ---------------- */
export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("✅"),
  color: text("color").notNull().default("#10b981"),
  targetPerWeek: integer("target_per_week").notNull().default(7),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const habitLogs = pgTable(
  "habit_logs",
  {
    id: serial("id").primaryKey(),
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
  },
  (t) => [uniqueIndex("habit_logs_habit_date_idx").on(t.habitId, t.date)],
);

/* ---------------- Budget tracker ---------------- */
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // income | expense
  amount: bigint("amount", { mode: "number" }).notNull(),
  category: text("category").notNull(),
  note: text("note"),
  date: date("date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgets = pgTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull(),
    monthKey: text("month_key").notNull(), // Jalali "YYYY-MM"
    limitAmount: bigint("limit_amount", { mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("budgets_category_month_idx").on(t.category, t.monthKey)],
);

export const financialGoals = pgTable("financial_goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetAmount: bigint("target_amount", { mode: "number" }).notNull(),
  savedAmount: bigint("saved_amount", { mode: "number" }).notNull().default(0),
  deadline: date("deadline", { mode: "string" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------------- Study planner ---------------- */
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  instructor: text("instructor"),
  color: text("color").notNull().default("#16a34a"),
  credits: integer("credits").notNull().default(3),
  weeklyTargetMinutes: integer("weekly_target_minutes").notNull().default(300),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  minutes: integer("minutes").notNull(),
  topic: text("topic"),
  focusScore: integer("focus_score").notNull().default(3), // 1..5
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  score: real("score"),
  maxScore: real("max_score").notNull().default(20),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------------- Timesheet ---------------- */
export const timesheetEntries = pgTable("timesheet_entries", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  project: text("project").notNull(),
  description: text("description"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  minutes: integer("minutes").notNull(),
  billable: boolean("billable").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------------- Goals / planning ---------------- */
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  area: text("area").notNull().default("شخصی"), // کار | تحصیل | مالی | سلامت | شخصی
  targetValue: real("target_value").notNull().default(100),
  currentValue: real("current_value").notNull().default(0),
  unit: text("unit").notNull().default("درصد"),
  deadline: date("deadline", { mode: "string" }),
  status: text("status").notNull().default("active"), // active | done | paused
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------------- Weekly self review ---------------- */
export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    weekStart: date("week_start", { mode: "string" }).notNull(),
    energy: integer("energy").notNull().default(3),
    focus: integer("focus").notNull().default(3),
    satisfaction: integer("satisfaction").notNull().default(3),
    wins: text("wins"),
    challenges: text("challenges"),
    nextFocus: text("next_focus"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("reviews_week_start_idx").on(t.weekStart)],
);

/* ---------------- Types ---------------- */
export type Task = typeof tasks.$inferSelect;
export type Habit = typeof habits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type FinancialGoal = typeof financialGoals.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type Exam = typeof exams.$inferSelect;
export type TimesheetEntry = typeof timesheetEntries.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Review = typeof reviews.$inferSelect;

/* ---------------- App settings (key/value) ---------------- */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ---------------- Local profile (single user for now) ---------------- */
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  bio: text("bio"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type Profile = typeof profiles.$inferSelect;

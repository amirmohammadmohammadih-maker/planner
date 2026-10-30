/* Idempotent schema bootstrap.
   Mirrors src/db/schema.ts (generated via `drizzle-kit generate`, then made IF NOT EXISTS)
   so the app can create its own tables on first start — no separate migration step.
   ⚠️ If you change schema.ts, update this file too (or run `npx drizzle-kit push`). */
export const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS "budgets" (
  "id" serial PRIMARY KEY NOT NULL,
  "category" text NOT NULL,
  "month_key" text NOT NULL,
  "limit_amount" bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS "courses" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "instructor" text,
  "color" text DEFAULT '#16a34a' NOT NULL,
  "credits" integer DEFAULT 3 NOT NULL,
  "weekly_target_minutes" integer DEFAULT 300 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "exams" (
  "id" serial PRIMARY KEY NOT NULL,
  "course_id" integer NOT NULL,
  "title" text NOT NULL,
  "date" date NOT NULL,
  "score" real,
  "max_score" real DEFAULT 20 NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "exams_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE cascade ON UPDATE no action
);
CREATE TABLE IF NOT EXISTS "financial_goals" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "target_amount" bigint NOT NULL,
  "saved_amount" bigint DEFAULT 0 NOT NULL,
  "deadline" date,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "goals" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "area" text DEFAULT 'شخصی' NOT NULL,
  "target_value" real DEFAULT 100 NOT NULL,
  "current_value" real DEFAULT 0 NOT NULL,
  "unit" text DEFAULT 'درصد' NOT NULL,
  "deadline" date,
  "status" text DEFAULT 'active' NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "habits" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "icon" text DEFAULT '✅' NOT NULL,
  "color" text DEFAULT '#10b981' NOT NULL,
  "target_per_week" integer DEFAULT 7 NOT NULL,
  "archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "habit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "habit_id" integer NOT NULL,
  "date" date NOT NULL,
  CONSTRAINT "habit_logs_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE cascade ON UPDATE no action
);
CREATE TABLE IF NOT EXISTS "reviews" (
  "id" serial PRIMARY KEY NOT NULL,
  "week_start" date NOT NULL,
  "energy" integer DEFAULT 3 NOT NULL,
  "focus" integer DEFAULT 3 NOT NULL,
  "satisfaction" integer DEFAULT 3 NOT NULL,
  "wins" text,
  "challenges" text,
  "next_focus" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "study_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "course_id" integer NOT NULL,
  "date" date NOT NULL,
  "minutes" integer NOT NULL,
  "topic" text,
  "focus_score" integer DEFAULT 3 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "study_sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE cascade ON UPDATE no action
);
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "date" date NOT NULL,
  "start_time" text,
  "end_time" text,
  "priority" text DEFAULT 'medium' NOT NULL,
  "status" text DEFAULT 'todo' NOT NULL,
  "category" text DEFAULT 'کار' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "timesheet_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "date" date NOT NULL,
  "project" text NOT NULL,
  "description" text,
  "start_time" text,
  "end_time" text,
  "minutes" integer NOT NULL,
  "billable" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "amount" bigint NOT NULL,
  "category" text NOT NULL,
  "note" text,
  "date" date NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "bio" text,
  "password_hash" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "budgets_category_month_idx" ON "budgets" USING btree ("category","month_key");
CREATE UNIQUE INDEX IF NOT EXISTS "habit_logs_habit_date_idx" ON "habit_logs" USING btree ("habit_id","date");
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_week_start_idx" ON "reviews" USING btree ("week_start");
`;

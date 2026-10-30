/* Isomorphic application logic — used by
 *   • the Next.js route handlers (server / desktop EXE / Docker), and
 *   • the in-browser transport of the mobile app (PGlite in IndexedDB, no server).
 * Everything here receives the Drizzle instance explicitly and must not import Node-only modules. */
import { and, asc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import * as s from "@/db/schema";
import type { Db } from "@/db/types";
import { addDays, jalaliMonthKey, monthKeyToRange, startOfWeek, todayISO } from "@/lib/jalali";
import { computeWeekMetrics, loadWeekContext } from "@/lib/metrics";
import { hashPassword, verifyPassword } from "@/lib/password";
import { RESOURCES, sanitize } from "@/lib/resources";
import { seedDemoData } from "@/server/seed";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Query = Record<string, string | undefined>;
type Body = Record<string, unknown>;

/* ============================== generic resources ============================== */
export async function listResource(db: Db, resource: string, q: Query) {
  const def = RESOURCES[resource];
  if (!def) throw new ApiError(404, "منبع یافت نشد");
  const conds: SQL[] = [];
  if (def.dateCol) {
    if (q.from) conds.push(gte(def.dateCol, q.from));
    if (q.to) conds.push(lte(def.dateCol, q.to));
  }
  for (const [key, f] of Object.entries(def.filters ?? {})) {
    const raw = q[key];
    if (raw === undefined || raw === null) continue;
    const value = f.type === "number" ? Number(raw) : f.type === "boolean" ? raw === "true" : raw;
    conds.push(eq(f.col, value));
  }
  return db
    .select()
    .from(def.table)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(...def.orderBy);
}

export async function getResource(db: Db, resource: string, id: number) {
  const def = RESOURCES[resource];
  if (!def) throw new ApiError(404, "منبع یافت نشد");
  const rows = await db.select().from(def.table).where(eq(def.id, id));
  if (!rows.length) throw new ApiError(404, "یافت نشد");
  return rows[0];
}

/** Returns `{ status, body }` because some resources answer with special shapes (habit toggle). */
export async function createResource(db: Db, resource: string, body: Body): Promise<{ status: number; body: unknown }> {
  const def = RESOURCES[resource];
  if (!def) throw new ApiError(404, "منبع یافت نشد");
  const data = sanitize(def, body);

  if (resource === "habit_logs") {
    const habitId = Number(data.habitId);
    const date = String(data.date);
    const existing = await db
      .select()
      .from(s.habitLogs)
      .where(and(eq(s.habitLogs.habitId, habitId), eq(s.habitLogs.date, date)));
    if (existing.length) {
      await db.delete(s.habitLogs).where(eq(s.habitLogs.id, existing[0].id));
      return { status: 200, body: { done: false } };
    }
    const [row] = await db.insert(s.habitLogs).values({ habitId, date }).returning();
    return { status: 201, body: { done: true, log: row } };
  }

  if (resource === "budgets") {
    const [row] = await db
      .insert(s.budgets)
      .values({ category: String(data.category), monthKey: String(data.monthKey), limitAmount: Number(data.limitAmount) })
      .onConflictDoUpdate({ target: [s.budgets.category, s.budgets.monthKey], set: { limitAmount: Number(data.limitAmount) } })
      .returning();
    return { status: 201, body: row };
  }

  if (resource === "reviews") {
    const weekStart = startOfWeek(String(data.weekStart));
    const set = {
      energy: Number(data.energy ?? 3),
      focus: Number(data.focus ?? 3),
      satisfaction: Number(data.satisfaction ?? 3),
      wins: (data.wins as string | null) ?? null,
      challenges: (data.challenges as string | null) ?? null,
      nextFocus: (data.nextFocus as string | null) ?? null,
    };
    const [row] = await db
      .insert(s.reviews)
      .values({ weekStart, ...set })
      .onConflictDoUpdate({ target: s.reviews.weekStart, set })
      .returning();
    return { status: 201, body: row };
  }

  const [row] = await db
    .insert(def.table)
    .values(data as never)
    .returning();
  return { status: 201, body: row };
}

export async function updateResource(db: Db, resource: string, id: number, body: Body) {
  const def = RESOURCES[resource];
  if (!def) throw new ApiError(404, "منبع یافت نشد");
  const data = sanitize(def, body);
  if (!Object.keys(data).length) throw new ApiError(400, "داده‌ای برای ویرایش ارسال نشده");
  const rows = await db
    .update(def.table)
    .set(data as never)
    .where(eq(def.id, id))
    .returning();
  if (!rows.length) throw new ApiError(404, "یافت نشد");
  return rows[0];
}

export async function deleteResource(db: Db, resource: string, id: number) {
  const def = RESOURCES[resource];
  if (!def) throw new ApiError(404, "منبع یافت نشد");
  await db.delete(def.table).where(eq(def.id, id));
}

/* ============================== dashboard ============================== */
export async function getDashboard(db: Db, todayParam?: string) {
  const today = todayParam || todayISO();
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const trendFrom = addDays(weekStart, -7 * 5);
  const monthKey = jalaliMonthKey(today);
  const month = monthKeyToRange(monthKey);

  const [ctx, monthTx, upcomingExams, goals, counts, profileRows] = await Promise.all([
    loadWeekContext(db, trendFrom, weekEnd),
    db.select().from(s.transactions).where(and(gte(s.transactions.date, month.from), lte(s.transactions.date, month.to))),
    db
      .select({ id: s.exams.id, title: s.exams.title, date: s.exams.date, courseName: s.courses.name, courseColor: s.courses.color })
      .from(s.exams)
      .innerJoin(s.courses, eq(s.exams.courseId, s.courses.id))
      .where(gte(s.exams.date, today))
      .orderBy(asc(s.exams.date))
      .limit(4),
    db.select().from(s.goals).where(eq(s.goals.status, "active")).orderBy(asc(s.goals.deadline)).limit(5),
    db.execute(sql`select
        (select count(*) from tasks) as tasks,
        (select count(*) from habits) as habits,
        (select count(*) from transactions) as transactions,
        (select count(*) from courses) as courses`),
    db.select({ name: s.profiles.name }).from(s.profiles).orderBy(asc(s.profiles.id)).limit(1),
  ]);

  const metrics = computeWeekMetrics(weekStart, ctx);
  const trend = Array.from({ length: 6 }, (_, i) => {
    const ws = addDays(weekStart, -7 * (5 - i));
    return { weekStart: ws, overall: computeWeekMetrics(ws, ctx).overall };
  });
  const income = monthTx.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const studyByDay = weekDays.map((d) => ctx.sessions.filter((x) => x.date === d).reduce((a, x) => a + x.minutes, 0));
  const tasksByDay = weekDays.map((d) => ({
    total: ctx.tasks.filter((t) => t.date === d).length,
    done: ctx.tasks.filter((t) => t.date === d && t.status === "done").length,
  }));
  const countRow = (counts.rows?.[0] ?? {}) as Record<string, string | number>;
  const isEmpty = Object.values(countRow).every((v) => Number(v) === 0);

  return {
    today,
    weekStart,
    monthKey,
    todayTasks: ctx.tasks.filter((t) => t.date === today),
    weekTasks: ctx.tasks.filter((t) => t.date >= weekStart && t.date <= weekEnd),
    tasksByDay,
    habits: ctx.habits,
    todayLogs: ctx.logs.filter((l) => l.date === today).map((l) => l.habitId),
    weekLogs: ctx.logs.filter((l) => l.date >= weekStart && l.date <= weekEnd),
    month: { income, expense },
    study: { weekMinutes: metrics.study.minutes, byDay: studyByDay, upcomingExams },
    timesheetWeekMinutes: metrics.timesheet.minutes,
    goals,
    metrics,
    trend,
    isEmpty,
    profileName: profileRows[0]?.name ?? null,
  };
}

/* ============================== weekly review ============================== */
const REVIEW_WEEKS = 8;
export async function getReview(db: Db, weekStartParam?: string) {
  const weekStart = startOfWeek(weekStartParam || todayISO());
  const weekEnd = addDays(weekStart, 6);
  const from = addDays(weekStart, -7 * (REVIEW_WEEKS - 1));
  const [ctx, reviewRows] = await Promise.all([loadWeekContext(db, from, weekEnd), db.select().from(s.reviews).where(eq(s.reviews.weekStart, weekStart))]);
  const metrics = computeWeekMetrics(weekStart, ctx);
  const trend = Array.from({ length: REVIEW_WEEKS }, (_, i) => computeWeekMetrics(addDays(weekStart, -7 * (REVIEW_WEEKS - 1 - i)), ctx));
  const byDay = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const dayTasks = ctx.tasks.filter((t) => t.date === d);
    return {
      date: d,
      tasksTotal: dayTasks.length,
      tasksDone: dayTasks.filter((t) => t.status === "done").length,
      habitsDone: ctx.logs.filter((l) => l.date === d).length,
      habitsTotal: ctx.habits.length,
      studyMinutes: ctx.sessions.filter((x) => x.date === d).reduce((a, x) => a + x.minutes, 0),
      timesheetMinutes: ctx.timesheet.filter((x) => x.date === d).reduce((a, x) => a + x.minutes, 0),
    };
  });
  const catMap = new Map<string, { total: number; done: number }>();
  for (const t of ctx.tasks.filter((t) => t.date >= weekStart && t.date <= weekEnd)) {
    const c = catMap.get(t.category) ?? { total: 0, done: 0 };
    c.total++;
    if (t.status === "done") c.done++;
    catMap.set(t.category, c);
  }
  return { weekStart, metrics, trend, byDay, byCategory: [...catMap.entries()].map(([category, v]) => ({ category, ...v })), review: reviewRows[0] ?? null };
}

/* ============================== settings ============================== */
const SETTING_KEYS = new Set(["theme", "mode", "weekStartsOn", "currency", "timesheetWeeklyTarget"]);
export async function getSettings(db: Db) {
  const rows = await db.select().from(s.settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
}
export async function putSettings(db: Db, body: Body) {
  const entries = Object.entries(body).filter(([k, v]) => SETTING_KEYS.has(k) && (typeof v === "string" || typeof v === "number"));
  if (!entries.length) throw new ApiError(400, "کلید معتبری ارسال نشده");
  for (const [key, value] of entries) {
    await db
      .insert(s.settings)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({ target: s.settings.key, set: { value: String(value), updatedAt: new Date() } });
  }
  return getSettings(db);
}

/* ============================== profile ============================== */
function publicProfile(p: s.Profile) {
  return { id: p.id, name: p.name, email: p.email, phone: p.phone, bio: p.bio, hasPassword: !!p.passwordHash, createdAt: p.createdAt, updatedAt: p.updatedAt };
}
async function currentProfile(db: Db): Promise<s.Profile | null> {
  const rows = await db.select().from(s.profiles).orderBy(asc(s.profiles.id)).limit(1);
  return rows[0] ?? null;
}
export async function getProfile(db: Db) {
  const p = await currentProfile(db);
  return p ? publicProfile(p) : null;
}
export async function putProfile(db: Db, body: Body) {
  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const name = str("name");
  if (!name) throw new ApiError(400, "نام را وارد کنید");
  const email = str("email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "ایمیل معتبر نیست");

  const existing = await currentProfile(db);
  const newPassword = str("newPassword");
  const currentPassword = str("currentPassword");
  const removePassword = body.removePassword === true;

  let passwordHash: string | null | undefined = undefined; // undefined = unchanged
  if (newPassword || removePassword) {
    if (existing?.passwordHash && !(await verifyPassword(currentPassword, existing.passwordHash))) throw new ApiError(403, "رمز عبور فعلی اشتباه است");
    if (removePassword) passwordHash = null;
    else {
      if (newPassword.length < 4) throw new ApiError(400, "رمز عبور باید حداقل ۴ کاراکتر باشد");
      passwordHash = await hashPassword(newPassword);
    }
  }
  const data = {
    name,
    email: email || null,
    phone: str("phone") || null,
    bio: str("bio") || null,
    updatedAt: new Date(),
    ...(passwordHash !== undefined ? { passwordHash } : {}),
  };
  const [row] = existing
    ? await db.update(s.profiles).set(data).where(eq(s.profiles.id, existing.id)).returning()
    : await db.insert(s.profiles).values({ ...data, passwordHash: passwordHash ?? null }).returning();
  return publicProfile(row);
}
export async function verifyProfilePassword(db: Db, password: string | undefined) {
  const p = await currentProfile(db);
  if (!p?.passwordHash) return { ok: true, required: false };
  return { ok: await verifyPassword(password ?? "", p.passwordHash), required: true };
}
async function requirePassword(db: Db, password: string | undefined) {
  const p = await currentProfile(db);
  if (!p?.passwordHash) return;
  if (!(await verifyPassword(password ?? "", p.passwordHash))) throw new ApiError(403, "رمز عبور اشتباه است");
}

/* ============================== data management ============================== */
const DATA_TABLES: { name: string; table: PgTable; scope: string }[] = [
  { name: "tasks", table: s.tasks, scope: "tasks" },
  { name: "habits", table: s.habits, scope: "habits" },
  { name: "habit_logs", table: s.habitLogs, scope: "habits" },
  { name: "transactions", table: s.transactions, scope: "finance" },
  { name: "budgets", table: s.budgets, scope: "finance" },
  { name: "financial_goals", table: s.financialGoals, scope: "finance" },
  { name: "courses", table: s.courses, scope: "study" },
  { name: "study_sessions", table: s.studySessions, scope: "study" },
  { name: "exams", table: s.exams, scope: "study" },
  { name: "timesheet_entries", table: s.timesheetEntries, scope: "timesheet" },
  { name: "goals", table: s.goals, scope: "goals" },
  { name: "reviews", table: s.reviews, scope: "reviews" },
];

async function counts(db: Db): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of DATA_TABLES) {
    const r = await db.execute(sql`select count(*)::int as n from ${sql.identifier(t.name)}`);
    out[t.name] = Number((r.rows[0] as { n: number }).n);
  }
  return out;
}
const truncateSql = (names: string[]) => sql.raw(`truncate ${names.map((n) => `"${n}"`).join(", ")} restart identity cascade`);

export async function dataStats(db: Db) {
  const c = await counts(db);
  return { counts: c, total: Object.values(c).reduce((a, b) => a + b, 0) };
}

export async function dataExport(db: Db) {
  const tables: Record<string, unknown[]> = {};
  for (const t of DATA_TABLES) tables[t.name] = await db.select().from(t.table);
  const settingsRows = await db.select().from(s.settings);
  const profile = await currentProfile(db);
  return {
    app: "planner",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: Object.fromEntries(settingsRows.map((r) => [r.key, r.value])),
    profile: profile ? { name: profile.name, email: profile.email, phone: profile.phone, bio: profile.bio } : null,
    tables,
  };
}

export async function dataReset(db: Db, body: Body) {
  await requirePassword(db, body.password as string | undefined);
  const requested = Array.isArray(body.scopes) ? (body.scopes as string[]) : ["all"];
  const all = requested.includes("all");
  const names = DATA_TABLES.filter((t) => all || requested.includes(t.scope)).map((t) => t.name);
  if (!names.length) throw new ApiError(400, "بخشی انتخاب نشده");
  await db.execute(truncateSql(names));
  if (all && body.includeProfile === true) await db.execute(sql`truncate "profiles", "settings" restart identity cascade`);
  return { ok: true, cleared: names, counts: await counts(db) };
}

function normalizeRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...row };
  for (const k of ["createdAt", "updatedAt"]) if (typeof out[k] === "string") out[k] = new Date(out[k] as string);
  return out;
}

export async function dataImport(db: Db, body: Body) {
  await requirePassword(db, body.password as string | undefined);
  const backup = body.backup as { app?: string; tables?: Record<string, Record<string, unknown>[]>; settings?: Record<string, string> } | undefined;
  if (!backup || backup.app !== "planner" || !backup.tables) throw new ApiError(400, "فایل پشتیبان معتبر نیست");
  await db.transaction(async (tx) => {
    await tx.execute(truncateSql(DATA_TABLES.map((t) => t.name)));
    for (const t of DATA_TABLES) {
      const rows = Array.isArray(backup.tables![t.name]) ? backup.tables![t.name] : [];
      for (let i = 0; i < rows.length; i += 300) {
        const chunk = rows.slice(i, i + 300).map(normalizeRow);
        await tx.insert(t.table).values(chunk as never);
      }
      await tx.execute(sql.raw(`select setval(pg_get_serial_sequence('"${t.name}"', 'id'), coalesce((select max(id) from "${t.name}"), 0) + 1, false)`));
    }
    if (backup.settings && typeof backup.settings === "object") {
      for (const [key, value] of Object.entries(backup.settings)) {
        if (typeof value !== "string") continue;
        await tx
          .insert(s.settings)
          .values({ key, value })
          .onConflictDoUpdate({ target: s.settings.key, set: { value } });
      }
    }
  });
  return { ok: true, counts: await counts(db) };
}

/* ============================== demo data ============================== */
export async function seed(db: Db, todayParam?: string) {
  const today = todayParam || todayISO();
  await seedDemoData(db, today);
  return { ok: true, today };
}

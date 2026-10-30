/* Database client with two interchangeable drivers, selected by DATABASE_URL:
 *
 *   postgresql://user:pass@host:5432/db   → real PostgreSQL (server / Docker)
 *   pglite://./data                       → embedded PostgreSQL (PGlite) stored in ./data
 *                                           → zero install: perfect for local use / desktop
 *   memory://                             → in-memory PGlite (tests)
 *
 * `ensureSchema()` creates the tables on first start (idempotent), so no migration step is needed.
 */
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { PGlite } from "@electric-sql/pglite";
import { BOOTSTRAP_SQL } from "./bootstrap";

export type Db = NodePgDatabase;

type Driver = { kind: "pg"; pool: Pool; db: Db } | { kind: "pglite"; client: PGlite; db: Db };

const g = globalThis as typeof globalThis & {
  __plannerDriver?: Driver;
  __plannerDriverPromise?: Promise<Driver>;
  __plannerSchemaReady?: Promise<void>;
};

export function dbTarget(): { kind: "pg"; url: string } | { kind: "pglite"; dataDir: string } {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is required (e.g. pglite://./data or postgresql://…)");
  if (/^memory:\/\//i.test(url)) return { kind: "pglite", dataDir: "memory://" };
  const m = url.match(/^(?:pglite|file):(?:\/\/)?(.*)$/i);
  if (m) return { kind: "pglite", dataDir: m[1] || "./data" };
  return { kind: "pg", url };
}

async function createDriver(): Promise<Driver> {
  const target = dbTarget();
  if (target.kind === "pglite") {
    const [{ PGlite }, { drizzle }] = await Promise.all([import("@electric-sql/pglite"), import("drizzle-orm/pglite")]);
    const client = await PGlite.create(target.dataDir);
    return { kind: "pglite", client, db: drizzle(client) as unknown as Db };
  }
  const pool = new Pool({ connectionString: target.url });
  return { kind: "pg", pool, db: drizzlePg(pool) };
}

/** Resolve (and cache) the driver. */
export function getDriver(): Promise<Driver> {
  if (g.__plannerDriver) return Promise.resolve(g.__plannerDriver);
  if (!g.__plannerDriverPromise) {
    g.__plannerDriverPromise = createDriver()
      .then((d) => (g.__plannerDriver = d))
      .catch((e) => {
        g.__plannerDriverPromise = undefined;
        throw e;
      });
  }
  return g.__plannerDriverPromise;
}

/** Creates all tables if they don't exist. Call once at the start of every request handler. */
export function ensureSchema(): Promise<void> {
  if (!g.__plannerSchemaReady) {
    g.__plannerSchemaReady = (async () => {
      const d = await getDriver();
      if (d.kind === "pglite") {
        await d.client.exec(BOOTSTRAP_SQL);
        return;
      }
      const c = await d.pool.connect();
      try {
        await c.query("BEGIN");
        await c.query("SELECT pg_advisory_xact_lock(727274)");
        await c.query(BOOTSTRAP_SQL);
        await c.query("COMMIT");
      } catch (e) {
        await c.query("ROLLBACK").catch(() => undefined);
        throw e;
      } finally {
        c.release();
      }
    })().catch((e) => {
      g.__plannerSchemaReady = undefined;
      throw e;
    });
  }
  return g.__plannerSchemaReady;
}

/** Synchronous access to the (already initialised) Drizzle instance.
 *  PostgreSQL can be created lazily on first use; PGlite needs `await ensureSchema()` first. */
function currentDb(): Db {
  if (g.__plannerDriver) return g.__plannerDriver.db;
  const target = dbTarget();
  if (target.kind === "pg") {
    const pool = new Pool({ connectionString: target.url });
    g.__plannerDriver = { kind: "pg", pool, db: drizzlePg(pool) };
    return g.__plannerDriver.db;
  }
  throw new Error("Database not initialised yet — call `await ensureSchema()` at the start of the handler.");
}

/** Drizzle client. Works like a normal NodePgDatabase; resolves the active driver under the hood. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const inst = currentDb();
    const value = Reflect.get(inst, prop, inst);
    return typeof value === "function" ? value.bind(inst) : value;
  },
});

"use client";

/* In-browser PostgreSQL (PGlite, WebAssembly) persisted in IndexedDB.
   Used by the mobile app — there is no server; all data stays on the device.
   PGlite's runtime files are shipped unbundled under /pglite/ (copied by packaging/capacitor/prepare.js)
   and loaded with a native dynamic import so its internal asset URLs resolve correctly. */
import type { PGlite } from "@electric-sql/pglite";
import type { Db } from "@/db/types";
import { BOOTSTRAP_SQL } from "@/db/bootstrap";

export const LOCAL_DB_NAME = "idb://planner";
const PGLITE_RUNTIME_URL = "/pglite/index.js";

type PGliteModule = { PGlite: { create(options: Record<string, unknown>): Promise<PGlite> } };
type Local = { client: PGlite; db: Db };
let instance: Promise<Local> | null = null;

async function create(): Promise<Local> {
  const runtimeUrl = new URL(PGLITE_RUNTIME_URL, window.location.origin).href;
  const [mod, { drizzle }] = await Promise.all([
    import(/* turbopackIgnore: true */ /* webpackIgnore: true */ runtimeUrl) as Promise<PGliteModule>,
    import("drizzle-orm/pglite"),
  ]);
  const client = await mod.PGlite.create({ dataDir: LOCAL_DB_NAME });
  await client.exec(BOOTSTRAP_SQL);
  return { client, db: drizzle(client) as unknown as Db };
}

/** Opens (once) the on-device database and makes sure all tables exist. */
export function getLocalDb(): Promise<Local> {
  if (!instance) {
    instance = create().catch((e) => {
      instance = null;
      throw e;
    });
  }
  return instance;
}

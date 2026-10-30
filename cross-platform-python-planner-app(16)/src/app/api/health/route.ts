import { db, ensureSchema } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* CORS is enabled on this endpoint only, so the mobile shell (which runs on its own
   local origin) can check whether a server address is reachable before connecting. */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET() {
  try {
    await ensureSchema();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, app: "planner", version: "1.1.0" }, { headers: CORS });
  } catch {
    return Response.json({ ok: false, app: "planner" }, { status: 500, headers: CORS });
  }
}

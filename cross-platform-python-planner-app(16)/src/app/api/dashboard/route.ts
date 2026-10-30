import { db, ensureSchema } from "@/db";
import { query, respond } from "@/server/http";
import { getDashboard } from "@/server/services";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureSchema();
  return respond(() => getDashboard(db, query(req).today));
}

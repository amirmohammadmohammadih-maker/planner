import { db, ensureSchema } from "@/db";
import { query, respond } from "@/server/http";
import { seed } from "@/server/services";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureSchema();
  return respond(() => seed(db, query(req).today));
}

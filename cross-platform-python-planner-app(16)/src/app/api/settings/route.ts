import { db, ensureSchema } from "@/db";
import { readJson, respond } from "@/server/http";
import { getSettings, putSettings } from "@/server/services";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSchema();
  return respond(() => getSettings(db));
}

export async function PUT(req: Request) {
  await ensureSchema();
  return respond(async () => putSettings(db, await readJson(req)));
}

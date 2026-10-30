import { db, ensureSchema } from "@/db";
import { readJson, respond } from "@/server/http";
import { ApiError, dataExport, dataImport, dataReset, dataStats } from "@/server/services";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ action: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  await ensureSchema();
  const { action } = await ctx.params;
  if (action === "stats") return respond(() => dataStats(db));
  if (action === "export") {
    try {
      const payload = await dataExport(db);
      const stamp = new Date().toISOString().slice(0, 10);
      return new Response(JSON.stringify(payload, null, 2), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="planner-backup-${stamp}.json"` },
      });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 500 });
    }
  }
  return respond(() => Promise.reject(new ApiError(404, "عملیات نامعتبر")));
}

export async function POST(req: Request, ctx: Ctx) {
  await ensureSchema();
  const { action } = await ctx.params;
  return respond(async () => {
    const body = await readJson(req).catch(() => ({}) as Record<string, unknown>);
    if (action === "reset") return dataReset(db, body);
    if (action === "import") return dataImport(db, body);
    throw new ApiError(404, "عملیات نامعتبر");
  });
}

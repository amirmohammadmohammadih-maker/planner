import { db, ensureSchema } from "@/db";
import { readJson, query, respond } from "@/server/http";
import { createResource, listResource } from "@/server/services";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ resource: string }> };

export async function GET(req: Request, ctx: Ctx) {
  await ensureSchema();
  const { resource } = await ctx.params;
  return respond(() => listResource(db, resource, query(req)));
}

export async function POST(req: Request, ctx: Ctx) {
  await ensureSchema();
  const { resource } = await ctx.params;
  try {
    const body = await readJson(req);
    const { status, body: result } = await createResource(db, resource, body);
    return Response.json(result, { status });
  } catch (e) {
    return respond(() => Promise.reject(e));
  }
}

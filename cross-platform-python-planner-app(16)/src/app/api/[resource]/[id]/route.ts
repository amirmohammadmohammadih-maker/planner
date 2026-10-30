import { db, ensureSchema } from "@/db";
import { readJson, respond } from "@/server/http";
import { deleteResource, getResource, updateResource } from "@/server/services";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ resource: string; id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  await ensureSchema();
  const { resource, id } = await ctx.params;
  return respond(() => getResource(db, resource, Number(id)));
}

export async function PATCH(req: Request, ctx: Ctx) {
  await ensureSchema();
  const { resource, id } = await ctx.params;
  return respond(async () => updateResource(db, resource, Number(id), await readJson(req)));
}

export async function DELETE(_req: Request, ctx: Ctx) {
  await ensureSchema();
  const { resource, id } = await ctx.params;
  return respond(() => deleteResource(db, resource, Number(id)));
}

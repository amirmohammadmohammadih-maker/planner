/* Helpers for Next.js route handlers (server side only). */
import { ApiError } from "@/server/services";

export function query(req: Request): Record<string, string | undefined> {
  return Object.fromEntries(new URL(req.url).searchParams.entries());
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const v = await req.json();
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    throw new ApiError(400, "بدنه نامعتبر");
  }
}

/** Runs a service call and converts results/errors into HTTP responses. */
export async function respond(fn: () => Promise<unknown>, status = 200): Promise<Response> {
  try {
    const result = await fn();
    if (result === undefined) return new Response(null, { status: 204 });
    return Response.json(result, { status });
  } catch (e) {
    if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

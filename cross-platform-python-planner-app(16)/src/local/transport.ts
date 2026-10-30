"use client";

/* Serves `/api/*` requests inside the browser (mobile app) using the on-device database.
   Mirrors the route handlers under src/app/api — same services, no HTTP. */
import { getLocalDb } from "./db";
import {
  ApiError,
  createResource,
  dataExport,
  dataImport,
  dataReset,
  dataStats,
  deleteResource,
  getDashboard,
  getProfile,
  getResource,
  getReview,
  getSettings,
  listResource,
  putProfile,
  putSettings,
  seed,
  updateResource,
  verifyProfilePassword,
} from "@/server/services";

export type LocalResponse = { status: number; body: unknown };

function parseBody(init?: RequestInit & { json?: unknown }): Record<string, unknown> {
  if (init?.json !== undefined) return (init.json ?? {}) as Record<string, unknown>;
  if (typeof init?.body === "string") {
    try {
      return JSON.parse(init.body);
    } catch {
      throw new ApiError(400, "بدنه نامعتبر");
    }
  }
  return {};
}

/** JSON round-trip so results look exactly like they would over HTTP (Dates → ISO strings). */
const plain = (v: unknown) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

export async function localFetch(url: string, init?: RequestInit & { json?: unknown }): Promise<LocalResponse> {
  const u = new URL(url, "http://local");
  const parts = u.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const q = Object.fromEntries(u.searchParams.entries()) as Record<string, string | undefined>;
  const method = (init?.method ?? "GET").toUpperCase();
  const { db } = await getLocalDb();

  const run = async (): Promise<LocalResponse> => {
    const [head, second] = parts;
    if (!head || head === "health") return { status: 200, body: { ok: true, app: "planner", local: true } };

    if (head === "dashboard") return { status: 200, body: await getDashboard(db, q.today) };
    if (head === "review") return { status: 200, body: await getReview(db, q.weekStart) };
    if (head === "seed") return { status: 200, body: await seed(db, q.today) };

    if (head === "settings") {
      if (method === "PUT") return { status: 200, body: await putSettings(db, parseBody(init)) };
      return { status: 200, body: await getSettings(db) };
    }
    if (head === "profile") {
      if (method === "PUT") return { status: 200, body: await putProfile(db, parseBody(init)) };
      if (method === "POST") return { status: 200, body: await verifyProfilePassword(db, parseBody(init).password as string | undefined) };
      return { status: 200, body: await getProfile(db) };
    }
    if (head === "data") {
      if (second === "stats") return { status: 200, body: await dataStats(db) };
      if (second === "export") return { status: 200, body: await dataExport(db) };
      if (second === "reset" && method === "POST") return { status: 200, body: await dataReset(db, parseBody(init)) };
      if (second === "import" && method === "POST") return { status: 200, body: await dataImport(db, parseBody(init)) };
      throw new ApiError(404, "عملیات نامعتبر");
    }

    /* generic resources: /api/<resource>[/<id>] */
    const resource = head;
    if (second !== undefined) {
      const id = Number(second);
      if (method === "PATCH") return { status: 200, body: await updateResource(db, resource, id, parseBody(init)) };
      if (method === "DELETE") {
        await deleteResource(db, resource, id);
        return { status: 204, body: undefined };
      }
      return { status: 200, body: await getResource(db, resource, id) };
    }
    if (method === "POST") return await createResource(db, resource, parseBody(init));
    return { status: 200, body: await listResource(db, resource, q) };
  };

  const res = await run();
  return { status: res.status, body: plain(res.body) };
}

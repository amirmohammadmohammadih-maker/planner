import { db, ensureSchema } from "@/db";
import { readJson, respond } from "@/server/http";
import { getProfile, putProfile, verifyProfilePassword } from "@/server/services";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSchema();
  return respond(() => getProfile(db));
}

/** Create/update the local profile. body: { name, email?, phone?, bio?, newPassword?, currentPassword?, removePassword? } */
export async function PUT(req: Request) {
  await ensureSchema();
  return respond(async () => putProfile(db, await readJson(req)));
}

/** Verify the password (used by destructive actions). body: { password } */
export async function POST(req: Request) {
  await ensureSchema();
  return respond(async () => {
    const body = await readJson(req).catch(() => ({}) as Record<string, unknown>);
    return verifyProfilePassword(db, body.password as string | undefined);
  });
}

import { cookies, headers } from "next/headers";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { documents, users } from "@/db/schema";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** Loads (or lazily creates) the workspace row for a known id and applies retention. */
async function resolveWorkspace(id: string) {
  const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (existing[0]) {
    const cutoff = new Date(Date.now() - existing[0].retentionDays * 86400000);
    await db.delete(documents).where(and(eq(documents.userId, id), lt(documents.uploadTimestamp, cutoff)));
    return existing[0];
  }
  const inserted = await db.insert(users).values({ id, email: `private-${id.slice(0, 8)}@workspace.local` }).onConflictDoNothing().returning();
  if (inserted[0]) return inserted[0];
  const retry = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!retry[0]) throw new Error("Could not initialise workspace.");
  return retry[0];
}

/**
 * Resolves the current private workspace.
 *
 * Order of precedence: request header (sent by the client or set by proxy.ts) →
 * workspace cookie → optional explicit fallback id.
 */
export async function getWorkspace(fallbackId?: string) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const headerId = headerStore.get("x-feeshield-workspace");
  const cookieId = cookieStore.get("feeshield_workspace")?.value;
  const id = UUID_RE.test(headerId ?? "") ? headerId : UUID_RE.test(cookieId ?? "") ? cookieId : UUID_RE.test(fallbackId ?? "") ? fallbackId : null;
  if (!id) throw new Error("A valid private workspace session is required.");
  return resolveWorkspace(id);
}

/**
 * Resolves an explicit workspace id. Used as a secondary lookup for deep links
 * (`/analysis/{id}?w={workspaceId}`) so a saved report stays reachable in
 * cookie-restricted browsers instead of appearing to have been deleted.
 */
export async function getWorkspaceById(id: string) {
  if (!UUID_RE.test(id)) throw new Error("A valid private workspace session is required.");
  return resolveWorkspace(id);
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { documents, users } from "@/db/schema";
import { getWorkspace, jsonError } from "@/lib/workspace";

export async function PATCH(request: Request) {
  try {
    const user = await getWorkspace(); const body = await request.json() as { retentionDays?: number; storeEvidence?: boolean };
    const retentionDays = body.retentionDays ?? user.retentionDays;
    if (![30, 90, 365, 3650].includes(retentionDays)) return jsonError("Choose a supported retention period.");
    const storeEvidence = typeof body.storeEvidence === "boolean" ? body.storeEvidence : user.storeEvidence;
    const [updated] = await db.update(users).set({ retentionDays, storeEvidence }).where(eq(users.id, user.id)).returning();
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    await db.delete(documents).where(and(eq(documents.userId, user.id), lt(documents.uploadTimestamp, cutoff)));
    return Response.json({ retentionDays: updated.retentionDays, storeEvidence: updated.storeEvidence });
  } catch { return jsonError("Settings could not be saved.", 500); }
}

export async function DELETE() {
  try {
    const user = await getWorkspace();
    const deleted = await db.delete(documents).where(eq(documents.userId, user.id)).returning({ id: documents.id });
    await db.update(users).set({ retentionDays: 90, storeEvidence: true }).where(eq(users.id, user.id));
    return Response.json({ deletedDocuments: deleted.length });
  } catch { return jsonError("Workspace data could not be deleted.", 500); }
}

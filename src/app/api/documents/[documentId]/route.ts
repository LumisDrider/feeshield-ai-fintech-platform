import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { getWorkspace, jsonError } from "@/lib/workspace";

async function owned(documentId: string, userId: string) {
  const [document] = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, userId))).limit(1);
  return document;
}

export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await params;
    const user = await getWorkspace();
    const document = await owned(documentId, user.id);
    if (!document) return jsonError("Document not found in this workspace.", 404);
    return Response.json({ ...document, pendingText: undefined, uploadTimestamp: document.uploadTimestamp.toISOString() });
  } catch { return jsonError("Could not load document.", 500); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await params;
    const user = await getWorkspace();
    const document = await owned(documentId, user.id);
    if (!document) return jsonError("Document not found in this workspace.", 404);
    await db.delete(documents).where(and(eq(documents.id, documentId), eq(documents.userId, user.id)));
    return Response.json({ deleted: true, documentId });
  } catch { return jsonError("Document could not be deleted.", 500); }
}

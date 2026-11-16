import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { comparisons } from "@/db/schema";
import { getWorkspace, jsonError } from "@/lib/workspace";

export async function GET(_request: Request, { params }: { params: Promise<{ comparisonId: string }> }) {
  try {
    const { comparisonId } = await params; const user = await getWorkspace();
    const [comparison] = await db.select().from(comparisons).where(and(eq(comparisons.id, comparisonId), eq(comparisons.userId, user.id))).limit(1);
    if (!comparison) return jsonError("Comparison not found in this workspace.", 404);
    return Response.json({ ...comparison, createdAt: comparison.createdAt.toISOString() });
  } catch { return jsonError("Could not load comparison.", 500); }
}

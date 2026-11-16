import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, status: "healthy", database: "connected", engine: "1.0.0", aiConfigured: Boolean(process.env.AI_API_KEY) });
  } catch {
    return Response.json({ ok: false, status: "degraded", database: "unavailable" }, { status: 500 });
  }
}

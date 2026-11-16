import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(process.env.PYTHON_BINARY || "python3", ["-m", "backend.evaluation.evaluate"], { cwd: process.cwd() });
      let stdout = "", stderr = "";
      const timer = setTimeout(() => { child.kill(); reject(new Error("Evaluation timed out")); }, 15000);
      child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("error", reject); child.on("close", (code) => { clearTimeout(timer); if (code === 0) resolve(stdout); else reject(new Error(stderr || "Evaluation failed")); });
    });
    return Response.json(JSON.parse(output), { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "The evaluation script could not run in this environment." }, { status: 500 }); }
}

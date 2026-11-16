import { spawn } from "node:child_process";
import type { AnalysisResult, ComparisonResult } from "@/lib/types";

export interface EngineEvent {
  type: "stage" | "result" | "error";
  stage?: string;
  message?: string;
  result?: unknown;
  error?: string;
}

export async function runEngine<T = AnalysisResult | ComparisonResult>(
  mode: "analyze" | "compare",
  payload: unknown,
  onEvent?: (event: EngineEvent) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.PYTHON_BINARY || "python3", ["-u", "-m", "backend.app.cli", mode], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let buffer = "";
    let stderr = "";
    let finalResult: T | undefined;
    let engineError: string | undefined;
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("The analysis engine timed out. Try a shorter document or pasted text."));
    }, 90000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line) as EngineEvent;
          onEvent?.(event);
          if (event.type === "result") finalResult = event.result as T;
          if (event.type === "error") engineError = event.error || "Analysis engine failed.";
        } catch {
          engineError = "The analysis engine returned an unreadable response.";
        }
      }
    });
    child.stderr.on("data", (chunk) => { stderr = (stderr + String(chunk)).slice(-1500); });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(new Error(`Python analysis runtime could not start: ${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (finalResult) resolve(finalResult);
      else reject(new Error(engineError || (code === 0 ? "The engine returned no report." : "Analysis failed. Check the document and Python runtime.") + (stderr && !engineError ? " Runtime detail was logged server-side." : "")));
    });
    child.stdin.on("error", () => { /* handled by process close */ });
    child.stdin.end(JSON.stringify(payload));
  });
}

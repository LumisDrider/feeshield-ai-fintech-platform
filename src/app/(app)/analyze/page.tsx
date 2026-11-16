"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowRight, Check, ChevronDown, CircleDashed, Download, FileText, FlaskConical,
  GitCompareArrows, History, Loader2, LockKeyhole, RotateCcw, ScanText, ShieldCheck, Sparkles,
  Trash2, Type, UploadCloud, X,
} from "lucide-react";
import demos from "@/data/demo-contracts.json";
import { getWorkspaceId, rememberWorkspace, workspaceHeaders } from "@/lib/session";
import type { AnalysisResult } from "@/lib/types";

/** Matches the server-side workspace errors that mean the stored document is
 *  unreachable under the current session identity. */
function isWorkspaceMismatch(message: string) {
  return /not found in this workspace|no longer available|private workspace session/i.test(message);
}

/** Report / report-PDF URL. Carries the workspace id when cookies may be
 *  unavailable so a finished report always stays reachable. */
function reportUrl(base: string, id: string, suffix = "") {
  const workspaceId = getWorkspaceId();
  return `${base}/${id}${suffix}${workspaceId ? `?w=${workspaceId}` : ""}`;
}

type Mode = "file" | "raw";
type Phase = "idle" | "extracting" | "analysing" | "opening";
type StageId = "uploading" | "extracting" | "preparing" | "identifying" | "classifying" | "calculating" | "finalising";

const FILE_STAGES: Array<{ id: StageId; label: string; hint: string }> = [
  { id: "uploading", label: "Uploading file", hint: "Validating file type, signature, and size" },
  { id: "extracting", label: "Extracting text from file", hint: "Reading PDF, Word, plain text, or running OCR" },
  { id: "identifying", label: "Identifying financial clauses", hint: "Locating rates, fees, and obligations" },
  { id: "classifying", label: "Classifying fees and conditions", hint: "Applying hybrid clause classification" },
  { id: "calculating", label: "Calculating potential costs", hint: "Running deterministic financial models" },
  { id: "finalising", label: "Generating the final report", hint: "Linking risks, evidence, and recommendations" },
];

const RAW_STAGES: Array<{ id: StageId; label: string; hint: string }> = [
  { id: "preparing", label: "Reading agreement text", hint: "Checking text length and preparing clauses" },
  { id: "identifying", label: "Identifying financial clauses", hint: "Locating rates, fees, and obligations" },
  { id: "classifying", label: "Classifying fees and conditions", hint: "Applying hybrid clause classification" },
  { id: "calculating", label: "Calculating potential costs", hint: "Running deterministic financial models" },
  { id: "finalising", label: "Generating the final report", hint: "Linking risks, evidence, and recommendations" },
];

const ACCEPTED_EXTENSIONS = /\.(pdf|docx|txt|md|rtf|csv|png|jpe?g|webp)$/i;
const ACCEPT_ATTR = ".pdf,.docx,.txt,.md,.rtf,.csv,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,application/rtf,image/png,image/jpeg,image/webp";
const MIN_DWELL = 300;
const FLUSH_DWELL = 90;

function formatMoney(value: number | null, currency: string | null | undefined) {
  if (value === null || value === undefined) return "Not available";
  try { return new Intl.NumberFormat("en", { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(value); }
  catch { return `${value.toLocaleString()} ${currency ?? ""}`; }
}

export default function AnalyzePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const analysisIdRef = useRef("");
  const autoNavRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);
  const lastAdvance = useRef(0);

  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [selectedDemoId, setSelectedDemoId] = useState("");
  const [dragging, setDragging] = useState(false);

  // Extracted file state
  const [documentId, setDocumentId] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [extractionMethod, setExtractionMethod] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [ocrUsed, setOcrUsed] = useState(false);
  const [aiExtractionUsed, setAiExtractionUsed] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Processing state
  const [phase, setPhase] = useState<Phase>("idle");
  const [targetIndex, setTargetIndex] = useState(-1);
  const [displayIndex, setDisplayIndex] = useState(-1);
  const [stageMessage, setStageMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  // Usable completion payload
  const [completed, setCompleted] = useState<{ analysisId: string; result: AnalysisResult } | null>(null);

  const stages = mode === "file" ? FILE_STAGES : RAW_STAGES;
  const lastIndex = stages.length - 1;
  const running = phase === "extracting" || phase === "analysing";
  const busy = running || phase === "opening";
  const selectedDemo = demos.find((item) => item.id === selectedDemoId) ?? null;

  /* Paced, monotonic stage display: server events set the target; the UI advances smoothly. */
  useEffect(() => {
    const goal = phase === "opening" ? lastIndex + 1 : targetIndex;
    if (displayIndex >= goal) return;
    const dwell = phase === "opening" ? FLUSH_DWELL : Math.max(110, MIN_DWELL - (performance.now() - lastAdvance.current));
    const timer = setTimeout(() => {
      lastAdvance.current = performance.now();
      setDisplayIndex((value) => value + 1);
    }, dwell);
    return () => clearTimeout(timer);
  }, [displayIndex, targetIndex, phase, lastIndex]);

  /* When the rail has fully flushed, auto-open the finished report once. */
  useEffect(() => {
    if (phase !== "opening" || displayIndex <= lastIndex || !completed) return;
    autoNavRef.current = setTimeout(() => {
      router.push(reportUrl("/analysis", completed.analysisId));
    }, 1500);
    return () => { if (autoNavRef.current) clearTimeout(autoNavRef.current); };
  }, [phase, displayIndex, lastIndex, completed, router]);

  useEffect(() => {
    if (!running) return;
    startedAt.current = performance.now();
    const timer = setInterval(() => setElapsed((performance.now() - startedAt.current) / 1000), 100);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (autoNavRef.current) clearTimeout(autoNavRef.current);
  }, []);

  const resetProgress = useCallback(() => {
    setPhase("idle");
    setTargetIndex(-1);
    setDisplayIndex(-1);
    setStageMessage("");
    setElapsed(0);
    setCompleted(null);
    analysisIdRef.current = "";
  }, []);

  const clearExtractedFile = useCallback(() => {
    setDocumentId("");
    setExtractedText("");
    setExtractionMethod("");
    setPageCount(null);
    setWordCount(0);
    setOcrUsed(false);
    setAiExtractionUsed(false);
    resetProgress();
  }, [resetProgress]);

  const switchMode = useCallback((next: Mode) => {
    if (busy) return;
    if (autoNavRef.current) clearTimeout(autoNavRef.current);
    setMode(next);
    setError("");
    if (next === "raw") resetProgress();
  }, [busy, resetProgress]);

  /* ---- Streamed financial analysis (extracted file OR direct raw text) ---- */
  const runAnalysis = useCallback(async (
    payload: { documentId: string } | { rawText: string; title?: string },
    activeMode: Mode,
    preparedDisplayIndex?: number,
    /** Text already extracted from the file, used to self-heal if the stored
     *  document becomes unreachable under a different session identity. */
    fallbackText?: string,
  ) => {
    const activeStages = activeMode === "file" ? FILE_STAGES : RAW_STAGES;
    const findIndex = (id: StageId) => activeStages.findIndex((item) => item.id === id);

    setError("");
    setCompleted(null);
    setPhase("analysing");
    analysisIdRef.current = "";
    const controller = new AbortController();
    abortRef.current = controller;

    if (activeMode === "raw") {
      setDisplayIndex(0);
      setTargetIndex(0);
      setStageMessage("Reading your agreement text…");
    } else {
      // Continue smoothly from the extraction phase into clause analysis.
      setDisplayIndex(preparedDisplayIndex ?? 1);
      setTargetIndex(findIndex("identifying"));
      setStageMessage("Text extracted — analysing financial clauses…");
    }

    try {
      const response = await fetch("/api/documents/analyze", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...workspaceHeaders() },
        body: JSON.stringify(payload),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Analysis could not start.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: { type: string; stage?: string; message?: string; error?: string; analysisId?: string; workspaceId?: string; result?: AnalysisResult };
          try { event = JSON.parse(line); } catch { continue; }
          if (event.type === "stage" && event.stage) {
            const index = findIndex(event.stage as StageId);
            if (index < 0) continue;
            setStageMessage(event.message ?? "");
            setTargetIndex((current) => Math.max(current, index));
          } else if (event.type === "error") {
            throw new Error(event.error || "The analysis engine reported an error.");
          } else if (event.type === "result" && event.analysisId && event.result) {
            rememberWorkspace(event.workspaceId);
            analysisIdRef.current = event.analysisId;
            setCompleted({ analysisId: event.analysisId, result: event.result });
            setTargetIndex(activeStages.length - 1);
            setStageMessage("Report saved with linked source evidence");
          }
        }
      }

      if (!analysisIdRef.current) throw new Error("The analysis finished without returning a report.");
      setPhase("opening");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed.";

      // Self-heal: if the uploaded document can no longer be located under this
      // session (e.g. cookies were dropped between requests) but we still hold
      // the extracted text, analyse that text directly instead of dead-ending.
      if (fallbackText && fallbackText.trim().length >= 40 && isWorkspaceMismatch(message)) {
        setStageMessage("Re-establishing your session and continuing the analysis…");
        await runAnalysis({ rawText: fallbackText }, activeMode, preparedDisplayIndex);
        return;
      }

      if (err instanceof DOMException && err.name === "AbortError") {
        setError(activeMode === "file"
          ? "Analysis cancelled. Your extracted file text is saved — press the button again to resume."
          : "Analysis cancelled. Your agreement text is still here whenever you're ready.");
      } else {
        setError(message);
      }
      setPhase("idle");
    }
  }, []);

  /* ---- ONE ACTION: upload file → extract text → analyse, no second click ---- */
  const runFilePipeline = useCallback(async (selected: File) => {
    setError("");
    setCompleted(null);
    setPhase("extracting");
    setDisplayIndex(0);
    setTargetIndex(1);
    setStageMessage("Uploading file and extracting readable agreement text…");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const form = new FormData();
      form.append("file", selected);
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
        signal: controller.signal,
        headers: { ...workspaceHeaders() },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not extract text from this file.");

      const textValue = typeof data.extractedText === "string" ? data.extractedText : (data.preview ?? "");
      rememberWorkspace(data.workspaceId);
      setDocumentId(data.document.id);
      setExtractedText(textValue);
      setExtractionMethod(data.extractionMethod ?? "File text");
      setPageCount(data.pageCount ?? 1);
      setWordCount(data.wordCount ?? (textValue.trim() ? textValue.trim().split(/\s+/).length : 0));
      setOcrUsed(Boolean(data.ocrUsed));
      setAiExtractionUsed(Boolean(data.aiUsed));
      setShowPreview(true);

      // Immediately continue into analysis — no intermediate "ready" click.
      // The extracted text is passed so the run can self-heal if the stored
      // document becomes unreachable under a different session identity.
      await runAnalysis({ documentId: data.document.id }, "file", 1, textValue);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(documentId ? "Extraction cancelled. Press the button again to resume." : "Extraction cancelled.");
      } else {
        setError(err instanceof Error ? err.message : "Could not extract text from this file.");
      }
      setPhase("idle");
    }
  }, [documentId, runAnalysis]);

  const chooseFile = useCallback((selected?: File) => {
    if (!selected || busy) return;
    abortRef.current?.abort();
    clearExtractedFile();
    setFile(selected);
    setError("");
    if (!ACCEPTED_EXTENSIONS.test(selected.name)) {
      setError("Unsupported file type. Upload a PDF, Word (.docx), TXT, MD, RTF, or contract image (PNG/JPG/WEBP).");
      return;
    }
    if (selected.size > 8 * 1024 * 1024) {
      setError("This file is larger than the 8 MB limit.");
      return;
    }
    void runFilePipeline(selected);
  }, [busy, clearExtractedFile, runFilePipeline]);

  const removeFile = useCallback(async () => {
    abortRef.current?.abort();
    if (autoNavRef.current) clearTimeout(autoNavRef.current);
    if (documentId) await fetch(`/api/documents/${documentId}`, { method: "DELETE", headers: { ...workspaceHeaders() } }).catch(() => undefined);
    setFile(null);
    clearExtractedFile();
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }, [clearExtractedFile, documentId]);

  const start = useCallback(async () => {
    setError("");
    if (mode === "raw") {
      if (rawText.trim().length < 40) {
        setError("Paste or type at least 40 characters of agreement text.");
        return;
      }
      await runAnalysis({ rawText, title: selectedDemo?.title }, "raw");
      return;
    }
    // File mode: if text was already extracted (e.g. after a cancel), resume directly.
    if (documentId && extractedText.trim().length >= 40) {
      await runAnalysis({ documentId }, "file", 1);
      return;
    }
    if (!file) {
      setError("Choose a file first, or switch to Raw agreement text.");
      return;
    }
    await runFilePipeline(file);
  }, [documentId, extractedText, file, mode, rawText, runAnalysis, runFilePipeline, selectedDemo]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const loadDemo = useCallback((id: string) => {
    const demo = demos.find((item) => item.id === id);
    if (!demo) return;
    abortRef.current?.abort();
    if (autoNavRef.current) clearTimeout(autoNavRef.current);
    resetProgress();
    setError("");
    setMode("raw");
    setRawText(demo.text);
    setSelectedDemoId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [resetProgress]);

  const resetAll = useCallback(() => {
    abortRef.current?.abort();
    if (autoNavRef.current) clearTimeout(autoNavRef.current);
    void removeFile();
    setRawText("");
    setSelectedDemoId("");
    setError("");
  }, [removeFile]);

  const rawWordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
  const extractedWordCount = extractedText.trim() ? extractedText.trim().split(/\s+/).length : wordCount;
  const showProgressCard = phase !== "idle";

  const progressPercent = phase === "idle"
    ? 0
    : phase === "opening"
      ? 100
      : Math.min(96, ((Math.max(0, displayIndex) + 0.5) / stages.length) * 100);

  const railFillPercent = phase === "opening" ? 100 : displayIndex <= 0 ? 0 : Math.min(100, (displayIndex / lastIndex) * 100);

  const canStart = !busy && (
    mode === "raw"
      ? rawText.trim().length >= 40
      : (Boolean(documentId) && extractedText.trim().length >= 40) || Boolean(file)
  );

  const primaryLabel = phase === "opening"
    ? "Report ready"
    : phase === "extracting"
      ? "Uploading & extracting…"
      : phase === "analysing"
        ? "Analysing clauses…"
        : mode === "raw"
          ? "Analyse agreement text"
          : documentId
            ? "Analyse extracted text"
            : "Analyse file";

  const result = completed?.result;
  const concernCount = result ? result.risks.filter((risk) => risk.level !== "LOW").length : 0;

  return (
    <div className="mx-auto max-w-[1200px]">
      <header className="fade-up">
        <p className="eyebrow">Document analysis workspace</p>
        <h1 className="mt-2 text-[27px] font-semibold tracking-[-.035em] text-ink sm:text-[33px]">What would you like to understand?</h1>
        <p className="mt-2 max-w-[740px] text-[12.5px] leading-6 text-muted">
          Drop an agreement file and it is uploaded, converted to text (OCR for scans), and analysed in one continuous action — or paste raw agreement text directly.
        </p>
      </header>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_336px]">
        <div className="space-y-5">
          {/* Input Card */}
          <section className="surface overflow-hidden">
            <div className="grid grid-cols-2 gap-2 border-b border-line bg-surface-2/60 p-2.5 sm:flex sm:items-center sm:gap-2 sm:px-4">
              {([
                { key: "file" as const, label: "Upload a file", sub: "PDF, Word, TXT, scan — one click", icon: UploadCloud },
                { key: "raw" as const, label: "Raw agreement text", sub: "Paste text only — no file", icon: Type },
              ]).map(({ key, label, sub, icon: Icon }) => {
                const active = mode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={busy}
                    onClick={() => switchMode(key)}
                    aria-pressed={active}
                    className={`flex items-center gap-2.5 rounded-[11px] border px-3.5 py-2.5 text-left transition-all duration-200 ${active ? "border-brand/40 bg-surface text-ink shadow-[var(--shadow-sm)]" : "border-transparent text-muted hover:bg-surface/60 hover:text-ink"}`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${active ? "bg-brand-soft text-brand" : "bg-surface-3 text-muted"}`}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-bold">{label}</span>
                      <span className="hidden truncate text-[9.5px] text-muted sm:block">{sub}</span>
                    </span>
                  </button>
                );
              })}
              <span className="ml-auto hidden items-center gap-1.5 pr-1 text-[10px] text-muted md:flex"><LockKeyhole size={12} />Private session</span>
            </div>

            <div className="p-4 sm:p-5">
              {mode === "file" ? (
                <>
                  <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="hidden"
                    onChange={(event) => chooseFile(event.target.files?.[0])} />

                  {!file ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => inputRef.current?.click()}
                      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}
                      className={`group flex min-h-[244px] w-full flex-col items-center justify-center rounded-[15px] border-2 border-dashed px-5 text-center transition-all duration-300 ${dragging ? "scale-[1.01] border-brand bg-brand-soft" : "border-line-2 bg-surface-2 hover:border-brand hover:bg-brand-soft/45"}`}
                    >
                      <span className="grid h-14 w-14 place-items-center rounded-[16px] bg-surface text-brand shadow-[var(--shadow-sm)] transition-transform duration-300 group-hover:scale-105">
                        <UploadCloud size={26} />
                      </span>
                      <span className="mt-4 text-[14px] font-bold text-ink">Drop your agreement file here</span>
                      <span className="mt-1.5 max-w-[440px] text-[11.5px] leading-5 text-muted">
                        or <span className="font-bold text-brand-ink underline underline-offset-2">browse your device</span> — text is extracted (OCR for scans) and analysed automatically in one action
                      </span>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                        {["PDF", "Word (.docx)", "TXT / RTF", "Scanned PDF & Image OCR"].map((badge) => (
                          <span key={badge} className="rounded-full border border-line bg-surface px-2.5 py-1 text-[9.5px] font-medium text-muted">{badge}</span>
                        ))}
                      </div>
                      <span className="mt-3 text-[9.5px] text-muted">Maximum 8 MB · up to 80 PDF pages · scanned pages up to 12 are OCR'd</span>
                    </button>
                  ) : (
                    <div className="inset-panel p-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-surface text-ink-soft shadow-[var(--shadow-sm)]">
                          <FileText size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12.5px] font-bold text-ink">{file.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted">
                            <span>{(file.size / 1024).toFixed(1)} KB</span>
                            {pageCount ? <><span aria-hidden>·</span><span>{pageCount} page{pageCount === 1 ? "" : "s"}</span></> : null}
                            {extractedText && <><span aria-hidden>·</span><span>{extractedWordCount.toLocaleString()} words extracted</span></>}
                          </div>
                        </div>
                        {phase === "extracting" ? (
                          <span className="chip !border-brand/30 !bg-brand-soft !text-brand-ink">
                            <Loader2 size={12} className="spin-slow" />Extracting…
                          </span>
                        ) : documentId ? (
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand" title="Text extracted">
                            <Check size={15} strokeWidth={3} />
                          </span>
                        ) : null}
                        {!busy && (
                          <button type="button" onClick={() => void removeFile()} className="btn-ghost !min-h-9 !p-2 hover:!text-red-ink" aria-label="Remove file">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {documentId && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[10px]">
                          <span className="inline-flex items-center gap-1.5 font-bold text-brand-ink">
                            <Check size={13} />Text extracted from file
                          </span>
                          <span className="chip !py-0.5 !text-[9px]">{extractionMethod}</span>
                          {aiExtractionUsed && <span className="chip !border-brand/30 !bg-brand-soft !py-0.5 !text-[9px] !text-brand-ink"><Sparkles size={10} />AI Vision</span>}
                          {ocrUsed && !aiExtractionUsed && <span className="chip !border-amber/30 !bg-amber-soft !py-0.5 !text-[9px] !text-amber-ink">OCR applied</span>}
                          <span className="ml-auto text-muted">{extractedText.length.toLocaleString()} chars</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Raw agreement text mode — ZERO file upload or .txt filename required */
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="label !mb-0" htmlFor="raw-agreement-text">Agreement text</label>
                    <div className="flex items-center gap-2 text-[10px] text-muted">
                      <span>{rawWordCount.toLocaleString()} words · {rawText.length.toLocaleString()} / 180,000 chars</span>
                      {rawText.length > 0 && !busy && (
                        <button
                          type="button"
                          onClick={() => { setRawText(""); setSelectedDemoId(""); setError(""); resetProgress(); }}
                          className="rounded-md px-1.5 py-0.5 font-semibold text-muted transition-colors hover:bg-surface-3 hover:text-ink"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 text-[10.5px] leading-5 text-muted">
                    Paste or type your loan, credit card, or banking agreement directly below. No file upload is needed.
                  </p>
                  <textarea
                    id="raw-agreement-text"
                    disabled={busy}
                    value={rawText}
                    onChange={(event) => {
                      setRawText(event.target.value);
                      if (selectedDemoId) setSelectedDemoId("");
                      if (error) setError("");
                    }}
                    placeholder="Paste your agreement text here — including principal amount, interest rates, duration, fees, insurance, and penalty clauses…"
                    className="field scrollbar-thin mt-3 min-h-[285px] resize-y !font-mono !text-[11px] !leading-6"
                  />
                  {selectedDemo && (
                    <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-amber/30 bg-amber-soft px-3 py-2 text-[10px] font-semibold text-amber-ink">
                      <FlaskConical size={14} className="shrink-0" />
                      <span>Synthetic demo loaded ({selectedDemo.title}) — not a real financial offer.</span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div role="alert" className="fade-up mt-4 flex items-start gap-2.5 rounded-[11px] border border-red/30 bg-red-soft p-3.5 text-[11px] leading-5 text-red-ink">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button type="button" onClick={() => setError("")} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss error"><X size={14} /></button>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
                <p className="text-[10px] leading-4 text-muted">
                  {mode === "file" && documentId
                    ? "Text extracted — the analysis runs automatically; you can resume here if interrupted."
                    : "Educational estimate — not financial or legal advice."}
                </p>
                <div className="flex items-center gap-2 sm:ml-auto">
                  {running && (
                    <button type="button" onClick={cancel} className="btn-secondary !min-h-10 !text-[11.5px]">
                      <X size={14} />Cancel
                    </button>
                  )}
                  {phase !== "opening" && (
                    <button type="button" onClick={() => void start()} disabled={!canStart} className="btn-primary !min-h-10 !px-5 !text-[12px]">
                      {running ? <Loader2 size={15} className="spin-slow" /> : <ScanText size={15} />}
                      {primaryLabel}
                      {!running && <ArrowRight size={14} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Processing Rail & (in File Mode) Extracted Text Inspector */}
          {(showProgressCard || (mode === "file" && extractedText)) && (
            <section className={`grid gap-5 ${mode === "file" ? "lg:grid-cols-2" : "grid-cols-1"}`}>
              {showProgressCard && (
                <div className="surface fade-up p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[12.5px] font-bold text-ink">
                      {mode === "file" ? "Extraction & analysis pipeline" : "Agreement analysis pipeline"}
                    </h2>
                    <div className="flex items-center gap-2 text-[10px] font-semibold">
                      {running ? (
                        <span className="flex items-center gap-1.5 text-brand"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />Live</span>
                      ) : phase === "opening" ? (
                        <span className="text-brand">Complete</span>
                      ) : null}
                      {elapsed > 0 && <span className="tabular text-muted">{elapsed.toFixed(1)}s</span>}
                    </div>
                  </div>

                  <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-brand transition-[width] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ width: `${progressPercent}%` }} />
                  </div>

                  <ol className="stage-rail mt-5">
                    <span className="rail-fill" style={{ ["--rail-progress" as string]: `${railFillPercent}%` }} aria-hidden="true" />
                    {stages.map((stage, index) => {
                      const state = phase === "opening" ? "done" : index < displayIndex ? "done" : index === displayIndex ? "active" : "waiting";
                      return (
                        <li key={stage.id} className="relative flex gap-3 py-[7px]">
                          <span className={`stage-dot z-[1] mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[9px] font-bold ${state === "done" ? "border-brand bg-brand text-surface" : state === "active" ? "stage-active border-brand bg-brand-soft text-brand-ink" : "border-line-2 bg-surface text-muted"}`}>
                            {state === "done" ? <Check size={12} strokeWidth={3.2} /> : state === "active" ? <Loader2 size={12} className="spin-slow" /> : <CircleDashed size={12} />}
                          </span>
                          <span className="min-w-0 flex-1 pt-0.5">
                            <span className={`block text-[11.5px] font-semibold transition-colors ${state === "waiting" ? "text-muted" : "text-ink"}`}>{stage.label}</span>
                            {state === "active" && stageMessage && <span className="mt-0.5 block text-[10px] leading-4 text-brand-ink">{stageMessage}</span>}
                            {state === "waiting" && <span className="mt-0.5 block text-[9.5px] leading-4 text-muted/80">{stage.hint}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ol>

                  <p className="mt-3 border-t border-line pt-3 text-[9.5px] leading-4 text-muted">
                    Every stage advances only when the server confirms it. The file is uploaded, converted to text, and analysed automatically — keep this tab open while processing.
                  </p>
                </div>
              )}

              {mode === "file" && (
                <div className="surface fade-up overflow-hidden">
                  <div className="flex items-center gap-2 p-4 sm:p-5">
                    <button type="button" onClick={() => setShowPreview((value) => !value)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={showPreview}>
                      <FileText size={15} className="shrink-0 text-brand" />
                      <h2 className="truncate text-[12.5px] font-bold text-ink">Extracted text from file</h2>
                      <span className="chip !py-0.5 !text-[9px]">{extractedText ? `${extractedWordCount.toLocaleString()} words` : "extracting…"}</span>
                      <ChevronDown size={15} className={`ml-auto shrink-0 text-muted transition-transform duration-300 ${showPreview ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {showPreview && (
                    <div className="border-t border-line">
                      <pre className="scrollbar-thin max-h-[340px] overflow-auto whitespace-pre-wrap break-words bg-surface-2 p-4 font-mono text-[9.5px] leading-5 text-ink-soft">
                        {extractedText ? extractedText.slice(0, 15000) : "Extracting readable text from your uploaded file…"}
                      </pre>
                      <div className="border-t border-line px-4 py-2 text-[9px] text-muted">
                        {extractedText.length > 15000
                          ? `Showing first 15,000 of ${extractedText.length.toLocaleString()} extracted characters. Full text is analysed.`
                          : "Full extracted text is used for financial clause analysis."}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="surface p-5">
            <div className="flex items-center gap-2">
              <FlaskConical size={16} className="text-brand" />
              <h2 className="text-[12.5px] font-bold text-ink">Try a synthetic agreement</h2>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-muted">Loads directly into Raw agreement text and runs through the same live analysis engine.</p>
            <div className="mt-4 space-y-2">
              {demos.map((demo) => (
                <button key={demo.id} type="button" onClick={() => loadDemo(demo.id)} disabled={busy}
                  className={`group w-full rounded-[12px] border p-3 text-left transition-all duration-250 ${selectedDemoId === demo.id ? "border-brand bg-brand-soft" : "border-line bg-surface-2 hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-[var(--shadow-sm)]"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-ink">{demo.title}</span>
                    <ArrowRight size={12} className="ml-auto text-muted transition-transform duration-250 group-hover:translate-x-0.5 group-hover:text-brand" />
                  </div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-wide text-brand">{demo.subtitle}</div>
                  <p className="mt-1.5 text-[9.5px] leading-[1.55] text-muted">{demo.description}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[16px] border border-brand/25 bg-brand-soft p-5">
            <ShieldCheck size={18} className="text-brand" />
            <h2 className="mt-3 text-[12px] font-bold text-brand-ink">What happens to your agreement?</h2>
            <ul className="mt-3 space-y-2 text-[10px] leading-5 text-ink-soft">
              <li>• Files are validated and converted to text server-side.</li>
              <li>• Scanned PDFs and photos are OCR'd automatically.</li>
              <li>• Raw agreement text is analysed directly—no file needed.</li>
              <li>• Delete any saved report at any time from History.</li>
            </ul>
            <Link href="/history" className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-ink hover:underline"><History size={13} />View history</Link>
          </section>
        </aside>
      </div>

      {/* ---- Usable completion card: appears the moment the report is saved ---- */}
      {phase === "opening" && result && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#04101b]/55 p-4 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-labelledby="report-ready-title">
          <div className="fade-up w-full max-w-[560px] rounded-[20px] border border-line bg-surface p-6 shadow-[var(--shadow-lg)] sm:p-7">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-brand-soft text-brand"><Check size={22} strokeWidth={2.6} /></span>
              <div>
                <h2 id="report-ready-title" className="text-[18px] font-semibold tracking-[-.02em] text-ink">Your report is ready</h2>
                <p className="mt-1 text-[10.5px] leading-5 text-muted">
                  {result.general.institution || "Institution not identified"} · {result.general.contractType} · opening automatically…
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {[
                ["Principal", formatMoney(result.general.principal, result.general.currency)],
                ["Annual interest", result.general.annualInterestRate !== null ? `${result.general.annualInterestRate}%` : "Not stated"],
                ["Clauses found", String(result.terms.length)],
                ["Concerns", String(concernCount)],
                ["Est. extra cost", formatMoney(result.costs.additionalCost, result.costs.currency)],
                ["Est. total", formatMoney(result.costs.totalEstimatedRepayment, result.costs.currency)],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-[11px] border border-line bg-surface-2 p-3">
                  <div className="text-[8.5px] font-bold uppercase tracking-[.07em] text-muted">{label as string}</div>
                  <div className="tabular mt-1.5 truncate text-[13px] font-bold text-ink" title={String(value)}>{value}</div>
                </div>
              ))}
            </div>

            <p className="mt-4 rounded-[10px] border border-line bg-surface-2 p-3 text-[10px] leading-5 text-ink-soft">{result.summary}</p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => { if (autoNavRef.current) clearTimeout(autoNavRef.current); router.push(reportUrl("/analysis", completed!.analysisId)); }}
                className="btn-primary !min-h-10 !px-3 !text-[10.5px]"
              >
                Open report <ArrowRight size={13} />
              </button>
              <a href={reportUrl("/api/reports", completed!.analysisId, "/pdf")} className="btn-secondary !min-h-10 !px-3 !text-[10.5px]"><Download size={13} />PDF</a>
              <Link href={`/compare?a=${completed!.analysisId}`} className="btn-secondary !min-h-10 !px-3 !text-[10.5px]"><GitCompareArrows size={13} />Compare</Link>
              <button type="button" onClick={resetAll} className="btn-ghost border border-line !min-h-10 !px-3 !text-[10.5px]"><RotateCcw size={13} />New</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

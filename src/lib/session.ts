"use client";

/**
 * Client-side workspace session helper.
 *
 * The private workspace is normally identified by an HTTP-only cookie set by
 * `src/proxy.ts`. Some environments (plain-HTTP previews, strict cookie
 * policies, embedded browsers) drop or block that cookie, which would give every
 * request a different workspace and make saved documents/reports unreachable.
 *
 * To keep the session stable we also remember the workspace id in
 * `sessionStorage` and send it as `x-feeshield-workspace` on every API call.
 * The server prefers this header, so identity survives even without cookies.
 * The id is a random UUID with no embedded secrets, so exposing it to JS is safe.
 */

const STORAGE_KEY = "feeshield-workspace-id";
const UUID_RE = /^[0-9a-f-]{36}$/i;

export function rememberWorkspace(id: unknown): void {
  if (typeof id !== "string" || !UUID_RE.test(id)) return;
  try { sessionStorage.setItem(STORAGE_KEY, id); } catch { /* storage unavailable */ }
}

export function getWorkspaceId(): string {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored && UUID_RE.test(stored) ? stored : "";
  } catch { return ""; }
}

/** Headers to merge into same-origin API calls for a stable workspace identity. */
export function workspaceHeaders(): Record<string, string> {
  const id = getWorkspaceId();
  return id ? { "x-feeshield-workspace": id } : {};
}

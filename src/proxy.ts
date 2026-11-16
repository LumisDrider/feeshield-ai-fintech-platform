import { NextRequest, NextResponse } from "next/server";

const WORKSPACE_COOKIE = "feeshield_workspace";
const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * Establishes a stable private-workspace identity for every request.
 *
 * Two safeguards keep the identity stable across a whole user session:
 *  1. An existing workspace cookie is reused.
 *  2. A client-provided `x-feeshield-workspace` header is adopted when the cookie
 *     is unavailable (browsers drop `Secure` cookies on non-HTTPS origins, and
 *     some embedded/strict browsers restrict cookies altogether). Without this,
 *     each request would mint a brand-new workspace and previously stored
 *     documents/reports would appear to "not exist" or "delete themselves".
 */
export default function proxy(request: NextRequest) {
  const cookieId = request.cookies.get(WORKSPACE_COOKIE)?.value ?? "";
  const headerId = request.headers.get("x-feeshield-workspace") ?? "";

  let workspaceId = UUID_RE.test(cookieId) ? cookieId : UUID_RE.test(headerId) ? headerId : crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-feeshield-workspace", workspaceId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Refresh the cookie whenever it was missing or unusable so the identity is
  // persisted for subsequent navigations (documents, reports, comparisons).
  if (!UUID_RE.test(cookieId) || cookieId !== workspaceId) {
    const forwardedProto = (request.headers.get("x-forwarded-proto") ?? "").split(",")[0].trim().toLowerCase();
    const isHttps = forwardedProto ? forwardedProto === "https" : request.nextUrl.protocol === "https:";
    response.cookies.set(WORKSPACE_COOKIE, workspaceId, {
      httpOnly: true,
      sameSite: "lax",
      // Only mark Secure when the request is actually served over HTTPS;
      // a Secure cookie received over HTTP is discarded by the browser.
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

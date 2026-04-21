import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Middleware: Origin check + CSP headers ────────────────────────────────────

function normalizeOrigin(value: string | null): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(request: NextRequest): string | null {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!host) {
    return normalizeOrigin(request.nextUrl.origin);
  }

  const proto =
    forwardedProto ?? request.nextUrl.protocol.replace(":", "") ?? "https";
  return normalizeOrigin(`${proto}://${host}`);
}

function isSameOriginRequest(
  request: NextRequest,
  candidate: string | null,
): boolean {
  if (!candidate) return false;

  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin) return false;

  return normalizeOrigin(candidate) === requestOrigin;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Layer 4: Origin/Referrer protection for POST /api/chat and /api/message
  if (
    request.method === "POST" &&
    (pathname === "/api/chat" || pathname === "/api/message")
  ) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const secFetchSite = request.headers.get("sec-fetch-site");
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const requestOrigin = getRequestOrigin(request);
    const allAllowed = [
      requestOrigin,
      normalizeOrigin(baseUrl ?? null),
      ...allowedOrigins.map((allowed) => normalizeOrigin(allowed)),
    ].filter((value): value is string => Boolean(value));

    if (origin) {
      const normalizedOrigin = normalizeOrigin(origin);

      if (
        !normalizedOrigin ||
        (!allAllowed.includes(normalizedOrigin) &&
          !isSameOriginRequest(request, normalizedOrigin))
      ) {
        return NextResponse.json(
          { error: "Request not allowed from this origin." },
          { status: 403 },
        );
      }
    } else if (referer) {
      const refererOrigin = normalizeOrigin(referer);

      if (!refererOrigin) {
        return NextResponse.json(
          { error: "Invalid request." },
          { status: 400 },
        );
      }

      if (
        !allAllowed.includes(refererOrigin) &&
        !isSameOriginRequest(request, refererOrigin)
      ) {
        return NextResponse.json(
          { error: "Request not allowed from this origin." },
          { status: 403 },
        );
      }
    } else {
      // Some edge/browser combinations omit Origin for same-origin POSTs.
      if (
        process.env.NODE_ENV === "production" &&
        secFetchSite !== "same-origin" &&
        secFetchSite !== "same-site"
      ) {
        return NextResponse.json(
          { error: "Request not allowed." },
          { status: 403 },
        );
      }
    }
  }

  // Layer 5: CSP frame-ancestors for widget routes
  if (pathname === "/widget" || pathname === "/api/widget") {
    const allowedDomains = (
      process.env.ALLOWED_EMBED_DOMAINS ?? "*"
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");

    const response = NextResponse.next();
    response.headers.set(
      "Content-Security-Policy",
      `frame-ancestors ${allowedDomains}`,
    );
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/chat/:path*",
    "/api/message/:path*",
    "/widget",
    "/api/widget",
  ],
};

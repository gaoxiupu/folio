import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Middleware: Origin check + CSP headers ────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Layer 4: Origin/Referrer protection for POST /api/chat and /api/message
  if (
    request.method === "POST" &&
    (pathname === "/api/chat" || pathname === "/api/message")
  ) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";
    const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const allAllowed = [baseUrl, ...allowedOrigins].filter(Boolean);

    if (origin) {
      if (
        !allAllowed.some(
          (allowed) => origin === allowed || origin.startsWith(allowed),
        )
      ) {
        return NextResponse.json(
          { error: "Request not allowed from this origin." },
          { status: 403 },
        );
      }
    } else if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (
          !allAllowed.some(
            (allowed) =>
              refererOrigin === new URL(allowed).origin,
          )
        ) {
          return NextResponse.json(
            { error: "Request not allowed from this origin." },
            { status: 403 },
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid request." },
          { status: 400 },
        );
      }
    } else {
      // No origin or referer — block in production
      if (process.env.NODE_ENV === "production") {
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
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
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

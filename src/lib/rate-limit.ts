// ── Per-IP fixed-window rate limiter ──────────────────────────────────────────
// Pure in-memory, no external dependencies. Resets on server restart.

type Window = { count: number; resetAt: number };

const minuteWindows = new Map<string, Window>();
const dayWindows = new Map<string, Window>();

const PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE ?? "10", 10);
const PER_DAY = parseInt(process.env.RATE_LIMIT_PER_DAY ?? "100", 10);

function checkWindow(
  map: Map<string, Window>,
  ip: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  let entry = map.get(ip);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    map.set(ip, entry);
  }

  entry.count++;

  if (entry.count > limit) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

// Periodic cleanup: remove stale entries when map grows large
function cleanup(map: Map<string, Window>) {
  if (map.size < 10_000) return;
  const now = Date.now();
  const keysToDelete: string[] = [];
  map.forEach((entry, key) => {
    if (now >= entry.resetAt) keysToDelete.push(key);
  });
  keysToDelete.forEach((key) => map.delete(key));
}

export function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  cleanup(minuteWindows);
  cleanup(dayWindows);

  const minute = checkWindow(minuteWindows, ip, PER_MINUTE, 60_000);
  if (!minute.allowed) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(minute.retryAfterMs / 1000),
    };
  }

  const day = checkWindow(dayWindows, ip, PER_DAY, 86_400_000);
  if (!day.allowed) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(day.retryAfterMs / 1000),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

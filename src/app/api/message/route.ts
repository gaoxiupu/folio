import fs from "fs";
import path from "path";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MESSAGES_FILE = path.join(process.cwd(), "knowledge", "messages.json");

interface VisitorMessage {
  id: string;
  timestamp: string;
  name: string;
  contact: string;
  message: string;
  interested_in?: string[];
  ip_hash: string;
}

interface MessagesStore {
  messages: VisitorMessage[];
}

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonOk(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function hashIp(ip: string): string {
  let h = 0;
  for (let i = 0; i < ip.length; i++) {
    h = (h << 5) - h + ip.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16).padStart(8, "0");
}

function readStore(): MessagesStore {
  try {
    if (!fs.existsSync(MESSAGES_FILE)) return { messages: [] };
    const raw = fs.readFileSync(MESSAGES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.messages)) return parsed as MessagesStore;
    return { messages: [] };
  } catch {
    return { messages: [] };
  }
}

function writeStore(store: MessagesStore): void {
  const knowledgeDir = path.dirname(MESSAGES_FILE);
  if (!fs.existsSync(knowledgeDir)) {
    fs.mkdirSync(knowledgeDir, { recursive: true });
  }
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return jsonError(415, "Invalid request format.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Could not read your message.");
  }

  if (!body || typeof body !== "object") {
    return jsonError(422, "Invalid message format.");
  }

  const { name, contact, message, interested_in } = body as {
    name?: unknown;
    contact?: unknown;
    message?: unknown;
    interested_in?: unknown;
  };

  if (typeof name !== "string" || name.trim().length === 0) {
    return jsonError(422, "Please provide your name.");
  }
  if (typeof contact !== "string" || contact.trim().length === 0) {
    return jsonError(422, "Please provide a way to contact you.");
  }
  if (typeof message !== "string" || message.trim().length === 0) {
    return jsonError(422, "Please write a message.");
  }

  if (name.length > 80 || contact.length > 200 || message.length > 2000) {
    return jsonError(422, "Some fields are too long.");
  }

  const ip = getClientIp(req);
  const rateResult = checkRateLimit(ip);
  if (!rateResult.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many requests. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateResult.retryAfterSeconds),
        },
      },
    );
  }

  const tags = Array.isArray(interested_in)
    ? (interested_in as unknown[])
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10)
    : undefined;

  const entry: VisitorMessage = {
    id: `msg_${Date.now()}`,
    timestamp: new Date().toISOString(),
    name: name.trim(),
    contact: contact.trim(),
    message: message.trim(),
    interested_in: tags,
    ip_hash: hashIp(ip),
  };

  try {
    const store = readStore();
    store.messages.push(entry);
    writeStore(store);
  } catch (e) {
    console.error("[message] Failed to persist:", e);
    return jsonError(500, "Could not save your message. Please try again.");
  }

  return jsonOk({ ok: true, id: entry.id });
}

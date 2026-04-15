import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { retrieve } from "@/lib/retriever";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { checkDailyBudget } from "@/lib/cost-limit";
import { loadPersona, loadSocials, loadCard } from "@/lib/knowledge-config";

export const runtime = "nodejs";

const ark = createOpenAI({
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
  apiKey: process.env.ARK_API_KEY,
});

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  // ── Layer 1: Content-Type gate ───────────────────────────────────────────
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return jsonError(415, "Invalid request format.");
  }

  // ── Layer 2: Safe body parsing + validation ──────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Could not read your message.");
  }

  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as Record<string, unknown>).messages)
  ) {
    return jsonError(422, "Invalid message format.");
  }

  const { messages } = body as {
    messages: { role: string; content: string }[];
  };

  if (messages.length === 0 || messages.length > 50) {
    return jsonError(
      422,
      messages.length === 0
        ? "Please type a message."
        : "This conversation is getting long. Please start a new chat.",
    );
  }

  const last = messages[messages.length - 1];
  if (last.role !== "user" || typeof last.content !== "string") {
    return jsonError(422, "Invalid message format.");
  }

  const userMessage = last.content.trim();
  if (userMessage.length === 0) {
    return jsonError(422, "Please type a message.");
  }
  if (userMessage.length > 2000) {
    return jsonError(
      422,
      "That's quite long! Please keep your message under 2000 characters.",
    );
  }

  // ── Layer 3: IP rate limiting ────────────────────────────────────────────
  const ip = getClientIp(req);
  const rateResult = checkRateLimit(ip);
  if (!rateResult.allowed) {
    return new Response(
      JSON.stringify({
        error: "I'm taking a short break. Please try again in a moment.",
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

  // ── Layer 4: Daily API budget ────────────────────────────────────────────
  const budgetResult = checkDailyBudget();
  if (!budgetResult.allowed) {
    return jsonError(
      503,
      "I've reached my daily chat limit. Please come back tomorrow!",
    );
  }

  // ── RAG + LLM ────────────────────────────────────────────────────────────
  const context = await retrieve(userMessage);

  // ── Load optional config ──────────────────────────────────────────────────
  const personaContent = loadPersona();
  const socialLinks = loadSocials();
  const cardData = loadCard();

  const suggestionsInstruction = `

After your response, on a new line, append exactly this structure:
<suggestions>["question 1", "question 2", "question 3"]</suggestions>
Choose 3 natural follow-up questions a visitor would ask next.
Write them in the same language as the conversation.
Keep each question under 24 characters.`;

  // ── Build optional prompt sections ────────────────────────────────────────
  const personaPrefix = personaContent
    ? `Personality & Style:\n${personaContent}\n\n`
    : "";

  const socialInstruction = socialLinks.length > 0
    ? `Social media profiles (recommend relevant ones when the visitor shows interest in a topic):\n${
        socialLinks.map(s => `- ${s.platform}: ${s.url}${s.handle ? ` (${s.handle})` : ""}`).join("\n")
      }\nWhen mentioning social links, format them as: [platform name](url)\n\n`
    : "";

  const cardInstruction = cardData
    ? `Digital business card data (use when visitor asks for contact card, business card, or how to reach the owner):\n${JSON.stringify(cardData, null, 2)}\nWhen emitting a business card, use this block format (only include fields that have values):\n:::card\nname: <value>\ntitle: <value>\ncompany: <value>\nemail: <value>\nphone: <value>\nwebsite: <value>\ngithub: <value>\nlinkedin: <value>\nwechat: <value>\n:::\n\n`
    : "";

  const dynamicPrefix = personaPrefix + socialInstruction + cardInstruction;

  const noContext = context.trim().length === 0;
  const systemPrompt = noContext
    ? `${dynamicPrefix}You are a helpful assistant representing the portfolio owner.
You don't have enough information to answer this question.
Reply in the same language as the visitor's message.
Tell them: you're not sure about this one, and suggest they reach out directly to the owner.${suggestionsInstruction}`
    : `${dynamicPrefix}You are a helpful assistant representing the portfolio owner.
Answer visitors' questions based only on the context below.
Reply in the same language as the visitor's message.
If a question isn't covered by the context, say you're not sure and suggest the visitor reach out directly to the owner.

Rich card formatting rules (use ONLY when the visitor specifically asks):

When listing projects, output each project in this exact block format (one block per project, blank line between blocks):
:::project
name: <project name>
description: <one sentence summary>
tech: <comma-separated technologies, optional>
link: <url, optional>
:::

When providing contact information, output one block:
:::contact
name: <full name>
email: <email, optional>
phone: <phone number, optional>
github: <github url, optional>
linkedin: <linkedin url, optional>
:::

When listing work experience, output each position in this exact block format (one block per position, blank line between blocks):
:::experience
company: <company name>
role: <job title>
period: <time range, e.g. 2020 - 2023>
description: <one sentence summary of responsibilities or achievements>
:::

When listing skills grouped by category, output one block with category groups separated by a line containing only ---:
:::skills
category: <category name>
items: <comma-separated skills>
---
category: <another category>
items: <comma-separated skills>
:::

Rules:
- Only emit card blocks when the context contains the relevant data.
- Do not wrap card blocks in markdown or code fences.
- You may write a short intro sentence before card blocks, but keep prose minimal when cards are used.

Context:
${context}${suggestionsInstruction}`;

  const result = await streamText({
    model: ark("doubao-seed-2-0-pro-260215"),
    system: systemPrompt,
    messages: messages as Parameters<typeof streamText>[0]["messages"],
  });

  return result.toDataStreamResponse();
}

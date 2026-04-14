"use client";

import { useChat } from "ai/react";
import { SendHorizonal } from "lucide-react";
import { useEffect, useRef } from "react";

const QUICK_QUESTIONS = ["你做过什么项目", "你擅长什么", "怎么联系你"];

// ── Project card parser ──────────────────────────────────────────────────────
// Detects lines like:  **Title**: one-line description
// or:                  - **Title**: one-line description
// If ≥2 such lines exist in a message, they render as cards; rest as text.

type Segment =
  | { type: "text"; text: string }
  | { type: "card"; title: string; description: string };

function parseSegments(content: string): Segment[] {
  const lines = content.split("\n");

  const cardHits: Array<{ index: number; title: string; desc: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^[-*\d.]*\s*\*\*(.+?)\*\*[:\s]+(.+)$/);
    if (m) cardHits.push({ index: i, title: m[1].trim(), desc: m[2].trim() });
  }

  if (cardHits.length < 2) return [{ type: "text", text: content }];

  const cardSet = new Set(cardHits.map((c) => c.index));
  const segments: Segment[] = [];
  let buf: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (cardSet.has(i)) {
      const txt = buf.join("\n").trim();
      if (txt) segments.push({ type: "text", text: txt });
      buf = [];
      const hit = cardHits.find((c) => c.index === i)!;
      segments.push({ type: "card", title: hit.title, description: hit.desc });
    } else {
      buf.push(lines[i]);
    }
  }
  const tail = buf.join("\n").trim();
  if (tail) segments.push({ type: "text", text: tail });

  return segments;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ProjectCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm my-1 first:mt-0 last:mb-0">
      <p className="text-[13px] font-semibold text-gray-900 leading-snug">
        {title}
      </p>
      <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function MessageBubble({ content, role }: { content: string; role: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-gray-900 text-white px-3.5 py-2 text-[13px] leading-relaxed">
          {content}
        </div>
      </div>
    );
  }

  const segments = parseSegments(content);
  const hasCards = segments.some((s) => s.type === "card");

  return (
    <div className="flex justify-start">
      <div className={`max-w-[88%] ${hasCards ? "w-full" : ""}`}>
        {segments.map((seg, i) =>
          seg.type === "card" ? (
            <ProjectCard
              key={i}
              title={seg.title}
              description={seg.description}
            />
          ) : seg.text ? (
            <div
              key={i}
              className="rounded-2xl rounded-bl-sm bg-gray-100 text-gray-800 px-3.5 py-2 text-[13px] leading-relaxed my-1 first:mt-0 last:mb-0 whitespace-pre-wrap"
            >
              {seg.text}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
        <span className="flex gap-1 items-center">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function WidgetPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } =
    useChat({ api: "/api/chat" });

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function sendQuick(question: string) {
    append({ role: "user", content: question });
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen bg-white font-sans text-sm">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-100 bg-white">
        <h1 className="text-[13px] font-semibold text-gray-900">
          Ask me anything
        </h1>
        <p className="text-[11px] text-gray-400 mt-0.5">Powered by AI</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-5 mt-6">
            <p className="text-[12px] text-gray-400 text-center px-4">
              Hi! Ask me about this person's projects, skills, or how to reach
              them.
            </p>
            <div className="flex flex-col gap-2 w-full">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendQuick(q)}
                  className="w-full text-left text-[13px] text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} content={m.content} role={m.role} />
          ))
        )}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 px-3 py-3 border-t border-gray-100 flex gap-2 items-center bg-white"
      >
        <input
          className="flex-1 text-[13px] bg-gray-100 rounded-full px-4 py-2 outline-none placeholder-gray-400 focus:ring-1 focus:ring-gray-300 transition"
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message…"
          disabled={isLoading}
          autoFocus
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-gray-900 text-white disabled:opacity-35 hover:bg-gray-700 transition-colors"
        >
          <SendHorizonal size={14} />
        </button>
      </form>
    </div>
  );
}

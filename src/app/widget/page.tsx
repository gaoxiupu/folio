"use client";

import { useChat } from "ai/react";
import { SendHorizonal } from "lucide-react";
import { useEffect, useRef } from "react";

const QUICK_QUESTIONS = ["你做过什么项目", "你擅长什么", "怎么联系你"];

// ── Project card parser ──────────────────────────────────────────────────────

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
    <div className="rounded-xl border border-stone-200 border-l-2 border-l-indigo-400 bg-white hover:bg-indigo-50 transition-colors px-3 py-2.5 my-1 first:mt-0 last:mb-0">
      <p className="text-[13px] font-semibold text-stone-900 leading-snug">
        {title}
      </p>
      <p className="text-[12px] text-stone-500 mt-0.5 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function MessageBubble({ content, role }: { content: string; role: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-indigo-500 text-white px-3.5 py-2 text-[13px] leading-relaxed animate-fade-slide-up">
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
              className="rounded-2xl rounded-bl-sm bg-white border border-stone-200 text-stone-800 px-3.5 py-2 text-[13px] leading-relaxed my-1 first:mt-0 last:mb-0 whitespace-pre-wrap animate-fade-slide-up"
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
      <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
        <span className="flex gap-1 items-center">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"
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
    <div className="flex flex-col h-screen bg-[#fafaf8] font-sans text-sm">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-stone-200 bg-white flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[13px] font-bold shrink-0">
          A
        </div>
        <div>
          <h1 className="text-[13px] font-semibold text-stone-900">
            Hi, I&apos;m here to help
          </h1>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Ask me about this person
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-5 mt-6">
            <p className="text-[12px] text-stone-400 text-center px-4">
              What would you like to know? Pick a question or type your own.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendQuick(q)}
                  className="text-[12px] text-stone-600 bg-stone-100 hover:bg-white hover:border-indigo-400 border border-stone-200 rounded-full px-3.5 py-1.5 transition-colors cursor-pointer"
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
        className="shrink-0 px-3 py-3 border-t border-stone-200 flex gap-2 items-center bg-white"
      >
        <input
          className="flex-1 text-[13px] bg-stone-100 text-stone-800 rounded-full px-4 py-2 outline-none placeholder-stone-400 focus:ring-1 focus:ring-indigo-300 transition"
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message…"
          disabled={isLoading}
          autoFocus
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-indigo-500 text-white disabled:opacity-35 hover:bg-indigo-600 transition-colors"
        >
          <SendHorizonal size={14} />
        </button>
      </form>
    </div>
  );
}

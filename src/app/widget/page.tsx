"use client";

import { useChat } from "ai/react";
import Image from "next/image";
import {
  ChevronRight,
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  Phone,
  SendHorizonal,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

const QUICK_ACTIONS = [
  { label: "My Work", query: "Tell me about your projects" },
  { label: "Experience", query: "What's your work experience?" },
  { label: "Skills", query: "What are your technical skills?" },
  { label: "Contact", query: "How can I get in touch?" },
];

// ── Suggestion tag helpers ───────────────────────────────────────────────────

function getDisplayContent(content: string): string {
  const idx = content.indexOf("<suggestions>");
  return idx === -1 ? content : content.slice(0, idx).trimEnd();
}

function parseSuggestions(content: string): string[] {
  const match = content.match(/<suggestions>([\s\S]*?)<\/suggestions>/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[1]);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

// ── Rich card parser (::block::) ─────────────────────────────────────────────

type SkillCategory = { label: string; items: string[] };

type Segment =
  | { type: "text"; text: string }
  | {
      type: "project";
      name: string;
      description: string;
      tech: string[];
      link?: string;
    }
  | {
      type: "experience";
      company: string;
      role: string;
      period: string;
      description: string;
    }
  | {
      type: "contact";
      name: string;
      email?: string;
      phone?: string;
      github?: string;
      linkedin?: string;
    }
  | { type: "skills"; categories: SkillCategory[] };

function parseKV(body: string): Record<string, string> {
  const kv: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) kv[m[1]] = m[2].trim();
  }
  return kv;
}

function parseBlock(kind: string, body: string): Segment | null {
  if (kind === "project") {
    const kv = parseKV(body);
    if (!kv.name) return null;
    return {
      type: "project",
      name: kv.name,
      description: kv.description || "",
      tech: kv.tech
        ? kv.tech
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      link: kv.link || undefined,
    };
  }

  if (kind === "experience") {
    const kv = parseKV(body);
    if (!kv.company) return null;
    return {
      type: "experience",
      company: kv.company,
      role: kv.role || "",
      period: kv.period || "",
      description: kv.description || "",
    };
  }

  if (kind === "contact") {
    const kv = parseKV(body);
    if (!kv.name) return null;
    return {
      type: "contact",
      name: kv.name,
      email: kv.email || undefined,
      phone: kv.phone || undefined,
      github: kv.github || undefined,
      linkedin: kv.linkedin || undefined,
    };
  }

  if (kind === "skills") {
    const categories: SkillCategory[] = [];
    for (const group of body.split(/^---$/m)) {
      const kv = parseKV(group);
      if (kv.category && kv.items) {
        categories.push({
          label: kv.category,
          items: kv.items
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        });
      }
    }
    if (!categories.length) return null;
    return { type: "skills", categories };
  }

  return null;
}

function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  const blockRe = /:::(\w+)\n([\s\S]*?)\n:::/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(content)) !== null) {
    const before = content.slice(lastIdx, match.index).trim();
    if (before) segments.push({ type: "text", text: before });
    const block = parseBlock(match[1], match[2]);
    if (block) segments.push(block);
    lastIdx = match.index + match[0].length;
  }

  let tail = content.slice(lastIdx);
  const danglingIdx = tail.indexOf(":::");
  if (danglingIdx !== -1) tail = tail.slice(0, danglingIdx);
  const tailTrim = tail.trim();
  if (tailTrim) segments.push({ type: "text", text: tailTrim });

  return segments;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ProjectCard({
  name,
  description,
  onLearnMore,
}: {
  name: string;
  description: string;
  tech: string[];
  link?: string;
  onLearnMore: (name: string) => void;
}) {
  return (
    <div
      className="group rounded-lg border border-folio-border bg-folio-surface px-3 py-2.5 my-1 first:mt-0 last:mb-0"
      onMouseEnter={(e) => {
        const btn = e.currentTarget.querySelector("[data-learn-more]");
        if (btn) (btn as HTMLElement).style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        const btn = e.currentTarget.querySelector("[data-learn-more]");
        if (btn) (btn as HTMLElement).style.opacity = "0";
      }}
    >
      <p className="text-[13px] font-semibold text-folio-ink leading-snug">
        {name}
      </p>
      <p className="text-[12px] text-folio-muted mt-0.5 leading-relaxed">
        {description}
      </p>
      <button
        data-learn-more
        onClick={() => onLearnMore(name)}
        className="mt-1 text-[11px] font-medium text-folio-accent hover:underline cursor-pointer opacity-0 transition-opacity duration-150"
      >
        Learn more →
      </button>
    </div>
  );
}

function ExperienceCard({
  company,
  role,
  period,
  description,
  onLearnMore,
}: {
  company: string;
  role: string;
  period: string;
  description: string;
  onLearnMore: (company: string) => void;
}) {
  return (
    <div
      className="group rounded-lg border border-folio-border bg-folio-surface px-3 py-2.5 my-1 first:mt-0 last:mb-0"
      onMouseEnter={(e) => {
        const btn = e.currentTarget.querySelector("[data-learn-more]");
        if (btn) (btn as HTMLElement).style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        const btn = e.currentTarget.querySelector("[data-learn-more]");
        if (btn) (btn as HTMLElement).style.opacity = "0";
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold text-folio-ink leading-snug">
          {company}
        </p>
        {period && (
          <span className="text-[11px] text-folio-muted shrink-0">{period}</span>
        )}
      </div>
      {role && (
        <p className="text-[12px] font-medium text-folio-ink/70 mt-0.5">{role}</p>
      )}
      {description && (
        <p className="text-[12px] text-folio-muted mt-0.5 leading-relaxed">
          {description}
        </p>
      )}
      <button
        data-learn-more
        onClick={() => onLearnMore(company)}
        className="mt-1 text-[11px] font-medium text-folio-accent hover:underline cursor-pointer opacity-0 transition-opacity duration-150"
      >
        Learn more →
      </button>
    </div>
  );
}

function ContactCard({
  name,
  email,
  phone,
  github,
  linkedin,
}: {
  name: string;
  email?: string;
  phone?: string;
  github?: string;
  linkedin?: string;
}) {
  const links: { href: string; label: string; Icon: typeof Mail }[] = [];
  if (email)
    links.push({ href: `mailto:${email}`, label: email, Icon: Mail });
  if (phone)
    links.push({ href: `tel:${phone}`, label: phone, Icon: Phone });
  if (github) links.push({ href: github, label: "GitHub", Icon: Github });
  if (linkedin)
    links.push({ href: linkedin, label: "LinkedIn", Icon: Linkedin });

  return (
    <div className="rounded-lg border border-folio-border bg-folio-surface px-3 py-3 my-1 first:mt-0 last:mb-0">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
          <Image src="/avatar.jpg" alt={name} width={36} height={36} className="w-full h-full object-cover" />
        </div>
        <p className="text-[13px] font-semibold text-folio-ink leading-snug">
          {name}
        </p>
      </div>
      {links.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {links.map(({ href, label, Icon }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[12px] text-folio-ink hover:text-folio-accent transition-colors"
              >
                <Icon size={13} className="text-folio-muted" />
                <span className="underline-offset-2 hover:underline break-all">
                  {label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SkillsCard({ categories }: { categories: SkillCategory[] }) {
  return (
    <div className="rounded-lg border border-folio-border bg-folio-surface px-3 py-2.5 my-1 first:mt-0 last:mb-0">
      {categories.map((cat, i) => (
        <div key={cat.label} className={i > 0 ? "mt-2.5" : ""}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-folio-muted">
            {cat.label}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {cat.items.map((item) => (
              <span
                key={item}
                className="text-[11px] font-medium text-folio-ink bg-folio-bg border border-folio-border rounded px-2 py-0.5"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ content, role, onLearnMore }: { content: string; role: string; onLearnMore?: (name: string) => void }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-lg bg-folio-user-bg text-folio-user-fg px-3.5 py-2 text-[13px] leading-relaxed">
          {content}
        </div>
      </div>
    );
  }

  const displayContent = getDisplayContent(content);
  const segments = parseSegments(displayContent);
  const hasCards = segments.some((s) => s.type !== "text");

  return (
    <div className="flex justify-start">
      <div className={`max-w-[88%] ${hasCards ? "w-full" : ""}`}>
        {segments.map((seg, i) => {
          if (seg.type === "project")
            return (
              <ProjectCard
                key={i}
                name={seg.name}
                description={seg.description}
                tech={seg.tech}
                link={seg.link}
                onLearnMore={onLearnMore!}
              />
            );
          if (seg.type === "experience")
            return (
              <ExperienceCard
                key={i}
                company={seg.company}
                role={seg.role}
                period={seg.period}
                description={seg.description}
                onLearnMore={onLearnMore!}
              />
            );
          if (seg.type === "contact")
            return (
              <ContactCard
                key={i}
                name={seg.name}
                email={seg.email}
                phone={seg.phone}
                github={seg.github}
                linkedin={seg.linkedin}
              />
            );
          if (seg.type === "skills")
            return <SkillsCard key={i} categories={seg.categories} />;
          if (seg.text)
            return (
              <div
                key={i}
                className="rounded-lg bg-folio-surface border border-folio-border text-folio-ink px-3.5 py-2 text-[13px] leading-relaxed my-1 first:mt-0 last:mb-0 whitespace-pre-wrap"
              >
                {seg.text}
              </div>
            );
          return null;
        })}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-folio-surface border border-folio-border rounded-lg px-3.5 py-2.5">
        <span className="flex gap-1 items-center">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-1.5 h-1.5 bg-folio-muted rounded-full animate-bounce"
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 4 * 20 + 16)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function sendQuick(question: string) {
    append({ role: "user", content: question });
  }

  const isEmpty = messages.length === 0;

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const activeSuggestions =
    !isLoading && lastAssistant ? parseSuggestions(lastAssistant.content) : [];

  return (
    <div className="flex flex-col h-screen bg-folio-bg font-sans text-sm">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-folio-border bg-white flex items-center gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
          <Image src="/avatar.jpg" alt="PaulBot" width={32} height={32} className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-[13px] font-semibold text-folio-ink">
            PaulBot
          </h1>
          <p className="text-[11px] text-folio-muted mt-0.5">
            Ask me about Paul.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {isEmpty ? (
          <div className="flex justify-start gap-2 mt-4">
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5">
              <Image src="/avatar.jpg" alt="PaulBot" width={28} height={28} className="w-full h-full object-cover" />
            </div>
            <div className="rounded-lg bg-folio-surface border border-folio-border text-folio-ink px-3.5 py-2 text-[13px] leading-relaxed max-w-[88%]">
              <p>Hi there! 👋 I&apos;m <strong>PaulBot</strong>, Paul&apos;s AI assistant.</p>
              <p className="mt-1.5">Feel free to ask me anything about Paul — his projects, skills, experience, or how to get in touch.</p>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} content={m.content} role={m.role} onLearnMore={(name) => {
              // detect if this is an experience card or project card based on context
              const text = m.content;
              const isExperience = text.includes(`company: ${name}`) || text.includes(`company:${name}`);
              sendQuick(isExperience ? `详细介绍一下在${name}的工作经历` : `详细介绍一下${name}项目`);
            }} />
          ))
        )}
        {activeSuggestions.length > 0 && !isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[88%] flex flex-col gap-1.5 mt-1">
              {activeSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendQuick(s)}
                  className="flex items-center justify-between rounded-lg bg-folio-surface hover:bg-[rgba(55,53,47,0.08)] px-3 py-1.5 text-[12px] text-folio-muted hover:text-folio-ink transition-colors cursor-pointer"
                >
                  <span>{s}</span>
                  <ChevronRight size={12} className="text-folio-border" />
                </button>
              ))}
            </div>
          </div>
        )}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Persistent quick actions row */}
      <div
        className={`shrink-0 px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto bg-white no-scrollbar ${
          activeSuggestions.length > 0 ? "" : "border-t border-folio-border"
        }`}
      >
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.label}
            onClick={() => sendQuick(a.query)}
            disabled={isLoading}
            className="shrink-0 text-[11px] font-medium text-folio-ink bg-folio-surface hover:bg-[rgba(55,53,47,0.08)] border border-folio-border rounded-lg px-3 py-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          handleSubmit(e);
          adjustHeight();
        }}
        className="shrink-0 px-3 pt-2 pb-3 bg-white"
      >
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="w-full text-[13px] bg-folio-surface text-folio-ink rounded-lg px-4 py-2.5 pr-11 outline-none placeholder-folio-muted focus:ring-1 focus:ring-folio-border transition resize-none overflow-y-auto leading-[20px] min-h-[56px] max-h-[96px]"
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message…"
            disabled={isLoading}
            autoFocus
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.target as HTMLTextAreaElement).form?.requestSubmit();
              }
            }}
          />
          {input.trim() && (
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 bottom-2 w-7 h-7 flex items-center justify-center rounded-lg bg-folio-accent text-white hover:bg-[#2F2D2A] transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <SendHorizonal size={13} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

"use client";

import React from "react";
import { useChat } from "ai/react";
import Image from "next/image";
import {
  ChevronRight,
  Check,
  Copy,
  ExternalLink,
  Github,
  Globe,
  Linkedin,
  Mail,
  Phone,
  SendHorizonal,
} from "lucide-react";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

// ── i18n ────────────────────────────────────────────────────────────────────

type Locale = "en" | "zh";

const T = {
  en: {
    subtitle: "Ask me about Paul.",
    greeting1: "Hi there! 👋 I'm <strong>PaulBot</strong>, Paul's AI assistant.",
    greeting2: "Feel free to ask me anything about Paul — his projects, experience, or how to get in touch.",
    quickWork: "My Work",
    quickWorkQuery: "Tell me about your projects",
    quickExp: "Experience",
    quickExpQuery: "What's your work experience?",
    quickContact: "Contact",
    quickContactQuery: "How can I get in touch?",
    learnMore: "Learn more →",
    copy: "Copy",
    copied: "Copied",
    msgSent: "Message sent",
    msgSentBody: "Thanks! I'll pass it along — expect a reply soon.",
    msgSend: "Send message",
    msgSending: "Sending…",
    msgErrorDefault: "Failed to send. Please try again.",
    msgErrorNetwork: "Network error. Please try again.",
    msgName: "Your name",
    msgContact: "Email or other contact",
    msgBody: "Your message…",
    repos: (n: number) => `${n} repos`,
    followers: (n: number) => `${n} followers`,
    topLanguages: "Top languages",
    placeholder: "Type a message…",
  },
  zh: {
    subtitle: "问我关于 Paul 的事。",
    greeting1: "你好！👋 我是 <strong>PaulBot</strong>，Paul 的 AI 助手。",
    greeting2: "欢迎问我关于 Paul 的任何事情 — 他的项目、工作经历，或者如何联系他。",
    quickWork: "作品",
    quickWorkQuery: "介绍一下你的项目",
    quickExp: "经历",
    quickExpQuery: "介绍一下你的工作经历",
    quickContact: "联系",
    quickContactQuery: "怎么联系你？",
    learnMore: "了解更多 →",
    copy: "复制",
    copied: "已复制",
    msgSent: "消息已发送",
    msgSentBody: "谢谢！我会转达给他，请留意回复。",
    msgSend: "发送消息",
    msgSending: "发送中…",
    msgErrorDefault: "发送失败，请重试。",
    msgErrorNetwork: "网络错误，请重试。",
    msgName: "你的名字",
    msgContact: "邮箱或其他联系方式",
    msgBody: "你想说的话…",
    repos: (n: number) => `${n} 个仓库`,
    followers: (n: number) => `${n} 位关注者`,
    topLanguages: "主要语言",
    placeholder: "输入消息…",
  },
} as const;

const LocaleCtx = React.createContext<Locale>("en");

function useLocale() {
  return useContext(LocaleCtx);
}

function useDetectLocale(): Locale {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    const lang = navigator.language.toLowerCase();
    setLocale(lang.startsWith("zh") ? "zh" : "en");
  }, []);
  return locale;
}

function t(locale: Locale) {
  return T[locale];
}

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
  | {
      type: "card";
      name: string;
      title?: string;
      company?: string;
      email?: string;
      phone?: string;
      website?: string;
      github?: string;
      linkedin?: string;
      wechat?: string;
    }
  | { type: "message-form"; title?: string; hint?: string }
  | {
      type: "github";
      username: string;
      name?: string;
      bio?: string;
      followers?: number;
      public_repos?: number;
      top_languages?: { name: string; percent: number }[];
      top_repos?: { name: string; description?: string; stars: number; url: string }[];
    };

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

  if (kind === "card") {
    const kv = parseKV(body);
    if (!kv.name) return null;
    return {
      type: "card",
      name: kv.name,
      title: kv.title || undefined,
      company: kv.company || undefined,
      email: kv.email || undefined,
      phone: kv.phone || undefined,
      website: kv.website || undefined,
      github: kv.github || undefined,
      linkedin: kv.linkedin || undefined,
      wechat: kv.wechat || undefined,
    };
  }

  if (kind === "message-form") {
    const kv = parseKV(body);
    return {
      type: "message-form",
      title: kv.title || undefined,
      hint: kv.hint || undefined,
    };
  }

  if (kind === "github") {
    const kv = parseKV(body);
    if (!kv.username) return null;
    const parseLangs = (s?: string) => {
      if (!s) return undefined;
      const out: { name: string; percent: number }[] = [];
      for (const part of s.split(",")) {
        const [nameRaw, pctRaw] = part.split(":");
        if (!nameRaw || !pctRaw) continue;
        const p = parseFloat(pctRaw);
        if (!Number.isFinite(p)) continue;
        out.push({ name: nameRaw.trim(), percent: p });
      }
      return out.length > 0 ? out : undefined;
    };
    const parseRepos = (s?: string) => {
      if (!s) return undefined;
      try {
        const arr = JSON.parse(s);
        if (!Array.isArray(arr)) return undefined;
        return arr
          .filter(
            (r: unknown): r is { name: string; stars: number; url: string; description?: string } =>
              typeof r === "object" && r !== null && "name" in r && "url" in r,
          )
          .slice(0, 5);
      } catch {
        return undefined;
      }
    };
    return {
      type: "github",
      username: kv.username,
      name: kv.name || undefined,
      bio: kv.bio || undefined,
      followers: kv.followers ? parseInt(kv.followers, 10) : undefined,
      public_repos: kv.public_repos ? parseInt(kv.public_repos, 10) : undefined,
      top_languages: parseLangs(kv.top_languages),
      top_repos: parseRepos(kv.top_repos),
    };
  }

  return null;
}

function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  const blockRe = /:::([\w-]+)\n([\s\S]*?)\n:::/g;
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

// ── Inline markdown link renderer ────────────────────────────────────────────

/** Render text with [label](url) markdown links as clickable <a> tags. */
function renderInlineLinks(text: string) {
  const parts: (string | JSX.Element)[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      <a
        key={key++}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-folio-accent underline underline-offset-2 hover:text-folio-ink transition-colors"
      >
        {match[1]}
      </a>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
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
  const locale = useLocale();
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
        {t(locale).learnMore}
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
  const locale = useLocale();
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
        {t(locale).learnMore}
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
function BusinessCard({
  name,
  title,
  company,
  email,
  phone,
  website,
  github,
  linkedin,
  wechat,
}: {
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  wechat?: string;
}) {
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const copyText = [
    name,
    title,
    company,
    email && `Email: ${email}`,
    phone && `Phone: ${phone}`,
    website && `Website: ${website}`,
    github && `GitHub: ${github}`,
    linkedin && `LinkedIn: ${linkedin}`,
    wechat && `WeChat: ${wechat}`,
  ]
    .filter(Boolean)
    .join("\n");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may fail in some contexts
    }
  }, [copyText]);

  const links: { href: string; label: string; Icon: typeof Mail }[] = [];
  if (email)
    links.push({ href: `mailto:${email}`, label: email, Icon: Mail });
  if (phone)
    links.push({ href: `tel:${phone}`, label: phone, Icon: Phone });
  if (website)
    links.push({ href: website, label: website.replace(/^https?:\/\//, ""), Icon: Globe });
  if (github)
    links.push({ href: github, label: "GitHub", Icon: Github });
  if (linkedin)
    links.push({ href: linkedin, label: "LinkedIn", Icon: Linkedin });

  return (
    <div className="rounded-lg border border-folio-border bg-folio-surface px-3 py-3 my-1 first:mt-0 last:mb-0 relative">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
          <Image src="/avatar.jpg" alt={name} width={36} height={36} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-folio-ink leading-snug">
            {name}
          </p>
          {(title || company) && (
            <p className="text-[11px] text-folio-muted mt-0.5">
              {[title, company].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* Contact links */}
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

      {/* WeChat */}
      {wechat && (
        <div className="mt-2 inline-flex items-center gap-2 text-[12px] text-folio-ink">
          <span className="text-[11px] text-folio-muted bg-folio-bg border border-folio-border rounded px-2 py-0.5">
            WeChat: {wechat}
          </span>
        </div>
      )}

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[11px] font-medium text-folio-muted hover:text-folio-ink transition-colors cursor-pointer px-2 py-1 rounded hover:bg-folio-bg"
      >
        {copied ? (
          <>
            <Check size={12} />
            <span>{t(locale).copied}</span>
          </>
        ) : (
          <>
            <Copy size={12} />
            <span>{t(locale).copy}</span>
          </>
        )}
      </button>
    </div>
  );
}

function MessageFormCard({ title, hint }: { title?: string; hint?: string }) {
  const locale = useLocale();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit =
    status !== "sending" &&
    status !== "sent" &&
    name.trim().length > 0 &&
    contact.trim().length > 0 &&
    msg.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, message: msg }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || t(locale).msgErrorDefault);
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setErrorMsg(t(locale).msgErrorNetwork);
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-lg border border-folio-border bg-folio-surface px-3 py-3 my-1 first:mt-0 last:mb-0">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-folio-ink">
          <Check size={14} className="text-folio-accent" />
          <span>{t(locale).msgSent}</span>
        </div>
        <p className="text-[12px] text-folio-muted mt-1 leading-relaxed">
          {t(locale).msgSentBody}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-folio-border bg-folio-surface px-3 py-3 my-1 first:mt-0 last:mb-0">
      {title && (
        <p className="text-[13px] font-semibold text-folio-ink leading-snug">
          {title}
        </p>
      )}
      {hint && (
        <p className="text-[12px] text-folio-muted mt-0.5 leading-relaxed">
          {hint}
        </p>
      )}
      <div className="mt-2.5 flex flex-col gap-1.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t(locale).msgName}
          maxLength={80}
          disabled={status === "sending"}
          className="text-[12px] bg-folio-bg border border-folio-border rounded px-2 py-1.5 text-folio-ink outline-none focus:border-folio-accent placeholder-folio-muted"
        />
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={t(locale).msgContact}
          maxLength={200}
          disabled={status === "sending"}
          className="text-[12px] bg-folio-bg border border-folio-border rounded px-2 py-1.5 text-folio-ink outline-none focus:border-folio-accent placeholder-folio-muted"
        />
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={t(locale).msgBody}
          maxLength={2000}
          rows={3}
          disabled={status === "sending"}
          className="text-[12px] bg-folio-bg border border-folio-border rounded px-2 py-1.5 text-folio-ink outline-none focus:border-folio-accent placeholder-folio-muted resize-none leading-relaxed"
        />
      </div>
      {status === "error" && errorMsg && (
        <p className="mt-1.5 text-[11px] text-red-600">{errorMsg}</p>
      )}
      <button
        onClick={submit}
        disabled={!canSubmit}
        className="mt-2 w-full text-[12px] font-medium bg-folio-accent text-white rounded px-3 py-1.5 hover:bg-[#2F2D2A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {status === "sending" ? t(locale).msgSending : t(locale).msgSend}
      </button>
    </div>
  );
}

function GithubCard({
  username,
  name,
  bio,
  followers,
  public_repos,
  top_languages,
  top_repos,
}: {
  username: string;
  name?: string;
  bio?: string;
  followers?: number;
  public_repos?: number;
  top_languages?: { name: string; percent: number }[];
  top_repos?: { name: string; description?: string; stars: number; url: string }[];
}) {
  const locale = useLocale();
  return (
    <div className="rounded-lg border border-folio-border bg-folio-surface px-3 py-3 my-1 first:mt-0 last:mb-0">
      <div className="flex items-center gap-2">
        <Github size={15} className="text-folio-ink" />
        <a
          href={`https://github.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-semibold text-folio-ink hover:text-folio-accent transition-colors"
        >
          {name || username}
        </a>
        <span className="text-[11px] text-folio-muted">@{username}</span>
      </div>
      {bio && (
        <p className="text-[12px] text-folio-muted mt-1 leading-relaxed">{bio}</p>
      )}
      {(followers !== undefined || public_repos !== undefined) && (
        <div className="flex gap-3 mt-1.5 text-[11px] text-folio-muted">
          {public_repos !== undefined && <span>📦 {t(locale).repos(public_repos)}</span>}
          {followers !== undefined && <span>👥 {t(locale).followers(followers)}</span>}
        </div>
      )}
      {top_languages && top_languages.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-folio-muted">
            {t(locale).topLanguages}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {top_languages.map((l) => (
              <span
                key={l.name}
                className="text-[11px] font-medium text-folio-ink bg-folio-bg border border-folio-border rounded px-2 py-0.5"
              >
                {l.name} {Math.round(l.percent)}%
              </span>
            ))}
          </div>
        </div>
      )}
      {top_repos && top_repos.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {top_repos.map((r) => (
            <li key={r.url}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded px-2 py-1 hover:bg-folio-bg transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-folio-ink group-hover:text-folio-accent truncate">
                    {r.name}
                  </span>
                  <span className="text-[11px] text-folio-muted shrink-0">★ {r.stars}</span>
                </div>
                {r.description && (
                  <p className="text-[11px] text-folio-muted leading-snug truncate">
                    {r.description}
                  </p>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
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
          if (seg.type === "card")
            return (
              <BusinessCard
                key={i}
                name={seg.name}
                title={seg.title}
                company={seg.company}
                email={seg.email}
                phone={seg.phone}
                website={seg.website}
                github={seg.github}
                linkedin={seg.linkedin}
                wechat={seg.wechat}
              />
            );
          if (seg.type === "message-form")
            return <MessageFormCard key={i} title={seg.title} hint={seg.hint} />;
          if (seg.type === "github")
            return (
              <GithubCard
                key={i}
                username={seg.username}
                name={seg.name}
                bio={seg.bio}
                followers={seg.followers}
                public_repos={seg.public_repos}
                top_languages={seg.top_languages}
                top_repos={seg.top_repos}
              />
            );
          if (seg.text)
            return (
              <div
                key={i}
                className="rounded-lg bg-folio-surface border border-folio-border text-folio-ink px-3.5 py-2 text-[13px] leading-relaxed my-1 first:mt-0 last:mb-0 whitespace-pre-wrap"
              >
                {renderInlineLinks(seg.text)}
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
  const locale = useDetectLocale();
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

  const quickActions = [
    { label: t(locale).quickWork, query: t(locale).quickWorkQuery },
    { label: t(locale).quickExp, query: t(locale).quickExpQuery },
    { label: t(locale).quickContact, query: t(locale).quickContactQuery },
  ];

  return (
    <LocaleCtx.Provider value={locale}>
    <div className="flex flex-col h-screen bg-folio-bg font-sans text-sm">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-folio-border bg-white flex items-center gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
          <Image src="/avatar.jpg" alt="PaulBot" width={32} height={32} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[13px] font-semibold text-folio-ink">
            PaulBot
          </h1>
          <p className="text-[11px] text-folio-muted mt-0.5">
            {t(locale).subtitle}
          </p>
        </div>
        <a
          href="https://github.com/gaoxiupu/folio"
          target="_blank"
          rel="noopener noreferrer"
          className="text-folio-muted hover:text-folio-ink transition-colors shrink-0"
        >
          <Github size={16} />
        </a>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {isEmpty ? (
          <div className="flex justify-start gap-2 mt-4">
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5">
              <Image src="/avatar.jpg" alt="PaulBot" width={28} height={28} className="w-full h-full object-cover" />
            </div>
            <div className="rounded-lg bg-folio-surface border border-folio-border text-folio-ink px-3.5 py-2 text-[13px] leading-relaxed max-w-[88%]">
              <p dangerouslySetInnerHTML={{ __html: t(locale).greeting1 }} />
              <p className="mt-1.5">{t(locale).greeting2}</p>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} content={m.content} role={m.role} onLearnMore={(name) => {
              // detect if this is an experience card or project card based on context
              const text = m.content;
              const isExperience = text.includes(`company: ${name}`) || text.includes(`company:${name}`);
              sendQuick(isExperience
                ? (locale === "zh" ? `详细介绍一下在${name}的工作经历` : `Tell me more about working at ${name}`)
                : (locale === "zh" ? `详细介绍一下${name}项目` : `Tell me more about the ${name} project`)
              );
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
        {quickActions.map((a) => (
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
            placeholder={t(locale).placeholder}
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
    </LocaleCtx.Provider>
  );
}

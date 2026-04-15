import fs from "fs";
import path from "path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SocialLink {
  platform: string;
  url: string;
  handle?: string;
}

export interface CardData {
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

export interface SkillAxis {
  label: string;
  value: number; // 0 – 100
}

// ── Cache (undefined = not loaded, null = file absent) ─────────────────────────

let _persona: string | null | undefined;
let _socials: SocialLink[] | null | undefined;
let _card: CardData | null | undefined;
let _skills: SkillAxis[] | null | undefined;

// ── Helpers ────────────────────────────────────────────────────────────────────

function readTextFile(filename: string): string | null {
  try {
    const filePath = path.join(KNOWLEDGE_DIR, filename);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf-8").trim() || null;
  } catch {
    return null;
  }
}

function readJsonFile<T>(filename: string): T | null {
  try {
    const filePath = path.join(KNOWLEDGE_DIR, filename);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[knowledge-config] Failed to parse ${filename}:`, e);
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Read knowledge/persona.md. Returns null if file doesn't exist. */
export function loadPersona(): string | null {
  if (_persona === undefined) {
    _persona = readTextFile("persona.md");
  }
  return _persona;
}

/** Read knowledge/socials.json. Returns empty array if file doesn't exist. */
export function loadSocials(): SocialLink[] {
  if (_socials === undefined) {
    const data = readJsonFile<{ links?: SocialLink[] } | SocialLink[]>("socials.json");
    if (!data) {
      _socials = [];
    } else if (Array.isArray(data)) {
      _socials = data;
    } else if (data.links && Array.isArray(data.links)) {
      _socials = data.links;
    } else {
      _socials = [];
    }
  }
  return _socials!;
}

/** Read knowledge/card.json. Returns null if file doesn't exist. */
export function loadCard(): CardData | null {
  if (_card === undefined) {
    const data = readJsonFile<CardData>("card.json");
    _card = data && data.name ? data : null;
  }
  return _card;
}

/**
 * Read knowledge/skills.json. Accepts either `{ axes: [{label, value}] }`
 * or a bare array. Values are clamped to 0-100. Returns null if missing.
 */
export function loadSkills(): SkillAxis[] | null {
  if (_skills === undefined) {
    const data = readJsonFile<{ axes?: SkillAxis[] } | SkillAxis[]>("skills.json");
    let arr: unknown[] | null = null;
    if (Array.isArray(data)) arr = data;
    else if (data && Array.isArray((data as { axes?: SkillAxis[] }).axes))
      arr = (data as { axes: SkillAxis[] }).axes;

    if (!arr) {
      _skills = null;
    } else {
      const cleaned = arr
        .filter(
          (a): a is { label: string; value: number } =>
            !!a &&
            typeof a === "object" &&
            typeof (a as { label?: unknown }).label === "string" &&
            typeof (a as { value?: unknown }).value === "number",
        )
        .map((a) => ({
          label: a.label.trim(),
          value: Math.max(0, Math.min(100, a.value)),
        }))
        .filter((a) => a.label.length > 0);
      _skills = cleaned.length > 0 ? cleaned : null;
    }
  }
  return _skills;
}

/** Reset all cached config. Called when files in /knowledge change. */
export function invalidateConfigCache(): void {
  _persona = undefined;
  _socials = undefined;
  _card = undefined;
  _skills = undefined;
}

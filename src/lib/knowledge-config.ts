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

// ── Cache (undefined = not loaded, null = file absent) ─────────────────────────

let _persona: string | null | undefined;
let _socials: SocialLink[] | null | undefined;
let _card: CardData | null | undefined;

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

/** Read persona.md from root. Returns null if file doesn't exist. */
export function loadPersona(): string | null {
  if (_persona === undefined) {
    try {
      const filePath = path.join(process.cwd(), "persona.md");
      if (!fs.existsSync(filePath)) {
        _persona = null;
      } else {
        _persona = fs.readFileSync(filePath, "utf-8").trim() || null;
      }
    } catch {
      _persona = null;
    }
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

/** Reset all cached config. Called when files in /knowledge change. */
export function invalidateConfigCache(): void {
  _persona = undefined;
  _socials = undefined;
  _card = undefined;
}

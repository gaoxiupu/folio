import fs from "fs";
import path from "path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
const CONFIG_FILE = path.join(KNOWLEDGE_DIR, "github.json");
const CACHE_FILE = path.join(KNOWLEDGE_DIR, ".github-cache.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GithubConfig {
  username: string;
  highlights?: string[];
}

export interface GithubRepoSummary {
  name: string;
  full_name: string;
  description: string | null;
  stars: number;
  language: string | null;
  url: string;
}

export interface GithubProfile {
  login: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  public_repos: number;
  followers: number;
  avatar_url: string;
}

export interface GithubSnapshot {
  fetchedAt: string;
  profile: GithubProfile;
  top_repos: GithubRepoSummary[];
  top_languages: { name: string; percent: number }[];
  highlights: GithubRepoSummary[];
}

// ── Config loader ─────────────────────────────────────────────────────────────

export function loadGithubConfig(): GithubConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<GithubConfig>;
    if (!parsed.username || typeof parsed.username !== "string") return null;
    return {
      username: parsed.username.trim(),
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.filter((h) => typeof h === "string")
        : undefined,
    };
  } catch (e) {
    console.warn("[github-sync] Failed to parse github.json:", e);
    return null;
  }
}

// ── Cache ─────────────────────────────────────────────────────────────────────

function readCache(): GithubSnapshot | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(raw) as GithubSnapshot;
  } catch {
    return null;
  }
}

function writeCache(snap: GithubSnapshot): void {
  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(snap, null, 2), "utf-8");
  } catch (e) {
    console.warn("[github-sync] Failed to write cache:", e);
  }
}

function isCacheFresh(snap: GithubSnapshot | null): boolean {
  if (!snap || !snap.fetchedAt) return false;
  const age = Date.now() - new Date(snap.fetchedAt).getTime();
  return age < CACHE_TTL_MS;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function ghFetch<T>(url: string): Promise<T | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "folio-portfolio-chat",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`[github-sync] ${url} → ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn(`[github-sync] fetch failed ${url}:`, e);
    return null;
  }
}

// ── Main sync ─────────────────────────────────────────────────────────────────

export async function syncGithub(): Promise<GithubSnapshot | null> {
  const config = loadGithubConfig();
  if (!config) return null;

  const cached = readCache();
  if (cached && cached.profile.login === config.username && isCacheFresh(cached)) {
    console.log("[github-sync] Using fresh cache.");
    return cached;
  }

  console.log(`[github-sync] Fetching GitHub data for @${config.username}…`);

  const profile = await ghFetch<GithubProfile>(
    `https://api.github.com/users/${config.username}`,
  );
  if (!profile) {
    console.warn("[github-sync] Failed to fetch profile.");
    return cached;
  }

  const repos = await ghFetch<
    {
      name: string;
      full_name: string;
      description: string | null;
      stargazers_count: number;
      language: string | null;
      html_url: string;
      fork: boolean;
    }[]
  >(
    `https://api.github.com/users/${config.username}/repos?sort=stars&per_page=30&type=owner`,
  );

  const nonForkRepos = (repos ?? []).filter((r) => !r.fork);
  const topRepos: GithubRepoSummary[] = nonForkRepos
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map((r) => ({
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      stars: r.stargazers_count,
      language: r.language,
      url: r.html_url,
    }));

  // language distribution by repo count (simple proxy that avoids extra API calls)
  const langCounts = new Map<string, number>();
  for (const r of nonForkRepos) {
    if (r.language) {
      langCounts.set(r.language, (langCounts.get(r.language) ?? 0) + 1);
    }
  }
  const totalLangCount = Array.from(langCounts.values()).reduce((a, b) => a + b, 0);
  const topLanguages = Array.from(langCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      percent: totalLangCount > 0 ? (count / totalLangCount) * 100 : 0,
    }));

  // highlights lookup
  const highlights: GithubRepoSummary[] = [];
  if (config.highlights && config.highlights.length > 0) {
    for (const name of config.highlights.slice(0, 5)) {
      const match = nonForkRepos.find((r) => r.name === name);
      if (match) {
        highlights.push({
          name: match.name,
          full_name: match.full_name,
          description: match.description,
          stars: match.stargazers_count,
          language: match.language,
          url: match.html_url,
        });
      }
    }
  }

  const snapshot: GithubSnapshot = {
    fetchedAt: new Date().toISOString(),
    profile: {
      login: profile.login,
      name: profile.name,
      bio: profile.bio,
      company: profile.company,
      location: profile.location,
      blog: profile.blog,
      public_repos: profile.public_repos,
      followers: profile.followers,
      avatar_url: profile.avatar_url,
    },
    top_repos: topRepos,
    top_languages: topLanguages,
    highlights,
  };

  writeCache(snapshot);
  return snapshot;
}

// ── In-memory cached accessor for chat route ─────────────────────────────────

let _snapshot: GithubSnapshot | null | undefined;

export function loadGithubSnapshot(): GithubSnapshot | null {
  if (_snapshot !== undefined) return _snapshot;
  _snapshot = readCache();
  return _snapshot;
}

export function invalidateGithubCache(): void {
  _snapshot = undefined;
}

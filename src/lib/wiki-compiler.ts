import fs from "fs";
import path from "path";
import crypto from "crypto";
import pdfParse from "pdf-parse";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
const WIKI_DIR = path.join(process.cwd(), "wiki");
const CACHE_PATH = path.join(WIKI_DIR, ".cache.json");

/** Files to include in compilation (structured configs + unstructured content) */
const COMPILE_EXTENSIONS = /\.(md|txt|pdf|json)$/i;

// ── File helpers ──────────────────────────────────────────────────────────

interface FileHashes {
  [filename: string]: string;
}

function getFileHash(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(buf).digest("hex");
}

function getKnowledgeFiles(): string[] {
  if (!fs.existsSync(KNOWLEDGE_DIR)) return [];
  return fs
    .readdirSync(KNOWLEDGE_DIR)
    .filter(
      (f) =>
        COMPILE_EXTENSIONS.test(f) &&
        !f.startsWith(".") &&
        !f.endsWith(".example") &&
        f.toLowerCase() !== "example.md",
    );
}

async function readFileContent(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const data = await pdfParse(fs.readFileSync(filePath));
    return data.text;
  }
  return fs.readFileSync(filePath, "utf-8");
}

// ── Cache logic ───────────────────────────────────────────────────────────

function loadCache(): FileHashes {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    }
  } catch {
    /* ignore corrupt cache */
  }
  return {};
}

function saveCache(hashes: FileHashes): void {
  if (!fs.existsSync(WIKI_DIR)) {
    fs.mkdirSync(WIKI_DIR, { recursive: true });
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(hashes, null, 2));
}

function computeCurrentHashes(): FileHashes {
  const hashes: FileHashes = {};
  for (const file of getKnowledgeFiles()) {
    hashes[file] = getFileHash(path.join(KNOWLEDGE_DIR, file));
  }
  return hashes;
}

function hashesEqual(a: FileHashes, b: FileHashes): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k, i) => k === keysB[i] && a[k] === b[k]);
}

// ── Page parser ───────────────────────────────────────────────────────────

function parsePages(raw: string): Map<string, string> {
  const pages = new Map<string, string>();
  // Match ---PAGE: filename.md--- followed by content until next ---PAGE: or end
  const regex = /---PAGE:\s*(\S+?)---\n([\s\S]*?)(?=\n---PAGE:|$)/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const filename = match[1].trim();
    const content = match[2].trim();
    if (filename && content) {
      pages.set(filename, content);
    }
  }
  return pages;
}

// ── Compiler prompt ───────────────────────────────────────────────────────

const COMPILER_SYSTEM = `你是一个知识库编译器。你的任务是将原始文件编译为一组结构化的 wiki 页面。

规则：
1. 按主题组织页面（个人概述、工作经历、项目经验、教育背景、联系方式等）
2. 跨文件关联信息（比如简历中的项目与相关经历的对应关系）
3. 保留具体数据（数字、时间、公司名等不要模糊化）
4. 去除格式噪音，生成干净的 markdown
5. 每个页面保持精炼，避免冗余重复
6. 最后生成一个 index.md，格式为每行：- filename.md: 一句话摘要

输出格式（严格遵守，每个页面用分隔符标记）：
---PAGE: filename.md---
（markdown 内容）
---PAGE: next-file.md---
（markdown 内容）
---PAGE: index.md---
（索引内容）`;

// ── Main compile function ─────────────────────────────────────────────────

export async function compileWiki(): Promise<void> {
  const files = getKnowledgeFiles();
  if (files.length === 0) {
    console.warn("[wiki-compiler] No files in knowledge/ — skipping.");
    return;
  }

  // Check cache
  const currentHashes = computeCurrentHashes();
  const cachedHashes = loadCache();
  const indexExists = fs.existsSync(path.join(WIKI_DIR, "index.md"));

  if (indexExists && hashesEqual(currentHashes, cachedHashes)) {
    console.log("[wiki-compiler] Wiki up to date — skipping compilation.");
    return;
  }

  console.log("[wiki-compiler] Compiling wiki from knowledge files…");

  // Read all file contents
  const sections: string[] = [];
  for (const file of files) {
    try {
      const content = await readFileContent(path.join(KNOWLEDGE_DIR, file));
      sections.push(`=== ${file} ===\n${content}`);
    } catch (e) {
      console.warn(`[wiki-compiler] Failed to read ${file}:`, e);
    }
  }

  if (sections.length === 0) {
    console.warn("[wiki-compiler] No readable files — aborting.");
    return;
  }

  const rawInput = sections.join("\n\n");

  // Call LLM
  const ark = createOpenAI({
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    apiKey: process.env.ARK_API_KEY,
  });

  try {
    const { text } = await generateText({
      model: ark("doubao-seed-2-0-pro-260215"),
      system: COMPILER_SYSTEM,
      prompt: `原始资料：\n\n${rawInput}`,
    });

    // Parse and write pages
    const pages = parsePages(text);

    if (pages.size === 0) {
      console.warn(
        "[wiki-compiler] LLM output could not be parsed into pages. Raw output saved to wiki/.raw-output.txt",
      );
      if (!fs.existsSync(WIKI_DIR)) fs.mkdirSync(WIKI_DIR, { recursive: true });
      fs.writeFileSync(path.join(WIKI_DIR, ".raw-output.txt"), text);
      return;
    }

    if (!fs.existsSync(WIKI_DIR)) fs.mkdirSync(WIKI_DIR, { recursive: true });

    // Clean old pages (keep .cache.json and .raw-output.txt)
    for (const f of fs.readdirSync(WIKI_DIR)) {
      if (f.endsWith(".md")) {
        fs.unlinkSync(path.join(WIKI_DIR, f));
      }
    }

    // Write new pages
    const pageNames: string[] = [];
    pages.forEach((content, filename) => {
      fs.writeFileSync(path.join(WIKI_DIR, filename), content);
      pageNames.push(filename);
    });

    // Update cache
    saveCache(currentHashes);

    console.log(
      `[wiki-compiler] Done — ${pages.size} page(s) compiled (${pageNames.join(", ")}).`,
    );
  } catch (e) {
    console.error("[wiki-compiler] Compilation failed:", e);
    throw e;
  }
}

/** Check if the wiki has been compiled (index.md exists). */
export function isWikiCompiled(): boolean {
  return fs.existsSync(path.join(WIKI_DIR, "index.md"));
}

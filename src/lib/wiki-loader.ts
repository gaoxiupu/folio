import fs from "fs";
import path from "path";

const WIKI_DIR = path.join(process.cwd(), "wiki");

/** Rough token estimate: ~4 chars per token for mixed CJK/English. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/**
 * Load wiki context for the chat prompt.
 *
 * Progressive disclosure:
 * - Small wiki (under threshold): load all pages
 * - Large wiki (over threshold): load index + relevant pages (future)
 *
 * Returns formatted markdown string, or empty string if wiki not compiled.
 */
export function loadWikiContext(): string {
  if (!fs.existsSync(WIKI_DIR)) {
    console.warn("[wiki-loader] wiki/ not found — run compile-wiki first.");
    return "";
  }

  const indexPath = path.join(WIKI_DIR, "index.md");
  if (!fs.existsSync(indexPath)) {
    console.warn("[wiki-loader] wiki/index.md not found — wiki not compiled.");
    return "";
  }

  const indexContent = fs.readFileSync(indexPath, "utf-8").trim();

  // Collect all wiki pages (excluding meta files)
  const pageFiles = fs
    .readdirSync(WIKI_DIR)
    .filter((f) => f.endsWith(".md") && f !== "index.md");

  if (pageFiles.length === 0) {
    return indexContent;
  }

  // Read all pages and estimate total size
  const pages: { filename: string; content: string; tokens: number }[] = [];
  let totalTokens = 0;

  for (const file of pageFiles) {
    const content = fs.readFileSync(path.join(WIKI_DIR, file), "utf-8").trim();
    const tokens = estimateTokens(content);
    pages.push({ filename: file, content, tokens });
    totalTokens += tokens;
  }

  const threshold = parseInt(
    process.env.WIKI_FULL_LOAD_THRESHOLD || "8000",
    10,
  );

  if (totalTokens <= threshold) {
    // Full load: all pages
    let context = `# Knowledge Index\n${indexContent}\n\n`;
    for (const page of pages) {
      context += `## ${page.filename}\n${page.content}\n\n`;
    }
    return context.trim();
  }

  // Future: selective loading based on query keywords
  // For now, load index + first 4 most relevant pages
  let context = `# Knowledge Index\n${indexContent}\n\n`;
  for (const page of pages.slice(0, 4)) {
    context += `## ${page.filename}\n${page.content}\n\n`;
  }
  return context.trim();
}

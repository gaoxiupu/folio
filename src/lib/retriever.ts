import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { embedOne } from "./embeddings";

const DB_PATH = path.join(process.cwd(), "vector.db");
const TOP_K = 5;

export async function retrieve(query: string): Promise<string> {
  if (!fs.existsSync(DB_PATH)) {
    console.warn("[retriever] vector.db not found — returning empty context.");
    return "";
  }

  const vec = await embedOne(query);

  const { load: vssLoad } = await import("sqlite-vss");
  const db = new Database(DB_PATH, { readonly: true });
  vssLoad(db);

  const rows = db
    .prepare(
      `SELECT c.text, c.source
       FROM chunks c
       WHERE c.id IN (
         SELECT rowid FROM vss_chunks
         WHERE vss_search(embedding, ?)
         LIMIT ?
       )`
    )
    .all(JSON.stringify(vec), TOP_K) as { text: string; source: string }[];

  db.close();

  if (rows.length === 0) return "";

  return rows.map((r) => `[${r.source}]\n${r.text}`).join("\n\n---\n\n");
}

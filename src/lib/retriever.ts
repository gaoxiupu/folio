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

  const db = new Database(DB_PATH, { readonly: true });
  const extPath = path.join(
    process.cwd(), "node_modules",
    `sqlite-vec-${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`,
    process.platform === "win32" ? "vec0.dll" : process.platform === "darwin" ? "vec0.dylib" : "vec0.so"
  );
  db.loadExtension(extPath);

  const rows = db
    .prepare(
      `SELECT c.text, c.source
       FROM chunks c
       WHERE c.id IN (
         SELECT rowid FROM vec_chunks
         WHERE embedding MATCH ?
         ORDER BY distance
         LIMIT ?
       )`
    )
    .all(new Float32Array(vec), TOP_K) as { text: string; source: string }[];

  db.close();

  if (rows.length === 0) return "";

  return rows.map((r) => `[${r.source}]\n${r.text}`).join("\n\n---\n\n");
}

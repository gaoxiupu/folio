import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { cachedEmbed } from "./embeddings";

const DB_PATH = path.join(process.cwd(), "vector.db");
const TOP_K = 5;

// ── DB singleton ──
let dbInstance: Database.Database | null = null;

function getExtPath(): string {
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const ext = process.platform === "win32" ? "vec0.dll"
    : process.platform === "darwin" ? "vec0.dylib" : "vec0.so";
  return path.join(
    process.cwd(), "node_modules",
    `sqlite-vec-${platform}-${process.arch}`, ext,
  );
}

function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  const db = new Database(DB_PATH, { readonly: true });
  db.loadExtension(getExtPath());
  dbInstance = db;
  return db;
}

/** Call from indexer after rebuilding the DB so stale handles are dropped. */
export function invalidateDbCache(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function retrieve(query: string): Promise<string> {
  if (!fs.existsSync(DB_PATH)) {
    console.warn("[retriever] vector.db not found — returning empty context.");
    return "";
  }

  const vec = await cachedEmbed(query);
  const db = getDb();

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

  if (rows.length === 0) return "";

  return rows.map((r) => `[${r.source}]\n${r.text}`).join("\n\n---\n\n");
}

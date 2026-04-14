import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import pdfParse from "pdf-parse";
import { embedOne, EMBEDDING_DIM } from "./embeddings";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
const DB_PATH = path.join(process.cwd(), "vector.db");
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const content = text.slice(start, start + CHUNK_SIZE).trim();
    if (content.length > 0) chunks.push(content);
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function readFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const data = await pdfParse(fs.readFileSync(filePath));
    return data.text;
  }
  return fs.readFileSync(filePath, "utf-8");
}

export async function buildIndex(): Promise<void> {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    console.warn("[indexer] knowledge/ not found — skipping.");
    return;
  }

  const files = fs
    .readdirSync(KNOWLEDGE_DIR)
    .filter((f) => /\.(md|txt|pdf)$/i.test(f));

  if (files.length === 0) {
    console.warn("[indexer] No files in knowledge/ — skipping.");
    return;
  }

  const { load: vssLoad } = await import("sqlite-vss");
  const db = new Database(DB_PATH);
  vssLoad(db);

  // Rebuild from scratch each run to keep index in sync with files
  db.exec(`
    DROP TABLE IF EXISTS chunks;
    DROP TABLE IF EXISTS vss_chunks;
    CREATE TABLE chunks (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      text  TEXT    NOT NULL,
      source TEXT   NOT NULL
    );
    CREATE VIRTUAL TABLE vss_chunks USING vss0(embedding(${EMBEDDING_DIM}));
  `);

  const insertChunk = db.prepare(
    "INSERT INTO chunks (text, source) VALUES (?, ?)"
  );
  const insertVec = db.prepare(
    "INSERT INTO vss_chunks (rowid, embedding) VALUES (?, ?)"
  );

  for (const file of files) {
    console.log(`[indexer] Processing ${file}…`);
    const text = await readFile(path.join(KNOWLEDGE_DIR, file));
    for (const chunk of chunkText(text)) {
      const { lastInsertRowid } = insertChunk.run(chunk, file);
      const vec = await embedOne(chunk);
      insertVec.run(lastInsertRowid, JSON.stringify(vec));
    }
  }

  db.close();
  console.log(`[indexer] Done — ${files.length} file(s) indexed.`);
}

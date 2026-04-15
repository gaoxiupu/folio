const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const EMBEDDING_MODEL = "doubao-embedding-vision-251215";

export const EMBEDDING_DIM = 2048;

export type TextBlock = { type: "text"; text: string };
export type ImageBlock = { type: "image_url"; image_url: { url: string } };
export type ContentBlock = TextBlock | ImageBlock;

/**
 * Embed a list of content blocks (text and/or images) in a single call.
 * Returns a single embedding vector.
 */
export async function embedBlocks(blocks: ContentBlock[]): Promise<number[]> {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) throw new Error("ARK_API_KEY is not set");

  const res = await fetch(`${ARK_BASE_URL}/embeddings/multimodal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: blocks }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Doubao embedding error ${res.status}: ${err}`);
  }

  const json = (await res.json()) as { data: { embedding: number[] } };
  return json.data.embedding;
}

/** Embed a plain text string. */
export async function embedOne(text: string): Promise<number[]> {
  return embedBlocks([{ type: "text", text }]);
}

// ── LRU embedding cache ──
const MAX_CACHE = 200;
const embedCache = new Map<string, number[]>();

function cacheKey(text: string): string {
  return text.trim().toLowerCase();
}

/** embedOne with in-memory LRU cache. Evicts oldest when full. */
export async function cachedEmbed(text: string): Promise<number[]> {
  const key = cacheKey(text);
  const hit = embedCache.get(key);
  if (hit) {
    // move to end (most-recently used)
    embedCache.delete(key);
    embedCache.set(key, hit);
    return hit;
  }
  const vec = await embedOne(text);
  if (embedCache.size >= MAX_CACHE) {
    // evict oldest entry (first key)
    const firstKey = embedCache.keys().next().value;
    if (firstKey !== undefined) embedCache.delete(firstKey);
  }
  embedCache.set(key, vec);
  return vec;
}

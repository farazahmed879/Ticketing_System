/**
 * Semantic embeddings via Google's Gemini embedding API (text-embedding-004).
 *
 * Replaces the previous in-process BGE model (Transformers.js), which loaded a
 * ~440MB model into RAM and OOM-killed small cloud instances. This is a plain
 * HTTP call — near-zero memory — so the backend runs fine on a 512MB box.
 *
 * Uses global fetch (no npm dep). Requires GEMINI_API_KEY in the environment.
 */

const MODEL = "gemini-embedding-001";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`;

// Truncated output dimensionality (model supports 128–3072 via Matryoshka).
// 768 keeps vectors lean while retaining quality; we L2-normalize below since
// reduced dimensions aren't pre-normalized.
const OUTPUT_DIM = 768;

// Keep input well under the model's token cap.
const MAX_CHARS = 2000;

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

/** L2-normalize so cosineSimilarity can be a plain dot product. */
function normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum);
  if (norm === 0) return v;
  return v.map((x) => x / norm);
}

async function embed(text: string, taskType: string): Promise<number[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: `models/${MODEL}`,
      content: { parts: [{ text: text.slice(0, MAX_CHARS) }] },
      taskType,
      outputDimensionality: OUTPUT_DIM,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Gemini embed failed (${res.status}): ${await res.text()}`,
    );
  }
  const data = (await res.json()) as { embedding?: { values?: number[] } };
  const values = data.embedding?.values;
  if (!values || !values.length) {
    throw new Error("Gemini embed returned no vector");
  }
  return normalize(values);
}

/** Embed a candidate profile (stored). Returns [] for empty input. */
export async function embedProfile(text: string): Promise<number[]> {
  if (!text || !text.trim()) return [];
  return embed(text, "RETRIEVAL_DOCUMENT");
}

/** Embed a search query. Returns [] for empty input. */
export async function embedQuery(text: string): Promise<number[]> {
  if (!text || !text.trim()) return [];
  return embed(text, "RETRIEVAL_QUERY");
}

/**
 * Cosine similarity. Vectors are L2-normalized above, so this is a dot product.
 * Returns 0 if either vector is missing/empty or lengths mismatch.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export const embeddingService = { embedProfile, embedQuery, cosineSimilarity };

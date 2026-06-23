/**
 * Local semantic embeddings via BGE (bge-small-en-v1.5) running in-process
 * through Transformers.js. No external API, no key, no Python — the model runs
 * on CPU inside this Node backend.
 *
 * Used for the topic/skill-matching layer of AI search: we embed each
 * candidate's profile at write time and the query at search time, then rank by
 * cosine similarity. This is what makes "frontend" match "front-end engineer".
 */

const MODEL_ID = "Xenova/bge-base-en-v1.5";

// bge retrieval queries get an instruction prefix; passages (the stored
// profiles) do not. See the model card.
const QUERY_INSTRUCTION =
  "Represent this sentence for searching relevant passages: ";

// Cap input length — bge handles ~512 tokens; trim to stay well under.
const MAX_CHARS = 1800;

// Transformers.js is ESM-only. This backend is CommonJS, and ts-node/tsc would
// downlevel a normal `import()` into `require()` and break it — so route the
// dynamic import through `new Function` to keep it a real ESM import at runtime.
const esmImport = new Function("s", "return import(s)") as (
  s: string,
) => Promise<any>;

let extractorPromise: Promise<any> | null = null;
function getExtractor(): Promise<any> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await esmImport("@huggingface/transformers");
      return pipeline("feature-extraction", MODEL_ID);
    })();
  }
  return extractorPromise;
}

async function embed(text: string, isQuery: boolean): Promise<number[]> {
  const input = (isQuery ? QUERY_INSTRUCTION : "") + text.slice(0, MAX_CHARS);
  const extractor = await getExtractor();
  const out = await extractor(input, { pooling: "mean", normalize: true });
  return Array.from(out.data as Float32Array);
}

/** Embed a candidate profile (stored). Returns [] for empty input. */
export async function embedProfile(text: string): Promise<number[]> {
  if (!text || !text.trim()) return [];
  return embed(text, false);
}

/** Embed a search query (topic text). Returns [] for empty input. */
export async function embedQuery(text: string): Promise<number[]> {
  if (!text || !text.trim()) return [];
  return embed(text, true);
}

/**
 * Cosine similarity. Vectors from BGE are L2-normalized, so this is just a dot
 * product. Returns 0 if either vector is missing/empty or lengths mismatch.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/** Eagerly load the model (e.g. at server startup) so the first search is fast. */
export async function warmupEmbeddings(): Promise<void> {
  await getExtractor();
}

export const embeddingService = {
  embedProfile,
  embedQuery,
  cosineSimilarity,
  warmupEmbeddings,
};

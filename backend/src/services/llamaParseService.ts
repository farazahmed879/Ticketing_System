/**
 * Resume file -> clean text via LlamaParse (LlamaCloud).
 *
 * Replaces the basic pdf-parse/mammoth extraction. LlamaParse handles
 * multi-column layouts, tables, and scanned/image PDFs (OCR) — producing much
 * cleaner text for the downstream Claude enrichment + BGE embedding.
 *
 * Uses the REST API directly (global fetch/FormData — no new npm deps).
 * Requires LLAMA_CLOUD_API_KEY in the environment.
 */

const BASE = "https://api.cloud.llamaindex.ai/api/v1/parsing";
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 90_000;

function apiKey(): string {
  const key = process.env.LLAMA_CLOUD_API_KEY;
  if (!key) throw new Error("LLAMA_CLOUD_API_KEY is not set");
  return key;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Extract text from a resume file buffer. Throws on failure (the caller decides
 * whether to fall back to the basic parser).
 */
async function extractText(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> {
  const key = apiKey();

  // 1) Upload the file -> returns a job id.
  const form = new FormData();
  // Wrap in a fresh Uint8Array so the Blob ctor accepts it under strict
  // @types/node (Node Buffer's ArrayBufferLike isn't assignable to BlobPart).
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: mimetype }),
    filename,
  );

  const uploadRes = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    body: form,
  });
  if (!uploadRes.ok) {
    throw new Error(
      `LlamaParse upload failed (${uploadRes.status}): ${await uploadRes.text()}`,
    );
  }
  const { id } = (await uploadRes.json()) as { id: string };
  if (!id) throw new Error("LlamaParse upload returned no job id");

  // 2) Poll the job until it finishes.
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const jobRes = await fetch(`${BASE}/job/${id}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!jobRes.ok) {
      throw new Error(`LlamaParse job poll failed (${jobRes.status})`);
    }
    const { status } = (await jobRes.json()) as { status: string };
    if (status === "SUCCESS") break;
    if (status === "ERROR" || status === "FAILED" || status === "CANCELLED") {
      throw new Error(`LlamaParse job ${status}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }

  // 3) Fetch the parsed result as markdown text.
  const resultRes = await fetch(`${BASE}/job/${id}/result/markdown`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!resultRes.ok) {
    throw new Error(`LlamaParse result fetch failed (${resultRes.status})`);
  }
  const { markdown } = (await resultRes.json()) as { markdown: string };
  return (markdown || "").trim();
}

export const llamaParseService = { extractText };

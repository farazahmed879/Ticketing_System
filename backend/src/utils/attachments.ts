const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2 MB binary, after base64 decode

// Images plus common document types. Document data URLs carry the original
// filename as a `;name=` parameter, and `;gzip=1` when the browser gzipped
// them (the size limit then applies to the compressed bytes). Same allow-list as chat attachments and the
// frontend utils/attachments.ts.
const ALLOWED_ATTACHMENT_RE =
  /^data:(?:image\/(?:png|jpe?g|webp|gif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(?:wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|application\/vnd\.ms-excel|application\/vnd\.ms-powerpoint|text\/(?:plain|csv)|application\/(?:zip|x-zip-compressed))(?:;name=[A-Za-z0-9%!'()*._~-]*)?(?:;gzip=1)?;base64,/i;

/**
 * Validates image/document data-URL attachments. Returns undefined when the
 * field was not sent (so updates leave existing attachments untouched) and
 * throws a 400-style error on anything invalid.
 */
export function validateFileAttachments(attachments: unknown): string[] | undefined {
  if (attachments === undefined || attachments === null) return undefined;
  const fail = (message: string) => Object.assign(new Error(message), { status: 400 });
  if (!Array.isArray(attachments)) throw fail("attachments must be an array.");
  if (attachments.length > MAX_ATTACHMENTS) {
    throw fail(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
  }
  for (const a of attachments) {
    if (typeof a !== "string" || !ALLOWED_ATTACHMENT_RE.test(a)) {
      throw fail("Unsupported attachment. Allowed: images, PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP.");
    }
    const base64 = a.split(",")[1] || "";
    const padding = (base64.match(/=+$/) || [""])[0].length;
    if ((base64.length * 3) / 4 - padding > MAX_ATTACHMENT_BYTES) {
      throw fail("Each attachment must be 2MB or smaller.");
    }
  }
  return attachments as string[];
}

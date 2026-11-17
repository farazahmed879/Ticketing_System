export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_MIME_RE = /^image\/(png|jpe?g|webp|gif)$/i;
export const ACCEPT_ATTRIBUTE = "image/png,image/jpeg,image/webp,image/gif";

// Documents allowed in chat (images plus these). Kept in sync with the
// backend socket sanitizer in socketio/events.ts.
export const ALLOWED_DOCUMENT_MIME_RE =
  /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|application\/vnd\.ms-excel|application\/vnd\.ms-powerpoint|text\/(plain|csv)|application\/(zip|x-zip-compressed))$/i;

export const CHAT_ACCEPT_ATTRIBUTE = `${ACCEPT_ATTRIBUTE},.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip`;

/**
 * Parse a chat attachment data URL. File attachments carry their original
 * filename as a `;name=` parameter: `data:<mime>;name=<encoded>;base64,...`.
 */
export function parseChatAttachment(src: string): {
  isImage: boolean;
  name: string | null;
  mime: string | null;
  /** Bytes are gzip-compressed (see `optimize` in readAttachmentFiles). */
  gzipped: boolean;
} {
  const m = /^data:([^;,]+)(?:;name=([^;,]*))?(;gzip=1)?;base64,/i.exec(src);
  const mime = m?.[1] || null;
  let name: string | null = null;
  if (m?.[2]) {
    try {
      name = decodeURIComponent(m[2]);
    } catch {
      name = m[2];
    }
  }
  return {
    isImage: !!mime && /^image\//i.test(mime),
    name,
    mime,
    gzipped: !!m?.[3],
  };
}

/**
 * Sidebar preview text for a chat message: the body when present, otherwise a
 * label derived from the first attachment (filename for documents, a photo
 * label for images).
 */
export function chatMessagePreview(
  body?: string,
  attachments?: string[],
): string {
  if (body) return body;
  if (!attachments || attachments.length === 0) return "";
  const { isImage, name } = parseChatAttachment(attachments[0]);
  if (name) return name;
  if (isImage) {
    return attachments.length > 1
      ? `📷 ${attachments.length} Photos`
      : "📷 Photo";
  }
  return "📎 File";
}

export function validateAttachmentFile(file: File): string | null {
  if (!ALLOWED_MIME_RE.test(file.type)) {
    return "Only PNG, JPEG, WebP, or GIF images are allowed.";
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return "Each image must be 2MB or smaller.";
  }
  return null;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize and re-encode an image to keep stored payload small.
 *
 * - Caps dimensions at `maxDim`×`maxDim` (default 1600, preserving aspect ratio).
 * - Re-encodes JPEG/WebP/etc as JPEG at quality 0.85.
 * - Preserves PNG transparency (PNG in → PNG out, just resized).
 * - Skips GIFs (canvas would flatten any animation).
 */
export async function compressImage(
  file: File,
  maxDim: number = 1600,
): Promise<string> {
  // Animated formats: don't run through canvas or animation is lost.
  if (file.type === "image/gif") {
    return fileToDataUrl(file);
  }

  const MAX_DIM = maxDim;
  const isPng = file.type === "image/png";
  const outputType = isPng ? "image/png" : "image/jpeg";
  const quality = isPng ? undefined : 0.85;

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(outputType, quality);
        resolve(dataUrl);
      } catch (err) {
        reject(err as Error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
}

/**
 * Read multiple File objects into data URLs, validating each.
 * Returns { accepted: string[], errors: string[] }.
 * Enforces MAX_ATTACHMENTS across the existing + incoming arrays.
 */
export async function readAttachmentFiles(
  files: FileList | File[],
  existingCount: number,
  options?: {
    allowDocuments?: boolean;
    /**
     * Stronger compression: images become size-targeted WebP (so photos up to
     * MAX_OPTIMIZE_INPUT_SIZE are accepted), documents are gzipped when that
     * actually helps. The 2MB limit then applies to the compressed result.
     */
    optimize?: boolean;
  },
): Promise<{ accepted: string[]; errors: string[] }> {
  const allowDocuments = options?.allowDocuments ?? false;
  const optimize = options?.optimize ?? false;
  const list = Array.from(files);
  const errors: string[] = [];
  const accepted: string[] = [];
  const slotsLeft = MAX_ATTACHMENTS - existingCount;
  if (slotsLeft <= 0) {
    errors.push(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
    return { accepted, errors };
  }
  const toProcess = list.slice(0, slotsLeft);
  if (list.length > slotsLeft) {
    errors.push(
      `Only the first ${slotsLeft} file(s) added — limit of ${MAX_ATTACHMENTS} reached.`,
    );
  }
  for (const file of toProcess) {
    const isImage = ALLOWED_MIME_RE.test(file.type);
    const isDocument =
      allowDocuments && ALLOWED_DOCUMENT_MIME_RE.test(file.type);

    if (!isImage && !isDocument) {
      errors.push(
        `${file.name}: ${
          allowDocuments
            ? "Unsupported file type. Allowed: images, PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP."
            : "Only PNG, JPEG, WebP, or GIF images are allowed."
        }`,
      );
      continue;
    }
    if (optimize) {
      if (file.size > MAX_OPTIMIZE_INPUT_SIZE) {
        errors.push(`${file.name}: File must be 15MB or smaller.`);
        continue;
      }
      try {
        const dataUrl = isImage
          ? await optimizeImage(file)
          : await gzipDocument(file);
        if (dataUrlBytes(dataUrl) > MAX_ATTACHMENT_SIZE) {
          errors.push(`${file.name}: Still larger than 2MB after compression.`);
          continue;
        }
        accepted.push(dataUrl);
      } catch {
        errors.push(`${file.name}: failed to read file.`);
      }
      continue;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      errors.push(`${file.name}: Each file must be 2MB or smaller.`);
      continue;
    }
    try {
      if (isImage) {
        accepted.push(await compressImage(file));
      } else {
        // Embed the original filename in the data URL so it survives storage.
        const dataUrl = await fileToDataUrl(file);
        accepted.push(
          dataUrl.replace(
            /^data:([^;,]+)/,
            (_all, mime) => `data:${mime};name=${encodeURIComponent(file.name)}`,
          ),
        );
      }
    } catch {
      errors.push(`${file.name}: failed to read file.`);
    }
  }
  return { accepted, errors };
}

// ---------------------------------------------------------------------------
// Stronger compression (opt-in via `optimize`)
// ---------------------------------------------------------------------------

/** Largest original file accepted when `optimize` is on (it gets compressed). */
export const MAX_OPTIMIZE_INPUT_SIZE = 15 * 1024 * 1024;
/** Images are squeezed until they fit this size (or hit the size floor). */
const IMAGE_TARGET_BYTES = 400 * 1024;
const IMAGE_MAX_DIM = 1600;
const IMAGE_MIN_DIM = 640;
const QUALITY_STEPS = [0.82, 0.72, 0.62];

/** Decoded byte size of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = (base64.match(/=+$/) || [""])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/**
 * Re-encode an image as WebP (keeps PNG transparency), lowering quality and
 * then dimensions until it fits IMAGE_TARGET_BYTES. Falls back to JPEG/PNG on
 * browsers that can't encode WebP. GIFs are kept as-is to preserve animation.
 * Never returns something bigger than the original.
 */
export async function optimizeImage(file: File): Promise<string> {
  const original = await fileToDataUrl(file);
  if (file.type === "image/gif") return original;

  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return original;

  const hasAlpha = file.type === "image/png";
  let scale = Math.min(1, IMAGE_MAX_DIM / Math.max(img.width, img.height));
  let best = original;

  for (;;) {
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const quality of QUALITY_STEPS) {
      let out = canvas.toDataURL("image/webp", quality);
      // Browsers without a WebP encoder silently return PNG.
      if (!out.startsWith("data:image/webp")) {
        out = hasAlpha
          ? canvas.toDataURL("image/png")
          : canvas.toDataURL("image/jpeg", quality);
      }
      if (dataUrlBytes(out) < dataUrlBytes(best)) best = out;
      if (dataUrlBytes(best) <= IMAGE_TARGET_BYTES) return best;
    }

    if (Math.max(canvas.width, canvas.height) <= IMAGE_MIN_DIM) return best;
    scale *= 0.75;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Document as a data URL that keeps its filename. Gzipped (marked `;gzip=1`)
 * only when that saves at least 10% - PDF/DOCX/XLSX/ZIP are already compressed.
 */
export async function gzipDocument(file: File): Promise<string> {
  const mime = file.type || "application/octet-stream";
  const prefix = `data:${mime};name=${encodeURIComponent(file.name)}`;
  const raw = new Uint8Array(await file.arrayBuffer());

  if (typeof CompressionStream !== "undefined") {
    const gz = new Uint8Array(
      await new Response(
        new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip")),
      ).arrayBuffer(),
    );
    if (gz.length < raw.length * 0.9) {
      return `${prefix};gzip=1;base64,${bytesToBase64(gz)}`;
    }
  }
  return `${prefix};base64,${bytesToBase64(raw)}`;
}

/** Original file contents of an attachment (un-gzipping when needed). */
export async function attachmentToBlob(src: string): Promise<Blob> {
  const { mime, gzipped } = parseChatAttachment(src);
  const bytes = base64ToBytes(src.slice(src.indexOf(",") + 1));
  const type = mime || "application/octet-stream";
  if (!gzipped) return new Blob([bytes], { type });
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Blob([await new Response(stream).arrayBuffer()], { type });
}

/** Save an attachment to disk under its original name. */
export async function downloadAttachment(src: string, fallbackName = "file") {
  const { name } = parseChatAttachment(src);
  const url = URL.createObjectURL(await attachmentToBlob(src));
  const a = document.createElement("a");
  a.href = url;
  a.download = name || fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

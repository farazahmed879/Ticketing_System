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
} {
  const m = /^data:([^;,]+)(?:;name=([^;,]*))?;base64,/i.exec(src);
  const mime = m?.[1] || null;
  let name: string | null = null;
  if (m?.[2]) {
    try {
      name = decodeURIComponent(m[2]);
    } catch {
      name = m[2];
    }
  }
  return { isImage: !!mime && /^image\//i.test(mime), name, mime };
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
  options?: { allowDocuments?: boolean },
): Promise<{ accepted: string[]; errors: string[] }> {
  const allowDocuments = options?.allowDocuments ?? false;
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

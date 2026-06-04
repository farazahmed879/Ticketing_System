export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_MIME_RE = /^image\/(png|jpe?g|webp|gif)$/i;
export const ACCEPT_ATTRIBUTE = "image/png,image/jpeg,image/webp,image/gif";

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
 * - Caps dimensions at 1600x1600 (preserving aspect ratio).
 * - Re-encodes JPEG/WebP/etc as JPEG at quality 0.85.
 * - Preserves PNG transparency (PNG in → PNG out, just resized).
 * - Skips GIFs (canvas would flatten any animation).
 */
export async function compressImage(file: File): Promise<string> {
  // Animated formats: don't run through canvas or animation is lost.
  if (file.type === "image/gif") {
    return fileToDataUrl(file);
  }

  const MAX_DIM = 1600;
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
): Promise<{ accepted: string[]; errors: string[] }> {
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
    const err = validateAttachmentFile(file);
    if (err) {
      errors.push(`${file.name}: ${err}`);
      continue;
    }
    try {
      const dataUrl = await compressImage(file);
      accepted.push(dataUrl);
    } catch {
      errors.push(`${file.name}: failed to read file.`);
    }
  }
  return { accepted, errors };
}

import DOMPurify from "dompurify";

/**
 * Allowlist for user-authored rich text (timesheet task descriptions, which
 * are also reused by announcements, departments and dashboard moments).
 * Matches what the TaskDescriptionEditor produces via execCommand: basic
 * formatting, lists, checklists (data-task-* attrs) and indent blockquotes.
 * Everything else — scripts, event handlers, links, images, iframes, forms —
 * is stripped.
 */
const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: [
    "b", "strong", "i", "em", "u", "s", "strike", "code", "pre",
    "ul", "ol", "li", "div", "p", "br", "span", "blockquote", "input",
  ],
  ALLOWED_ATTR: [
    "data-task-list", "data-task-item", "data-checked",
    "style", "type", "checked", "disabled",
  ],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitizes untrusted HTML. Must run BEFORE the string touches innerHTML /
 * dangerouslySetInnerHTML — even a detached element created with
 * document.createElement fires <img onerror> handlers when parsed.
 */
export function sanitizeRichHtml(html: string): string {
  if (!html) return "";
  const clean = DOMPurify.sanitize(html, RICH_TEXT_CONFIG) as string;
  // Only checkbox inputs are meaningful in task descriptions.
  if (!clean.includes("<input")) return clean;
  const doc = new DOMParser().parseFromString(clean, "text/html");
  doc.body.querySelectorAll("input").forEach((el) => {
    if (el.getAttribute("type") !== "checkbox") el.remove();
  });
  return doc.body.innerHTML;
}

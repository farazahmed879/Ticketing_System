const HTML_TAG_REGEX =
  /<\/?(strong|b|em|i|code|ul|ol|li|div|p|br|span|input)\b/i;

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatInlineMarkdownToHtml(escapedText: string): string {
  return escapedText
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
}

export function isRichHtml(value: string): boolean {
  return HTML_TAG_REGEX.test(value);
}

/**
 * Converts plain text or legacy Markdown (including stacked markers like `1. • item`)
 * into clean rich HTML for the WYSIWYG editor and display views.
 */
export function markdownToHtml(raw: string): string {
  if (!raw || !raw.trim()) return "";

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let listMode: "ul" | "ol" | "task" | null = null;

  const closeList = () => {
    if (listMode === "ul" || listMode === "task") {
      out.push("</ul>");
    } else if (listMode === "ol") {
      out.push("</ol>");
    }
    listMode = null;
  };

  for (const line of lines) {
    // 1. Checklist item: `- [ ] task`, `- [x] task`, `• - [ ] task`, `1. - [ ] task`
    const taskMatch = line.match(
      /^\s*(?:\d+\.\s*)?(?:[•\-*]\s+)?(?:-?\s*\[([ xX])\]\s*)(.*)$/
    );
    if (taskMatch) {
      const checked = taskMatch[1].toLowerCase() === "x";
      const content = formatInlineMarkdownToHtml(escapeHtml(taskMatch[2]));
      if (listMode !== "task") {
        closeList();
        out.push('<ul data-task-list="true">');
        listMode = "task";
      }
      out.push(
        `<li data-task-item="true" data-checked="${checked}">${content || "<br>"}</li>`
      );
      continue;
    }

    // 2. Numbered list item: `1. text` or `1. • text` (strips accidental stacked bullet)
    const olMatch = line.match(/^\s*\d+\.\s+(?:[•\-*]\s+)?(.*)$/);
    if (olMatch) {
      const content = formatInlineMarkdownToHtml(escapeHtml(olMatch[1]));
      if (listMode !== "ol") {
        closeList();
        out.push("<ol>");
        listMode = "ol";
      }
      out.push(`<li>${content || "<br>"}</li>`);
      continue;
    }

    // 3. Bullet list item: `• text`, `- text`, `* text` (not bold/italic `*text*`)
    const ulMatch = line.match(/^\s*(?:•|-|\*)\s+(?:\d+\.\s+)?(.*)$/);
    if (ulMatch) {
      const content = formatInlineMarkdownToHtml(escapeHtml(ulMatch[1]));
      if (listMode !== "ul") {
        closeList();
        out.push("<ul>");
        listMode = "ul";
      }
      out.push(`<li>${content || "<br>"}</li>`);
      continue;
    }

    // 4. Regular paragraph / line
    closeList();
    if (!line.trim()) {
      out.push("<div><br></div>");
    } else {
      out.push(`<div>${formatInlineMarkdownToHtml(escapeHtml(line))}</div>`);
    }
  }

  closeList();
  return out.join("");
}

/**
 * Normalizes any task description string (legacy Markdown or HTML) into rich HTML.
 */
export function toEditorHtml(value?: string | null): string {
  if (!value || !value.trim()) return "";

  const cleaned = value.replace(/\u200B/g, "");
  if (!cleaned.trim()) return "";

  if (!isRichHtml(cleaned)) {
    return markdownToHtml(cleaned);
  }

  // Also convert any remaining inline markdown or stacked `• ` inside HTML
  if (typeof document !== "undefined") {
    const container = document.createElement("div");
    container.innerHTML = cleaned;

    // Ensure task list items have proper attributes and no stacked bullets
    container.querySelectorAll("ol > li").forEach((li) => {
      if (li.firstChild && li.firstChild.nodeType === Node.TEXT_NODE) {
        li.firstChild.textContent =
          li.firstChild.textContent?.replace(/^\s*[•\-*]\s+/, "") ?? "";
      }
    });

    container.querySelectorAll("ul[data-task-list='true'] > li").forEach((li) => {
      li.setAttribute("data-task-item", "true");
      if (!li.hasAttribute("data-checked")) {
        li.setAttribute("data-checked", "false");
      }
    });

    return container.innerHTML;
  }

  return cleaned;
}

/**
 * Extracts readable plain text from rich HTML or Markdown (for character/line counts and 1-line previews).
 */
export function getTaskDescriptionPlainText(value?: string | null): string {
  if (!value || !value.trim()) return "";

  const html = toEditorHtml(value);
  if (!html) return "";

  if (typeof document !== "undefined") {
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const lines: string[] = [];
    const walkBlock = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const txt = (node.textContent || "").replace(/\u200B/g, "");
        if (txt) {
          if (lines.length === 0) lines.push(txt);
          else lines[lines.length - 1] += txt;
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === "br") {
        lines.push("");
        return;
      }

      const isBlock =
        tag === "div" ||
        tag === "p" ||
        tag === "li" ||
        tag === "ul" ||
        tag === "ol";

      if (
        (tag === "div" || tag === "p" || tag === "li") &&
        lines.length > 0 &&
        lines[lines.length - 1] !== ""
      ) {
        lines.push("");
      } else if (
        (tag === "div" || tag === "p" || tag === "li") &&
        lines.length === 0
      ) {
        lines.push("");
      }

      el.childNodes.forEach(walkBlock);

      if (isBlock && lines.length === 0) {
        lines.push("");
      }
    };

    temp.childNodes.forEach(walkBlock);

    return lines
      .map((l) => l.trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u200B/g, "")
    .trim();
}


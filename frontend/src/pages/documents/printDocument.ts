import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DocumentPaper, { type DocumentPaperProps } from "./DocumentPaper";

const escapeHtml = (v: string) =>
  v.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

/**
 * Opens the browser print dialog for one document, rendered alone in a
 * hidden iframe (no app chrome). Choosing "Save as PDF" downloads it with
 * `fileName` as the suggested name; text stays selectable/searchable.
 */
export function printDocument(props: DocumentPaperProps, fileName: string) {
  const markup = renderToStaticMarkup(createElement(DocumentPaper, props));
  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>${escapeHtml(fileName)}</title>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hr-document-page { min-height: 296mm !important; }
</style></head><body>${markup}</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(frame);

  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  const go = () => {
    const win = frame.contentWindow!;
    win.addEventListener("afterprint", cleanup, { once: true });
    win.focus();
    win.print();
    // Fallback for browsers that don't fire afterprint on iframes.
    setTimeout(() => frame.isConnected && frame.remove(), 60_000);
  };

  // Wait for logo/signature images before printing, or they come out blank.
  const imgs = Array.from(doc.images);
  const pending = imgs.filter((i) => !i.complete);
  if (pending.length === 0) {
    setTimeout(go, 50);
  } else {
    let left = pending.length;
    const done = () => --left === 0 && go();
    pending.forEach((i) => {
      i.addEventListener("load", done, { once: true });
      i.addEventListener("error", done, { once: true });
    });
  }
}

export const documentFileName = (title: string, recipientName: string) =>
  `${title} - ${recipientName}`.replace(/[\\/:*?"<>|]+/g, "-");

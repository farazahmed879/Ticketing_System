import type { UserRequest } from "../../types";
import { docTypeLabel } from "../documents/documentConfig";

/**
 * "Document request": an employee asks Admin / Sub Admin for an HR document.
 * Approving one means generating the document on the Documents page (saved
 * as a draft); delivering it there approves the request and links the document.
 * Keep in sync with DOCUMENT_REQUEST / REQUESTABLE_DOCUMENTS in
 * backend/src/usecases/request.usecase.ts.
 */
export const DOCUMENT_REQUEST = "DOCUMENT_REQUEST";

export const REQUESTABLE_DOCUMENTS = [
  { value: "payslip", label: "Pay Slip" },
  { value: "salary_certificate", label: "Salary Certificate" },
  { value: "experience_letter", label: "Experience Letter" },
  { value: "relieving_letter", label: "Relieving Letter" },
  { value: "appointment_letter", label: "Copy of Appointment Letter" },
  { value: "custom", label: "Other document (describe below)" },
];

export const isDocumentRequest = (r: Pick<UserRequest, "type">) => r.type === DOCUMENT_REQUEST;

/** Last 12 months as "YYYY-MM" options, newest first (for pay slips). */
export const recentMonthOptions = () => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { value, label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) };
  });
};

export const monthLabel = (ym?: string) =>
  ym && /^\d{4}-\d{2}$/.test(ym)
    ? new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : "";

/** "Pay Slip — October 2026", "Salary Certificate", ... */
export const documentRequestSummary = (r: Pick<UserRequest, "data">) => {
  const d = r.data || {};
  const label =
    REQUESTABLE_DOCUMENTS.find((o) => o.value === d.documentType)?.label ||
    docTypeLabel(d.documentType || "");
  return d.payMonth ? `${label} — ${monthLabel(d.payMonth)}` : label;
};

/** Documents page, opening the editor pre-filled for this request. */
export const generateDocumentLink = (r: Pick<UserRequest, "id" | "userId" | "data">) => {
  const d = r.data || {};
  const q = new URLSearchParams({ generate: d.documentType || "custom", requestId: r.id });
  if (r.userId) q.set("userId", r.userId);
  if (d.payMonth) q.set("payMonth", d.payMonth);
  if (d.addressedTo) q.set("addressedTo", d.addressedTo);
  if (d.purpose) q.set("purpose", d.purpose);
  return `/documents?${q.toString()}`;
};

/** Where to open the issued document: Documents page for admins, else own profile. */
export const issuedDocumentLink = (documentId: string, isAdmin: boolean) =>
  isAdmin ? `/documents?documentId=${documentId}` : `/profile?documentId=${documentId}`;

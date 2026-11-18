/**
 * Document types and the fields each one's form asks for. The backend
 * stores whatever `data` the form produces; DocumentPaper renders it.
 * Keep the type ids in sync with DOCUMENT_TYPES in
 * backend/src/usecases/document.usecase.ts.
 */
export type DocumentType =
  | "payslip"
  | "offer_letter"
  | "appointment_letter"
  | "increment_letter"
  | "promotion_letter"
  | "experience_letter"
  | "salary_certificate"
  | "relieving_letter"
  | "warning_letter"
  | "custom";

export type FieldKind = "text" | "date" | "number" | "textarea" | "select";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  /**
   * Pre-fill this field from a different stored value, e.g. an increment
   * letter's "current salary" is the employee's stored salary.
   */
  prefillFrom?: string;
  /** Choices for kind "select". */
  options?: string[];
  /** Spans both columns in the form grid. */
  wide?: boolean;
}

export interface LineItem {
  label: string;
  amount: number | string;
}

export interface CompanyProfile {
  name: string;
  logo?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  signature?: string | null;
  footerNote?: string | null;
}

/**
 * A document's form values. Free-form on purpose: each type has its own
 * fields (see DOCUMENT_TYPES) and templates read them directly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DocData = Record<string, any>;

/**
 * The app's own branding (same name + insignia as the sidebar and login
 * screen). Used on documents whenever the letterhead in Settings leaves the
 * company name or logo empty.
 */
export const BRAND = {
  name: "Jami Partners",
  logo: "/InsigniaStandalone.svg",
};

/** Absolute URL, so the logo also loads inside the print iframe. */
const absolute = (src: string) =>
  typeof window !== "undefined" && src.startsWith("/")
    ? new URL(src, window.location.origin).href
    : src;

export const withBrandDefaults = (c?: CompanyProfile | null): CompanyProfile => ({
  ...(c || { name: "" }),
  name: c?.name?.trim() || BRAND.name,
  logo: c?.logo || absolute(BRAND.logo),
});

export interface HrDocument {
  id: string;
  type: DocumentType;
  title: string;
  userId?: string | null;
  recipientName: string;
  data: DocData;
  company: CompanyProfile;
  issuedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTypeDef {
  id: DocumentType;
  label: string;
  icon: string;
  description: string;
  /** Must be issued to an existing employee (vs. any named recipient). */
  employeeOnly: boolean;
  /** Recipient is usually a candidate: offer a Candidate / Employee picker. */
  candidateRecipient?: boolean;
  fields: FieldDef[];
  defaults?: () => DocData;
}

const today = () => new Date().toISOString().slice(0, 10);

const DATE: FieldDef = { key: "date", label: "Issue Date", kind: "date", required: true };
const REF: FieldDef = { key: "refNo", label: "Reference No.", kind: "text", placeholder: "Optional" };
const DESIGNATION: FieldDef = {
  key: "designation",
  label: "Designation",
  kind: "text",
  required: true,
};
const DEPARTMENT: FieldDef = { key: "department", label: "Department", kind: "text" };
const CNIC: FieldDef = { key: "cnic", label: "CNIC / National ID", kind: "text" };
const ADDRESS: FieldDef = {
  key: "recipientAddress",
  label: "Recipient Address",
  kind: "textarea",
  wide: true,
};
const JOINING: FieldDef = { key: "joiningDate", label: "Joining Date", kind: "date", required: true };
// A dropdown, not free text: a free-text box invited typing the salary
// itself here ("PKR 100,000") instead of into the amount fields.
export const CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR"];
const CURRENCY: FieldDef = {
  key: "currency",
  label: "Currency",
  kind: "select",
  required: true,
  options: CURRENCIES,
};
const SALARY: FieldDef = {
  key: "salary",
  label: "Monthly Gross Salary",
  kind: "number",
  required: true,
};

export const DOCUMENT_TYPES: DocumentTypeDef[] = [
  {
    id: "payslip",
    label: "Pay Slip",
    icon: "Receipt",
    description: "Monthly salary slip with earnings, deductions and net pay.",
    employeeOnly: true,
    fields: [
      { key: "payDate", label: "Payment Date", kind: "date", required: true },
      { key: "employeeId", label: "Employee ID", kind: "text" },
      DESIGNATION,
      DEPARTMENT,
      CNIC,
      { key: "bankName", label: "Bank Name", kind: "text" },
      { key: "accountNo", label: "Account / IBAN", kind: "text" },
      { key: "workingDays", label: "Working Days", kind: "number" },
      { key: "paidDays", label: "Paid Days", kind: "number" },
      CURRENCY,
      { key: "notes", label: "Notes", kind: "textarea", wide: true, placeholder: "Optional" },
    ],
    defaults: () => ({
      payDate: today(),
      currency: "PKR",
      earnings: [
        { label: "Basic Salary", amount: "" },
        { label: "House Rent Allowance", amount: "" },
        { label: "Medical Allowance", amount: "" },
        { label: "Conveyance Allowance", amount: "" },
      ],
      deductions: [
        { label: "Income Tax", amount: "" },
        { label: "Unpaid Leave", amount: "" },
      ],
    }),
  },
  {
    id: "offer_letter",
    label: "Offer Letter",
    icon: "Mail",
    description: "Job offer for a candidate or new hire, with salary and joining date.",
    employeeOnly: false,
    candidateRecipient: true,
    fields: [
      DATE,
      REF,
      DESIGNATION,
      DEPARTMENT,
      JOINING,
      { key: "employmentType", label: "Employment Type", kind: "text", required: true },
      SALARY,
      CURRENCY,
      { key: "probationMonths", label: "Probation (months)", kind: "number" },
      { key: "workLocation", label: "Work Location", kind: "text" },
      { key: "reportingTo", label: "Reporting To", kind: "text" },
      { key: "acceptBy", label: "Accept Offer By", kind: "date" },
      ADDRESS,
      { key: "additionalTerms", label: "Additional Terms", kind: "textarea", wide: true, placeholder: "Benefits, allowances, other conditions (optional)" },
    ],
    defaults: () => ({ date: today(), currency: "PKR", employmentType: "Full-time", probationMonths: 3 }),
  },
  {
    id: "appointment_letter",
    label: "Appointment Letter",
    icon: "BadgeCheck",
    description: "Formal confirmation of appointment with terms of employment.",
    employeeOnly: false,
    candidateRecipient: true,
    fields: [
      DATE,
      REF,
      DESIGNATION,
      DEPARTMENT,
      JOINING,
      SALARY,
      CURRENCY,
      { key: "probationMonths", label: "Probation (months)", kind: "number" },
      { key: "workingHours", label: "Working Hours", kind: "text" },
      { key: "noticePeriod", label: "Notice Period", kind: "text" },
      ADDRESS,
      { key: "additionalTerms", label: "Additional Terms", kind: "textarea", wide: true, placeholder: "Optional" },
    ],
    defaults: () => ({
      date: today(),
      currency: "PKR",
      probationMonths: 3,
      workingHours: "Monday to Friday, 9:00 AM – 6:00 PM",
      noticePeriod: "1 month",
    }),
  },
  {
    id: "increment_letter",
    label: "Increment Letter",
    icon: "TrendingUp",
    description: "Salary increase with the new amount and effective date.",
    employeeOnly: true,
    fields: [
      DATE,
      REF,
      DESIGNATION,
      DEPARTMENT,
      { key: "currentSalary", label: "Current Monthly Salary", kind: "number", required: true, prefillFrom: "salary" },
      { key: "newSalary", label: "New Monthly Salary", kind: "number", required: true },
      CURRENCY,
      { key: "effectiveDate", label: "Effective From", kind: "date", required: true },
      { key: "remarks", label: "Remarks", kind: "textarea", wide: true },
    ],
    defaults: () => ({
      date: today(),
      currency: "PKR",
      remarks:
        "This increment is in recognition of your performance and contribution to the company. We look forward to your continued dedication.",
    }),
  },
  {
    id: "promotion_letter",
    label: "Promotion Letter",
    icon: "Rocket",
    description: "Promotion to a new designation, optionally with a revised salary.",
    employeeOnly: true,
    fields: [
      DATE,
      REF,
      { key: "currentDesignation", label: "Current Designation", kind: "text", required: true, prefillFrom: "designation" },
      { key: "newDesignation", label: "New Designation", kind: "text", required: true },
      DEPARTMENT,
      { key: "effectiveDate", label: "Effective From", kind: "date", required: true },
      { key: "newSalary", label: "Revised Monthly Salary", kind: "number", placeholder: "Optional" },
      CURRENCY,
      { key: "reportingTo", label: "Reporting To", kind: "text" },
      { key: "remarks", label: "Remarks", kind: "textarea", wide: true },
    ],
    defaults: () => ({
      date: today(),
      currency: "PKR",
      remarks:
        "This promotion reflects your consistent performance and the confidence the management has in your abilities. We wish you continued success in your new role.",
    }),
  },
  {
    id: "experience_letter",
    label: "Experience Letter",
    icon: "Award",
    description: "Certifies the employee's period of service and role.",
    employeeOnly: true,
    fields: [
      DATE,
      REF,
      DESIGNATION,
      DEPARTMENT,
      CNIC,
      JOINING,
      { key: "lastWorkingDate", label: "Last Working Date", kind: "date", required: true },
      { key: "remarks", label: "Remarks", kind: "textarea", wide: true },
    ],
    defaults: () => ({
      date: today(),
      remarks:
        "During their tenure we found them hardworking, dependable and an asset to the team. We wish them every success in their future endeavours.",
    }),
  },
  {
    id: "salary_certificate",
    label: "Salary Certificate",
    icon: "Wallet",
    description: "Confirms current employment and salary (for banks, visas, etc.).",
    employeeOnly: true,
    fields: [
      DATE,
      REF,
      DESIGNATION,
      DEPARTMENT,
      CNIC,
      JOINING,
      SALARY,
      CURRENCY,
      { key: "addressedTo", label: "Addressed To", kind: "text" },
      { key: "purpose", label: "Purpose", kind: "text", placeholder: "e.g. bank account opening" },
    ],
    defaults: () => ({ date: today(), currency: "PKR", addressedTo: "To Whom It May Concern" }),
  },
  {
    id: "relieving_letter",
    label: "Relieving Letter",
    icon: "LogOut",
    description: "Confirms resignation acceptance and clearance on exit.",
    employeeOnly: true,
    fields: [
      DATE,
      REF,
      DESIGNATION,
      DEPARTMENT,
      CNIC,
      JOINING,
      { key: "resignationDate", label: "Resignation Date", kind: "date" },
      { key: "lastWorkingDate", label: "Last Working Date", kind: "date", required: true },
      { key: "remarks", label: "Remarks", kind: "textarea", wide: true },
    ],
    defaults: () => ({
      date: today(),
      remarks:
        "All company assets have been returned and dues settled. We thank them for their contributions and wish them the very best.",
    }),
  },
  {
    id: "warning_letter",
    label: "Warning Letter",
    icon: "TriangleAlert",
    description: "Formal written warning about conduct or performance.",
    employeeOnly: true,
    fields: [
      DATE,
      REF,
      DESIGNATION,
      DEPARTMENT,
      { key: "subject", label: "Subject", kind: "text", required: true, wide: true },
      { key: "incidentDate", label: "Incident Date", kind: "date" },
      { key: "details", label: "Details of the Issue", kind: "textarea", required: true, wide: true },
      { key: "expectation", label: "Expected Improvement / Consequence", kind: "textarea", wide: true },
    ],
    defaults: () => ({
      date: today(),
      subject: "Written Warning",
      expectation:
        "You are expected to show immediate and sustained improvement. Any recurrence may lead to further disciplinary action, up to and including termination of employment.",
    }),
  },
  {
    id: "custom",
    label: "Custom Letter",
    icon: "FilePen",
    description: "Any other letter on the company letterhead.",
    employeeOnly: false,
    fields: [
      DATE,
      REF,
      { key: "subject", label: "Subject", kind: "text", required: true, wide: true },
      { key: "salutation", label: "Salutation", kind: "text", placeholder: "Dear …" },
      ADDRESS,
      { key: "body", label: "Letter Body", kind: "textarea", required: true, wide: true, placeholder: "Write the letter. Blank lines start new paragraphs." },
    ],
    defaults: () => ({ date: today() }),
  },
];

export const DOCUMENT_TYPE_MAP: Record<DocumentType, DocumentTypeDef> = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.id, d]),
) as Record<DocumentType, DocumentTypeDef>;

export const docTypeLabel = (t: string) =>
  DOCUMENT_TYPE_MAP[t as DocumentType]?.label || "Document";

// ---------------------------------------------------------------- formatting

export const toNumber = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const fmtMoney = (v: unknown, currency?: string) => {
  const s = toNumber(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${s}` : s;
};

export const fmtDate = (v?: string) => {
  if (!v) return "—";
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export const fmtMonth = (v?: string) => {
  if (!v) return "—";
  const d = new Date(`${v}-01T00:00:00`);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const under1000 = (n: number): string => {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
};

/** 125000.5 → "One Hundred Twenty-Five Thousand and 50/100". */
export const amountInWords = (v: unknown) => {
  const total = Math.abs(toNumber(v));
  let whole = Math.floor(total);
  const cents = Math.round((total - whole) * 100);
  if (whole === 0 && cents === 0) return "Zero";
  const scales = ["", "Thousand", "Million", "Billion"];
  const chunks: string[] = [];
  let i = 0;
  while (whole > 0 && i < scales.length) {
    const c = whole % 1000;
    if (c) chunks.unshift(`${under1000(c)}${scales[i] ? ` ${scales[i]}` : ""}`);
    whole = Math.floor(whole / 1000);
    i++;
  }
  const words = chunks.join(" ") || "Zero";
  return cents ? `${words} and ${cents}/100` : words;
};

export const sumItems = (items?: LineItem[]) =>
  (items || []).reduce((s, i) => s + toNumber(i.amount), 0);

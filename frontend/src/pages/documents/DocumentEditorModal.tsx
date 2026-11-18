import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Modal from "../../components/Modal";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import CustomTextArea from "../../components/CustomTextArea";
import CustomDatePicker from "../../components/CustomDatePicker";
import DocumentPaper from "./DocumentPaper";
import api from "../../services/api";
import { formatCnic } from "../../utils/helpers";
import { API_ROUTES } from "../../utils/apiRoutes";
import {
  DOCUMENT_TYPE_MAP,
  fmtMoney,
  sumItems,
  type CompanyProfile,
  type DocData,
  type DocumentType,
  type FieldDef,
  type HrDocument,
  type LineItem,
} from "./documentConfig";
import styles from "./Documents.module.css";

export interface EmployeeOption {
  id: string;
  fullname: string;
  title?: string | null;
  cnic?: string | null;
  address?: string | null;
  email?: string | null;
  companyEmail?: string | null;
  username?: string | null;
  image?: string | null;
}

export interface DocumentDraft {
  type: DocumentType;
  title: string;
  userId: string | null;
  recipientName: string;
  data: DocData;
  /** Issued for this employee document request (approves it). */
  requestId?: string;
}

/** Opened from an employee's document request (Requests page). */
export interface DocumentRequestSeed {
  requestId: string;
  userId: string;
  /** Values taken from the request (pay date, addressed to, purpose). */
  data: DocData;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Type for a new document; ignored when editing. Mount this only while
   * open (with a key per document) — state is initialized from props.
   */
  type: DocumentType;
  editing?: HrDocument | null;
  /** Start a new document as a copy of this one (same type). */
  duplicateOf?: HrDocument | null;
  /** Start a new document for an employee's document request. */
  fromRequest?: DocumentRequestSeed | null;
  employees: EmployeeOption[];
  company: CompanyProfile;
  saving?: boolean;
  onSave: (draft: DocumentDraft) => void;
}

/**
 * Stored values that belong to one person. When the admin switches to a
 * different employee, untouched fields from these are cleared if the new
 * employee has no value, so nobody's CNIC or bank details leak into
 * another person's document.
 */
const PERSONAL_KEYS = new Set([
  "designation",
  "department",
  "cnic",
  "recipientAddress",
  "employeeId",
  "email",
  "reportingTo",
  "workLocation",
  "bankName",
  "accountNo",
  "joiningDate",
  "salary",
]);

export interface CandidateOption {
  id: string;
  name: string;
  email?: string | null;
  position?: string | null;
  cnic?: string | null;
  address?: string | null;
  city?: string | null;
  status?: string | null;
}

const withoutCandidate = (d: DocData): DocData => {
  const next = { ...d };
  delete next.candidateId;
  return next;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

/** A duplicate is a fresh document: issue/payment dates start at today. */
const duplicateData = (src: HrDocument): DocData => {
  const data: DocData = { ...(src.data || {}) };
  if ("date" in data) data.date = todayIso();
  if ("payDate" in data) data.payDate = todayIso();
  delete data.payPeriod; // older slips: month now follows payDate
  return data;
};

interface PrefillResponse {
  values: DocData;
  sources: Record<string, "profile" | "documents">;
}

type PrefillState =
  | { status: "idle" }
  | { status: "loading"; name: string }
  | { status: "done"; name: string; fromProfile: number; fromDocuments: number }
  | { status: "error"; name: string };

const LineItemsEditor: React.FC<{
  title: string;
  items: LineItem[];
  currency?: string;
  onChange: (items: LineItem[]) => void;
}> = ({ title, items, currency, onChange }) => (
  <div className={styles.lineItems}>
    <div className={styles.lineItemsHead}>
      <span>{title}</span>
      <span className={styles.lineItemsTotal}>{fmtMoney(sumItems(items), currency)}</span>
    </div>
    {items.map((item, i) => (
      <div key={i} className={styles.lineItemRow}>
        <CustomInput
          placeholder="Item"
          value={item.label}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(items.map((it, j) => (j === i ? { ...it, label: e.target.value } : it)))
          }
          containerStyle={{ flex: 2 }}
        />
        <CustomInput
          type="number"
          placeholder="0.00"
          value={item.amount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(items.map((it, j) => (j === i ? { ...it, amount: e.target.value } : it)))
          }
          containerStyle={{ flex: 1 }}
        />
        <CustomButton
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Remove ${item.label || "row"}`}
          title="Remove row"
          onClick={() => onChange(items.filter((_, j) => j !== i))}
          icon={<CustomIcon name="X" size={16} />}
        />
      </div>
    ))}
    <CustomButton
      type="button"
      variant="ghost"
      size="sm"
      icon={<CustomIcon name="Plus" size={16} />}
      onClick={() => onChange([...items, { label: "", amount: "" }])}
    >
      Add row
    </CustomButton>
  </div>
);

const DocumentEditorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  type: newType,
  editing,
  duplicateOf,
  fromRequest,
  employees,
  company,
  saving,
  onSave,
}) => {
  const source = editing || duplicateOf || null;
  const type = source?.type || newType;
  const def = DOCUMENT_TYPE_MAP[type];

  const [userId, setUserId] = useState<string | null>(
    source?.userId || fromRequest?.userId || null,
  );
  const [recipientName, setRecipientName] = useState(source?.recipientName || "");
  const [title, setTitle] = useState(source?.title || def.label);
  const [data, setData] = useState<DocData>(() =>
    editing
      ? editing.data || {}
      : duplicateOf
        ? duplicateData(duplicateOf)
        : { ...(def.defaults?.() || {}), ...(fromRequest?.data || {}) },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Keys the admin typed into; pre-filling never overwrites these. Values
  // that came from the employee's request count as typed.
  const touched = useRef(new Set<string>(Object.keys(fromRequest?.data || {})));
  const prefillSeq = useRef(0);
  const [prefill, setPrefill] = useState<PrefillState>(
    fromRequest ? { status: "loading", name: "the employee" } : { status: "idle" },
  );

  // Offer / appointment letters usually go to a candidate (Candidates list).
  const [recipientKind, setRecipientKind] = useState<"candidate" | "employee">(
    def.candidateRecipient && !source?.userId ? "candidate" : "employee",
  );
  const [candidate, setCandidate] = useState<CandidateOption | null>(() =>
    source?.data?.candidateId
      ? {
          id: source.data.candidateId,
          name: source.recipientName,
          position: source.data.designation,
        }
      : null,
  );
  const [candidateQuery, setCandidateQuery] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCandidateSearch = (q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setCandidateQuery(q.trim()), 300);
  };
  const { data: candidateResults = [] } = useQuery({
    queryKey: ["hr-document-candidates", candidateQuery],
    queryFn: async () =>
      ((
        await api.get(API_ROUTES.DOCUMENTS.CANDIDATES, {
          params: { search: candidateQuery || undefined },
        })
      ).data.items || []) as CandidateOption[],
    enabled: !!def.candidateRecipient && recipientKind === "candidate",
    staleTime: 60 * 1000,
  });

  const candidateOptions = useMemo(() => {
    // Keep the selected candidate selectable even if a search filters it out.
    const list =
      candidate && !candidateResults.some((c) => c.id === candidate.id)
        ? [candidate, ...candidateResults]
        : candidateResults;
    return list.map((c) => ({
      value: c.id,
      label: c.name,
      sublabel: [c.position, c.email, c.status].filter(Boolean).join(" · ") || undefined,
    }));
  }, [candidate, candidateResults]);

  const switchRecipientKind = (kind: "candidate" | "employee") => {
    if (kind === recipientKind) return;
    setRecipientKind(kind);
    if (kind === "employee") pickCandidate(null);
    else {
      ++prefillSeq.current;
      setUserId(null);
      setPrefill({ status: "idle" });
    }
  };

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const employeeOptions = useMemo(
    () =>
      employees.map((u) => ({
        value: u.id,
        label: u.fullname,
        sublabel: u.title || u.companyEmail || u.email || undefined,
        image: u.image || undefined,
      })),
    [employees],
  );

  /**
   * Apply stored values (employee profile + earlier documents, or a
   * candidate record) to the form. Replaces defaults and earlier pre-filled
   * values, never what the admin typed; clears untouched personal fields the
   * new person has no value for. Returns per-source counts for the hint.
   */
  const applyStored = (res: PrefillResponse) => {
    // Form key -> stored key it pre-fills from (usually the same).
    const targets: [string, string][] = def.fields.map((f) => [f.key, f.prefillFrom || f.key]);
    if (type === "payslip") targets.push(["earnings", "earnings"], ["deductions", "deductions"]);
    const filled: DocData = {};
    const cleared: string[] = [];
    const applied: string[] = [];
    for (const [key, src] of targets) {
      if (touched.current.has(key)) continue;
      if (src in res.values) {
        filled[key] = res.values[src];
        applied.push(key);
      } else if (PERSONAL_KEYS.has(src)) {
        cleared.push(key);
      }
    }
    const sourceOf = (key: string) => targets.find(([k]) => k === key)?.[1] || key;
    setData((prev) => {
      const next = { ...prev, ...filled };
      for (const k of cleared) delete next[k];
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of applied) delete next[k];
      return next;
    });
    return {
      fromProfile: applied.filter((k) => res.sources[sourceOf(k)] === "profile").length,
      fromDocuments: applied.filter((k) => res.sources[sourceOf(k)] === "documents").length,
    };
  };

  const setRecipientFrom = (name: string) => {
    if (touched.current.has("recipientName")) return;
    setRecipientName(name);
    clearError("recipientName");
  };

  /**
   * Fill the form from the employee's stored data: profile (designation,
   * CNIC, address, department, manager...) and their earlier documents
   * (joining date, salary, bank, last pay slip's earnings/deductions).
   */
  const pickEmployee = async (id: string | null) => {
    setUserId(id || null);
    clearError("userId");
    const u = employees.find((e) => e.id === id);
    if (!u) {
      setPrefill({ status: "idle" });
      return;
    }
    // An employee and a candidate are alternatives, never both.
    setCandidate(null);
    setData(withoutCandidate);
    setRecipientFrom(u.fullname);
    const seq = ++prefillSeq.current;
    setPrefill({ status: "loading", name: u.fullname });
    try {
      const res = (await api.get(API_ROUTES.DOCUMENTS.PREFILL(u.id))).data as PrefillResponse;
      if (seq !== prefillSeq.current) return; // a later pick won
      setPrefill({ status: "done", name: u.fullname, ...applyStored(res) });
    } catch {
      if (seq === prefillSeq.current) setPrefill({ status: "error", name: u.fullname });
    }
  };

  /** Offer / appointment letters: address a candidate from the Candidates list. */
  const pickCandidate = (c: CandidateOption | null) => {
    ++prefillSeq.current; // drop any in-flight employee pre-fill
    setCandidate(c);
    clearError("candidateId");
    if (!c) {
      setPrefill({ status: "idle" });
      setData(withoutCandidate);
      return;
    }
    setUserId(null);
    setRecipientFrom(c.name);
    const values: DocData = { candidateId: c.id };
    const sources: PrefillResponse["sources"] = {};
    const put = (k: string, v?: string | null) => {
      if (v && v.trim()) {
        values[k] = v.trim();
        sources[k] = "profile";
      }
    };
    put("designation", c.position);
    put("cnic", c.cnic);
    put("email", c.email);
    put("recipientAddress", [c.address, c.city].filter((x) => x && x.trim()).join("\n"));
    const counts = applyStored({ values, sources });
    setData((prev) => ({ ...prev, candidateId: c.id }));
    setPrefill({ status: "done", name: c.name, ...counts });
  };

  // From a document request: fill in the requesting employee's details once.
  useEffect(() => {
    if (!fromRequest) return;
    const seq = ++prefillSeq.current;
    api
      .get(API_ROUTES.DOCUMENTS.PREFILL(fromRequest.userId))
      .then(({ data: res }: { data: PrefillResponse }) => {
        if (seq !== prefillSeq.current) return;
        const name = String(res.values.recipientName || "the employee");
        setRecipientFrom(name);
        setPrefill({ status: "done", name, ...applyStored(res) });
      })
      .catch(() => {
        if (seq === prefillSeq.current) setPrefill({ status: "error", name: "the employee" });
      });
    // Runs once for the request this editor was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key: string, value: unknown) => {
    touched.current.add(key);
    setData((prev) => ({ ...prev, [key]: value }));
    clearError(key);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (def.employeeOnly && !userId) errs.userId = "Select the employee";
    if (!recipientName.trim()) errs.recipientName = "Recipient name is required";
    for (const f of def.fields) {
      if (f.required && !String(data[f.key] ?? "").trim()) errs[f.key] = `${f.label} is required`;
    }
    if (type === "payslip") {
      // Net pay is computed from these rows, so a pay slip needs at least one
      // earning, and every row with an amount needs a name to print.
      const rows: LineItem[] = [...(data.earnings || []), ...(data.deductions || [])];
      if (sumItems(data.earnings) <= 0) {
        errs.earnings =
          "Enter the salary amount in the Earnings rows (e.g. Basic Salary) — net pay is calculated from them.";
      } else if (rows.some((r) => String(r.amount ?? "").trim() && !r.label?.trim())) {
        errs.earnings = "Give each earning / deduction row with an amount a name.";
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSave({
      type,
      title: title.trim() || def.label,
      userId,
      recipientName: recipientName.trim(),
      data,
      // Only while still issued to the employee who asked for it.
      requestId:
        fromRequest && userId === fromRequest.userId ? fromRequest.requestId : undefined,
    });
  };

  const renderField = (f: FieldDef) => {
    const common = {
      label: f.label,
      required: f.required,
      error: errors[f.key],
      placeholder: f.placeholder,
    };
    if (f.kind === "select") {
      const value = data[f.key] ?? "";
      const opts = f.options || [];
      return (
        <CustomSelect
          label={f.label}
          required={f.required}
          error={errors[f.key]}
          showSearch={false}
          isClearable={false}
          // Keep an older document's non-standard value selectable.
          options={(value && !opts.includes(value) ? [value, ...opts] : opts).map((o) => ({
            value: o,
            label: o,
          }))}
          value={value}
          onChange={(v: string) => setField(f.key, v)}
        />
      );
    }
    if (f.kind === "date") {
      return (
        <CustomDatePicker
          label={f.label}
          required={f.required}
          error={errors[f.key]}
          value={data[f.key] ?? ""}
          onChange={(v: string) => setField(f.key, v)}
        />
      );
    }
    if (f.kind === "textarea") {
      return (
        <CustomTextArea
          {...common}
          rows={f.key === "body" || f.key === "details" ? 7 : 3}
          value={data[f.key] ?? ""}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setField(f.key, e.target.value)}
        />
      );
    }
    return (
      <CustomInput
        {...common}
        type={f.kind}
        // Same live XXXXX-XXXXXXX-X formatting as the user/candidate forms.
        transform={f.key === "cnic" ? formatCnic : undefined}
        value={data[f.key] ?? ""}
        // With `transform`, CustomInput passes the formatted string, not the event.
        onChange={(e: React.ChangeEvent<HTMLInputElement> | string) =>
          setField(f.key, typeof e === "string" ? e : e.target.value)
        }
      />
    );
  };

  const footer = (
    <div className={styles.modalFooter}>
      <CustomButton variant="outline" onClick={onClose} disabled={saving}>
        Cancel
      </CustomButton>
      <CustomButton type="submit" form="document-form" variant="gradient" loading={saving}>
        {editing ? "Save & Re-issue" : "Generate Document"}
      </CustomButton>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${editing ? "Edit" : duplicateOf ? "Duplicate" : "New"} ${def.label}`}
      maxWidth="1280px"
      footer={footer}
    >
      <div className={styles.editor}>
        <form id="document-form" className={styles.editorForm} onSubmit={submit} noValidate>
          <div className={styles.formGrid}>
            <div className={styles.wide}>
              {def.candidateRecipient && (
                <div className={`view-mode-switcher ${styles.switcher} ${styles.kindSwitcher}`}>
                  {(["candidate", "employee"] as const).map((k) => (
                    <CustomButton
                      key={k}
                      type="button"
                      variant={recipientKind === k ? "primary" : "ghost"}
                      size="sm"
                      aria-pressed={recipientKind === k}
                      onClick={() => switchRecipientKind(k)}
                      icon={<CustomIcon name={k === "candidate" ? "UserPlus" : "User"} size={15} />}
                    >
                      {k === "candidate" ? "Candidate" : "Employee"}
                    </CustomButton>
                  ))}
                </div>
              )}
              {def.candidateRecipient && recipientKind === "candidate" ? (
                <CustomSelect
                  label="Candidate"
                  options={candidateOptions}
                  value={candidate?.id || ""}
                  onChange={(v: string) =>
                    pickCandidate(
                      candidateResults.find((c) => c.id === v) ||
                        (candidate?.id === v ? candidate : null),
                    )
                  }
                  showSearch
                  serverSideSearch
                  onSearch={onCandidateSearch}
                  placeholder="Search candidates by name, email, position…"
                />
              ) : (
                <CustomSelect
                  label={def.employeeOnly ? "Employee" : "Employee (optional)"}
                  required={def.employeeOnly}
                  options={employeeOptions}
                  value={userId || ""}
                  onChange={(v: string) => pickEmployee(v)}
                  placeholder={
                    def.employeeOnly ? "Select employee…" : "Select an employee, or type a name below"
                  }
                  error={errors.userId}
                />
              )}
              {fromRequest && (
                <p className={styles.prefillNote} role="status">
                  <CustomIcon name="FileQuestion" size={14} />
                  {userId === fromRequest.userId
                    ? "Requested by this employee — issuing it approves their request."
                    : "Issued to someone else, so the employee's request stays pending."}
                </p>
              )}
              {duplicateOf && prefill.status === "idle" && (
                <p className={styles.hint}>
                  Copy of “{duplicateOf.title}” issued to {duplicateOf.recipientName}. Pick another
                  employee to issue it to them — their details are filled in automatically.
                </p>
              )}
              {prefill.status === "loading" && (
                <p className={styles.hint}>Loading {prefill.name}'s details…</p>
              )}
              {prefill.status === "done" && (
                <p className={styles.prefillNote} role="status">
                  <CustomIcon name="Sparkles" size={14} />
                  {prefill.fromProfile + prefill.fromDocuments > 0
                    ? `Filled ${prefill.fromProfile + prefill.fromDocuments} field(s) from ${prefill.name}'s ${
                        prefill.fromDocuments ? "profile and earlier documents" : "profile"
                      }. Review and edit as needed.`
                    : `No stored details found for ${prefill.name} — fill the form manually.`}
                </p>
              )}
              {prefill.status === "error" && (
                <p className={styles.error}>Couldn't load {prefill.name}'s details. Fill the form manually.</p>
              )}
              {!def.employeeOnly && prefill.status === "idle" && !duplicateOf && (
                <p className={styles.hint}>
                  {def.candidateRecipient && recipientKind === "candidate"
                    ? "Pick from the Candidates list, or leave it empty and type the name below."
                    : "For anyone without an account, leave this empty and type their name. Documents issued to an employee appear on their profile."}
                </p>
              )}
            </div>
            <CustomInput
              label="Recipient Name"
              required
              value={recipientName}
              error={errors.recipientName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                touched.current.add("recipientName");
                setRecipientName(e.target.value);
                clearError("recipientName");
              }}
            />
            <CustomInput
              label="Document Title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            />
            {def.fields.map((f) => (
              <div key={f.key} className={f.wide ? styles.wide : undefined}>
                {renderField(f)}
              </div>
            ))}
          </div>

          {type === "payslip" && (
            <div className={styles.payGrid}>
              <LineItemsEditor
                title="Earnings"
                items={data.earnings || []}
                currency={data.currency}
                onChange={(items) => setField("earnings", items)}
              />
              <LineItemsEditor
                title="Deductions"
                items={data.deductions || []}
                currency={data.currency}
                onChange={(items) => setField("deductions", items)}
              />
              {errors.earnings && <span className={styles.error}>{errors.earnings}</span>}
              <div className={styles.netPay}>
                Net Pay
                <strong>
                  {fmtMoney(sumItems(data.earnings) - sumItems(data.deductions), data.currency)}
                </strong>
              </div>
            </div>
          )}
        </form>

        <div className={styles.previewPane} aria-label="Live preview">
          <div className={styles.previewLabel}>Live preview</div>
          <div className={styles.paperScaler}>
            <DocumentPaper
              type={type}
              recipientName={recipientName || "Recipient Name"}
              data={data}
              company={company}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentEditorModal;

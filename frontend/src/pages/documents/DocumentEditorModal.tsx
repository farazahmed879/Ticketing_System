import React, { useMemo, useRef, useState } from "react";
import Modal from "../../components/Modal";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import CustomTextArea from "../../components/CustomTextArea";
import CustomDatePicker from "../../components/CustomDatePicker";
import DocumentPaper from "./DocumentPaper";
import api from "../../services/api";
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
}

export interface DocumentDraft {
  type: DocumentType;
  title: string;
  userId: string | null;
  recipientName: string;
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
  employees: EmployeeOption[];
  company: CompanyProfile;
  saving?: boolean;
  onSave: (draft: DocumentDraft) => void;
}

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
        <button
          type="button"
          className={styles.iconBtn}
          aria-label={`Remove ${item.label || "row"}`}
          onClick={() => onChange(items.filter((_, j) => j !== i))}
        >
          <CustomIcon name="X" size={16} />
        </button>
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
  employees,
  company,
  saving,
  onSave,
}) => {
  const type = editing?.type || newType;
  const def = DOCUMENT_TYPE_MAP[type];

  const [userId, setUserId] = useState<string | null>(editing?.userId || null);
  const [recipientName, setRecipientName] = useState(editing?.recipientName || "");
  const [title, setTitle] = useState(editing?.title || def.label);
  const [data, setData] = useState<DocData>(() =>
    editing ? editing.data || {} : def.defaults?.() || {},
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Keys the admin typed into; pre-filling never overwrites these.
  const touched = useRef(new Set<string>());
  const prefillSeq = useRef(0);
  const [prefill, setPrefill] = useState<PrefillState>({ status: "idle" });

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
      })),
    [employees],
  );

  /**
   * Fill the form from the employee's stored data: profile (designation,
   * CNIC, address, department, manager...) and their earlier documents
   * (joining date, salary, bank, last pay slip's earnings/deductions).
   * Replaces defaults and earlier pre-filled values, never what was typed.
   */
  const pickEmployee = async (id: string | null) => {
    setUserId(id || null);
    clearError("userId");
    const u = employees.find((e) => e.id === id);
    if (!u) {
      setPrefill({ status: "idle" });
      return;
    }
    if (!touched.current.has("recipientName")) {
      setRecipientName(u.fullname);
      clearError("recipientName");
    }
    const seq = ++prefillSeq.current;
    setPrefill({ status: "loading", name: u.fullname });
    try {
      const res = (await api.get(API_ROUTES.DOCUMENTS.PREFILL(u.id))).data as PrefillResponse;
      if (seq !== prefillSeq.current) return; // a later pick won
      const allowed = new Set(def.fields.map((f) => f.key));
      if (type === "payslip") {
        allowed.add("earnings");
        allowed.add("deductions");
      }
      const applied = Object.keys(res.values).filter(
        (k) => allowed.has(k) && !touched.current.has(k),
      );
      setData((prev) => {
        const next = { ...prev };
        for (const k of applied) next[k] = res.values[k];
        return next;
      });
      setErrors((prev) => {
        const next = { ...prev };
        for (const k of applied) delete next[k];
        return next;
      });
      setPrefill({
        status: "done",
        name: u.fullname,
        fromProfile: applied.filter((k) => res.sources[k] === "profile").length,
        fromDocuments: applied.filter((k) => res.sources[k] === "documents").length,
      });
    } catch {
      if (seq === prefillSeq.current) setPrefill({ status: "error", name: u.fullname });
    }
  };

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
        value={data[f.key] ?? ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField(f.key, e.target.value)}
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
      title={`${editing ? "Edit" : "New"} ${def.label}`}
      maxWidth="1280px"
      footer={footer}
    >
      <div className={styles.editor}>
        <form id="document-form" className={styles.editorForm} onSubmit={submit} noValidate>
          <div className={styles.formGrid}>
            <div className={styles.wide}>
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
              {!def.employeeOnly && (
                <p className={styles.hint}>
                  For a candidate or anyone without an account, leave this empty and type their
                  name. Documents issued to an employee appear on their profile.
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

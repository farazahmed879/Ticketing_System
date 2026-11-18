import React, { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import CustomInput from "../../components/CustomInput";
import CustomTextArea from "../../components/CustomTextArea";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { BRAND, type CompanyProfile } from "./documentConfig";
import {
  COMPANY_QUERY_KEY,
  apiErrorMessage,
  useCompanyProfile,
} from "./documentApi";
import styles from "./Documents.module.css";

const MAX_IMAGE_BYTES = 1024 * 1024;

const ImagePicker: React.FC<{
  label: string;
  value?: string | null;
  /** Shown (and used on documents) while no image is uploaded. */
  fallback?: string;
  onChange: (v: string | null) => void;
  onError: (msg: string) => void;
}> = ({ label, value, fallback, onChange, onError }) => {
  const input = useRef<HTMLInputElement>(null);
  const pick = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return onError("Please choose an image file.");
    if (file.size > MAX_IMAGE_BYTES)
      return onError("Image must be 1 MB or smaller.");
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };
  return (
    <div className={styles.imagePicker}>
      <span className={styles.imagePickerLabel}>{label}</span>
      <div className={styles.imageBox}>
        <div className={styles.imageThumb}>
          {value || fallback ? (
            <img src={value || fallback} alt={`${label} preview`} />
          ) : (
            "None"
          )}
        </div>
        <CustomButton
          type="button"
          variant="outline"
          size="sm"
          icon={<CustomIcon name="Upload" size={16} />}
          onClick={() => input.current?.click()}
        >
          {value ? "Replace" : "Upload"}
        </CustomButton>
        {value && (
          <CustomButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
          >
            Remove
          </CustomButton>
        )}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
};

/** The editable form; mounted once the saved letterhead has loaded. */
const LetterheadForm: React.FC<{ initial: CompanyProfile }> = ({ initial }) => {
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  // Unset name = the app's brand (Jami Partners), same as on documents.
  const [form, setForm] = useState<CompanyProfile>({
    ...initial,
    name: initial.name?.trim() || BRAND.name,
  });

  const save = useMutation({
    mutationFn: async (body: CompanyProfile) =>
      (await api.put(API_ROUTES.DOCUMENTS.COMPANY, body)).data
        .company as CompanyProfile,
    onSuccess: (company) => {
      queryClient.setQueryData(COMPANY_QUERY_KEY, company);
      showNotification(
        "success",
        "Letterhead saved. New documents will use it.",
      );
    },
    onError: (err) =>
      showNotification(
        "error",
        apiErrorMessage(err, "Failed to save letterhead"),
      ),
  });

  const set = (key: keyof CompanyProfile, value: string | null) =>
    setForm((f) => ({ ...f, [key]: value }));

  const text = (
    key: keyof CompanyProfile,
    label: string,
    placeholder?: string,
  ) => (
    <CustomInput
      label={label}
      placeholder={placeholder}
      value={(form[key] as string) || ""}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        set(key, e.target.value)
      }
    />
  );

  return (
    <form
      className={styles.letterheadForm}
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.name?.trim()) {
          showNotification("error", "Company name is required");
          return;
        }
        save.mutate(form);
      }}
    >
      {text("name", "Company Name *", BRAND.name)}
      {text("website", "Website", "www.example.com")}
      {text("phone", "Phone")}
      {text("email", "Email", "hr@example.com")}
      <div className={styles.wide}>
        <CustomTextArea
          label="Address"
          rows={2}
          value={form.address || ""}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            set("address", e.target.value)
          }
        />
      </div>
      <ImagePicker
        label="Logo (default: Jami Partners insignia)"
        value={form.logo}
        fallback={BRAND.logo}
        onChange={(v) => set("logo", v)}
        onError={(m) => showNotification("error", m)}
      />
      <ImagePicker
        label="Signature (optional)"
        value={form.signature}
        onChange={(v) => set("signature", v)}
        onError={(m) => showNotification("error", m)}
      />
      {text("signatoryName", "Signatory Name", "e.g. Sarah Khan")}
      {text("signatoryTitle", "Signatory Title", "e.g. HR Manager")}
      <div className={styles.wide}>
        <CustomInput
          label="Footer Note"
          placeholder="e.g. Company registration no., confidentiality notice (optional)"
          value={form.footerNote || ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set("footerNote", e.target.value)
          }
        />
      </div>
      <div className={styles.letterheadActions}>
        <CustomButton
          type="button"
          variant="outline"
          onClick={() =>
            setForm({ ...initial, name: initial.name?.trim() || BRAND.name })
          }
          disabled={save.isPending}
        >
          Reset
        </CustomButton>
        <CustomButton type="submit" variant="gradient" loading={save.isPending}>
          Save Letterhead
        </CustomButton>
      </div>
    </form>
  );
};

/** Company letterhead used on every HR document (Settings → Company Letterhead). */
const LetterheadSettingsSection: React.FC = () => {
  const { data, isLoading, dataUpdatedAt } = useCompanyProfile();
  return (
    <div>
      <h3 style={{ margin: "0 0 4px" }}>Company Letterhead</h3>
      <p style={{ color: "var(--text-muted)", margin: "0 0 20px" }}>
        Shown on pay slips, offer letters and every other document generated
        from the Documents page. Documents already issued keep the letterhead
        they were issued with until edited.
      </p>
      {isLoading || !data ? (
        <p className={styles.muted}>Loading…</p>
      ) : (
        <LetterheadForm key={dataUpdatedAt} initial={data} />
      )}
    </div>
  );
};

export default LetterheadSettingsSection;

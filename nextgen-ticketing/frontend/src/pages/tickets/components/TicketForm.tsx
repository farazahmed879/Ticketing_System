import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomSelect from "../../../components/CustomSelect";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENTS,
  readAttachmentFiles,
} from "../../../utils/attachments";
import { useAuth } from "../../../context/AuthContext";
import { RoleName } from "../../../utils/constants";
import type { Ticket, TicketFormData } from "../../../types";

interface TicketFormProps {
  initialData?: Ticket | null;
  priorities: any[];
  projects: any[];
  types: any[];
  agents: any[];
  onSubmit: (data: TicketFormData) => Promise<void>;
  isLoading?: boolean;
  showAssignee?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

const TicketForm: React.FC<TicketFormProps> = ({
  initialData,
  priorities,
  projects,
  types,
  agents,
  onSubmit,
  showAssignee = false,
  onDirtyChange,
}) => {
  const { user } = useAuth();
  const isClient = user?.role?.name === RoleName.CUSTOMER;
  // Clients shouldn't set a due date when creating a ticket — they can't
  // gauge SLA. On edit, leave the field visible.
  const showDueDate = !isClient;
  const { handleSubmit, control, reset, watch, setValue, formState: { isDirty } } =
    useForm<TicketFormData>({
      defaultValues: {
        subject: "",
        issue: "",
        priorityId: "",
        projectId: "",
        typeId: "",
        assigneeId: "",
        dueDate: "",
      },
    });

  const selectedPriority = watch("priorityId");
  const subjectValue = watch("subject");
  const issueValue = watch("issue");

  const [subjectLen, setSubjectLen] = useState(0);
  const [issueLen, setIssueLen] = useState(0);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSubjectLen(subjectValue?.length || 0);
    }, 150);
    return () => clearTimeout(timer);
  }, [subjectValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIssueLen(issueValue?.length || 0);
    }, 150);
    return () => clearTimeout(timer);
  }, [issueValue]);

  const hasChanges = isDirty || attachments.length > 0;

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(hasChanges);
    }
  }, [hasChanges, onDirtyChange]);

  useEffect(() => {
    if (initialData) {
      reset({
        subject: initialData.subject,
        issue: initialData.issue,
        priorityId: initialData.priority.id,
        projectId: (initialData as any).project?.id || "",
        typeId: initialData.type?.id || "",
        assigneeId: initialData.assignee?.id || "",
        dueDate: initialData.dueDate
          ? new Date(initialData.dueDate).toISOString().split("T")[0]
          : "",
      });
      setAttachments(initialData.attachments || []);
    } else {
      reset({
        subject: "",
        issue: "",
        priorityId: priorities.length > 0 ? priorities[0].id : "",
        projectId: "",
        typeId: types.length > 0 ? types[0].id : "",
        assigneeId: "",
        dueDate: "",
      });
      setAttachments([]);
    }
    setAttachmentError(null);
  }, [initialData, priorities, types, reset]);

  const handleAttachmentSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setAttachmentError(null);
    const { accepted, errors } = await readAttachmentFiles(
      e.target.files,
      attachments.length,
    );
    if (accepted.length) setAttachments((prev) => [...prev, ...accepted]);
    if (errors.length) setAttachmentError(errors.join(" "));
    // Reset the input so selecting the same file again still triggers onChange.
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
    setAttachmentError(null);
  };

  const submitWithAttachments = (data: TicketFormData) =>
    onSubmit({ ...data, attachments } as TicketFormData & {
      attachments: string[];
    });

  return (
    <form
      id="ticket-form"
      onSubmit={handleSubmit(submitWithAttachments)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <CustomInput
        name="subject"
        control={control}
        rules={{
          required: "Subject is required",
          maxLength: {
            value: 255,
            message: "Subject cannot exceed 255 characters",
          },
        }}
        label={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <span>Subject</span>
            <span
              style={{
                fontSize: "0.75rem",
                opacity: 0.6,
                color: subjectLen > 240 ? "var(--accent-danger)" : "inherit",
              }}
            >
              {subjectLen} / 255
            </span>
          </div>
        }
        placeholder="Brief summary of the issue"
        required
        maxLength={255}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <CustomSelect
          name="projectId"
          control={control}
          rules={{ required: "Project is required" }}
          label="Project"
          placeholder="No Project"
          options={[
            { value: "", label: "No Project" },
            ...projects.map((g) => ({ value: g.id, label: g.name })),
          ]}
        />
        <CustomSelect
          name="typeId"
          control={control}
          rules={{ required: "Ticket type is required" }}
          label="Type"
          placeholder="Select Type"
          options={types.map((t) => ({ value: t.id, label: t.name }))}
          required
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          Priority
        </label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {priorities.map((p) => (
            <label
              key={p.id}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                background:
                  selectedPriority === p.id
                    ? `${p.color}30`
                    : "rgba(255,255,255,0.05)",
                border: `1px solid ${selectedPriority === p.id ? p.color : "transparent"}`,
                transition: "0.2s",
              }}
            >
              <input
                type="radio"
                name="priorityId"
                value={p.id}
                checked={selectedPriority === p.id}
                onChange={(e) => setValue("priorityId", e.target.value)}
                style={{ display: "none" }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: p.color,
                }}
              ></div>
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                {p.name}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {showAssignee && (
          <CustomSelect
            name="assigneeId"
            control={control}
            label="Assign To (Optional)"
            placeholder="Unassigned"
            options={[
              { value: "", label: "Unassigned" },
              ...agents.map((a) => ({
                value: a.id,
                label: `${a.fullname}-(${a.role.name})`,
              })),
            ]}
          />
        )}

        {showDueDate && (
          <CustomInput
            name="dueDate"
            control={control}
            label="Due Date (Optional)"
            type="date"
            placeholder="Select due date"
            min={new Date().toISOString().split("T")[0]}
          />
        )}
      </div>

      <CustomTextArea
        name="issue"
        control={control}
        rules={{
          required: "Description is required",
          maxLength: {
            value: 500,
            message: "Description cannot exceed 500 characters",
          },
        }}
        label={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <span>Description</span>
            <span
              style={{
                fontSize: "0.75rem",
                opacity: 0.6,
                color: issueLen > 480 ? "var(--accent-danger)" : "inherit",
              }}
            >
              {issueLen} / 500
            </span>
          </div>
        }
        placeholder="Detailed explanation..."
        rows={5}
        required
        maxLength={500}
        style={{ resize: "none" }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <label
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            Attachments (optional)
          </label>
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
            }}
          >
            {attachments.length} / {MAX_ATTACHMENTS}
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          multiple
          onChange={handleAttachmentSelect}
          style={{ display: "none" }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {attachments.map((src, idx) => (
            <div
              key={idx}
              style={{
                position: "relative",
                width: 72,
                height: 72,
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid var(--border-glass)",
              }}
            >
              <img
                src={src}
                alt={`attachment-${idx}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                title="Remove attachment"
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  cursor: "pointer",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                <CustomIcon name="X" size={12} />
              </button>
            </div>
          ))}
          {attachments.length < MAX_ATTACHMENTS && (
            <CustomButton
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              icon={<CustomIcon name="ImagePlus" size={16} />}
              style={{
                width: 72,
                height: 72,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Add image"
            />
          )}
        </div>
        {attachmentError && (
          <span style={{ fontSize: "0.75rem", color: "var(--accent-danger)" }}>
            {attachmentError}
          </span>
        )}
      </div>
    </form>
  );
};

export default TicketForm;

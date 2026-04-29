import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomSelect from "../../../components/CustomSelect";
import CustomButton from "../../../components/CustomButton";
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
}

const TicketForm: React.FC<TicketFormProps> = ({
  initialData,
  priorities,
  projects,
  types,
  agents,
  onSubmit,
  isLoading = false,
  showAssignee = false,
}) => {
  const { handleSubmit, control, reset, watch, setValue } =
    useForm<TicketFormData>({
      defaultValues: {
        subject: "",
        issue: "",
        priorityId: "",
        groupId: "",
        typeId: "",
        assigneeId: "",
        dueDate: "",
      },
    });

  const selectedPriority = watch("priorityId");

  useEffect(() => {
    if (initialData) {
      reset({
        subject: initialData.subject,
        issue: initialData.issue,
        priorityId: initialData.priority.id,
        groupId: initialData.group?.id || "",
        typeId: initialData.type.id,
        assigneeId: initialData.assignee?.id || "",
        dueDate: initialData.dueDate
          ? new Date(initialData.dueDate).toISOString().split("T")[0]
          : "",
      });
    } else {
      reset({
        subject: "",
        issue: "",
        priorityId: priorities.length > 0 ? priorities[0].id : "",
        groupId: "",
        typeId: types.length > 0 ? types[0].id : "",
        assigneeId: "",
        dueDate: "",
      });
    }
  }, [initialData, priorities, types, reset]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <CustomInput
        name="subject"
        control={control}
        rules={{ required: "Subject is required" }}
        label="Subject"
        placeholder="Brief summary of the issue"
        required
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <CustomSelect
          name="groupId"
          control={control}
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
              ...agents.map((a) => ({ value: a.id, label: a.fullname })),
            ]}
          />
        )}

        <CustomInput
          name="dueDate"
          control={control}
          label="Due Date (Optional)"
          type="date"
          placeholder="Select due date"
        />
      </div>

      <CustomTextArea
        name="issue"
        control={control}
        rules={{ required: "Description is required" }}
        label="Description"
        placeholder="Detailed explanation..."
        rows={5}
        required
        style={{ resize: "none" }}
      />

      <CustomButton
        type="submit"
        variant="gradient"
        fullWidth
        loading={isLoading}
        style={{ marginTop: 10 }}
      >
        {initialData ? "Update Ticket" : "Create Ticket"}
      </CustomButton>
    </form>
  );
};

export default TicketForm;

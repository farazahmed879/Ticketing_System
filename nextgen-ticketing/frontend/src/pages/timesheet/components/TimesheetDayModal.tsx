import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import Modal from "../../../components/Modal";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import { useNotification } from "../../../context/NotificationContext";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { format } from "date-fns";
import styles from "../Timesheet.module.css";

import type { TimesheetEntry } from "../../../types";

interface TimesheetFormData {
  totalHours: string;
  notes: string;
  tasks: {
    description: string;
    hours: number;
    projectId: string;
    ticketId: string;
  }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  existingEntry?: TimesheetEntry;
  googleEvents: any[];
}

const TimesheetDayModal: React.FC<Props> = ({
  isOpen,
  onClose,
  date,
  existingEntry,
  googleEvents,
}) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const { showNotification, setIsLoading } = useNotification();

  const { handleSubmit, control, reset, watch } = useForm<TimesheetFormData>({
    defaultValues: {
      totalHours: "8",
      notes: "",
      tasks: [{ description: "", hours: 0, projectId: "", ticketId: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "tasks",
  });

  const watchedTasks = watch("tasks");
  const taskSum = watchedTasks.reduce(
    (sum, t) => sum + (Number(t.hours) || 0),
    0,
  );
  const isApproved = existingEntry?.status === "APPROVED";

  useEffect(() => {
    if (existingEntry) {
      reset({
        totalHours: existingEntry.totalHours?.toString() || "8",
        notes: existingEntry.notes || "",
        tasks: existingEntry.tasks || [
          { description: "", hours: 0, projectId: "", ticketId: "" },
        ],
      });
    } else {
      reset({
        totalHours: "8",
        notes: "",
        tasks: [{ description: "", hours: 0, projectId: "", ticketId: "" }],
      });
    }
  }, [existingEntry, reset]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          api.get(API_ROUTES.COMMON.GROUPS),
          api.get(API_ROUTES.TICKETS.BASE, { params: { limit: -1 } }),
        ]);
        setProjects(pRes.data.groups);
        setTickets(tRes.data.tickets);
      } catch (err) {
        console.error("Failed to fetch metadata", err);
      }
    };
    fetchMetadata();
  }, []);

  const handleSave = async (data: TimesheetFormData) => {
    setIsLoading(true);
    try {
      await api.post(API_ROUTES.TIMESHEETS.ENTRIES, {
        date: date.toISOString(),
        totalHours: parseFloat(data.totalHours),
        notes: data.notes,
        tasks: data.tasks.filter((t) => t.description?.trim() || t.hours > 0),
      });
      showNotification("success", "Timesheet saved successfully");
      onClose();
    } catch (err: any) {
      console.error("Failed to save timesheet", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to save timesheet",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Tasks - ${format(date, "MMMM dd, yyyy")}`}
      maxWidth="800px"
    >
      <form
        onSubmit={handleSubmit(handleSave)}
        style={{ display: "flex", flexDirection: "column", gap: 24 }}
      >
        {googleEvents.length > 0 && (
          <div
            className="glass-card"
            style={{
              padding: 16,
              background: "rgba(66, 133, 244, 0.05)",
              borderColor: "rgba(66, 133, 244, 0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                color: "#4285f4",
                fontWeight: 600,
              }}
            >
              <CustomIcon name="Calendar" size={18} />
              Google Calendar Events
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {googleEvents.map((evt, i) => (
                <div
                  key={i}
                  className={styles.googleEvent}
                  style={{ padding: "6px 12px" }}
                >
                  {evt.title}
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}
        >
          <div>
            <CustomInput
              name="totalHours"
              control={control}
              rules={{ required: "Total hours is required" }}
              label="Total Hours for the Day"
              type="number"
              step="0.5"
              required
              disabled={isApproved}
            />
            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: 4,
              }}
            >
              Sum of tasks: {taskSum}h
            </div>
          </div>
          <CustomInput
            name="notes"
            control={control}
            label="Daily Notes (Optional)"
            placeholder="Anything special about today?"
            disabled={isApproved}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
              Detailed Tasks
            </h3>
            {!isApproved && (
              <CustomButton
                variant="secondary"
                size="sm"
                type="button"
                onClick={() =>
                  append({
                    description: "",
                    hours: 0,
                    projectId: "",
                    ticketId: "",
                  })
                }
                icon={<CustomIcon name="Plus" size={16} />}
              >
                Add Task
              </CustomButton>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="glass-card"
                style={{
                  padding: 16,
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1.5fr 1.5fr auto",
                  gap: 12,
                  alignItems: "end",
                }}
              >
                <CustomInput
                  name={`tasks.${index}.description` as const}
                  control={control}
                  rules={{ required: "Description is required" }}
                  label="Description"
                  placeholder="What did you do?"
                  disabled={isApproved}
                  required
                />
                <CustomInput
                  name={`tasks.${index}.hours` as const}
                  control={control}
                  rules={{ required: "Hours is required" }}
                  label="Hours"
                  type="number"
                  step="0.5"
                  disabled={isApproved}
                  required
                />
                <CustomSelect
                  name={`tasks.${index}.projectId` as const}
                  control={control}
                  label="Project"
                  placeholder="Select Project"
                  options={projects.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  disabled={isApproved}
                />
                <CustomSelect
                  name={`tasks.${index}.ticketId` as const}
                  control={control}
                  label="Ticket"
                  placeholder="Link Ticket"
                  options={tickets.map((t) => ({
                    value: t.id,
                    label: `#${t.uid} ${t.subject.substring(0, 20)}...`,
                  }))}
                  disabled={isApproved}
                />
                {!isApproved && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    style={{
                      background: "transparent",
                      color: "var(--accent-danger)",
                      cursor: "pointer",
                      paddingBottom: 10,
                    }}
                  >
                    <CustomIcon name="Trash2" size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 12,
          }}
        >
          <CustomButton variant="secondary" type="button" onClick={onClose}>
            Cancel
          </CustomButton>
          {!isApproved && (
            <CustomButton variant="gradient" type="submit">
              Save Timesheet
            </CustomButton>
          )}
          {isApproved && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--accent-success)",
                fontWeight: 600,
              }}
            >
              <CustomIcon name="CheckCircle2" size={20} />
              Approved by {existingEntry?.approvedBy?.fullname}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default TimesheetDayModal;

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { UIMessages } from "../../../utils/constants";
import { useAuth } from "../../../context/AuthContext";

import type { TimesheetEntry } from "../../../types";

// Sentinel for the "Miscellaneous" (no specific project) option. Mapped to an
// empty projectId on save, which the backend stores as null.
const MISC_PROJECT = "misc";

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
  const queryClient = useQueryClient();
  const { showNotification, setIsLoading } = useNotification();
  const { user } = useAuth();

  const { handleSubmit, control, reset, watch, setValue } =
    useForm<TimesheetFormData>({
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

  // Total hours for the day is derived from the sum of task hours — keep the
  // (read-only) field in sync whenever a task's hours change.
  useEffect(() => {
    setValue("totalHours", String(taskSum));
  }, [taskSum, setValue]);

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

  const { data: metadata } = useQuery({
    // Keyed by the current user so an employee always sees their own scoped
    // projects (the backend scopes /projects by the JWT role + user). Fetches
    // fresh whenever the modal opens, so newly created projects appear without
    // a page refresh.
    queryKey: ["timesheet-metadata", user?.id],
    queryFn: async () => {
      const [pRes, tRes] = await Promise.all([
        api.get(API_ROUTES.PROJECTS.BASE, { params: { limit: -1 } }),
        api.get(API_ROUTES.TICKETS.BASE, { params: { limit: -1 } }),
      ]);
      return {
        projects: pRes.data.projects || [],
        tickets: tRes.data.tickets || [],
      };
    },
    enabled: isOpen,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const projects = metadata?.projects || [];
  const tickets = metadata?.tickets || [];

  const saveMutation = useMutation({
    mutationFn: async (data: TimesheetFormData) => {
      return api.post(API_ROUTES.TIMESHEETS.ENTRIES, {
        date: date.toISOString(),
        totalHours: parseFloat(data.totalHours),
        notes: data.notes,
        tasks: data.tasks
          .filter((t) => t.description?.trim() || t.hours > 0)
          .map((t) => {
            // "Miscellaneous" means no specific project → store as null, and it
            // isn't tied to a ticket either.
            const isMisc = t.projectId === MISC_PROJECT;
            const projectId = isMisc ? "" : t.projectId;
            let ticketId = isMisc ? "" : t.ticketId;
            // Drop a linked ticket that doesn't belong to the chosen project
            // (e.g. the project was changed after a ticket was picked).
            if (ticketId && projectId) {
              const linked = tickets.find((x: any) => x.id === ticketId);
              if (linked && linked.project?.id !== projectId) ticketId = "";
            }
            return { ...t, projectId, ticketId };
          }),
      });
    },
    onMutate: () => setIsLoading(true, UIMessages.LOADING.SAVING_CHANGES),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      showNotification("success", "Timesheet saved successfully");
      onClose();
    },
    onError: (err: any) => {
      console.error("Failed to save timesheet", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to save timesheet",
      );
    },
  });

  const handleSave = async (data: TimesheetFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Tasks - ${format(date, "MMMM dd, yyyy")}`}
      maxWidth="1200px"
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
              max={24}
              required
              readOnly
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
                  gridTemplateColumns: "2fr .5fr 1.5fr 2fr auto",
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
                  max={24}
                  disabled={isApproved}
                  required
                />
                <CustomSelect
                  name={`tasks.${index}.projectId` as const}
                  control={control}
                  label="Project"
                  placeholder="Select Project"
                  options={[
                    { value: MISC_PROJECT, label: "Miscellaneous" },
                    ...projects.map((p: any) => ({
                      value: p.id,
                      label: p.name,
                    })),
                  ]}
                  disabled={isApproved}
                />
                {watchedTasks?.[index]?.projectId === MISC_PROJECT ? (
                  // Miscellaneous activity isn't tied to a ticket — hide the
                  // Ticket picker (empty spacer keeps the grid columns aligned).
                  <div />
                ) : (
                  <CustomSelect
                    name={`tasks.${index}.ticketId` as const}
                    control={control}
                    label="Ticket"
                    placeholder="Link Ticket"
                    options={tickets
                      // When a project is selected, only its tickets are
                      // linkable; otherwise all tickets are shown.
                      .filter((t: any) =>
                        watchedTasks?.[index]?.projectId
                          ? t.project?.id === watchedTasks[index].projectId
                          : true,
                      )
                      .map((t: { id: any; uid: any; subject: string }) => ({
                        value: t.id,
                        label: `#${t.uid} ${t.subject.substring(0, 20)}...`,
                      }))}
                    disabled={isApproved}
                  />
                )}
                {!isApproved && (
                  <CustomButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    icon={<CustomIcon name="Trash2" size={20} />}
                    style={{
                      color: "var(--accent-danger)",
                      paddingBottom: 10,
                    }}
                  />
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

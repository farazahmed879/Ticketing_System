/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo } from "react";
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

import type { TimesheetFormData, TimesheetDayModalProps } from "../types";

// Sentinel for the "Miscellaneous" (no specific project) option. Mapped to an
// empty projectId on save, which the backend stores as null.
const MISC_PROJECT = "misc";

const TimesheetDayModal: React.FC<TimesheetDayModalProps> = ({
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
  const isApproved =
    existingEntry?.managerApproved === "APPROVED" ||
    existingEntry?.hrApproved === "APPROVED";

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
        tasks:
          existingEntry.tasks && existingEntry.tasks.length > 0
            ? existingEntry.tasks.map((t: any) => ({
                description: t.description || "",
                hours: t.hours || 0,
                projectId: t.projectId || MISC_PROJECT,
                ticketId: t.ticketId || "",
              }))
            : [{ description: "", hours: 0, projectId: "", ticketId: "" }],
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
        api.get(API_ROUTES.PROJECTS.BASE, { params: { limit: -1, all: "true" } }),
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

  const projects = useMemo(() => {
    if (!metadata?.projects) return [];
    return [...metadata.projects].sort((a: any, b: any) =>
      a.name.localeCompare(b.name)
    );
  }, [metadata?.projects]);
  const tickets = metadata?.tickets || [];

  const saveMutation = useMutation({
    mutationFn: async (data: TimesheetFormData) => {
      return api.post(API_ROUTES.TIMESHEETS.ENTRIES, {
        date: format(date, "yyyy-MM-dd"),
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
        className={`${styles.flexColumn} ${styles.gap24}`}
      >
        {googleEvents.length > 0 && (
          <div className={`glass-card ${styles.googleEventContainer}`}>
            <div className={styles.googleEventHeader}>
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
              className={`${styles.fontSm} ${styles.textMuted} ${styles.mt12}`}
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

        <div className={`${styles.flexColumn} ${styles.gap12}`}>
          {fields.length > 0 ? (
            <div
              className={`glass-card ${styles.flexColumn}`}
              style={{ padding: "8px 0" }}
            >
              <div className={styles.taskGridHeader}>
                <div>Project</div>
                <div>Ticket</div>
                <div>Hours</div>
                <div>Description</div>
                <div style={{ width: 36 }}></div>
              </div>

              <div className={styles.flexColumn}>
                {fields.map((field, index) => (
                  <div key={field.id} className={styles.taskGridRow}>
                    <CustomSelect
                      name={`tasks.${index}.projectId` as const}
                      control={control}
                      placeholder="Select Project"
                      options={[
                        { value: MISC_PROJECT, label: "Miscellaneous" },
                        ...projects.map((p: any) => ({
                          value: p.id,
                          label: p.name,
                        })),
                      ]}
                      disabled={isApproved}
                      showSearch
                    />
                    {watchedTasks?.[index]?.projectId === MISC_PROJECT ? (
                      // Miscellaneous activity isn't tied to a ticket — hide the
                      // Ticket picker (empty spacer keeps the grid columns aligned).
                      <div />
                    ) : (
                      <CustomSelect
                        name={`tasks.${index}.ticketId` as const}
                        control={control}
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
                        showSearch
                      />
                    )}
                    <CustomInput
                      name={`tasks.${index}.hours` as const}
                      control={control}
                      rules={{ required: "Hours is required" }}
                      type="number"
                      step="0.5"
                      max={24}
                      disabled={isApproved}
                      required
                    />
                    <CustomInput
                      name={`tasks.${index}.description` as const}
                      control={control}
                      rules={{ required: "Description is required" }}
                      placeholder="What did you do?"
                      disabled={isApproved}
                      required
                    />
                    {!isApproved && (
                      <CustomButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        icon={<CustomIcon name="Trash2" size={20} />}
                        style={{ color: "var(--accent-danger)" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              className={`glass-card ${styles.textCenter} ${styles.textMuted}`}
              style={{ padding: 32 }}
            >
              No task added
            </div>
          )}

          {!isApproved && (
            <div className={styles.flexRow}>
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
            </div>
          )}
        </div>

        <div className={`${styles.flexEnd} ${styles.gap12} ${styles.mt12}`}>
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
              className={`${styles.flexRow} ${styles.alignCenter} ${styles.gap8} ${styles.textSuccess} ${styles.fw600}`}
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

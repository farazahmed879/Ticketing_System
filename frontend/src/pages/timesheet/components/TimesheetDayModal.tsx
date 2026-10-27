/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import Modal from "../../../components/Modal";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import CustomTextArea from "../../../components/CustomTextArea";
import { useNotification } from "../../../context/NotificationContext";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { format } from "date-fns";
import styles from "../Timesheet.module.css";
import { UIMessages } from "../../../utils/constants";
import { useAuth } from "../../../context/AuthContext";

import type { TimesheetFormData, TimesheetDayModalProps } from "../types";
import { ENTRY_TYPE_OPTIONS, isZeroHourEntryType, normalizeEntryType } from "../entryTypes";

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
        entryType: "ONSITE_OFFICE",
        tasks: [{ description: "", hours: 0, projectId: "", ticketId: "" }],
      },
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "tasks",
  });

  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({
    0: true,
  });

  const toggleTask = (index: number) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    fields.forEach((_, i) => {
      all[i] = true;
    });
    setExpandedTasks(all);
  };

  const collapseAll = () => {
    setExpandedTasks({});
  };

  const watchedTasks = watch("tasks");
  const watchedEntryType = watch("entryType");
  const isZeroHourDay = isZeroHourEntryType(watchedEntryType);
  const taskSum = watchedTasks.reduce(
    (sum, t) => sum + (Number(t.hours) || 0),
    0,
  );
  const isApproved =
    existingEntry?.managerApproved === "APPROVED" ||
    existingEntry?.hrApproved === "APPROVED";

  // Total hours for the day is derived from the sum of task hours — keep the
  // (read-only) field in sync whenever a task's hours change. Weekend /
  // Public Holiday / Full Day Leave days have no tasks, so the total is
  // always 0.
  useEffect(() => {
    setValue("totalHours", isZeroHourDay ? "0" : String(taskSum));
  }, [taskSum, isZeroHourDay, setValue]);

  useEffect(() => {
    if (existingEntry) {
      reset({
        totalHours: existingEntry.totalHours?.toString() || "8",
        notes: existingEntry.notes || "",
        entryType: normalizeEntryType(existingEntry.entryType),
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
        entryType: "ONSITE_OFFICE",
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
      const isZeroHour = isZeroHourEntryType(data.entryType);
      return api.post(API_ROUTES.TIMESHEETS.ENTRIES, {
        date: format(date, "yyyy-MM-dd"),
        entryType: data.entryType,
        totalHours: isZeroHour ? 0 : parseFloat(data.totalHours),
        notes: data.notes,
        tasks: isZeroHour
          ? []
          : data.tasks
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

  const insertFormatting = (
    index: number,
    type: "bullet" | "number" | "bold",
  ) => {
    const currentVal = watchedTasks?.[index]?.description || "";
    let updated = currentVal;
    if (type === "bullet") {
      updated = currentVal ? `${currentVal}\n• ` : "• ";
    } else if (type === "number") {
      const lines = currentVal.split("\n");
      const num = lines.filter((l) => /^\d+\./.test(l.trim())).length + 1;
      updated = currentVal ? `${currentVal}\n${num}. ` : "1. ";
    } else if (type === "bold") {
      updated = currentVal ? `${currentVal} **bold**` : "**bold**";
    }
    setValue(`tasks.${index}.description`, updated, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Tasks - ${format(date, "MMMM dd, yyyy")}`}
      maxWidth="980px"
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

        {/* Top Controls: Day Type & Daily Notes in balanced 2-column grid */}
        <div className={styles.modalTopRow}>
          <CustomSelect
            name="entryType"
            control={control}
            label="Day Type"
            options={ENTRY_TYPE_OPTIONS}
            disabled={isApproved}
          />
          <CustomInput
            name="notes"
            control={control}
            label="Daily Notes (Optional)"
            placeholder="Anything special or noteworthy about today?"
            disabled={isApproved}
          />
        </div>

        {watchedEntryType === "HALF_DAY_LEAVE" && (
          <div
            className="glass-card"
            style={{
              padding: 12,
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              borderLeft: "3px solid var(--accent-warning)",
            }}
          >
            Log the hours worked for the working half of the day below.
            Approving this entry will deduct 0.5 day from your leave balance.
          </div>
        )}

        {isZeroHourDay && (
          <div
            className="glass-card"
            style={{
              padding: 12,
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              borderLeft: "3px solid var(--accent-primary)",
            }}
          >
            {watchedEntryType === "FULL_DAY_LEAVE"
              ? "No hours or tasks are needed for a Full Day Leave. Approving this entry will deduct 1 day from your leave balance."
              : watchedEntryType === "PUBLIC_HOLIDAY"
                ? "No hours or tasks are needed for a Public Holiday. This does not affect your leave balance."
                : "No hours or tasks are needed for a Weekend entry."}
          </div>
        )}

        {/* Tasks & Deliverables Section */}
        {!isZeroHourDay && (
          <div className={styles.flexColumn} style={{ gap: 12 }}>
            <div className={styles.tasksSectionHeader}>
              <div className={styles.tasksHeaderTitle}>
                <h3 className={styles.sectionHeading}>
                  <CustomIcon name="Layers" size={17} />
                  <span>Tasks & Deliverables</span>
                </h3>
                <span className={styles.tasksCountPill}>
                  {fields.length} {fields.length === 1 ? "task" : "tasks"}
                </span>
                <span className={styles.hoursLoggedPill}>
                  {taskSum}h / 8h logged
                </span>
              </div>
              {fields.length > 1 && (
                <div className={styles.tasksHeaderActions}>
                  <button
                    type="button"
                    onClick={expandAll}
                    className={styles.linkBtn}
                  >
                    Expand All
                  </button>
                  <span className={styles.linkDivider}>|</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className={styles.linkBtn}
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>

            {fields.length > 0 ? (
              <div className={styles.flexColumn} style={{ gap: 12 }}>
                {fields.map((field, index) => {
                  const isExpanded = expandedTasks[index] ?? index === 0;
                  const taskHours = watchedTasks?.[index]?.hours;
                  const taskDesc = watchedTasks?.[index]?.description;
                  const taskProjId = watchedTasks?.[index]?.projectId;
                  const taskProjName =
                    taskProjId === MISC_PROJECT
                      ? "Miscellaneous"
                      : projects.find((p: any) => p.id === taskProjId)?.name;

                  return (
                    <div key={field.id} className={styles.taskAccordionCard}>
                      {/* Accordion Header */}
                      <div
                        className={styles.taskAccordionHeader}
                        onClick={() => toggleTask(index)}
                      >
                        <div className={styles.taskAccordionHeaderLeft}>
                          <CustomIcon
                            name={isExpanded ? "ChevronDown" : "ChevronRight"}
                            size={16}
                            style={{ color: "var(--accent-primary)", flexShrink: 0 }}
                          />
                          <span className={styles.taskNumberBadge}>
                            Task #{index + 1}
                          </span>
                          {taskProjName && (
                            <span className={styles.taskSummarySnippet}>
                              • <span>{taskProjName}</span>
                            </span>
                          )}
                          {Number(taskHours) > 0 && (
                            <span className={styles.taskHoursTag}>
                              {taskHours}h
                            </span>
                          )}
                          {!isExpanded && taskDesc && (
                            <span className={styles.taskDescPreview}>
                              {taskDesc.replace(/\n+/g, " ")}
                            </span>
                          )}
                        </div>

                        <div className={styles.taskAccordionHeaderRight}>
                          {!isApproved && fields.length > 1 && (
                            <button
                              type="button"
                              className={styles.trashBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                remove(index);
                              }}
                              title="Delete Task"
                            >
                              <CustomIcon name="Trash2" size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className={styles.taskAccordionBody}>
                          {/* Metadata Row: Project, Ticket, Hours */}
                          <div
                            className={
                              watchedTasks?.[index]?.projectId === MISC_PROJECT
                                ? styles.taskInputsGridNoTicket
                                : styles.taskInputsGrid
                            }
                          >
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
                              showSearch
                            />

                            {watchedTasks?.[index]?.projectId !== MISC_PROJECT && (
                              <CustomSelect
                                name={`tasks.${index}.ticketId` as const}
                                control={control}
                                label="Linked Ticket (Optional)"
                                placeholder="Link Ticket"
                                options={tickets
                                  .filter((t: any) =>
                                    watchedTasks?.[index]?.projectId
                                      ? t.project?.id === watchedTasks[index].projectId
                                      : true,
                                  )
                                  .map((t: { id: any; uid: any; subject: string }) => ({
                                    value: t.id,
                                    label: `#${t.uid} ${t.subject.substring(0, 24)}...`,
                                  }))}
                                disabled={isApproved}
                                showSearch
                              />
                            )}

                            <CustomInput
                              name={`tasks.${index}.hours` as const}
                              control={control}
                              label="Hours"
                              rules={{ required: "Hours is required" }}
                              type="number"
                              step="0.5"
                              min={0.25}
                              max={24}
                              disabled={isApproved}
                              required
                            />
                          </div>

                          {/* Description Textarea with Integrated Formatting Toolbar */}
                          <CustomTextArea
                            name={`tasks.${index}.description` as const}
                            control={control}
                            label={
                              <div className={styles.textareaLabelRow}>
                                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <CustomIcon name="FileText" size={14} /> Description & Progress
                                </span>
                                {!isApproved && (
                                  <div className={styles.formattingTools}>
                                    <button
                                      type="button"
                                      className={styles.formatBtn}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        insertFormatting(index, "bullet");
                                      }}
                                      title="Add bullet point"
                                    >
                                      <CustomIcon name="List" size={12} /> Bullet
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.formatBtn}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        insertFormatting(index, "number");
                                      }}
                                      title="Add numbered list item"
                                    >
                                      <CustomIcon name="ListOrdered" size={12} /> Numbered
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.formatBtn}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        insertFormatting(index, "bold");
                                      }}
                                      title="Add bold formatting"
                                    >
                                      <CustomIcon name="Bold" size={12} /> Bold
                                    </button>
                                  </div>
                                )}
                              </div>
                            }
                            rules={{ required: "Description is required" }}
                            placeholder="What did you work on? Detail your progress, commits, or deliverables..."
                            rows={3}
                            autoResize
                            disabled={isApproved}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className={`glass-card ${styles.textCenter} ${styles.textMuted}`}
                style={{ padding: 32 }}
              >
                No tasks added yet
              </div>
            )}

            {!isApproved && (
              <button
                type="button"
                className={styles.addTaskButton}
                onClick={() => {
                  const nextIdx = fields.length;
                  append({
                    description: "",
                    hours: 0,
                    projectId: "",
                    ticketId: "",
                  });
                  setExpandedTasks((prev) => ({
                    ...prev,
                    [nextIdx]: true,
                  }));
                }}
              >
                <CustomIcon name="PlusCircle" size={16} />
                <span>Add Another Task</span>
              </button>
            )}
          </div>
        )}

        {/* Modal Footer */}
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

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomBadge from "../../../components/CustomBadge";
import { useNotification } from "../../../context/NotificationContext";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { format, isToday } from "date-fns";
import styles from "../Timesheet.module.css";
import { UIMessages } from "../../../utils/constants";
import { useAuth } from "../../../context/AuthContext";

import type { TimesheetEntry } from "../../../types";
import type { TimesheetFormData } from "../types";
import {
  ENTRY_TYPE_OPTIONS,
  isZeroHourEntryType,
  normalizeEntryType,
} from "../entryTypes";

// Sentinel for "Miscellaneous" (no specific project) option
const MISC_PROJECT = "misc";

export interface TimesheetLogPanelProps {
  date: Date;
  existingEntry?: TimesheetEntry;
  googleEvents?: { date: Date; title: string }[];
  onSaved?: () => void;
  isCalendarCollapsed?: boolean;
  onExpandCalendar?: () => void;
}

const TimesheetLogPanel: React.FC<TimesheetLogPanelProps> = ({
  date,
  existingEntry,
  googleEvents = [],
  onSaved,
  isCalendarCollapsed,
  onExpandCalendar,
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
  const taskSum = (watchedTasks || []).reduce(
    (sum, t) => sum + (Number(t?.hours) || 0),
    0,
  );
  const isApproved =
    existingEntry?.managerApproved === "APPROVED" ||
    existingEntry?.hrApproved === "APPROVED";
  const isRejected =
    existingEntry?.managerApproved === "REJECTED" ||
    existingEntry?.hrApproved === "REJECTED";

  // Derive totalHours whenever tasks change or day type switches
  useEffect(() => {
    setValue("totalHours", isZeroHourDay ? "0" : String(taskSum));
  }, [taskSum, isZeroHourDay, setValue]);

  // Reset form whenever date or existingEntry changes
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
    // Default first task open on day change
    setExpandedTasks({ 0: true });
  }, [existingEntry, date, reset]);

  const { data: metadata } = useQuery({
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
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
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
          : (data.tasks || [])
              .filter((t) => t.description?.trim() || t.hours > 0)
              .map((t) => {
                const isMisc = t.projectId === MISC_PROJECT;
                const projectId = isMisc ? "" : t.projectId;
                let ticketId = isMisc ? "" : t.ticketId;
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
      showNotification(
        "success",
        `Timesheet for ${format(date, "MMM dd, yyyy")} saved successfully`,
      );
      if (onSaved) onSaved();
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
    <div className={`glass-card ${styles.logPanelCard}`}>
      {/* Header */}
      <div className={styles.logPanelHeader}>
        <div className={styles.logPanelTitleGroup}>
          <h2 className={styles.logPanelTitle}>
            <CustomIcon name="Clock" size={19} />
            <span>Log Tasks</span>
          </h2>
          <span className={styles.logPanelDate}>
            {format(date, "EEEE, MMMM dd, yyyy")}
          </span>
        </div>

        <div className={styles.logPanelBadges}>
          {isToday(date) && (
            <CustomBadge variant="primary" style={{ fontSize: "0.72rem" }}>
              Today
            </CustomBadge>
          )}
          {existingEntry ? (
            isApproved ? (
              <CustomBadge variant="success" style={{ fontSize: "0.72rem" }}>
                Approved
              </CustomBadge>
            ) : isRejected ? (
              <CustomBadge variant="danger" style={{ fontSize: "0.72rem" }}>
                Rejected
              </CustomBadge>
            ) : (
              <CustomBadge variant="warning" style={{ fontSize: "0.72rem" }}>
                Pending
              </CustomBadge>
            )
          ) : (
            <CustomBadge variant="neutral" style={{ fontSize: "0.72rem" }}>
              Not Logged
            </CustomBadge>
          )}
          {isCalendarCollapsed && onExpandCalendar && (
            <CustomButton
              type="button"
              variant="secondary"
              size="sm"
              icon={<CustomIcon name="Calendar" size={13} />}
              onClick={onExpandCalendar}
              style={{ padding: "3px 8px", fontSize: "0.72rem" }}
              title="Expand Calendar"
            >
              Show Calendar
            </CustomButton>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit(handleSave)}
        className={styles.logPanelForm}
      >
        <div className={styles.logPanelFormBody}>
        {googleEvents.length > 0 && (
          <div className={`glass-card ${styles.googleEventContainer}`}>
            <div className={styles.googleEventHeader}>
              <CustomIcon name="Calendar" size={16} />
              <span>Google Calendar Events</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {googleEvents.map((evt, i) => (
                <div
                  key={i}
                  className={styles.googleEvent}
                  style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                >
                  {evt.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Controls: Day Type & Daily Notes */}
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
            placeholder="Notes or comments..."
            disabled={isApproved}
          />
        </div>

        {watchedEntryType === "HALF_DAY_LEAVE" && (
          <div
            className="glass-card"
            style={{
              padding: 10,
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              borderLeft: "3px solid var(--accent-warning)",
            }}
          >
            Log the hours worked for the working half of the day below. Approving will deduct 0.5 day from your leave balance.
          </div>
        )}

        {isZeroHourDay && (
          <div
            className="glass-card"
            style={{
              padding: 10,
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              borderLeft: "3px solid var(--accent-primary)",
            }}
          >
            {watchedEntryType === "FULL_DAY_LEAVE"
              ? "No hours or tasks are needed for a Full Day Leave (deducts 1 day from leave balance)."
              : watchedEntryType === "PUBLIC_HOLIDAY"
                ? "No hours or tasks are needed for a Public Holiday."
                : "No hours or tasks are needed for a Weekend entry."}
          </div>
        )}

        {/* Tasks & Deliverables Section */}
        {!isZeroHourDay && (
          <div className={styles.flexColumn} style={{ gap: 12 }}>
            <div className={styles.tasksSectionHeader}>
              <div className={styles.tasksHeaderTitle}>
                <h3 className={styles.sectionHeading}>
                  <CustomIcon name="Layers" size={16} />
                  <span>Tasks</span>
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
                  <CustomButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={expandAll}
                    style={{ padding: "2px 6px", height: "auto", fontSize: "0.75rem" }}
                  >
                    Expand All
                  </CustomButton>
                  <span className={styles.linkDivider}>|</span>
                  <CustomButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={collapseAll}
                    style={{ padding: "2px 6px", height: "auto", color: "var(--text-muted)", fontSize: "0.75rem" }}
                  >
                    Collapse All
                  </CustomButton>
                </div>
              )}
            </div>

            {fields.length > 0 ? (
              <div className={styles.flexColumn} style={{ gap: 10 }}>
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
                            size={15}
                            style={{ color: "var(--accent-primary)", flexShrink: 0 }}
                          />
                          <span className={styles.taskNumberBadge}>
                            #{index + 1}
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
                            <CustomButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                remove(index);
                              }}
                              title="Delete Task"
                              icon={<CustomIcon name="Trash2" size={14} />}
                              style={{
                                padding: 4,
                                minWidth: "auto",
                                color: "var(--text-muted)",
                              }}
                              className={styles.trashBtn}
                            />
                          )}
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className={styles.taskAccordionBody}>
                          <div
                            className={
                              watchedTasks?.[index]?.projectId === MISC_PROJECT
                                ? styles.taskInputsGridNoTicket
                                : styles.taskInputsGrid
                            }
                          >
                            <div className={styles.taskInputProject}>
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
                            </div>

                            {watchedTasks?.[index]?.projectId !== MISC_PROJECT && (
                              <div className={styles.taskInputTicket}>
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
                              </div>
                            )}

                            <div className={styles.taskInputHours}>
                              <CustomInput
                                name={`tasks.${index}.hours` as const}
                                control={control}
                                label="Hours"
                                rules={{
                                  required: "Hours is required",
                                  min: { value: 0.1, message: "Min 0.1" },
                                  max: { value: 24, message: "Max 24" },
                                }}
                                type="number"
                                step="any"
                                min={0.1}
                                max={24}
                                disabled={isApproved}
                                required
                              />
                            </div>
                          </div>

                          <CustomTextArea
                            name={`tasks.${index}.description` as const}
                            control={control}
                            label={
                              <div className={styles.textareaLabelRow}>
                                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <CustomIcon name="FileText" size={13} /> Details
                                </span>
                                {!isApproved && (
                                  <div className={styles.formattingTools}>
                                    <CustomButton
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        insertFormatting(index, "bullet");
                                      }}
                                      title="Add bullet point"
                                      icon={<CustomIcon name="List" size={12} />}
                                      style={{ padding: "2px 6px", fontSize: "0.7rem" }}
                                    >
                                      Bullet
                                    </CustomButton>
                                    <CustomButton
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        insertFormatting(index, "number");
                                      }}
                                      title="Add numbered list item"
                                      icon={<CustomIcon name="ListOrdered" size={12} />}
                                      style={{ padding: "2px 6px", fontSize: "0.7rem" }}
                                    >
                                      Numbered
                                    </CustomButton>
                                    <CustomButton
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        insertFormatting(index, "bold");
                                      }}
                                      title="Add bold formatting"
                                      icon={<CustomIcon name="Bold" size={12} />}
                                      style={{ padding: "2px 6px", fontSize: "0.7rem" }}
                                    >
                                      Bold
                                    </CustomButton>
                                  </div>
                                )}
                              </div>
                            }
                            rules={{ required: "Description is required" }}
                            placeholder="What did you work on? Deliverables, tickets, or commits..."
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
                style={{ padding: 24, fontSize: "0.85rem" }}
              >
                No tasks added yet. Click &quot;Add Another Task&quot; below to add one.
              </div>
            )}
          </div>
        )}
        </div>

        {/* Sticky Docked Footer */}
        <div className={styles.stickyFooter}>
          <div className={styles.footerLeft}>
            {!isApproved && !isZeroHourDay && (
              <CustomButton
                type="button"
                variant="outline"
                size="sm"
                icon={<CustomIcon name="PlusCircle" size={15} />}
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
                Add Another Task
              </CustomButton>
            )}
          </div>

          <div className={styles.footerRight}>
            <div className={styles.footerTotal}>
              <span>Total:</span>
              <span className={styles.totalHoursVal}>{isZeroHourDay ? "0" : taskSum}h</span>
            </div>

            {!isApproved && (
              <CustomButton
                variant="gradient"
                type="submit"
                loading={saveMutation.isPending}
                icon={<CustomIcon name="Check" size={16} />}
              >
                Save Timesheet
              </CustomButton>
            )}

            {isApproved && (
              <div
                className={`${styles.flexRow} ${styles.alignCenter} ${styles.gap8} ${styles.textSuccess} ${styles.fw600}`}
                style={{ fontSize: "0.85rem" }}
              >
                <CustomIcon name="CheckCircle2" size={18} />
                <span>Approved by {existingEntry?.approvedBy?.fullname}</span>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default TimesheetLogPanel;

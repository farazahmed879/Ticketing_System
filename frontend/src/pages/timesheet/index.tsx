import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameWeek,
  isSameDay,
  eachDayOfInterval,
  isWeekend,
  isToday,
} from "date-fns";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import styles from "./Timesheet.module.css";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import TimesheetLogPanel from "./components/TimesheetLogPanel";
import { FormattedTaskDescription } from "./components/TaskDescriptionEditor";
import { useAuth } from "../../context/AuthContext";

import type { TimesheetEntry } from "../../types";
import CustomSkeleton from "../../components/CustomSkeleton";
import { CalendarSkeleton } from "../../components/CustomSkeleton/CustomSkeleton";
import { ROLE_TYPE } from "../roles/roleConstants";
import { getEntryTypeLabel, isZeroHourEntryType } from "./entryTypes";

// Google Calendar Events
const MOCK_GOOGLE_EVENTS: { date: Date; title: string }[] = [];

interface TimesheetTableRow {
  id: string;
  day: Date;
  entry?: TimesheetEntry;
  isWeekendDay: boolean;
  isTodayDay: boolean;
  isFutureDay: boolean;
}

const Timesheet: React.FC = () => {
  const [period, setPeriod] = useState<"monthly" | "weekly">("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const [tableFilter, setTableFilter] = useState<"all" | "working" | "missing">("all");
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: entriesData, isLoading: loading } = useQuery({
    queryKey: [
      "timesheets",
      period,
      period === "monthly"
        ? format(currentDate, "yyyy-MM")
        : format(startOfWeek(currentDate), "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      const start =
        period === "monthly"
          ? startOfWeek(startOfMonth(currentDate))
          : startOfWeek(currentDate);
      const end =
        period === "monthly"
          ? endOfWeek(endOfMonth(currentDate))
          : endOfWeek(currentDate);

      const res = await api.get(API_ROUTES.TIMESHEETS.ENTRIES, {
        params: {
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(end, "yyyy-MM-dd"),
        },
      });
      return res.data.entries;
    },
    enabled: !!user,
  });

  const entries: TimesheetEntry[] = entriesData || [];

  const handlePrev = () => {
    if (period === "monthly") {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (period === "monthly") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const getDateTitle = () => {
    if (period === "monthly") {
      return format(currentDate, "MMMM yyyy");
    }
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    const sameMonth = isSameMonth(start, end);
    if (sameMonth) {
      return `${format(start, "MMM d")} - ${format(end, "d, yyyy")}`;
    }
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  };

  const renderHeader = () => (
    <div className={styles.controls}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className={styles.calendarCollapseBtn}
          onClick={() => setIsCalendarCollapsed(true)}
          title="Collapse Calendar"
          aria-label="Collapse Calendar"
        >
          <CustomIcon name="ChevronRight" size={16} />
        </button>
        <h2 className={styles.monthYear}>{getDateTitle()}</h2>
        <div className={styles.navButtons}>
          <CustomButton variant="secondary" size="sm" onClick={handlePrev}>
            <CustomIcon name="ChevronLeft" size={20} />
          </CustomButton>
          <CustomButton
            variant="secondary"
            size="sm"
            onClick={() => {
              const today = new Date();
              setCurrentDate(today);
              setSelectedDate(today);
            }}
          >
            Today
          </CustomButton>
          <CustomButton variant="secondary" size="sm" onClick={handleNext}>
            <CustomIcon name="ChevronRight" size={20} />
          </CustomButton>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Monthly / Weekly Filter Switcher */}
        <div className={styles.viewSwitcher}>
          <CustomButton
            type="button"
            variant={period === "monthly" ? "primary" : "ghost"}
            size="sm"
            icon={<CustomIcon name="CalendarRange" size={15} />}
            onClick={() => setPeriod("monthly")}
          >
            Monthly
          </CustomButton>
          <CustomButton
            type="button"
            variant={period === "weekly" ? "primary" : "ghost"}
            size="sm"
            icon={<CustomIcon name="CalendarDays" size={15} />}
            onClick={() => setPeriod("weekly")}
          >
            Weekly
          </CustomButton>
        </div>

        {/* View Switcher: Calendar / Table */}
        <div className={styles.viewSwitcher}>
          <CustomButton
            type="button"
            variant={viewMode === "calendar" ? "primary" : "ghost"}
            size="sm"
            icon={<CustomIcon name="Calendar" size={15} />}
            onClick={() => setViewMode("calendar")}
          >
            Calendar
          </CustomButton>
          <CustomButton
            type="button"
            variant={viewMode === "table" ? "primary" : "ghost"}
            size="sm"
            icon={<CustomIcon name="Table" size={15} />}
            onClick={() => setViewMode("table")}
          >
            Table View
          </CustomButton>
        </div>
      </div>
    </div>
  );

  const renderDays = () => {
    if (period === "weekly") return null;
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      <div className={styles.calendarGrid}>
        {days.map((day) => (
          <div key={day} className={styles.dayHeader}>
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const startDate =
      period === "monthly"
        ? startOfWeek(startOfMonth(currentDate))
        : startOfWeek(currentDate);
    const endDate =
      period === "monthly"
        ? endOfWeek(endOfMonth(currentDate))
        : endOfWeek(currentDate);

    const dateFormat = "d";
    const grid: any[] = [];

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    days.forEach((day) => {
      const entry = entries.find((e) => isSameDay(new Date(e.date), day));
      const googleEvents = MOCK_GOOGLE_EVENTS.filter((e) =>
        isSameDay(e.date, day),
      );

      const isCurrentMonth = isSameMonth(day, currentDate);
      const isTodayDay = isSameDay(day, new Date());
      const isSelectedDay = isSameDay(day, selectedDate);

      const cellNode = (
        <div
          key={day.toString()}
          className={`${styles.dayCell} ${period === "weekly" ? styles.weeklyDayCell : ""} glass-card ${period === "monthly" && !isCurrentMonth ? styles.otherMonth : ""} ${isTodayDay ? styles.today : ""} ${isSelectedDay ? styles.selectedDay : ""}`}
          style={undefined}
          onClick={() => setSelectedDate(day)}
        >
          <div className={styles.dayCellHeader}>
            <span className={`${styles.dayNumber} ${isTodayDay ? styles.todayDayNumber : ""}`}>
              {format(day, dateFormat)}
            </span>
            {entry && (
              <span
                className={`${styles.statusDotSmall} ${
                  entry.hrApproved === "APPROVED" || entry.managerApproved === "APPROVED"
                    ? styles.statusApproved
                    : entry.hrApproved === "REJECTED" || entry.managerApproved === "REJECTED"
                      ? styles.statusRejected
                      : styles.statusPending
                }`}
                title={
                  entry.hrApproved === "APPROVED" || entry.managerApproved === "APPROVED"
                    ? "Approved"
                    : entry.hrApproved === "REJECTED" || entry.managerApproved === "REJECTED"
                      ? "Rejected"
                      : "Pending"
                }
              />
            )}
          </div>

          {entry && (
            <div className={styles.dayCellContent}>
              <div
                className={`${styles.hoursBadge} ${isZeroHourEntryType(entry.entryType) ? styles.zeroHourBadge : ""}`}
                title={getEntryTypeLabel(entry.entryType)}
              >
                {isZeroHourEntryType(entry.entryType)
                  ? getEntryTypeLabel(entry.entryType)
                  : `${entry.totalHours}h`}
              </div>

              {!isZeroHourEntryType(entry.entryType) && entry.tasks?.length > 0 && (
                <div className={styles.weeklyTaskIndicator}>
                  {entry.tasks.length} {entry.tasks.length === 1 ? "task" : "tasks"}
                </div>
              )}
            </div>
          )}

          {googleEvents.length > 0 && (
            <div className={styles.taskList}>
              {googleEvents.map((evt, idx) => (
                <div key={idx} className={styles.googleEvent}>
                  {evt.title}
                </div>
              ))}
            </div>
          )}
        </div>
      );
      if (period === "weekly") {
        grid.push(
          <div key={day.toString()} className={styles.weeklyDayColumn}>
            <div className={styles.dayHeader}>{format(day, "EEE")}</div>
            {cellNode}
          </div>
        );
      } else {
        grid.push(cellNode);
      }
      void (0
      );
    });

    return <div className={period === "weekly" ? styles.weeklyCalendarGrid : styles.calendarGrid}>{grid}</div>;
  };

  const toggleDayExpanded = (dayId: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayId]: !prev[dayId],
    }));
  };

  const renderExpandedTasks = (row: TimesheetTableRow) => {
    const entry = row.entry;
    const tasks = entry?.tasks || [];

    return (
      <div className={styles.expandedChildContainer}>
        <div className={styles.expandedChildHeader}>
          <div className={styles.expandedChildTitle}>
            <CustomIcon name="ListTodo" size={14} style={{ color: "var(--accent-primary)" }} />
            <span>Tasks Breakdown</span>
            {entry?.entryType && (
              <CustomBadge variant="neutral" style={{ fontSize: "0.68rem", padding: "1px 6px", textTransform: "none" }}>
                {getEntryTypeLabel(entry.entryType)}
              </CustomBadge>
            )}
          </div>
          {entry && (
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-primary)" }}>
              {isZeroHourEntryType(entry.entryType) ? "0h" : `${entry.totalHours}h Total`}
            </span>
          )}
        </div>

        {tasks.length > 0 ? (
          <div className={styles.expandedTasksList}>
            {tasks.map((task, idx) => (
              <div key={task.id || idx} className={styles.childTaskCard}>
                <div className={styles.childTaskCardTop}>
                  <div className={styles.childTaskMeta}>
                    {task.project?.name && (
                      <span className={styles.childTaskProject}>
                        <CustomIcon name="Folder" size={12} />
                        {task.project.name}
                      </span>
                    )}
                    {task.ticket && (
                      <span className={styles.childTaskTicket}>
                        <CustomIcon name="Ticket" size={12} />
                        #{task.ticket.uid} {task.ticket.subject}
                      </span>
                    )}
                  </div>
                  {task.hours > 0 && (
                    <span className={styles.childTaskHours}>{task.hours}h</span>
                  )}
                </div>
                {task.description && (
                  <FormattedTaskDescription content={task.description} className={styles.childTaskDesc} />
                )}
              </div>
            ))}
          </div>
        ) : entry?.notes ? (
          <div className={styles.childEmptyNote}>
            <CustomIcon name="FileText" size={14} style={{ color: "var(--accent-primary)" }} />
            <span>{entry.notes}</span>
          </div>
        ) : (
          <div className={styles.childEmptyState}>
            <CustomIcon name="Clock" size={14} />
            <span>
              {row.isWeekendDay
                ? "Weekend Off — No tasks recorded"
                : row.isFutureDay
                ? "Upcoming day"
                : "No tasks logged yet for this day"}
            </span>
          </div>
        )}
      </div>
    );
  };

  const tableColumns = [
    {
      header: "Date",
      key: "date",
      style: { minWidth: "150px" },
      render: (row: TimesheetTableRow) => {
        const isExpanded = !!expandedDays[row.id];
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className={styles.rowExpandBtn}
              onClick={(e) => {
                e.stopPropagation();
                toggleDayExpanded(row.id);
              }}
              title={isExpanded ? "Collapse Tasks Summary" : "Expand Tasks Summary"}
              aria-label={isExpanded ? "Collapse Tasks Summary" : "Expand Tasks Summary"}
            >
              <CustomIcon
                name={isExpanded ? "ChevronDown" : "ChevronRight"}
                size={14}
                style={{ color: isExpanded ? "var(--accent-primary)" : "var(--text-muted)" }}
              />
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontWeight: 600,
                    color: row.isTodayDay ? "var(--accent-primary)" : "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                >
                  {format(row.day, "EEE, MMM dd")}
                </span>
                {row.isTodayDay && (
                  <CustomBadge variant="primary" style={{ fontSize: "0.62rem", padding: "1px 5px" }}>
                    Today
                  </CustomBadge>
                )}
              </div>
              {row.isWeekendDay && (
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  Weekend
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "Hours",
      key: "totalHours",
      style: { width: "70px", textAlign: "center" as const },
      render: (row: TimesheetTableRow) => {
        if (row.entry) {
          return (
            <div className={styles.hoursBadge} style={{ display: "inline-block" }}>
              {isZeroHourEntryType(row.entry.entryType)
                ? "0h"
                : `${row.entry.totalHours}h`}
            </div>
          );
        }
        return <span style={{ color: "var(--text-muted)" }}>-</span>;
      },
    },
    {
      header: "Status",
      key: "status",
      style: { width: "100px" },
      render: (row: TimesheetTableRow) => {
        if (row.entry) {
          const isApproved =
            row.entry.hrApproved === "APPROVED" ||
            row.entry.managerApproved === "APPROVED";
          const isRejected =
            row.entry.hrApproved === "REJECTED" ||
            row.entry.managerApproved === "REJECTED";

          if (isApproved) {
            return <CustomBadge variant="success">Approved</CustomBadge>;
          }
          if (isRejected) {
            return <CustomBadge variant="danger">Rejected</CustomBadge>;
          }
          return <CustomBadge variant="warning">Pending</CustomBadge>;
        }

        if (row.isWeekendDay) {
          return <CustomBadge variant="neutral">Off</CustomBadge>;
        }
        if (row.isFutureDay) {
          return <CustomBadge variant="neutral">Upcoming</CustomBadge>;
        }
        return (
          <CustomBadge variant="danger" style={{ opacity: 0.85 }}>
            Missing
          </CustomBadge>
        );
      },
    },
    {
      header: "Action",
      key: "action",
      style: { width: "95px", textAlign: "right" as const },
      render: (row: TimesheetTableRow) => {
        if (row.entry) {
          return (
            <CustomButton
              size="sm"
              variant="secondary"
              icon={<CustomIcon name="Edit3" size={13} />}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDate(row.day);
              }}
            >
              Edit
            </CustomButton>
          );
        }
        return (
          <CustomButton
            size="sm"
            variant="gradient"
            icon={<CustomIcon name="Plus" size={13} />}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDate(row.day);
            }}
          >
            Log
          </CustomButton>
        );
      },
    },
  ];

  const renderTableView = () => {
    const rangeStart =
      period === "monthly"
        ? startOfMonth(currentDate)
        : startOfWeek(currentDate);
    const rangeEnd =
      period === "monthly"
        ? endOfMonth(currentDate)
        : endOfWeek(currentDate);

    const periodDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const tableRows: TimesheetTableRow[] = periodDays.map((day) => {
      const dayDate = new Date(day);
      dayDate.setHours(0, 0, 0, 0);
      const entry = entries.find((e) => isSameDay(new Date(e.date), day));
      const isWeekendDay = isWeekend(day);
      const isTodayDay = isToday(day);
      const isFutureDay = dayDate.getTime() > now.getTime();

      return {
        id: format(day, "yyyy-MM-dd"),
        day,
        entry,
        isWeekendDay,
        isTodayDay,
        isFutureDay,
      };
    });

    const workingDaysCount = tableRows.filter((r) => !r.isWeekendDay).length;
    const missingDaysCount = tableRows.filter(
      (r) => !r.entry && !r.isWeekendDay && !r.isFutureDay,
    ).length;
    const loggedDaysCount = tableRows.filter((r) => !!r.entry).length;

    const filteredRows = tableRows.filter((row) => {
      if (tableFilter === "working") return !row.isWeekendDay;
      if (tableFilter === "missing") {
        return !row.entry && !row.isWeekendDay && !row.isFutureDay;
      }
      return true;
    });

    const allExpanded =
      filteredRows.length > 0 && filteredRows.every((r) => !!expandedDays[r.id]);

    const toggleAllExpanded = () => {
      if (allExpanded) {
        setExpandedDays({});
      } else {
        const next: Record<string, boolean> = {};
        filteredRows.forEach((r) => {
          next[r.id] = true;
        });
        setExpandedDays(next);
      }
    };

    return (
      <div className={styles.tableWrapper}>
        <div className={styles.tableFilterRow}>
          <div className={styles.tableFilters}>
            <CustomButton
              type="button"
              variant={tableFilter === "all" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTableFilter("all")}
            >
              All ({tableRows.length})
            </CustomButton>
            <CustomButton
              type="button"
              variant={tableFilter === "working" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTableFilter("working")}
            >
              Working ({workingDaysCount})
            </CustomButton>
            <CustomButton
              type="button"
              variant={tableFilter === "missing" ? "danger" : "secondary"}
              size="sm"
              icon={<CustomIcon name="AlertCircle" size={13} />}
              onClick={() => setTableFilter("missing")}
            >
              Missing ({missingDaysCount})
            </CustomButton>
            <CustomButton
              type="button"
              variant="ghost"
              size="sm"
              icon={<CustomIcon name={allExpanded ? "ChevronsUp" : "ChevronsDown"} size={13} />}
              onClick={toggleAllExpanded}
              title={allExpanded ? "Collapse All Rows" : "Expand All Rows"}
            >
              {allExpanded ? "Collapse All" : "Expand All"}
            </CustomButton>
          </div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            • {loggedDaysCount} Logged
          </span>
        </div>

        <CustomTable<TimesheetTableRow>
          columns={tableColumns}
          data={filteredRows}
          loading={loading}
          emptyMessage="No days match the selected filter."
          highlightRowId={format(selectedDate, "yyyy-MM-dd")}
          onRowClick={(row) => setSelectedDate(row.day)}
          isRowExpanded={(row) => !!expandedDays[row.id]}
          renderExpandedRow={renderExpandedTasks}
        />
      </div>
    );
  };

  const isInCurrentPeriod = (dateStr: string) => {
    const d = new Date(dateStr);
    return period === "monthly"
      ? isSameMonth(d, currentDate)
      : isSameWeek(d, currentDate);
  };

  const totalPeriodHours = entries.reduce(
    (sum, e) => sum + (isInCurrentPeriod(e.date) ? e.totalHours : 0),
    0,
  );
  const approvedHours = entries
    .filter(
      (e) =>
        (e.hrApproved === "APPROVED" || e.managerApproved === "APPROVED") &&
        isInCurrentPeriod(e.date),
    )
    .reduce((sum, e) => sum + e.totalHours, 0);

  const targetHours = period === "monthly" ? 160 : 40;
  const targetPercent = Math.round((totalPeriodHours / targetHours) * 100);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={`${styles.fontXl} ${styles.fw700}`}>My Timesheet</h1>
        <div className={`${styles.flexRow} ${styles.gap12}`}>
          <CustomButton
            variant="secondary"
            icon={<CustomIcon name="FileText" size={18} />}
            onClick={() => navigate("/timesheet/report")}
          >
            Monthly Report
          </CustomButton>
          {user?.role?.roleType === ROLE_TYPE.AGENT ||
          user?.role?.roleType === ROLE_TYPE.ADMIN ||
          user?.role?.roleType === ROLE_TYPE.HR ? (
            <CustomButton
              variant="gradient"
              icon={<CustomIcon name="CheckCircle2" size={18} />}
              onClick={() => navigate("/timesheet/review")}
            >
              Review Pending
            </CustomButton>
          ) : null}
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statLabel}>
            {period === "monthly" ? "Monthly Hours" : "Weekly Hours"}
          </div>
          <div className={styles.statValue}>
            {loading ? (
              <CustomSkeleton width="60px" height="2rem" />
            ) : (
              `${totalPeriodHours}-h`
            )}
          </div>
        </div>
        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Approved</div>
          <div className={`${styles.statValue} ${styles.textSuccess}`}>
            {loading ? (
              <CustomSkeleton width="60px" height="2rem" />
            ) : (
              `${approvedHours}-h`
            )}
          </div>
        </div>
        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Pending Approval</div>
          <div className={`${styles.statValue} ${styles.textWarning}`}>
            {loading ? (
              <CustomSkeleton width="60px" height="2rem" />
            ) : (
              `${totalPeriodHours - approvedHours}-h`
            )}
          </div>
        </div>
        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Target ({targetHours}h)</div>
          <div className={`${styles.statValue} ${styles.textSecondary}`}>
            {loading ? (
              <CustomSkeleton width="60px" height="2rem" />
            ) : (
              `${targetPercent}%`
            )}
          </div>
        </div>
      </div>

      {/* 60 / 40 Split Layout: Left Log Tasks & Right Calendar/Table */}
      <div className={styles.timesheetLayout}>
        {/* Left Section (60% or Expanded): Log Tasks Panel */}
        <div
          className={`${styles.logTasksSection} ${
            isCalendarCollapsed ? styles.logTasksSectionExpanded : ""
          }`}
        >
          <TimesheetLogPanel
            date={selectedDate}
            existingEntry={entries.find((e) =>
              isSameDay(new Date(e.date), selectedDate),
            )}
            googleEvents={MOCK_GOOGLE_EVENTS.filter((e) =>
              isSameDay(e.date, selectedDate),
            )}
            isCalendarCollapsed={isCalendarCollapsed}
            onExpandCalendar={() => setIsCalendarCollapsed(false)}
          />
        </div>

        {/* Right Section (40% or Collapsed): Calendar or Table View */}
        <div
          className={`glass-card ${styles.calendarSection} ${
            isCalendarCollapsed ? styles.calendarSectionCollapsed : ""
          }`}
          onClick={isCalendarCollapsed ? () => setIsCalendarCollapsed(false) : undefined}
          title={isCalendarCollapsed ? "Click to expand calendar" : undefined}
        >
          {isCalendarCollapsed ? (
            <div className={styles.collapsedCalendarRail}>
              <button
                type="button"
                className={styles.calendarExpandBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCalendarCollapsed(false);
                }}
                title="Expand Calendar"
                aria-label="Expand Calendar"
              >
                <CustomIcon name="ChevronLeft" size={16} />
              </button>
              <CustomIcon
                name="Calendar"
                size={18}
                style={{ color: "var(--accent-primary)" }}
              />
              <span className={styles.collapsedCalendarText}>Calendar</span>
            </div>
          ) : (
            <>
              {renderHeader()}
              {viewMode === "calendar" ? (
                <>
                  {renderDays()}
                  {loading ? (
                    <div style={{ marginTop: 24 }}>
                      <CalendarSkeleton rows={period === "monthly" ? 5 : 2} />
                    </div>
                  ) : (
                    renderCells()
                  )}
                </>
              ) : (
                renderTableView()
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Timesheet;

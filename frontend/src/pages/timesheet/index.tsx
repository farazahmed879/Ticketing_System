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
import TimesheetDayModal from "./components/TimesheetDayModal";
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
  const [period, setPeriod] = useState<"monthly" | "weekly">("monthly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const [tableFilter, setTableFilter] = useState<"all" | "working" | "missing">("all");
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
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <h2 className={styles.monthYear}>{getDateTitle()}</h2>
        <div className={styles.navButtons}>
          <CustomButton variant="secondary" size="sm" onClick={handlePrev}>
            <CustomIcon name="ChevronLeft" size={20} />
          </CustomButton>
          <CustomButton
            variant="secondary"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
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
          <button
            type="button"
            className={`${styles.viewSwitchBtn} ${period === "monthly" ? styles.viewSwitchBtnActive : ""}`}
            onClick={() => setPeriod("monthly")}
          >
            <CustomIcon name="CalendarRange" size={16} /> Monthly
          </button>
          <button
            type="button"
            className={`${styles.viewSwitchBtn} ${period === "weekly" ? styles.viewSwitchBtnActive : ""}`}
            onClick={() => setPeriod("weekly")}
          >
            <CustomIcon name="CalendarDays" size={16} /> Weekly
          </button>
        </div>

        {/* View Switcher: Calendar / Table */}
        <div className={styles.viewSwitcher}>
          <button
            type="button"
            className={`${styles.viewSwitchBtn} ${viewMode === "calendar" ? styles.viewSwitchBtnActive : ""}`}
            onClick={() => setViewMode("calendar")}
          >
            <CustomIcon name="Calendar" size={16} /> Calendar
          </button>
          <button
            type="button"
            className={`${styles.viewSwitchBtn} ${viewMode === "table" ? styles.viewSwitchBtnActive : ""}`}
            onClick={() => setViewMode("table")}
          >
            <CustomIcon name="Table" size={16} /> Table View
          </button>
        </div>
      </div>
    </div>
  );

  const renderDays = () => {
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

      grid.push(
        <div
          key={day.toString()}
          className={`${styles.dayCell} glass-card ${period === "monthly" && !isCurrentMonth ? styles.otherMonth : ""} ${isTodayDay ? styles.today : ""}`}
          style={period === "weekly" ? { minHeight: 220 } : undefined}
          onClick={() => {
            setSelectedDate(day);
            setIsModalOpen(true);
          }}
        >
          <div className={styles.dayNumber}>
            {format(day, dateFormat)}
            {period === "weekly" && (
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: 6 }}>
                ({format(day, "EEEE")})
              </span>
            )}
          </div>

          {entry && (
            <>
              <div
                className={styles.hoursBadge}
                title={getEntryTypeLabel(entry.entryType)}
              >
                {isZeroHourEntryType(entry.entryType)
                  ? getEntryTypeLabel(entry.entryType)
                  : `${entry.totalHours}-h`}
              </div>
              <div
                className={`${styles.statusIndicator} ${
                  entry.hrApproved === "APPROVED" ||
                  entry.managerApproved === "APPROVED"
                    ? styles.statusApproved
                    : entry.hrApproved === "REJECTED" ||
                        entry.managerApproved === "REJECTED"
                      ? styles.statusRejected
                      : styles.statusPending
                }`}
                title={
                  entry.hrApproved === "APPROVED" ||
                  entry.managerApproved === "APPROVED"
                    ? "Approved"
                    : entry.hrApproved === "REJECTED" ||
                        entry.managerApproved === "REJECTED"
                      ? "Rejected"
                      : "Pending"
                }
              />

              {!isZeroHourEntryType(entry.entryType) && (
                <div className={styles.taskList}>
                  {entry.tasks.slice(0, period === "weekly" ? 5 : 2).map((task, idx) => (
                    <div key={idx} className={styles.taskItem}>
                      {task.description}
                    </div>
                  ))}
                  {entry.tasks.length > (period === "weekly" ? 5 : 2) && (
                    <div
                      className={styles.taskItem}
                      style={{ border: "none", fontStyle: "italic" }}
                    >
                      + {entry.tasks.length - (period === "weekly" ? 5 : 2)} more
                    </div>
                  )}
                </div>
              )}
            </>
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
        </div>,
      );
    });

    return <div className={styles.calendarGrid}>{grid}</div>;
  };

  const tableColumns = [
    {
      header: "Date",
      key: "date",
      style: { minWidth: "170px" },
      render: (row: TimesheetTableRow) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontWeight: 600,
              color: row.isTodayDay ? "var(--accent-primary)" : "var(--text-primary)",
            }}
          >
            {format(row.day, "EEE, MMM dd, yyyy")}
          </span>
          {row.isTodayDay && (
            <CustomBadge variant="primary" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
              Today
            </CustomBadge>
          )}
          {row.isWeekendDay && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              (Weekend)
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Day Type",
      key: "entryType",
      style: { minWidth: "140px" },
      render: (row: TimesheetTableRow) => {
        if (row.entry) {
          return (
            <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>
              {getEntryTypeLabel(row.entry.entryType)}
            </span>
          );
        }
        if (row.isWeekendDay) {
          return <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Weekend Off</span>;
        }
        return <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Not Logged</span>;
      },
    },
    {
      header: "Hours",
      key: "totalHours",
      style: { width: "90px" },
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
      header: "Tasks Summary",
      key: "tasks",
      render: (row: TimesheetTableRow) => {
        if (row.entry && row.entry.tasks && row.entry.tasks.length > 0) {
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "420px" }}>
              {row.entry.tasks.slice(0, 3).map((task, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ color: "var(--accent-primary)" }}>•</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {task.description || "Task"}
                  </span>
                  {task.hours > 0 && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>
                      ({task.hours}h)
                    </span>
                  )}
                </div>
              ))}
              {row.entry.tasks.length > 3 && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  +{row.entry.tasks.length - 3} more tasks
                </div>
              )}
            </div>
          );
        }
        if (row.entry && row.entry.notes) {
          return (
            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
              {row.entry.notes}
            </span>
          );
        }
        return (
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
            {row.isWeekendDay ? "No work scheduled" : "No tasks logged yet"}
          </span>
        );
      },
    },
    {
      header: "Status",
      key: "status",
      style: { width: "130px" },
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
      style: { width: "110px", textAlign: "right" as const },
      render: (row: TimesheetTableRow) => {
        if (row.entry) {
          return (
            <CustomButton
              size="sm"
              variant="secondary"
              icon={<CustomIcon name="Edit3" size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDate(row.day);
                setIsModalOpen(true);
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
            icon={<CustomIcon name="Plus" size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDate(row.day);
              setIsModalOpen(true);
            }}
          >
            Log Time
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

    return (
      <div className={styles.tableWrapper}>
        <div className={styles.tableFilterRow}>
          <div className={styles.tableFilters}>
            <button
              type="button"
              className={`${styles.filterPill} ${tableFilter === "all" ? styles.filterPillActive : ""}`}
              onClick={() => setTableFilter("all")}
            >
              All Days ({tableRows.length})
            </button>
            <button
              type="button"
              className={`${styles.filterPill} ${tableFilter === "working" ? styles.filterPillActive : ""}`}
              onClick={() => setTableFilter("working")}
            >
              Working Days ({workingDaysCount})
            </button>
            <button
              type="button"
              className={`${styles.filterPill} ${tableFilter === "missing" ? styles.filterPillActive : ""}`}
              onClick={() => setTableFilter("missing")}
            >
              Missing Logs ({missingDaysCount})
            </button>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: 6 }}>
              • {loggedDaysCount} Logged
            </span>
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CustomIcon name="MousePointerClick" size={14} />
            <span>Click any row or button to log/edit hours</span>
          </div>
        </div>

        <CustomTable<TimesheetTableRow>
          columns={tableColumns}
          data={filteredRows}
          loading={loading}
          emptyMessage="No days match the selected filter."
          onRowClick={(row) => {
            setSelectedDate(row.day);
            setIsModalOpen(true);
          }}
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

      <div
        className={`glass-card ${styles.calendarWrapper} ${styles.flexColumn}`}
        style={{ padding: 16 }}
      >
        {renderHeader()}
        {viewMode === "calendar" ? (
          <>
            {renderDays()}
            {loading ? (
              <div style={{ marginTop: 24 }}>
                <CalendarSkeleton rows={period === "monthly" ? 5 : 1} />
              </div>
            ) : (
              renderCells()
            )}
          </>
        ) : (
          renderTableView()
        )}
      </div>

      {isModalOpen && selectedDate && (
        <TimesheetDayModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
          }}
          date={selectedDate}
          existingEntry={entries.find((e) =>
            isSameDay(new Date(e.date), selectedDate),
          )}
          googleEvents={MOCK_GOOGLE_EVENTS.filter((e) =>
            isSameDay(e.date, selectedDate),
          )}
        />
      )}
    </div>
  );
};

export default Timesheet;

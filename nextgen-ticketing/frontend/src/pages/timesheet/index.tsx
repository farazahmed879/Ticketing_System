import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  eachDayOfInterval,
} from "date-fns";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import styles from "./Timesheet.module.css";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import TimesheetDayModal from "./components/TimesheetDayModal";
import { useAuth } from "../../context/AuthContext";

import type { TimesheetEntry } from "../../types";
import CustomSkeleton from "../../components/CustomSkeleton";
import { CalendarSkeleton } from "../../components/CustomSkeleton/CustomSkeleton";
import { ROLE_TYPE } from "../roles/roleConstants";
import { getEntryTypeLabel, isZeroHourEntryType } from "./entryTypes";

// Mock Google Calendar Events
const MOCK_GOOGLE_EVENTS = [
  { date: new Date(), title: "Team Standup" },
  { date: addDays(new Date(), 1), title: "Project Alpha Sync" },
  { date: addDays(new Date(), -2), title: "Client Review Meeting" },
];

const Timesheet: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: entriesData, isLoading: loading } = useQuery({
    queryKey: ["timesheets", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = startOfWeek(startOfMonth(currentMonth));
      const end = endOfWeek(endOfMonth(currentMonth));

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

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => (
    <div className={styles.controls}>
      <h2 className={styles.monthYear}>{format(currentMonth, "MMMM yyyy")}</h2>
      <div className={styles.navButtons}>
        <CustomButton variant="secondary" size="sm" onClick={prevMonth}>
          <CustomIcon name="ChevronLeft" size={20} />
        </CustomButton>
        <CustomButton
          variant="secondary"
          size="sm"
          onClick={() => setCurrentMonth(new Date())}
        >
          Today
        </CustomButton>
        <CustomButton variant="secondary" size="sm" onClick={nextMonth}>
          <CustomIcon name="ChevronRight" size={20} />
        </CustomButton>
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
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const grid: any[] = [];

    let days = eachDayOfInterval({ start: startDate, end: endDate });

    days.forEach((day) => {
      const entry = entries.find((e) => isSameDay(new Date(e.date), day));
      const googleEvents = MOCK_GOOGLE_EVENTS.filter((e) =>
        isSameDay(e.date, day),
      );

      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());

      grid.push(
        <div
          key={day.toString()}
          className={`${styles.dayCell} glass-card ${!isCurrentMonth ? styles.otherMonth : ""} ${isToday ? styles.today : ""}`}
          onClick={() => {
            setSelectedDate(day);
            setIsModalOpen(true);
          }}
        >
          <div className={styles.dayNumber}>{format(day, dateFormat)}</div>

          {entry && (
            <>
              <div className={styles.hoursBadge} title={getEntryTypeLabel(entry.entryType)}>
                {isZeroHourEntryType(entry.entryType)
                  ? getEntryTypeLabel(entry.entryType)
                  : `${entry.totalHours}h`}
              </div>
              <div
                className={`${styles.statusIndicator} ${
                  entry.hrApproved === "APPROVED" || entry.managerApproved === "APPROVED"
                    ? styles.statusApproved
                    : entry.hrApproved === "REJECTED" || entry.managerApproved === "REJECTED"
                      ? styles.statusRejected
                      : styles.statusPending
                }`}
                title={entry.hrApproved === "APPROVED" || entry.managerApproved === "APPROVED" ? "Approved" : entry.hrApproved === "REJECTED" || entry.managerApproved === "REJECTED" ? "Rejected" : "Pending"}
              />

              {!isZeroHourEntryType(entry.entryType) && (
                <div className={styles.taskList}>
                  {entry.tasks.slice(0, 2).map((task, idx) => (
                    <div key={idx} className={styles.taskItem}>
                      {task.description}
                    </div>
                  ))}
                  {entry.tasks.length > 2 && (
                    <div
                      className={styles.taskItem}
                      style={{ border: "none", fontStyle: "italic" }}
                    >
                      + {entry.tasks.length - 2} more
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

  const totalMonthlyHours = entries.reduce(
    (sum, e) =>
      sum + (isSameMonth(new Date(e.date), currentMonth) ? e.totalHours : 0),
    0,
  );
  const approvedHours = entries
    .filter(
      (e) =>
        (e.hrApproved === "APPROVED" || e.managerApproved === "APPROVED") && isSameMonth(new Date(e.date), currentMonth),
    )
    .reduce((sum, e) => sum + e.totalHours, 0);

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
          <div className={styles.statLabel}>Monthly Hours</div>
          <div className={styles.statValue}>
            {loading ? (
              <CustomSkeleton width="60px" height="2rem" />
            ) : (
              `${totalMonthlyHours}h`
            )}
          </div>
        </div>
        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Approved</div>
          <div
            className={`${styles.statValue} ${styles.textSuccess}`}
          >
            {loading ? (
              <CustomSkeleton width="60px" height="2rem" />
            ) : (
              `${approvedHours}h`
            )}
          </div>
        </div>
        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Pending Approval</div>
          <div
            className={`${styles.statValue} ${styles.textWarning}`}
          >
            {loading ? (
              <CustomSkeleton width="60px" height="2rem" />
            ) : (
              `${totalMonthlyHours - approvedHours}h`
            )}
          </div>
        </div>
        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Target (160h)</div>
          <div
            className={`${styles.statValue} ${styles.textSecondary}`}
          >
            {loading ? (
              <CustomSkeleton width="60px" height="2rem" />
            ) : (
              `${Math.round((totalMonthlyHours / 160) * 100)}%`
            )}
          </div>
        </div>
      </div>

      <div
        className={`glass-card ${styles.calendarWrapper} ${styles.flexColumn}`}
        style={{ padding: 16 }}
      >
        {renderHeader()}
        {renderDays()}
        {loading ? (
          <div style={{ marginTop: 24 }}>
            <CalendarSkeleton rows={5} />
          </div>
        ) : (
          renderCells()
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

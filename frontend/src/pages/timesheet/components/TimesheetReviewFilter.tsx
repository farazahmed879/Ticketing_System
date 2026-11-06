import React from "react";
import CustomSelect from "../../../components/CustomSelect";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import type { TimesheetReviewFilterProps, ReviewPeriod } from "../types";
import styles from "../Timesheet.module.css";

const PERIOD_TABS: { value: ReviewPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "Month" },
];

export const TimesheetReviewFilter: React.FC<TimesheetReviewFilterProps> = ({
  period,
  setPeriod,
  month,
  setMonth,
  months,
  year,
  setYear,
  years,
  selectedStatus,
  setSelectedStatus,
  onRefresh,
  refreshing = false,
  viewMode,
  setViewMode,
}) => {
  return (
    <div className={styles.reviewFilterBar}>
      <div className={styles.reviewFilterGroup}>
        <div className={`glass-card ${styles.reviewSegment}`}>
          {PERIOD_TABS.map((tab) => (
            <CustomButton
              key={tab.value}
              variant={period === tab.value ? "gradient" : "ghost"}
              onClick={() => setPeriod(tab.value)}
              style={{
                borderRadius: 8,
                height: "auto",
                padding: "8px 16px",
                fontWeight: 600,
                transition: "all 0.2s",
                border: "none",
              }}
            >
              {tab.label}
            </CustomButton>
          ))}
        </div>
        {period === "month" && (
          <div className={styles.reviewSelects}>
            <CustomSelect
              value={month}
              onChange={setMonth}
              options={months}
              className={styles.reviewSelectMonth}
              placeholder="Month"
            />
            <CustomSelect
              value={year}
              onChange={setYear}
              options={years}
              className={styles.reviewSelectYear}
              placeholder="Year"
            />
          </div>
        )}
        <div className={`glass-card ${styles.reviewSegment}`}>
          {[
            { value: "PENDING", label: "Pending" },
            { value: "MANAGER_APPROVED", label: "Manager Approved" },
            { value: "HR_APPROVED", label: "HR Approved" },
            { value: "REJECTED", label: "Rejected" },
            { value: "ALL", label: "All" },
          ].map((tab) => (
            <CustomButton
              key={tab.value}
              variant={selectedStatus === tab.value ? "gradient" : "ghost"}
              onClick={() => setSelectedStatus(tab.value)}
              style={{
                borderRadius: 8,
                height: "auto",
                padding: "8px 16px",
                fontWeight: 600,
                transition: "all 0.2s",
                border: "none",
              }}
            >
              {tab.label}
            </CustomButton>
          ))}
        </div>
      </div>
      <div
        className="view-mode-switcher"
        style={{ display: "flex", gap: 12, alignItems: "center" }}
      >
        <div
          className="view-mode-switcher"
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            borderRadius: 10,
            border: "1px solid var(--border-glass)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <CustomButton
            variant={viewMode === "list" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            icon={<CustomIcon name="List" size={16} />}
            title="List view"
            style={{ padding: "6px 10px" }}
          />
          <CustomButton
            variant={viewMode === "grid" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            icon={<CustomIcon name="LayoutGrid" size={16} />}
            title="Grid view"
            style={{ padding: "6px 10px" }}
          />
        </div>
        <CustomButton
          variant="secondary"
          onClick={onRefresh}
          loading={refreshing}
          icon={<CustomIcon name="RotateCcw" size={18} />}
        >
          Refresh
        </CustomButton>
      </div>
    </div>
  );
};

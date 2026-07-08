import React from "react";
import CustomSelect from "../../../components/CustomSelect";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import type { TimesheetReviewFilterProps } from "../types";

export const TimesheetReviewFilter: React.FC<TimesheetReviewFilterProps> = ({
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
}) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <CustomSelect
            value={month}
            onChange={setMonth}
            options={months}
            style={{ width: 125 }}
            placeholder="Month"
          />
          <CustomSelect
            value={year}
            onChange={setYear}
            options={years}
            style={{ width: 125 }}
            placeholder="Year"
          />
        </div>
        <div
          className="glass-card"
          style={{ display: "flex", padding: 4, borderRadius: 12 }}
        >
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
      <CustomButton
        variant="secondary"
        onClick={onRefresh}
        loading={refreshing}
        icon={<CustomIcon name="RotateCcw" size={18} />}
      >
        Refresh
      </CustomButton>
    </div>
  );
};

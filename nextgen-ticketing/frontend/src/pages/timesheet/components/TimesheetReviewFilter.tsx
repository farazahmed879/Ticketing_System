import React from "react";
import CustomSelect from "../../../components/CustomSelect";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";

export interface TimesheetReviewFilterProps {
  month: string;
  setMonth: (v: string) => void;
  months: { value: string; label: string }[];
  year: string;
  setYear: (v: string) => void;
  years: { value: string; label: string }[];
  selectedStatus: string;
  setSelectedStatus: (v: string) => void;
  onRefresh: () => void;
}

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
            style={{ width: 150 }}
            placeholder="Month"
          />
          <CustomSelect
            value={year}
            onChange={setYear}
            options={years}
            style={{ width: 100 }}
            placeholder="Year"
          />
        </div>
        <div
          className="glass-card"
          style={{ display: "flex", padding: 4, borderRadius: 12 }}
        >
          <CustomButton
            variant={selectedStatus === "PENDING" ? "gradient" : "ghost"}
            onClick={() => setSelectedStatus("PENDING")}
            style={{
              borderRadius: 8,
              height: "auto",
              padding: "8px 16px",
              fontWeight: 600,
              transition: "all 0.2s",
              border: "none",
            }}
          >
            Pending
          </CustomButton>
          <CustomButton
            variant={selectedStatus === "APPROVED" ? "gradient" : "ghost"}
            onClick={() => setSelectedStatus("APPROVED")}
            style={{
              borderRadius: 8,
              height: "auto",
              padding: "8px 16px",
              fontWeight: 600,
              transition: "all 0.2s",
              border: "none",
            }}
          >
            Approved
          </CustomButton>
        </div>
      </div>
      <CustomButton
        variant="secondary"
        onClick={onRefresh}
        icon={<CustomIcon name="RotateCcw" size={18} />}
      >
        Refresh
      </CustomButton>
    </div>
  );
};

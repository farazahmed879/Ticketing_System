import React from "react";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";

export interface TimesheetReviewHeaderProps {
  onBack: () => void;
}

export const TimesheetReviewHeader: React.FC<TimesheetReviewHeaderProps> = ({
  onBack,
}) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
        <CustomButton
          variant="ghost"
          onClick={onBack}
          icon={<CustomIcon name="ArrowLeft" size={20} />}
          style={{
            width: 40,
            height: 40,
            padding: 0,
            borderRadius: "12px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--border-glass)",
          }}
        />
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
            Timesheet Approvals
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              margin: "4px 0 0 0",
              fontSize: "0.9rem",
            }}
          >
            Review and manage team timesheet entries
          </p>
        </div>
      </div>
    </div>
  );
};

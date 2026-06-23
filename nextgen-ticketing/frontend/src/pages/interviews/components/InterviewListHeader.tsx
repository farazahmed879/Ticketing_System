import React from "react";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";

import type { InterviewListHeaderProps } from "./interfaces";

export const InterviewListHeader: React.FC<InterviewListHeaderProps> = ({
  canCreateInterviews,
  onScheduleClick,
}) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Interviews</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Schedule and manage candidate interviews
        </p>
      </div>
      {canCreateInterviews && (
        <CustomButton
          variant="gradient"
          icon={<CustomIcon name="Plus" size={20} />}
          onClick={onScheduleClick}
        >
          Schedule Interview
        </CustomButton>
      )}
    </div>
  );
};

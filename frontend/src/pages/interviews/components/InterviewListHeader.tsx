import React from "react";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../InterviewList.module.css";

import type { InterviewListHeaderProps } from "./interfaces";

export const InterviewListHeader: React.FC<InterviewListHeaderProps> = ({
  canCreateInterviews,
  onScheduleClick,
}) => {
  return (
    <div className={styles.listHeader}>
      <div>
        <h1 className={styles.listTitle}>Interviews</h1>
        <p className={styles.listSubtitle}>
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

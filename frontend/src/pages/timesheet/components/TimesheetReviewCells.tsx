import React from "react";
import CustomBadge from "../../../components/CustomBadge";
import { ROLE_TYPE } from "../../roles/roleConstants";
import { getEntryTypeLabel, isZeroHourEntryType } from "../entryTypes";
import type { TimesheetEntry } from "../../../types";
import styles from "../Timesheet.module.css";

// Shared renderers for the timesheet review table (list view) and the review
// cards (grid view), so both layouts always show the same data the same way.

export const reviewStatusVariant = (status?: string) =>
  status === "APPROVED" ? "success" : status === "REJECTED" ? "danger" : "warning";

export const reviewStatusLabel = (status?: string) =>
  status === "APPROVED" ? "Approved" : status === "REJECTED" ? "Rejected" : "Pending";

/** Same gating as the table's Approve action. */
export const canApproveTimesheetEntry = (
  entry: TimesheetEntry,
  userRoleType?: string,
) => {
  const isHr = userRoleType === ROLE_TYPE.HR;
  const isManager =
    userRoleType === ROLE_TYPE.AGENT || userRoleType === ROLE_TYPE.ADMIN;
  return (
    (isManager && entry.managerApproved === "PENDING") ||
    (isHr && entry.hrApproved === "PENDING")
  );
};

/** Hours pill + day-type badge ("Hours / Type" column). */
export const ReviewHoursType: React.FC<{
  entry: TimesheetEntry;
  style?: React.CSSProperties;
}> = ({ entry, style }) => (
  <div className={styles.rvHoursCell} style={style}>
    <span className={styles.rvHoursPill}>{entry.totalHours}h</span>
    <CustomBadge
      variant={isZeroHourEntryType(entry.entryType) ? "info" : "neutral"}
      className={styles.rvTypeBadge}
    >
      {getEntryTypeLabel(entry.entryType)}
    </CustomBadge>
  </div>
);

/** Manager + HR approval badges ("Status" column). */
export const ReviewApprovalStatus: React.FC<{ entry: TimesheetEntry }> = ({
  entry,
}) => (
  <div className={styles.rvStatusCell}>
    <div className={styles.rvStatusLine}>
      <span className={styles.rvStatusLabel}>Manager</span>
      <CustomBadge variant={reviewStatusVariant(entry.managerApproved)}>
        {reviewStatusLabel(entry.managerApproved)}
      </CustomBadge>
    </div>
    <div className={styles.rvStatusLine}>
      <span className={styles.rvStatusLabel}>HR</span>
      <CustomBadge variant={reviewStatusVariant(entry.hrApproved)}>
        {reviewStatusLabel(entry.hrApproved)}
      </CustomBadge>
    </div>
  </div>
);

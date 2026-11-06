import { format } from "date-fns";
import { useMemo } from "react";
import CustomImage from "../../../components/CustomImage";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import {
  ReviewApprovalStatus,
  ReviewHoursType,
  canApproveTimesheetEntry,
} from "./TimesheetReviewCells";
import type { TimesheetEntry } from "../../../types";
import styles from "../Timesheet.module.css";

interface UseTimesheetReviewColumnsProps {
  setSelectedEntry: (e: TimesheetEntry) => void;
  setIsModalOpen: (b: boolean) => void;
  handleApprove: (id: string) => void;
  userRoleType?: string;
}

export const useTimesheetReviewColumns = ({
  setSelectedEntry,
  setIsModalOpen,
  handleApprove,
  userRoleType,
}: UseTimesheetReviewColumnsProps) => {
  return useMemo(() => [
    {
      header: "User",
      key: "user",
      className: styles.rvColUser,
      render: (e: TimesheetEntry) => (
        <div className={styles.rvUserCell}>
          <div className={styles.rvAvatar}>
            {e.user?.image ? (
              <CustomImage
                src={e.user.image}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <CustomIcon name="User" size={18} color="var(--text-muted)" />
            )}
          </div>
          <div className={styles.rvUserText}>
            <div className={styles.rvUserName}>{e.user?.fullname}</div>
            <div className={styles.rvUserEmail} title={e.user?.email}>
              {e.user?.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Date",
      key: "date",
      className: styles.rvColDate,
      render: (e: TimesheetEntry) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span className={styles.rvDateMain}>
            {format(new Date(e.date), "MMM dd, yyyy")}
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
            }}
          >
            {format(new Date(e.date), "EEEE")}
          </span>
        </div>
      ),
    },
    {
      // Hours and day type share a column so the table fits without
      // horizontal scrolling on laptops and tablets.
      header: "Hours / Type",
      key: "totalHours",
      className: styles.rvColHours,
      render: (e: TimesheetEntry) => <ReviewHoursType entry={e} />,
    },
    {
      header: "Status",
      key: "status",
      className: styles.rvColStatus,
      render: (e: TimesheetEntry) => <ReviewApprovalStatus entry={e} />,
    },
    {
      header: "Actions",
      key: "actions",
      className: styles.rvColActions,
      render: (e: TimesheetEntry) => (
        <div className={styles.rvActionsCell}>
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedEntry(e);
              setIsModalOpen(true);
            }}
            icon={<CustomIcon name="Eye" size={16} />}
            title="Review"
            aria-label="Review timesheet"
            style={{ padding: "8px" }}
          />
          {canApproveTimesheetEntry(e, userRoleType) && (
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={() => handleApprove(e.id)}
              icon={<CustomIcon name="CheckCircle2" size={16} />}
              title="Approve"
              aria-label="Approve timesheet"
              style={{
                color: "var(--accent-success)",
                padding: "8px",
              }}
            />
          )}
        </div>
      ),
    },
  ], [userRoleType, handleApprove, setIsModalOpen, setSelectedEntry]);
};

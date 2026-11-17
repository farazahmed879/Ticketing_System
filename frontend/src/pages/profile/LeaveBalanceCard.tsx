import React from "react";
import CustomIcon from "../../components/CustomIcon";
import { useLeaveHistory, fmtDays } from "./useLeaveHistory";
import styles from "./Profile.module.css";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/**
 * Leave balance with the approved leaves that were cut from it, so employees
 * can see exactly why their balance went down. `isSelf` switches the wording.
 */
const LeaveBalanceCard: React.FC<{ userId: string; isSelf: boolean }> = ({
  userId,
  isSelf,
}) => {
  const { data, isLoading } = useLeaveHistory(userId, isSelf);

  const balance = data?.balance ?? 0;
  const items = data?.items ?? [];
  const recent = items.filter((i) => i.recent);
  const recentDays = data?.recentDays ?? 0;

  return (
    <div className={`glass-card ${styles.panel} ${styles.leaveCard}`}>
      <div className={styles.leaveTop}>
        <div className={styles.leaveBalance}>
          <span className={styles.leaveBalanceLabel}>
            <CustomIcon name="CalendarCheck" size={16} />
            Leave Balance
          </span>
          <span className={styles.leaveBalanceValue}>
            {isLoading ? "–" : balance}
            <small>days remaining</small>
          </span>
        </div>

        {recent.length > 0 && (
          <div className={styles.leaveAlert} role="status">
            <CustomIcon name="CalendarMinus" size={22} />
            <div>
              <strong>
                {fmtDays(recentDays)} deducted from{" "}
                {isSelf ? "your" : "this user's"} leave balance in the last 7
                days
              </strong>
              <span>
                {recent
                  .map(
                    (i) =>
                      `${i.label}${i.period ? ` (${i.period})` : ""}: −${fmtDays(i.days)}`,
                  )
                  .join(" · ")}
              </span>
            </div>
          </div>
        )}
      </div>

      <h4 className={styles.leaveListTitle}>Leaves deducted</h4>
      {items.length === 0 ? (
        <p className={styles.leaveEmpty}>
          {isLoading ? "Loading…" : "No approved leaves have been deducted yet."}
        </p>
      ) : (
        <ul className={styles.leaveList}>
          {items.map((i) => (
            <li key={`${i.source}-${i.id}`} className={styles.leaveRow}>
              <div className={styles.leaveRowMain}>
                <span className={styles.leaveRowLabel}>{i.label}</span>
                <span className={styles.leaveRowMeta}>
                  {i.period ? `${i.period} · ` : ""}
                  Approved {fmtDate(i.approvedAt)}
                  {i.approvedBy ? ` by ${i.approvedBy}` : ""}
                  {i.source === "timesheet" ? " · Timesheet" : ""}
                </span>
              </div>
              <span className={styles.leaveRowDays}>−{fmtDays(i.days)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LeaveBalanceCard;

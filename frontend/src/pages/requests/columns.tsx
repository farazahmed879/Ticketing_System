import type { TableColumn } from "../../components/types";
import { isDocumentRequest } from "./documentRequest";
import type { UserRequest } from "../../types";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import CustomTooltip from "../../components/CustomTooltip";
import { timeAgo } from "../../utils/helpers";
import { FormattedTaskDescription } from "../timesheet/components/TaskDescriptionEditor";
import styles from "./Requests.module.css";
import type { User } from "../../types";

export const formatRequestType = (type: string) => {
  const map: Record<string, string> = {
    HALFDAY_LEAVE: "Half-Day Leave",
    FULLDAY_LEAVE: "Full-Day Leave",
    VACATION: "Vacation",
    WFH: "Work From Home",
    REIMBURSEMENT: "Reimbursement",
    DOCUMENT_REQUEST: "Document Request",
    OTHER: "Other / Custom",
  };
  return map[type] || type.replace(/_/g, " ");
};

/** "Approved by" / "Rejected by" depending on how the request was decided. */
export const getReviewerLabel = (status: string) =>
  status === "REJECTED" ? "Rejected by" : "Approved by";

export const getRequestColumns = (
  user: User | null,
  hasPermission: (permPath: string) => boolean,
  handleUpdateStatus: (id: string, status: string) => void,
  handleDelete: (id: string) => void,
): TableColumn<UserRequest>[] => [
  {
    header: "Type",
    key: "type",
    render: (r) => (
      <div className={styles.typeBadge}>{formatRequestType(r.type)}</div>
    ),
  },
  {
    header: "User / Email",
    key: "user",
    render: (r) => (
      <div className={styles.userInfo}>
        <span className={styles.userName}>
          {r.user?.fullname || "Anonymous"}
        </span>
        <span className={styles.userEmail}>{r.email || r.user?.email}</span>
      </div>
    ),
  },
  {
    header: "Approved By / Rejected By",
    key: "approvedBy",
    render: (r) => (
      <div className={styles.userInfo}>
        {r.approvedBy && r.status !== "PENDING" ? (
          <>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                color:
                  r.status === "REJECTED"
                    ? "var(--accent-danger)"
                    : "var(--accent-success)",
              }}
            >
              {getReviewerLabel(r.status)}
            </span>
            <span className={styles.userName}>{r.approvedBy.fullname}</span>
            {r.approvedBy.email && (
              <span className={styles.userEmail}>{r.approvedBy.email}</span>
            )}
          </>
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            —
          </span>
        )}
      </div>
    ),
  },
  {
    header: "Message",
    key: "message",
    className: styles.messageCell,
    render: (r) => <FormattedTaskDescription content={r.message} />,
  },
  {
    header: "Requested",
    key: "createdAt",
    render: (r) => timeAgo(r.createdAt),
  },
  {
    header: "Status",
    key: "status",
    render: (r) => (
      <CustomBadge
        variant={
          r.status === "APPROVED"
            ? "success"
            : r.status === "REJECTED"
              ? "danger"
              : "warning"
        }
      >
        {r.status}
      </CustomBadge>
    ),
  },
  {
    header: "Actions",
    key: "actions",
    render: (r) => (
      <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
        {/* The API decides who may review (e.g. organizational teams: manager only). */}
        {r.status === "PENDING" && r.canReview && (
            <>
              <CustomTooltip text={isDocumentRequest(r) ? "Generate document" : "Approve"}>
                <CustomButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdateStatus(r.id, "APPROVED")}
                  style={{ color: "var(--accent-success)" }}
                  icon={
                    <CustomIcon
                      name={isDocumentRequest(r) ? "FileSignature" : "CheckCircle2"}
                      size={18}
                    />
                  }
                />
              </CustomTooltip>
              <CustomTooltip text="Reject">
                <CustomButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdateStatus(r.id, "REJECTED")}
                  style={{ color: "var(--accent-danger)" }}
                  icon={<CustomIcon name="XCircle" size={18} />}
                />
              </CustomTooltip>
            </>
          )}
        {(r.userId === user?.id || hasPermission("requests.delete")) && (
          <CustomTooltip text="Delete">
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(r.id)}
              icon={<CustomIcon name="Trash2" size={18} />}
            />
          </CustomTooltip>
        )}
      </div>
    ),
  },
];

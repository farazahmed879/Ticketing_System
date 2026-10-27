import type { TableColumn } from "../../components/types";
import type { UserRequest } from "../../types";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import CustomTooltip from "../../components/CustomTooltip";
import { timeAgo } from "../../utils/helpers";
import styles from "./Requests.module.css";
import type { User } from "../../types";

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
      <div className={styles.typeBadge}>{r.type.replace("_", " ")}</div>
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
    header: "Message",
    key: "message",
    className: styles.messageCell,
  },
  {
    header: "Requested",
    key: "createdAt",
    render: (r) =>
      timeAgo(r.createdAt),
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
      <div className={styles.actions}>
        {r.status === "PENDING" &&
          (hasPermission("requests.update") ||
            (user?.isLead && r.userId !== user?.id)) && (
          <>
            <CustomTooltip text="Approve">
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={() => handleUpdateStatus(r.id, "APPROVED")}
                style={{ color: "var(--accent-success)" }}
                icon={<CustomIcon name="CheckCircle2" size={18} />}
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

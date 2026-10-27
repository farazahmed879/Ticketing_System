import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import CustomBadge from "../../../components/CustomBadge";
import CustomTooltip from "../../../components/CustomTooltip";
import { timeAgo } from "../../../utils/helpers";
import styles from "../Requests.module.css";
import type { User, UserRequest } from "../../../types";

interface RequestCardProps {
  data: UserRequest;
  user: User | null;
  hasPermission: (permPath: string) => boolean;
  handleUpdateStatus: (id: string, status: string) => void;
  handleDelete: (id: string) => void;
  highlighted?: boolean;
}

const RequestCard = ({
  data,
  user,
  hasPermission,
  handleUpdateStatus,
  handleDelete,
  highlighted,
}: RequestCardProps) => {
  const canReview =
    data.status === "PENDING" &&
    (hasPermission("requests.update") ||
      (user?.isLead && data.userId !== user?.id));
  const canDelete = data.userId === user?.id || hasPermission("requests.delete");

  return (
    <div
      className="glass-card"
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        border: highlighted
          ? "1px solid var(--accent-primary)"
          : "1px solid var(--border-glass)",
        borderRadius: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div className={styles.typeBadge}>{data.type.replace("_", " ")}</div>
        <CustomBadge
          variant={
            data.status === "APPROVED"
              ? "success"
              : data.status === "REJECTED"
                ? "danger"
                : "warning"
          }
        >
          {data.status}
        </CustomBadge>
      </div>

      <div className={styles.userInfo} style={{ minWidth: 0 }}>
        <span className={styles.userName}>
          {data.user?.fullname || "Anonymous"}
        </span>
        <span
          className={styles.userEmail}
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {data.email || data.user?.email}
        </span>
      </div>

      <div
        title={data.message}
        style={{
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          flex: 1,
        }}
      >
        {data.message}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          borderTop: "1px solid var(--border-glass)",
          paddingTop: 10,
          marginTop: 2,
        }}
      >
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {timeAgo(data.createdAt)}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {canReview && (
            <>
              <CustomTooltip text="Approve">
                <CustomButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdateStatus(data.id, "APPROVED")}
                  style={{ color: "var(--accent-success)", padding: "4px 8px" }}
                  icon={<CustomIcon name="CheckCircle2" size={16} />}
                />
              </CustomTooltip>
              <CustomTooltip text="Reject">
                <CustomButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdateStatus(data.id, "REJECTED")}
                  style={{ color: "var(--accent-danger)", padding: "4px 8px" }}
                  icon={<CustomIcon name="XCircle" size={16} />}
                />
              </CustomTooltip>
            </>
          )}
          {canDelete && (
            <CustomTooltip text="Delete">
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(data.id)}
                style={{ color: "var(--text-muted)", padding: "4px 8px" }}
                icon={<CustomIcon name="Trash2" size={16} />}
              />
            </CustomTooltip>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestCard;

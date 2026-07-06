import type { TableColumn } from "../../components/types";
import type { User } from "../../types";
import CustomIcon from "../../components/CustomIcon";
import CustomButton from "../../components/CustomButton";
import CustomTooltip from "../../components/CustomTooltip";
import styles from "./UserList.module.css";
import CustomImage from "../../components/CustomImage";

export const getRoleStyle = (
  roleName?: string,
): {
  variant: "danger" | "primary" | "warning" | "success" | "info" | "neutral";
  color: string;
} => {
  switch (roleName?.toLowerCase()) {
    case "admin":
      return { variant: "danger", color: "#f44336" };
    case "manager":
      return { variant: "primary", color: "var(--accent-primary)" };
    case "hr":
      return { variant: "warning", color: "#ff9800" };
    case "employee":
      return { variant: "success", color: "#4caf50" };
    case "client":
    case "customer":
      return { variant: "info", color: "#2196f3" };
    default:
      return { variant: "neutral", color: "var(--text-muted)" };
  }
};

export const getUserColumns = (
  onlineUserIds: Set<string>,
  canEditUsers: boolean,
  handleEdit: (u: User) => void,
  handleDelete: (id: string) => void,
): TableColumn<User>[] => [
  {
    header: "User",
    key: "fullname",
    render: (u) => (
      <div className="flex-row-12">
        <div className={styles.avatar}>
          {u.image ? (
            <CustomImage src={u.image} alt={u.fullname} />
          ) : (
            u.fullname.charAt(0)
          )}
        </div>
        <div>
          <div className="font-semibold flex-row">
            {u.fullname}
            {u.isLead && <span className={styles.leadBadge}>LEAD</span>}
          </div>
          <div
            style={{ color: getRoleStyle(u.role?.name).color }}
            className="text-xs font-semibold"
          >
            {u.role?.name}
          </div>
        </div>
      </div>
    ),
  },
  {
    header: "Contact",
    key: "contact",
    render: (u) => (
      <div className="flex-col-2">
        {u.companyEmail && (
          <span className="text-sm-secondary">{u.companyEmail}</span>
        )}
        <span className="text-xs-muted">{u.email}</span>
        <span className="text-xs-muted">
          {u.primaryContact || u.mobileNumber || "—"}
        </span>
      </div>
    ),
  },
  {
    header: "Emergency Contact",
    key: "emergencyContact",
    render: (u) => (
      <span className="text-sm-secondary">{u.emergencyContact || "—"}</span>
    ),
  },
  {
    header: "Status",
    key: "status",
    render: (u) => (
      <div className="flex-col">
        <div className={styles.statusIndicator}>
          <div
            className={`${styles.statusDot} ${
              onlineUserIds.has(u.id) ? styles.online : styles.offline
            }`}
          />
          <span>{onlineUserIds.has(u.id) ? "Online" : "Offline"}</span>
        </div>
        <span className="text-xs text-muted">
          Joined{" "}
          {u.createdAt
            ? new Date(u.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </span>
      </div>
    ),
  },
  {
    header: "Actions",
    key: "actions",
    render: (u) => (
      <div className={styles.actions}>
        {canEditUsers && (
          <CustomTooltip text="Edit">
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(u);
              }}
              style={{ color: "var(--text-muted)", padding: "4px 8px" }}
            >
              <CustomIcon name="Edit2" size={18} />
            </CustomButton>
          </CustomTooltip>
        )}
        {canEditUsers && (
          <CustomTooltip
            text={
              u.role.isAdmin ? "Admin accounts cannot be deleted" : "Delete"
            }
          >
            <CustomButton
              variant="ghost"
              size="sm"
              disabled={u.role.isAdmin}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(u.id);
              }}
              style={{
                color: u.role.isAdmin
                  ? "var(--text-muted)"
                  : "var(--accent-danger)",
                padding: "4px 8px",
                opacity: u.role.isAdmin ? 0.5 : 1,
                cursor: u.role.isAdmin ? "not-allowed" : "pointer",
              }}
            >
              <CustomIcon name="Trash2" size={18} />
            </CustomButton>
          </CustomTooltip>
        )}
      </div>
    ),
  },
];

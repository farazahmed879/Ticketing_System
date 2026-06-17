import type { TableColumn } from "../../components/types";
import type { User } from "../../types";
import CustomIcon from "../../components/CustomIcon";
import CustomButton from "../../components/CustomButton";
import styles from "./UserList.module.css";

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
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className={styles.avatar}>
          {u.image ? (
            <img src={u.image} alt={u.fullname} />
          ) : (
            u.fullname.charAt(0)
          )}
        </div>
        <div>
          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            {u.fullname}
            {u.isLead && (
              <span
                style={{
                  fontSize: "0.65rem",
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "rgba(124, 58, 237, 0.1)",
                  color: "var(--primary-color)",
                  fontWeight: 700,
                  border: "1px solid rgba(124, 58, 237, 0.2)",
                }}
              >
                LEAD
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: getRoleStyle(u.role?.name).color,
            }}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          {u.email}
        </span>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {u.primaryContact || u.mobileNumber || "—"}
        </span>
      </div>
    ),
  },
  {
    header: "Emergency Contact",
    key: "emergencyContact",
    render: (u) => (
      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
        {u.emergencyContact || "—"}
      </span>
    ),
  },
  {
    header: "Status",
    key: "status",
    render: (u) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: onlineUserIds.has(u.id)
                ? "var(--accent-success)"
                : "var(--text-muted)",
            }}
          />
          <span style={{ fontSize: "0.85rem" }}>
            {onlineUserIds.has(u.id) ? "Online" : "Offline"}
          </span>
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
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
      <div style={{ display: "flex", gap: 0 }}>
        {canEditUsers && (
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(u);
            }}
            title="Edit User"
            style={{ color: "var(--text-muted)", padding: "4px 8px" }}
          >
            <CustomIcon name="Edit2" size={18} />
          </CustomButton>
        )}
        {canEditUsers && (
          <CustomButton
            variant="ghost"
            size="sm"
            disabled={u.role.isAdmin}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(u.id);
            }}
            title={
              u.role.isAdmin
                ? "Admin accounts cannot be deleted"
                : "Delete User"
            }
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
        )}
      </div>
    ),
  },
];

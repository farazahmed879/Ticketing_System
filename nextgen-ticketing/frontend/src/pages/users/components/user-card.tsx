import { useNavigate } from "react-router-dom";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import styles from "../UserList.module.css";
import CustomImage from "../../../components/CustomImage";
const UserCard = ({
  data,
  isOnline,
  getRoleStyle,
  handleEdit,
  handleDelete,
  canEditUsers,
}: any) => {
  const navigate = useNavigate();
  return (
    <div
      key={data.id}
      className="glass-card"
      onClick={() => navigate(`/profile/${data.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/profile/${data.id}`);
        }
      }}
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        cursor: "pointer",
        border: "1px solid var(--border-glass)",
        borderRadius: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          className={styles.avatar}
          style={{ width: 48, height: 48, fontSize: "1.1rem" }}
        >
          {data.image ? (
            <CustomImage src={data.image} alt={data.fullname} />
          ) : (
            data.fullname.charAt(0)
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.95rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {data.fullname}
            {data.isLead && (
              <span
                style={{
                  fontSize: "0.6rem",
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: "rgba(124, 58, 237, 0.1)",
                  color: "var(--primary-color)",
                  fontWeight: 700,
                  border: "1px solid rgba(124, 58, 237, 0.2)",
                  lineHeight: 1,
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
              color: getRoleStyle(data.role?.name).color,
            }}
          >
            {data.role?.name}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <CustomIcon name="Mail" size={14} />
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {data.email}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CustomIcon name="Phone" size={14} />
          <span style={{ color: "var(--text-muted)" }}>
            {data.primaryContact || data.mobileNumber || "—"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
          title={data.emergencyContact || ""}
        >
          <CustomIcon name="LifeBuoy" size={14} />
          <span
            style={{
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {data.emergencyContact || "—"}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isOnline
                ? "var(--accent-success)"
                : "var(--text-muted)",
            }}
          />
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
          Joined{" "}
          {data.createdAt
            ? new Date(data.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 4,
          borderTop: "1px solid var(--border-glass)",
          paddingTop: 10,
          marginTop: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {canEditUsers && (
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(data)}
            title="Edit User"
            icon={<CustomIcon name="Edit2" size={16} />}
            style={{ color: "var(--text-muted)", padding: "4px 8px" }}
          />
        )}
        {canEditUsers && (
          <CustomButton
            variant="ghost"
            size="sm"
            disabled={data.role.isAdmin}
            onClick={() => handleDelete(data.id)}
            title={
              data.role.isAdmin
                ? "Admin accounts cannot be deleted"
                : "Delete User"
            }
            icon={<CustomIcon name="Trash2" size={16} />}
            style={{
              color: data.role.isAdmin
                ? "var(--text-muted)"
                : "var(--accent-danger)",
              padding: "4px 8px",
              opacity: data.role.isAdmin ? 0.5 : 1,
              cursor: data.role.isAdmin ? "not-allowed" : "pointer",
            }}
          />
        )}
      </div>
    </div>
  );
};

export default UserCard;

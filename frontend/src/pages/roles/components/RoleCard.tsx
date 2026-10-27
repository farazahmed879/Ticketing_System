import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import CustomBadge from "../../../components/CustomBadge";
import CustomTooltip from "../../../components/CustomTooltip";
import { RoleName } from "../../../utils/constants";
import type { Role } from "../../../types";

interface RoleCardProps {
  data: Role;
  handleEdit: (role: Role) => void;
  handleDelete: (id: string) => void;
}

const RoleCard = ({ data, handleEdit, handleDelete }: RoleCardProps) => {
  const role = data as any;
  const hasType =
    role.isAdmin ||
    role.isAgent ||
    role.isCustomer ||
    role.isEmployee ||
    role.isHR ||
    role.isQA;

  return (
    <div
      className="glass-card"
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        border: "1px solid var(--border-glass)",
        borderRadius: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <CustomIcon
          name="Shield"
          size={20}
          color={
            data.isAdmin ? "var(--accent-danger)" : "var(--accent-primary)"
          }
        />
        <span
          style={{
            fontWeight: 700,
            fontSize: "0.95rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {data.name}
        </span>
      </div>

      <div
        style={{
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          flex: 1,
        }}
      >
        {data.description || "-"}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {role.isAdmin && (
          <CustomBadge variant="danger">{RoleName.ADMIN}</CustomBadge>
        )}
        {role.isAgent && (
          <CustomBadge variant="info">{RoleName.AGENT}</CustomBadge>
        )}
        {role.isCustomer && (
          <CustomBadge variant="success">{RoleName.CUSTOMER}</CustomBadge>
        )}
        {role.isEmployee && (
          <CustomBadge variant="warning">{RoleName.EMPLOYEE}</CustomBadge>
        )}
        {role.isHR && <CustomBadge variant="info">{RoleName.HR}</CustomBadge>}
        {role.isQA && <CustomBadge variant="info">{RoleName.QA}</CustomBadge>}
        {!hasType && <CustomBadge variant="neutral">Other</CustomBadge>}
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
        <span
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <CustomIcon name="Users" size={14} />
          {data._count?.users || 0} users
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <CustomTooltip text="Edit">
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(data)}
              icon={<CustomIcon name="Edit2" size={16} />}
              style={{ color: "var(--text-muted)", padding: "4px 8px" }}
            />
          </CustomTooltip>
          <CustomTooltip text="Delete">
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(data.id)}
              icon={<CustomIcon name="Trash2" size={16} />}
              style={{ color: "var(--accent-danger)", padding: "4px 8px" }}
            />
          </CustomTooltip>
        </div>
      </div>
    </div>
  );
};

export default RoleCard;

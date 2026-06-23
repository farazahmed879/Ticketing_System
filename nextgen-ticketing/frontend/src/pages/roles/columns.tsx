import type { TableColumn } from "../../components/types";
import type { Role } from "../../types";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import CustomTooltip from "../../components/CustomTooltip";
import { RoleName } from "../../utils/constants";
import styles from "./columns.module.css";

export const getRoleColumns = (
  handleEdit: (role: Role) => void,
  handleDelete: (id: string) => void,
): TableColumn<Role>[] => [
  {
    header: "Role Name",
    key: "name",
    render: (role) => (
      <div className={styles.roleName}>
        <CustomIcon
          name="Shield"
          size={18}
          color={
            role.isAdmin ? "var(--accent-danger)" : "var(--accent-primary)"
          }
        />
        {role.name}
      </div>
    ),
  },
  {
    header: "Description",
    key: "description",
    render: (role) => (
      <span className="text-base-sm text-secondary">
        {role.description || "-"}
      </span>
    ),
  },
  {
    header: "Type",
    key: "type",
    render: (role: any) => (
      <div className="flex-row">
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
        {!role.isAdmin &&
          !role.isAgent &&
          !role.isCustomer &&
          !role.isEmployee &&
          !role.isHR &&
          !role.isQA && <CustomBadge variant="neutral">Other</CustomBadge>}
      </div>
    ),
  },
  {
    header: "Users",
    key: "users",
    render: (role) => `${role._count?.users || 0} users`,
  },
  {
    header: "Actions",
    key: "actions",
    render: (role) => (
      <div className={styles.actions}>
        <CustomTooltip text="Edit Role">
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(role)}
            icon={<CustomIcon name="Edit2" size={18} />}
          />
        </CustomTooltip>
        <CustomTooltip text="Delete Role">
          <CustomButton
            variant="danger"
            size="sm"
            onClick={() => handleDelete(role.id)}
            icon={<CustomIcon name="Trash2" size={18} />}
            style={{ background: "transparent" }}
          />
        </CustomTooltip>
      </div>
    ),
  },
];

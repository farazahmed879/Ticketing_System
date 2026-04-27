import React, { useEffect, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { API_ROUTES } from "../../utils/apiRoutes";
import type { Role } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import type { TableColumn } from "../../components/types";
import { RoleName } from "../../utils/constants";
import RoleForm, { type RoleFormData } from "./components/RoleForm";
import RoleModal from "./components/RoleModal";

const RoleList: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statuses, setStatuses] = useState<any[]>([]);
  const { showNotification, setIsLoading } = useNotification();

  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const fetchData = async () => {
    try {
      const [rolesRes, statusRes] = await Promise.all([
        api.get(API_ROUTES.ROLES.BASE),
        api.get(API_ROUTES.COMMON.STATUSES),
      ]);
      setRoles(rolesRes.data.roles);
      setStatuses(statusRes.data.statuses);
    } catch (err) {
      console.error("Failed to fetch data", err);
      showNotification("error", "Failed to load roles/statuses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (data: RoleFormData) => {
    setIsLoading(true);
    try {
      if (editingRole) {
        await api.put(API_ROUTES.ROLES.BY_ID(editingRole.id), data);
        showNotification("success", "Role updated successfully");
      } else {
        await api.post(API_ROUTES.ROLES.BASE, data);
        showNotification("success", "Role created successfully");
      }
      setIsModalOpen(false);
      setEditingRole(null);
      fetchData();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Operation failed",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this role?")) return;
    setIsLoading(true);
    try {
      await api.delete(API_ROUTES.ROLES.BY_ID(id));
      showNotification("success", "Role deleted successfully");
      fetchData();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete role",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const columns: TableColumn<Role>[] = [
    {
      header: "Role Name",
      key: "name",
      render: (role) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
          <CustomIcon name="Shield" size={18} color={role.isAdmin ? "var(--accent-danger)" : "var(--accent-primary)"} />
          {role.name}
        </div>
      ),
    },
    {
      header: "Description",
      key: "description",
      render: (role) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          {role.description || "-"}
        </span>
      ),
    },
    {
      header: "Type",
      key: "type",
      render: (role) => (
        <div style={{ display: "flex", gap: 8 }}>
          {role.isAdmin && (
            <CustomBadge variant="danger">
              {RoleName.ADMIN}
            </CustomBadge>
          )}
          {role.isAgent && (
            <CustomBadge variant="info">
              {RoleName.AGENT}
            </CustomBadge>
          )}
          {role.isCustomer && (
            <CustomBadge variant="success">
              {RoleName.CUSTOMER}
            </CustomBadge>
          )}
          {role.isEmployee && (
            <CustomBadge variant="warning">
              {RoleName.EMPLOYEE}
            </CustomBadge>
          )}
          {role.isHR && (
            <CustomBadge variant="info">
              {RoleName.HR}
            </CustomBadge>
          )}
          {!role.isAdmin && !role.isAgent && !role.isCustomer && !role.isEmployee && !role.isHR && (
            <CustomBadge variant="neutral">
              Other
            </CustomBadge>
          )}
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
        <div style={{ display: "flex", gap: 12 }}>
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(role)}
            title="Edit Role"
            icon={<CustomIcon name="Edit2" size={18} />}
          />
          <CustomButton
            variant="danger"
            size="sm"
            onClick={() => handleDelete(role.id)}
            title="Delete Role"
            icon={<CustomIcon name="Trash2" size={18} />}
            style={{ background: 'transparent' }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>
            Roles & Permissions
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            Manage system access levels and permissions
          </p>
        </div>
        <CustomButton
          variant="gradient"
          icon={<CustomIcon name="Plus" size={20} />}
          onClick={() => {
            setEditingRole(null);
            setIsModalOpen(true);
          }}
        >
          Create Role
        </CustomButton>
      </div>

      <CustomTable
        columns={columns}
        data={roles}
        loading={loading}
        loadingMessage="Loading roles..."
        emptyMessage="No roles found"
      />

      <RoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        role={editingRole}
        statuses={statuses}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default RoleList;

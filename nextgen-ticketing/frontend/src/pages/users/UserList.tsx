import React, { useEffect, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import styles from "./UserList.module.css";
import { API_ROUTES } from "../../utils/apiRoutes";

import type { User, Role, UserFormData } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import type { TableColumn } from "../../components/types";
import UserForm from "./components/UserForm";
import UserModal from "./components/UserModal";

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showNotification, setIsLoading } = useNotification();

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchData = async () => {
    try {
      const [uRes, rRes] = await Promise.all([
        api.get(API_ROUTES.USERS.BASE, {
          params: {
            type: roleFilter === "all" ? "all" : roleFilter,
            limit: -1,
          },
        }),
        api.get(API_ROUTES.ROLES.BASE),
      ]);
      setUsers(uRes.data.accounts);
      setRoles(rRes.data.roles);
    } catch (err) {
      console.error("Failed to fetch data", err);
      showNotification("error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [roleFilter]);

  const handleSubmit = async (data: UserFormData) => {
    setIsLoading(true);
    try {
      if (editingUser) {
        await api.put(API_ROUTES.USERS.BY_ID(editingUser.id), data);
        showNotification("success", "User updated successfully");
      } else {
        await api.post(API_ROUTES.USERS.BASE, data);
        showNotification("success", "User created successfully");
      }
      setIsModalOpen(false);
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || err.message || "Operation failed",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (u: User) => {
    setEditingUser(u);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    setIsLoading(true);
    try {
      await api.delete(API_ROUTES.USERS.BY_ID(id));
      showNotification("success", "User deleted successfully");
      fetchData();
    } catch (err: any) {
      showNotification("error", "Failed to delete user");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const columns: TableColumn<User>[] = [
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
            <div style={{ fontWeight: 600 }}>{u.fullname}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {u.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      key: "role",
      render: (u) => (
        <CustomBadge variant={u.role.isAdmin ? "danger" : "info"}>
          {u.role.name}
        </CustomBadge>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (u) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: u.lastOnline
                ? "var(--accent-success)"
                : "var(--text-muted)",
            }}
          ></div>
          <span style={{ fontSize: "0.85rem" }}>
            {u.lastOnline ? "Online" : "Offline"}
          </span>
        </div>
      ),
    },
    {
      header: "Joined",
      key: "createdAt",
      render: () => (
        <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {new Date().toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (u) => (
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => handleEdit(u)}
            style={{ background: "transparent", color: "var(--text-muted)" }}
            title="Edit User"
          >
            <CustomIcon name="Edit2" size={18} />
          </button>
          <button
            onClick={() => handleDelete(u.id)}
            style={{ background: "transparent", color: "var(--accent-danger)" }}
            title="Delete User"
          >
            <CustomIcon name="Trash2" size={18} />
          </button>
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
            User Management
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            Manage your team and their access levels
          </p>
        </div>
        <CustomButton
          variant="gradient"
          icon={<CustomIcon name="Plus" size={20} />}
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
        >
          Add New User
        </CustomButton>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <CustomInput
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<CustomIcon name="Search" size={18} />}
          containerStyle={{ flex: 1 }}
        />
        <CustomSelect
          value={roleFilter}
          onChange={(val) => setRoleFilter(val)}
          placeholder="All Roles"
          options={[
            { value: "all", label: "All Roles" },
            { value: "agents", label: "Agents" },
            { value: "admins", label: "Admins" },
            { value: "customers", label: "Customers" },
          ]}
          style={{ width: 200 }}
        />
      </div>

      <CustomTable
        columns={columns}
        data={filteredUsers}
        loading={loading}
        loadingMessage="Loading users..."
        emptyMessage="No users found"
      />

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={editingUser}
        roles={roles}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default UserList;

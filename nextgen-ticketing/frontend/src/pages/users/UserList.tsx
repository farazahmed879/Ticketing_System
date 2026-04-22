import React, { useEffect, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import Modal from "../../components/Modal.tsx";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import styles from "./UserList.module.css";
import { API_ROUTES } from "../../utils/apiRoutes";

import type { User } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import type { TableColumn } from "../../components/types";

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showNotification, setIsLoading } = useNotification();

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Form state
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [roleId, setRoleId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload: any = { fullname, email, title, roleId };
      if (password) payload.password = password;

      if (editingId) {
        await api.put(API_ROUTES.USERS.BY_ID(editingId), payload);
        showNotification("success", "User updated successfully");
      } else {
        if (!password) throw new Error("Password is required for new users");
        await api.post(API_ROUTES.USERS.BASE, payload);
        showNotification("success", "User created successfully");
      }
      setIsModalOpen(false);
      resetForm();
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

  const resetForm = () => {
    setFullname("");
    setEmail("");
    setPassword("");
    setTitle("");
    setRoleId("");
    setEditingId(null);
  };

  const handleEdit = (u: User) => {
    setFullname(u.fullname);
    setEmail(u.email);
    setTitle(u.title || "");
    setRoleId(u.role.id);
    setPassword("");
    setEditingId(u.id);
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
        <CustomBadge variant={u.role.isAdmin ? 'danger' : 'info'}>
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
            resetForm();
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit User" : "Add New User"}
      >
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <CustomInput
            label="Full Name"
            type="text"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
            placeholder="Full Name"
            required
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            <CustomInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
            <CustomInput
              label={`Password ${editingId ? "(Leave blank to keep current)" : ""}`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required={!editingId}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            <CustomInput
              label="Job Title / Company"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Agent"
            />
            <CustomSelect
              label="System Role"
              value={roleId}
              onChange={(val) => setRoleId(val)}
              placeholder="Select Role"
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              required={true}
            />
          </div>

          <CustomButton
            type="submit"
            variant="gradient"
            fullWidth
            style={{ marginTop: 10 }}
          >
            {editingId ? "Update User" : "Create User"}
          </CustomButton>
        </form>
      </Modal>
    </div>
  );
};

export default UserList;

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import styles from "./UserList.module.css";
import { API_ROUTES } from "../../utils/apiRoutes";
import { UIMessages } from "../../utils/constants";

import type { User, Role, UserFormData } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomPagination from "../../components/CustomPagination";
import type { TableColumn } from "../../components/types";
import UserModal from "./components/UserModal";
import ConfirmationModal from "../../components/ConfirmationModal";

const UserList: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showNotification, setIsLoading } = useNotification();

  // Pagination & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, rRes] = await Promise.all([
        api.get(API_ROUTES.USERS.BASE, {
          params: {
            type: roleFilter === "all" ? "all" : roleFilter,
            limit: itemsPerPage,
            page: currentPage,
            search: searchTerm,
          },
        }),
        api.get(API_ROUTES.ROLES.BASE),
      ]);
      setUsers(uRes.data.accounts);
      setTotalItems(uRes.data.total);
      setRoles(rRes.data.roles);
    } catch (err) {
      console.error("Failed to fetch data", err);
      showNotification("error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [roleFilter, currentPage, searchTerm, itemsPerPage]);

  const handleSubmit = async (data: UserFormData) => {
    setIsLoading(
      true,
      editingUser
        ? UIMessages.LOADING.UPDATING_USER
        : UIMessages.LOADING.CREATING_USER,
    );
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
      setIsLoading(false, "");
    }
  };

  const handleEdit = (u: User) => {
    setEditingUser(u);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(API_ROUTES.USERS.BY_ID(userToDelete));
      showNotification("success", "User deleted successfully");
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (err: any) {
      showNotification("error", "Failed to delete user");
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

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
        <div style={{ display: "flex", gap: 0 }}>
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchTerm(e.target.value);
            setCurrentPage(0);
          }}
          icon={<CustomIcon name="Search" size={18} />}
          containerStyle={{ flex: 1 }}
        />
        <CustomSelect
          value={roleFilter}
          onChange={(val) => {
            setRoleFilter(val);
            setCurrentPage(0);
          }}
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

      <div className="glass-card" style={{ padding: 0 }}>
        <CustomTable
          columns={columns}
          data={users}
          loading={loading}
          loadingMessage="Loading users..."
          emptyMessage="No users found"
          onRowClick={(u) => navigate(`/profile/${u.id}`)}
        />
        <CustomPagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / itemsPerPage)}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageSizeChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(0);
          }}
        />
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={editingUser}
        roles={roles}
        onSubmit={handleSubmit}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? This will permanently remove their access."
        confirmText="Delete User"
        loading={isDeleting}
        type="danger"
      />
    </div>
  );
};

export default UserList;

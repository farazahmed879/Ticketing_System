import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { socket } from "../../services/socket";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import { API_ROUTES } from "../../utils/apiRoutes";
import { UIMessages } from "../../utils/constants";
import type { User, Role, UserFormData } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomPagination from "../../components/CustomPagination";
import UserModal from "./components/UserModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import StandardListLayout from "../../components/StandardListLayout";
import { useAuth } from "../../context/AuthContext";
import { RoleName } from "../../utils/constants";
import UserCard from "./components/user-card";

import { getRoleStyle, getUserColumns } from "./columns";

const UserList: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const canEditUsers =
    currentUser?.role?.name === RoleName.ADMIN ||
    currentUser?.role?.name === RoleName.HR;
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
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Listen to real-time online users from socket

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

  const columns = getUserColumns(
    onlineUserIds,
    canEditUsers,
    handleEdit,
    handleDelete,
  );

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [roleFilter, currentPage, searchTerm, itemsPerPage]);

  useEffect(() => {
    const handleOnlineUsers = (
      onlineUsers: { userId: string; status: string }[],
    ) => {
      setOnlineUserIds(new Set(onlineUsers.map((u) => u.userId)));
    };

    socket.on("users:online", handleOnlineUsers);
    return () => {
      socket.off("users:online", handleOnlineUsers);
    };
  }, []);

  return (
    <>
      <StandardListLayout
        header={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
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
        }
        filters={
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
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
                ...roles.map((r) => ({ value: r.id, label: r.name })),
              ]}
              style={{ width: 200 }}
            />
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: 4,
                borderRadius: 10,
                border: "1px solid var(--border-glass)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <CustomButton
                variant={viewMode === "list" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                icon={<CustomIcon name="List" size={16} />}
                title="List view"
                style={{ padding: "6px 10px" }}
              />
              <CustomButton
                variant={viewMode === "grid" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                icon={<CustomIcon name="LayoutGrid" size={16} />}
                title="Grid view"
                style={{ padding: "6px 10px" }}
              />
            </div>
          </div>
        }
        pagination={
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
        }
      >
        {viewMode === "list" ? (
          <CustomTable
            style={{ flex: 1, overflowY: "auto" }}
            columns={columns}
            data={users}
            loading={loading}
            loadingMessage="Loading users..."
            emptyMessage="No users found"
            onRowClick={(u) => navigate(`/profile/${u.id}`)}
          />
        ) : loading ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            No users found
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
              padding: "4px 0",
            }}
          >
            {users.map((u: any) => (
              <UserCard
                key={u.id}
                data={u}
                isOnline={onlineUserIds.has(u.id)}
                getRoleStyle={getRoleStyle}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                canEditUsers={canEditUsers}
              />
            ))}
          </div>
        )}
      </StandardListLayout>

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
    </>
  );
};

export default UserList;

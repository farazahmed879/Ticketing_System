import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { socket } from "../../services/socket";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import { API_ROUTES } from "../../utils/apiRoutes";
import { UIMessages } from "../../utils/constants";
import type { User, UserFormData } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomPagination from "../../components/CustomPagination";
import UserModal from "./components/UserModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import StandardListLayout from "../../components/StandardListLayout";
import { useAuth } from "../../context/AuthContext";
import UserCard from "./components/user-card";

import { getRoleStyle, getUserColumns } from "./columns";
import { ROLE_TYPE } from "../roles/roleConstants";

const UserList: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const canEditUsers =
    currentUser?.role?.roleType === ROLE_TYPE.ADMIN ||
    currentUser?.role?.roleType === ROLE_TYPE.AGENT ||
    currentUser?.role?.roleType === ROLE_TYPE.HR;

  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showNotification, setIsLoading } = useNotification();

  // Pagination & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<"list" | "grid">(
    (localStorage.getItem("defaultListView") as "list" | "grid") || "list",
  );

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Listen to real-time online users from socket

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users", roleFilter, currentPage, searchTerm, itemsPerPage],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.USERS.BASE, {
        params: {
          type: roleFilter === "all" ? "all" : roleFilter,
          limit: itemsPerPage,
          page: currentPage,
          search: searchTerm,
        },
      });
      return {
        users: res.data.accounts,
        total: res.data.total || 0,
      };
    },
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.ROLES.BASE);
      return res.data.roles;
    },
  });

  const users = usersData?.users || [];
  const totalItems = usersData?.total || 0;
  const roles = rolesData || [];
  const loading = usersLoading || rolesLoading;

  const saveMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (editingUser) {
        return api.put(API_ROUTES.USERS.BY_ID(editingUser.id), data);
      } else {
        return api.post(API_ROUTES.USERS.BASE, data);
      }
    },
    onMutate: () =>
      setIsLoading(
        true,
        editingUser
          ? UIMessages.LOADING.UPDATING_USER
          : UIMessages.LOADING.CREATING_USER,
      ),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showNotification(
        "success",
        editingUser ? "User updated successfully" : "User created successfully",
      );
      setIsModalOpen(false);
      setEditingUser(null);
    },
    onError: (err: any) => {
      showNotification(
        "error",
        err.response?.data?.error || err.message || "Operation failed",
      );
    },
  });

  const handleSubmit = async (data: UserFormData) => {
    saveMutation.mutate(data);
  };

  const handleEdit = (u: User) => {
    setEditingUser(u);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(API_ROUTES.USERS.BY_ID(id));
    },
    onMutate: () => setIsDeleting(true),
    onSettled: () => setIsDeleting(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showNotification("success", "User deleted successfully");
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    },
    onError: () => {
      showNotification("error", "Failed to delete user");
      setUserToDelete(null);
    },
  });

  const confirmDelete = async () => {
    if (!userToDelete) return;
    deleteMutation.mutate(userToDelete);
  };

  const columns = getUserColumns(
    onlineUserIds,
    canEditUsers,
    handleEdit,
    handleDelete,
  );

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
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>
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
              value={searchInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value;
                setSearchInput(val);
                if (val === "") {
                  setSearchTerm("");
                  setCurrentPage(0);
                }
              }}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  setSearchTerm(searchInput);
                  setCurrentPage(0);
                }
              }}
              icon={<CustomIcon name="Search" size={18} />}
              containerStyle={{ width: "350px" }}
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
                ...roles.map((r: { id: any; name: any }) => ({
                  value: r.id,
                  label: r.name,
                })),
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

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { API_ROUTES } from "../../utils/apiRoutes";
import type { Role, RoleFormData } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomPagination from "../../components/CustomPagination";
import { TICKET_STATUSES, UIMessages } from "../../utils/constants";
import RoleModal from "./components/RoleModal";
import ConfirmationModal from "../../components/ConfirmationModal";

import StandardListLayout from "../../components/StandardListLayout";
import { getRoleColumns } from "./columns";

const RoleList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const statuses = TICKET_STATUSES;
  const { showNotification, setIsLoading } = useNotification();

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: rolesData, isLoading: loading } = useQuery({
    queryKey: ["roles", currentPage, itemsPerPage],
    queryFn: async () => {
      const rolesRes = await api.get(API_ROUTES.ROLES.BASE, {
        params: {
          limit: itemsPerPage,
          page: currentPage,
        },
      });
      return {
        roles: rolesRes.data.roles,
        total: rolesRes.data.total || 0,
      };
    },
  });

  const roles = rolesData?.roles || [];
  const totalItems = rolesData?.total || 0;

  const saveMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      if (editingRole) {
        return api.put(API_ROUTES.ROLES.BY_ID(editingRole.id), data);
      } else {
        return api.post(API_ROUTES.ROLES.BASE, data);
      }
    },
    onMutate: () => {
      setIsSaving(true);
      setIsLoading(true, UIMessages.LOADING.SAVING_CHANGES);
    },
    onSettled: () => {
      setIsSaving(false);
      setIsLoading(false, "");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      showNotification(
        "success",
        editingRole ? "Role updated successfully" : "Role created successfully"
      );
      setIsModalOpen(false);
      setEditingRole(null);
    },
    onError: (err: any) => {
      showNotification(
        "error",
        err.response?.data?.error || "Operation failed"
      );
    },
  });

  const handleSubmit = async (data: RoleFormData) => {
    saveMutation.mutate(data);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setRoleToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(API_ROUTES.ROLES.BY_ID(id));
    },
    onMutate: () => setIsDeleting(true),
    onSettled: () => setIsDeleting(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      showNotification("success", "Role deleted successfully");
      setIsDeleteModalOpen(false);
      setRoleToDelete(null);
    },
    onError: (err: any) => {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete role"
      );
      setRoleToDelete(null);
    },
  });

  const confirmDelete = async () => {
    if (!roleToDelete) return;
    deleteMutation.mutate(roleToDelete);
  };

  const columns = getRoleColumns(handleEdit, handleDelete);

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
        <CustomTable
          style={{ flex: 1, overflowY: "auto" }}
          columns={columns}
          data={roles}
          loading={loading}
          loadingMessage="Loading roles..."
          emptyMessage="No roles found"
        />
      </StandardListLayout>

      <RoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        role={editingRole}
        statuses={statuses}
        onSubmit={handleSubmit}
        isLoading={isSaving}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Role"
        message="Are you sure you want to delete this role? This will affect all users assigned to it."
        confirmText="Delete Role"
        loading={isDeleting}
        type="danger"
      />
    </>
  );
};

export default RoleList;

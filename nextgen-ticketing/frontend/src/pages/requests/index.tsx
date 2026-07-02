import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import styles from "./Requests.module.css";

import type { UserRequest } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomFilterBar from "../../components/CustomFilterBar";
import CustomButton from "../../components/CustomButton";
import { API_ROUTES } from "../../utils/apiRoutes";

import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import RequestModal from "./RequestModal";
import ConfirmationModal from "../../components/ConfirmationModal";

import StandardListLayout from "../../components/StandardListLayout";
import { getRequestColumns } from "./columns";

const Requests: React.FC = () => {
  const { user } = useAuth();
  const { showNotification, setIsLoading } = useNotification();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const highlightRequestId = searchParams.get("requestId") || undefined;
  const [filter, setFilter] = useState("PENDING");

  // Deep-linked from a notification: show ALL so an already approved/rejected
  // request isn't hidden by the default PENDING filter.
  useEffect(() => {
    if (highlightRequestId) setFilter("ALL");
  }, [highlightRequestId]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);

  const { data: requestData, isLoading: loading } = useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.REQUESTS.BASE);
      return res.data.requests;
    },
  });

  const requests: UserRequest[] = requestData || [];

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(API_ROUTES.REQUESTS.BY_ID(id), { status });
    },
    onMutate: () => setIsLoading(true, "Updating request..."),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      showNotification(
        "success",
        `Request ${variables.status === "APPROVED" ? "approved" : "rejected"} successfully`,
      );
    },
    onError: (err) => {
      console.error("Failed to update request status", err);
      showNotification("error", "Failed to update request status");
    },
  });

  const handleUpdateStatus = async (id: string, status: string) => {
    updateMutation.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    setRequestToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(API_ROUTES.REQUESTS.BY_ID(id));
    },
    onMutate: () => setIsLoading(true, "Deleting request..."),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      setIsDeleteModalOpen(false);
      setRequestToDelete(null);
      showNotification("success", "Request deleted successfully");
    },
    onError: (err) => {
      console.error("Failed to delete request", err);
      showNotification("error", "Failed to delete request");
    },
  });

  const confirmDelete = async () => {
    if (!requestToDelete) return;
    deleteMutation.mutate(requestToDelete);
  };

  const filteredRequests = requests.filter(
    (r) => filter === "ALL" || r.status === filter,
  );

  const hasPermission = (permPath: string) => {
    if (!user || !user.role || !user.role.permissions) return false;
    if (user.role.name === "Admin") return true;
    const [module, action] = permPath.split(".");
    return (user.role.permissions as any)?.[module]?.[action] === true;
  };

  const columns = getRequestColumns(
    user,
    hasPermission,
    handleUpdateStatus,
    handleDelete,
  );

  const handleRequestSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["requests"] });
    showNotification("success", "Request submitted successfully");
  };

  return (
    <>
      <StandardListLayout
        header={
          <div className={styles.header}>
            <div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>
                Management Requests
              </h1>
              <p style={{ color: "var(--text-muted)" }}>
                {user?.role?.isAdmin || user?.role?.isAgent
                  ? "Review and manage user requests"
                  : "Manage your leave and vacation requests"}
              </p>
            </div>
            <CustomButton
              variant="gradient"
              onClick={() => setIsModalOpen(true)}
              icon={<CustomIcon name="Plus" size={18} />}
            >
              New Request
            </CustomButton>
          </div>
        }
        filters={
          <CustomFilterBar
            activeOption={filter}
            onChange={setFilter}
            options={[
              { value: "PENDING", label: "Pending" },
              { value: "APPROVED", label: "Approved" },
              { value: "REJECTED", label: "Rejected" },
              { value: "ALL", label: "All" },
            ]}
          />
        }
      >
        <CustomTable
          style={{ flex: 1, overflowY: "auto" }}
          columns={columns}
          data={filteredRequests}
          highlightRowId={highlightRequestId}
          loading={loading}
          loadingMessage="Loading requests..."
          emptyMessage={`No ${filter.toLowerCase()} requests found.`}
        />
      </StandardListLayout>

      <RequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRequestSuccess}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Request"
        message="Are you sure you want to delete this request? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </>
  );
};

export default Requests;

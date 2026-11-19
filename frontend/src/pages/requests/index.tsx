import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { generateDocumentLink, isDocumentRequest } from "./documentRequest";
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
import RequestCard from "./components/RequestCard";
import RequestDetailsDrawer from "./components/RequestDetailsDrawer";
import { useListViewMode } from "../../utils/helpers";

const Requests: React.FC = () => {
  const { user } = useAuth();
  const { showNotification, setIsLoading } = useNotification();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const highlightRequestId = searchParams.get("requestId") || undefined;
  const [filter, setFilter] = useState("PENDING");
  const [viewMode, setViewMode] = useListViewMode();

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );

  // Deep-linked from a notification: show ALL so an already approved/rejected
  // request isn't hidden by the default PENDING filter, and open its details.
  useEffect(() => {
    if (highlightRequestId) {
      setFilter("ALL");
      setSelectedRequestId(highlightRequestId);
    }
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
  // Looked up from the live list so the drawer reflects approve/reject updates.
  const selectedRequest =
    requests.find((r) => r.id === selectedRequestId) || null;

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
      const data = (
        err as { response?: { data?: { message?: string; error?: string } } }
      ).response?.data;
      showNotification(
        "error",
        data?.message || data?.error || "Failed to update request status",
      );
    },
  });

  const handleUpdateStatus = async (id: string, status: string) => {
    // Approving a document request = generating the document; delivering
    // it on the Documents page approves the request.
    const req = requests.find((r) => r.id === id);
    if (status === "APPROVED" && req && isDocumentRequest(req)) {
      navigate(generateDocumentLink(req));
      return;
    }
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
      if (requestToDelete === selectedRequestId) setSelectedRequestId(null);
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
    const [module, action] = permPath.split(".");
    // Admin-type roles (Admin, Sub Admin) have every right, except that a
    // delete-restricted role (Sub Admin) never deletes.
    if (user.role.roleType === "admin") {
      return action !== "delete" || user.role.canDelete !== false;
    }
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
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>
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
          <div className={styles.filterRow}>
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
            <div className={`view-mode-switcher ${styles.viewToggle}`}>
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
      >
        {viewMode === "list" ? (
          <CustomTable
            style={{ flex: 1, overflowY: "auto" }}
            columns={columns}
            data={filteredRequests}
            highlightRowId={highlightRequestId}
            onRowClick={(r) => setSelectedRequestId(r.id)}
            loading={loading}
            loadingMessage="Loading requests..."
            emptyMessage={`No ${filter.toLowerCase()} requests found.`}
          />
        ) : loading ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            Loading requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            {`No ${filter.toLowerCase()} requests found.`}
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
              padding: "4px 0",
              alignContent: "start",
            }}
          >
            {filteredRequests.map((r) => (
              <RequestCard
                key={r.id}
                data={r}
                user={user}
                hasPermission={hasPermission}
                handleUpdateStatus={handleUpdateStatus}
                handleDelete={handleDelete}
                highlighted={r.id === highlightRequestId}
                onOpen={(req) => setSelectedRequestId(req.id)}
              />
            ))}
          </div>
        )}
      </StandardListLayout>

      <RequestDetailsDrawer
        request={selectedRequest}
        onClose={() => setSelectedRequestId(null)}
        canDelete={
          !!selectedRequest &&
          (selectedRequest.userId === user?.id ||
            hasPermission("requests.delete"))
        }
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDelete}
      />

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

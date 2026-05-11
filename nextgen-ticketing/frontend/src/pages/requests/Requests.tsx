import React, { useEffect, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import { formatDistanceToNow } from "date-fns";
import api from "../../services/api";
import styles from "./Requests.module.css";

import type { UserRequest } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomFilterBar from "../../components/CustomFilterBar";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import { API_ROUTES } from "../../utils/apiRoutes";
import type { TableColumn } from "../../components/types";

import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import RequestModal from "./RequestModal";
import ConfirmationModal from "../../components/ConfirmationModal";

import StandardListLayout from "../../components/StandardListLayout";

const Requests: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await api.get(API_ROUTES.REQUESTS.BASE);
      setRequests(res.data.requests);
    } catch (err) {
      console.error("Failed to fetch requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.patch(API_ROUTES.REQUESTS.BY_ID(id), { status });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
      showNotification(
        "success",
        `Request ${status === "APPROVED" ? "approved" : "rejected"} successfully`,
      );
    } catch (err) {
      console.error("Failed to update request status", err);
      showNotification("error", "Failed to update request status");
    }
  };

  const handleDelete = (id: string) => {
    setRequestToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;
    try {
      setIsDeleting(true);
      await api.delete(API_ROUTES.REQUESTS.BY_ID(requestToDelete));
      setRequests((prev) => prev.filter((r) => r.id !== requestToDelete));
      setIsDeleteModalOpen(false);
      showNotification("success", "Request deleted successfully");
    } catch (err) {
      console.error("Failed to delete request", err);
      showNotification("error", "Failed to delete request");
    } finally {
      setIsDeleting(false);
      setRequestToDelete(null);
    }
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

  const columns: TableColumn<UserRequest>[] = [
    {
      header: "Type",
      key: "type",
      render: (r) => (
        <div className={styles.typeBadge}>{r.type.replace("_", " ")}</div>
      ),
    },
    {
      header: "User / Email",
      key: "user",
      render: (r) => (
        <div className={styles.userInfo}>
          <span className={styles.userName}>
            {r.user?.fullname || "Anonymous"}
          </span>
          <span className={styles.userEmail}>{r.email || r.user?.email}</span>
        </div>
      ),
    },
    {
      header: "Message",
      key: "message",
      className: styles.messageCell,
    },
    {
      header: "Requested",
      key: "createdAt",
      render: (r) =>
        formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }),
    },
    {
      header: "Status",
      key: "status",
      render: (r) => (
        <CustomBadge
          variant={
            r.status === "APPROVED"
              ? "success"
              : r.status === "REJECTED"
                ? "danger"
                : "warning"
          }
        >
          {r.status}
        </CustomBadge>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (r) => (
        <div className={styles.actions}>
          {r.status === "PENDING" && hasPermission("requests.update") && (
            <>
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={() => handleUpdateStatus(r.id, "APPROVED")}
                title="Approve"
                style={{ color: "var(--accent-success)" }}
                icon={<CustomIcon name="CheckCircle2" size={18} />}
              />
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={() => handleUpdateStatus(r.id, "REJECTED")}
                title="Reject"
                style={{ color: "var(--accent-danger)" }}
                icon={<CustomIcon name="XCircle" size={18} />}
              />
            </>
          )}
          {(r.userId === user?.id || hasPermission("requests.delete")) && (
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(r.id)}
              title="Delete"
              icon={<CustomIcon name="Trash2" size={18} />}
            />
          )}
        </div>
      ),
    },
  ];

  const handleRequestSuccess = (newRequest: any) => {
    setRequests((prev) => [newRequest, ...prev]);
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
        loading={isDeleting}
        type="danger"
      />
    </>
  );
};

export default Requests;

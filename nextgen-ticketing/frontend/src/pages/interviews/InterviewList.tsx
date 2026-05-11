import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import styles from "./InterviewList.module.css";
import { API_ROUTES } from "../../utils/apiRoutes";
import { InterviewStatus, RoleName, UIMessages, DEFAULT_PAGE_SIZE } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";

import type { Interview } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomFilterBar from "../../components/CustomFilterBar";
import type { TableColumn } from "../../components/types";
import CustomDatePicker from "../../components/CustomDatePicker";
import ScheduleInterviewModal from "./ScheduleInterviewModal";
import CustomPagination from "../../components/CustomPagination";
import CustomAvatarStack from "../../components/CustomAvatarStack";

import StandardListLayout from "../../components/StandardListLayout";

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case InterviewStatus.SCHEDULED:
      return "info" as const;
    case InterviewStatus.COMPLETED:
      return "success" as const;
    case InterviewStatus.CANCELLED:
      return "danger" as const;
    default:
      return "neutral" as const;
  }
};

const InterviewList: React.FC = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showNotification, setIsLoading } = useNotification();
  const { user } = useAuth();

  const canUpdateInterviews =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.name === RoleName.HR ||
    user?.role?.permissions?.interviews?.update;

  const canDeleteInterviews =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.interviews?.delete;

  const canCreateInterviews =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.name === RoleName.HR ||
    user?.role?.permissions?.interviews?.create;

  // Pagination & Filter state
  const [activeFilter, setActiveFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingInterview, setEditingInterview] = useState<Interview | null>(
    null,
  );

  const [currentPage, setCurrentPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);

  const filters = [
    { value: "all", label: "All" },
    { value: "upcoming", label: "Upcoming" },
    { value: "today", label: "Today" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const params: any = {
        filter: activeFilter,
        limit: itemsPerPage,
        page: currentPage,
      };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
        delete params.filter;
      }

      const res = await api.get(API_ROUTES.INTERVIEWS.BASE, { params });
      setInterviews(res.data.interviews);
      setTotalItems(res.data.total);
    } catch (err) {
      console.error("Failed to fetch interviews", err);
      showNotification("error", "Failed to load interviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchInterviews();
  }, [activeFilter, currentPage, itemsPerPage]);

  const handleDateFilter = () => {
    if (startDate && endDate) {
      setCurrentPage(0);
      fetchInterviews();
    }
  };

  const handleScheduleSuccess = () => {
    setIsModalOpen(false);
    setEditingInterview(null);
    fetchInterviews();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this interview?"))
      return;
    setIsLoading(true, UIMessages.LOADING.DELETING);
    try {
      await api.delete(API_ROUTES.INTERVIEWS.BY_ID(id));
      showNotification("success", "Interview deleted successfully");
      fetchInterviews();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete interview",
      );
    } finally {
      setIsLoading(false, "");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const columns: TableColumn<Interview>[] = [
    {
      header: "Candidate",
      key: "candidate",
      render: (i) => (
        <div className={styles.candidateInfo}>
          <div className={styles.candidateAvatar}>
            {i.candidate.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{i.candidate.name}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {i.candidate.position}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Interview",
      key: "title",
      render: (i) => <span style={{ fontWeight: 500 }}>{i.title}</span>,
    },
    {
      header: "Date & Time",
      key: "scheduledAt",
      render: (i) => (
        <div className={styles.timeInfo}>
          <span className={styles.timeMain}>{formatDate(i.scheduledAt)}</span>
          <span className={styles.timeSub}>
            {formatTime(i.scheduledAt)} · {i.duration} min
          </span>
        </div>
      ),
    },
    {
      header: "Panel",
      key: "panel",
      render: (i) => (
        <CustomAvatarStack
          items={i.panelMembers.map((pm) => ({
            id: pm.id,
            name: pm.user.fullname,
            image: pm.user.image,
          }))}
          limit={4}
          size={28}
        />
      ),
    },
    {
      header: "Feedback",
      key: "feedbacks",
      render: (i) => (
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {i._count?.feedbacks || 0} / {i.panelMembers.length}
        </span>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (i) => (
        <CustomBadge variant={statusBadgeVariant(i.status)}>
          {i.status}
        </CustomBadge>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (i) => (
        <div style={{ display: "flex", gap: 0 }}>
          {canUpdateInterviews && (
            <CustomButton
              variant="ghost"
              size="sm"
              icon={<CustomIcon name="Edit2" size={17} />}
              onClick={(e) => {
                e.stopPropagation();
                setEditingInterview(i);
                setIsModalOpen(true);
              }}
              title="Edit Interview"
            />
          )}

          {canDeleteInterviews && (
            <CustomButton
              variant="ghost"
              size="sm"
              icon={<CustomIcon name="Trash2" size={17} />}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(i.id);
              }}
              style={{ color: "var(--accent-danger)" }}
              title="Delete Interview"
            />
          )}
        </div>
      ),
    },
  ];

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
                Interviews
              </h1>
              <p style={{ color: "var(--text-muted)" }}>
                Schedule and manage candidate interviews
              </p>
            </div>
            {canCreateInterviews && (
              <CustomButton
                variant="gradient"
                icon={<CustomIcon name="Plus" size={20} />}
                onClick={() => {
                  setEditingInterview(null);
                  setIsModalOpen(true);
                }}
              >
                Schedule Interview
              </CustomButton>
            )}
          </div>
        }
        filters={
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <CustomFilterBar
              options={filters}
              activeOption={activeFilter}
              onChange={(val) => {
                setActiveFilter(val);
                setCurrentPage(0);
                setStartDate("");
                setEndDate("");
              }}
            />

            <div className={styles.dateFilter}>
              <CustomDatePicker
                value={startDate}
                onChange={(val: string) => setStartDate(val)}
                placeholder="Start Date"
                className={styles.dateInput}
              />
              <span style={{ color: "var(--text-muted)", marginTop: 4 }}>
                to
              </span>
              <CustomDatePicker
                value={endDate}
                onChange={(val: string) => setEndDate(val)}
                placeholder="End Date"
                className={styles.dateInput}
              />
              <CustomButton
                variant="outline"
                size="sm"
                onClick={handleDateFilter}
                disabled={!startDate || !endDate}
                containerStyle={{ marginTop: 4 }}
              >
                Apply
              </CustomButton>
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
        <CustomTable
          style={{ flex: 1, overflowY: "auto" }}
          columns={columns}
          data={interviews}
          loading={loading}
          loadingMessage="Loading interviews..."
          emptyMessage="No interviews found"
          onRowClick={(i) => navigate(`/interviews/${i.id}`)}
        />
      </StandardListLayout>

      <ScheduleInterviewModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInterview(null);
        }}
        onSuccess={handleScheduleSuccess}
        interview={editingInterview}
      />
    </>
  );
};

export default InterviewList;

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import styles from "./InterviewList.module.css";
import { API_ROUTES } from "../../utils/apiRoutes";
import { InterviewStatus } from "../../utils/constants";

import type { Interview } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import type { TableColumn } from "../../components/types";
import CustomDatePicker from "../../components/CustomDatePicker";
import ScheduleInterviewModal from "./ScheduleInterviewModal";

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case InterviewStatus.SCHEDULED: return "info" as const;
    case InterviewStatus.COMPLETED: return "success" as const;
    case InterviewStatus.CANCELLED: return "danger" as const;
    default: return "neutral" as const;
  }
};

const InterviewList: React.FC = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showNotification } = useNotification();

  // Filter state
  const [activeFilter, setActiveFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);

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
      const params: any = { filter: activeFilter };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
        delete params.filter;
      }

      const res = await api.get(API_ROUTES.INTERVIEWS.BASE, { params });
      setInterviews(res.data.interviews);
    } catch (err) {
      console.error("Failed to fetch interviews", err);
      showNotification("error", "Failed to load interviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [activeFilter]);

  const handleDateFilter = () => {
    if (startDate && endDate) {
      fetchInterviews();
    }
  };

  const handleScheduleSuccess = () => {
    setIsModalOpen(false);
    setEditingInterview(null);
    fetchInterviews();
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
      render: (i) => (
        <span style={{ fontWeight: 500 }}>{i.title}</span>
      ),
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
        <div className={styles.panelAvatars}>
          {i.panelMembers.slice(0, 4).map((pm) => (
            <div
              key={pm.id}
              className={styles.panelAvatar}
              title={pm.user.fullname}
            >
              {pm.user.image ? (
                <img src={pm.user.image} alt={pm.user.fullname} />
              ) : (
                pm.user.fullname.charAt(0)
              )}
            </div>
          ))}
          {i.panelMembers.length > 4 && (
            <div className={`${styles.panelAvatar} ${styles.panelAvatarMore}`}>
              +{i.panelMembers.length - 4}
            </div>
          )}
        </div>
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
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingInterview(i);
              setIsModalOpen(true);
            }}
            style={{ background: "transparent", color: "var(--text-muted)" }}
            title="Edit Interview"
          >
            <CustomIcon name="Edit2" size={17} />
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
            Interviews
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            Schedule and manage candidate interviews
          </p>
        </div>
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
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div className={styles.filterBar}>
          {filters.map((f) => (
            <button
              key={f.value}
              className={`${styles.filterBtn} ${activeFilter === f.value ? styles.filterBtnActive : ""}`}
              onClick={() => {
                setActiveFilter(f.value);
                setStartDate("");
                setEndDate("");
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className={styles.dateFilter}>
          <CustomDatePicker
            value={startDate}
            onChange={(val) => setStartDate(val)}
            placeholder="Start Date"
            className={styles.dateInput}
          />
          <span style={{ color: "var(--text-muted)", marginTop: 4 }}>to</span>
          <CustomDatePicker
            value={endDate}
            onChange={(val) => setEndDate(val)}
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

      <CustomTable
        columns={columns}
        data={interviews}
        loading={loading}
        loadingMessage="Loading interviews..."
        emptyMessage="No interviews found"
        onRowClick={(i) => navigate(`/interviews/${i.id}`)}
      />

      <ScheduleInterviewModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInterview(null);
        }}
        onSuccess={handleScheduleSuccess}
        interview={editingInterview}
      />
    </div>
  );
};

export default InterviewList;

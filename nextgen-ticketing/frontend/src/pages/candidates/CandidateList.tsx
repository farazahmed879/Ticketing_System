import React, { useEffect, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import styles from "./CandidateList.module.css";
import { API_ROUTES } from "../../utils/apiRoutes";
import { CandidateStatus } from "../../utils/constants";
import { useNavigate, Link } from "react-router-dom";
import type { Candidate } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import type { TableColumn } from "../../components/types";
import CandidateForm from "./components/CandidateForm";
import CandidateModal from "./components/CandidateModal";

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case CandidateStatus.ACTIVE: return "info" as const;
    case CandidateStatus.HIRED: return "success" as const;
    case CandidateStatus.REJECTED: return "danger" as const;
    case CandidateStatus.ON_HOLD: return "warning" as const;
    default: return "neutral" as const;
  }
};

const CandidateList: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showNotification, setIsLoading } = useNotification();
  const navigate = useNavigate();

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ROUTES.CANDIDATES.BASE, {
        params: {
          status: statusFilter === "all" ? undefined : statusFilter,
          search: searchTerm || undefined,
        },
      });
      setCandidates(res.data.candidates);
    } catch (err) {
      console.error("Failed to fetch candidates", err);
      showNotification("error", "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSearch = () => {
    fetchData();
  };

  const handleFormSubmit = async (payload: any) => {
    try {
      if (currentEditingId) {
        await api.put(API_ROUTES.CANDIDATES.BY_ID(currentEditingId), payload);
        showNotification("success", "Candidate updated successfully");
      } else {
        await api.post(API_ROUTES.CANDIDATES.BASE, payload);
        showNotification("success", "Candidate created successfully");
      }
      setIsModalOpen(false);
      setCurrentEditingId(null);
      fetchData();
    } catch (err: any) {
      showNotification("error", err.response?.data?.error || "Failed to save candidate");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) return;
    setIsLoading(true);
    try {
      await api.delete(API_ROUTES.CANDIDATES.BY_ID(id));
      showNotification("success", "Candidate deleted successfully");
      fetchData();
    } catch (err: any) {
      showNotification("error", "Failed to delete candidate");
    } finally {
      setIsLoading(false);
    }
  };

  const columns: TableColumn<Candidate>[] = [
    {
      header: "Candidate",
      key: "name",
      render: (c) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className={styles.avatar}>{c.name.charAt(0)}</div>
          <div>
            <Link 
              to={`/candidates/${c.id}`} 
              style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
              className="hover-glow"
            >
              {c.name}
            </Link>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {c.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Position",
      key: "position",
      render: (c) => <span style={{ fontWeight: 500 }}>{c.position}</span>,
    },
    {
      header: "Phone",
      key: "phone",
      render: (c) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          {c.phone || "—"}
        </span>
      ),
    },
    {
      header: "Interviews",
      key: "interviews",
      render: (c) => (
        <span className={styles.interviewCount}>
          <CustomIcon name="CalendarCheck" size={14} />
          {c._count?.interviews || 0}
        </span>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (c) => (
        <CustomBadge variant={statusBadgeVariant(c.status)}>
          {c.status}
        </CustomBadge>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (c) => (
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => navigate(`/candidates/${c.id}`)}
            style={{ background: "transparent", color: "var(--text-muted)" }}
            title="View Details"
          >
            <CustomIcon name="Eye" size={18} />
          </button>
          {c.resumeUrl && (
            <button
              onClick={() => window.open(c.resumeUrl, "_blank")}
              style={{ background: "transparent", color: "var(--accent-primary)" }}
              title="View Resume"
            >
              <CustomIcon name="FileText" size={18} />
            </button>
          )}
          <button
            onClick={() => {
              setCurrentEditingId(c.id);
              setIsModalOpen(true);
            }}
            style={{ background: "transparent", color: "var(--text-muted)" }}
            title="Edit Candidate"
          >
            <CustomIcon name="Edit2" size={18} />
          </button>
          <button
            onClick={() => handleDelete(c.id)}
            style={{ background: "transparent", color: "var(--accent-danger)" }}
            title="Delete Candidate"
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
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Candidates</h1>
          <p style={{ color: "var(--text-muted)" }}>
            Manage interview candidates and their profiles
          </p>
        </div>
        <CustomButton
          variant="gradient"
          icon={<CustomIcon name="Plus" size={20} />}
          onClick={() => {
            setCurrentEditingId(null);
            setIsModalOpen(true);
          }}
        >
          Add Candidate
        </CustomButton>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <CustomInput
          placeholder="Search candidates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          icon={<CustomIcon name="Search" size={18} />}
          containerStyle={{ flex: 1 }}
        />
        <CustomSelect
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          placeholder="All Statuses"
          options={[
            { value: "all", label: "All Statuses" },
            { value: CandidateStatus.ACTIVE, label: "Active" },
            { value: CandidateStatus.HIRED, label: "Hired" },
            { value: CandidateStatus.REJECTED, label: "Rejected" },
            { value: CandidateStatus.ON_HOLD, label: "On Hold" },
          ]}
          style={{ width: 200 }}
        />
      </div>

      <CustomTable
        columns={columns}
        data={candidates}
        loading={loading}
        loadingMessage="Loading candidates..."
        emptyMessage="No candidates found"
      />

      <CandidateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        candidate={candidates.find((c) => c.id === currentEditingId)}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
};

export default CandidateList;

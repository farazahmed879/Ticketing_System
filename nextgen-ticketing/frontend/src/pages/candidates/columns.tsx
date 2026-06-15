import type { TableColumn } from "../../components/types";
import type { Candidate } from "../../types";
import type { NavigateFunction } from "react-router-dom";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import { Link } from "react-router-dom";
import { CandidateStatus } from "../../utils/constants";
import styles from "./CandidateList.module.css";

export const statusBadgeVariant = (status: string) => {
  switch (status) {
    case CandidateStatus.ACTIVE:
      return "info" as const;
    case CandidateStatus.HIRED:
      return "success" as const;
    case CandidateStatus.REJECTED:
      return "danger" as const;
    case CandidateStatus.ON_HOLD:
      return "warning" as const;
    default:
      return "neutral" as const;
  }
};

export const getCandidateColumns = (
  handleConvertClick: (id: string) => void,
  setCurrentEditingId: (id: string) => void,
  setIsModalOpen: (isOpen: boolean) => void,
  handleDelete: (id: string) => void,
  isAiMode: boolean,
): TableColumn<Candidate>[] => {
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
              style={{
                fontWeight: 600,
                color: "var(--text-primary)",
                textDecoration: "none",
              }}
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
      header: "Resume",
      key: "resumeUrl",
      render: (c) =>
        c.resumeUrl ? (
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              window.open(c.resumeUrl, "_blank");
            }}
            icon={<CustomIcon name="FileText" size={18} />}
            style={{ color: "var(--accent-primary)" }}
            title="View Resume"
          />
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            No Resume
          </span>
        ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (c) => (
        <div style={{ display: "flex", gap: 0 }}>
          {!c.isConverted && (
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleConvertClick(c.id);
              }}
              icon={<CustomIcon name="UserPlus" size={18} />}
              style={{ color: "var(--accent-success)" }}
              title="Convert to User"
            />
          )}
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentEditingId(c.id);
              setIsModalOpen(true);
            }}
            icon={<CustomIcon name="Edit2" size={18} />}
            title="Edit Candidate"
          />
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(c.id);
            }}
            icon={<CustomIcon name="Trash2" size={18} />}
            style={{ color: "var(--accent-danger)" }}
            title="Delete Candidate"
          />
        </div>
      ),
    },
  ];

  if (isAiMode) {
    columns.splice(3, 0, {
      header: "Match Score",
      key: "matchScore",
      render: (c: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: "100%",
              height: 6,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${c.matchScore || 0}%`,
                height: "100%",
                background: "var(--accent-primary)",
              }}
            />
          </div>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
            {c.matchScore || 0}%
          </span>
        </div>
      ),
    });
  }

  return columns;
};

export interface LeaderboardEntry {
  id: string;
  name: string;
  position: string;
  status: string;
  averageRating: number;
  interviewCount: number;
  feedbackCount: number;
  topRecommendation: string;
  lastInterviewDate: string | null;
}

const getRankBadge = (index: number) => {
  switch (index) {
    case 0:
      return (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #FFD700, #FFA500)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000",
            fontWeight: 800,
            boxShadow: "0 0 15px rgba(255, 215, 0, 0.4)",
          }}
        >
          1
        </div>
      );
    case 1:
      return (
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #C0C0C0, #808080)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          2
        </div>
      );
    case 2:
      return (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #CD7F32, #8B4513)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          3
        </div>
      );
    default:
      return (
        <span
          style={{
            color: "var(--text-muted)",
            fontWeight: 600,
            marginLeft: 10,
          }}
        >
          {index + 1}
        </span>
      );
  }
};

const getRecommendationColor = (rec: string) => {
  switch (rec) {
    case "Strong Hire":
      return "var(--accent-success)";
    case "Hire":
      return "#10b981";
    case "Neutral":
      return "var(--text-muted)";
    case "No Hire":
      return "var(--accent-danger)";
    case "Strong No Hire":
      return "#ef4444";
    default:
      return "var(--text-muted)";
  }
};

export const getLeaderboardColumns = (
  navigate: NavigateFunction,
): TableColumn<LeaderboardEntry>[] => [
  {
    header: "Rank",
    key: "rank",
    render: (_, index) => getRankBadge(index!),
    width: "80px",
  },
  {
    header: "Candidate",
    key: "name",
    render: (item) => (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "var(--bg-input)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            fontWeight: 600,
            border: "1px solid var(--border-glass)",
          }}
        >
          {item.name.charAt(0)}
        </div>
        <div>
          <div
            onClick={() => navigate(`/candidates/${item.id}`)}
            style={{ fontWeight: 600, cursor: "pointer" }}
            className="hover-glow"
          >
            {item.name}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {item.position}
          </div>
        </div>
      </div>
    ),
  },
  {
    header: "Avg. Rating",
    key: "averageRating",
    render: (item) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "3px solid var(--border-glass)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderColor:
              item.averageRating >= 4
                ? "var(--accent-success)"
                : item.averageRating >= 3
                  ? "var(--accent-primary)"
                  : "var(--border-glass)",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>
            {item.averageRating}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 2 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <CustomIcon
                key={star}
                name="Star"
                size={12}
                color={
                  star <= Math.round(item.averageRating)
                    ? "#FFD700"
                    : "rgba(255,255,255,0.1)"
                }
                style={{
                  fill:
                    star <= Math.round(item.averageRating)
                      ? "#FFD700"
                      : "transparent",
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            from {item.feedbackCount} reviews
          </span>
        </div>
      </div>
    ),
  },
  {
    header: "Interviews",
    key: "interviewCount",
    render: (item) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CustomIcon name="Calendar" size={14} color="var(--accent-primary)" />
          <span style={{ fontWeight: 600 }}>
            {item.interviewCount} Sessions
          </span>
        </div>
        {item.lastInterviewDate && (
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Last: {new Date(item.lastInterviewDate).toLocaleDateString()}
          </span>
        )}
      </div>
    ),
  },
  {
    header: "Top Recommendation",
    key: "topRecommendation",
    render: (item) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: getRecommendationColor(item.topRecommendation),
          }}
        />
        <span
          style={{
            fontWeight: 500,
            color: getRecommendationColor(item.topRecommendation),
          }}
        >
          {item.topRecommendation}
        </span>
      </div>
    ),
  },
  {
    header: "Current Status",
    key: "status",
    render: (item) => (
      <CustomBadge
        variant={
          item.status === CandidateStatus.HIRED
            ? "success"
            : item.status === CandidateStatus.REJECTED
              ? "danger"
              : "primary"
        }
      >
        {item.status}
      </CustomBadge>
    ),
  },
];

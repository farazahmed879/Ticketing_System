import type { TableColumn } from "../../components/types";
import type { Candidate } from "../../types";
import type { NavigateFunction } from "react-router-dom";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import CustomTooltip from "../../components/CustomTooltip";
import { Link } from "react-router-dom";
import { CandidateStatus } from "../../utils/constants";
import { formatDate } from "../../utils/helpers";
import styles from "./CandidateList.module.css";
import CustomImage from "../../components/CustomImage";

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
        <div className="flex-row-12">
          <div className={styles.avatar}>{c.name.charAt(0)}</div>
          <div>
            <Link
              to={`/candidates/${c.id}`}
              style={{ color: "var(--text-primary)", textDecoration: "none" }}
              className="hover-glow font-semibold"
            >
              {c.name}
            </Link>
            <div className="text-xs-muted">{c.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Position",
      key: "position",
      render: (c) => <span className="font-medium">{c.position}</span>,
    },
    {
      header: "Phone",
      key: "phone",
      render: (c) => (
        <span className="text-base-sm text-secondary">{c.phone || "—"}</span>
      ),
    },
    {
      header: "Notes",
      key: "notes",
      render: (c) =>
        c.notes ? (
          <div className={styles.notesContainer}>
            <span className={styles.notesText}>{c.notes}</span>
            <div className={styles.notesTooltip}>{c.notes}</div>
          </div>
        ) : (
          <span className="text-sm-secondary">—</span>
        ),
    },
    {
      header: "Location",
      key: "location",
      render: (c) => (
        <span className="text-base-sm text-secondary">
          {c.city
            ? c.nationality
              ? `${c.city}, ${c.nationality}`
              : c.city
            : c.nationality || c.address || "—"}
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
      header: "Created By",
      key: "addedBy",
      render: (c) => (
        <div className={styles.creatorCell}>
          {c.createdBy?.image ? (
            <CustomImage
              src={c.createdBy.image}
              alt={c.createdBy.fullname}
              className={styles.creatorImg}
            />
          ) : c.createdBy ? (
            <div className={styles.creatorAvatar}>
              {c.createdBy.fullname.charAt(0)}
            </div>
          ) : (
            <div className={styles.creatorPlaceholder}>—</div>
          )}
          <div className="flex-col">
            <span
              className="font-medium text-sm"
              style={{
                color: c.createdBy
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {c.createdBy?.fullname || "System"}
            </span>
            <span className="text-xs-muted" style={{ whiteSpace: "nowrap" }}>
              {formatDate(c.createdAt)}
            </span>
          </div>
        </div>
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
          <CustomTooltip text="View Resume">
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(c.resumeUrl, "_blank");
              }}
              icon={<CustomIcon name="FileText" size={18} />}
              style={{ color: "var(--accent-primary)" }}
            />
          </CustomTooltip>
        ) : (
          <span className="text-xs-muted">No Resume</span>
        ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (c) => (
        <div className={styles.actions}>
          {!c.isConverted && (
            <CustomTooltip text="Convert to User">
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConvertClick(c.id);
                }}
                icon={<CustomIcon name="UserPlus" size={18} />}
                style={{ color: "var(--accent-success)" }}
              />
            </CustomTooltip>
          )}
          <CustomTooltip text="Edit">
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentEditingId(c.id);
                setIsModalOpen(true);
              }}
              icon={<CustomIcon name="Edit2" size={18} />}
            />
          </CustomTooltip>
          <CustomTooltip text="Delete">
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(c.id);
              }}
              icon={<CustomIcon name="Trash2" size={18} />}
              style={{ color: "var(--accent-danger)" }}
            />
          </CustomTooltip>
        </div>
      ),
    },
  ];

  if (isAiMode) {
    columns.splice(3, 0, {
      header: "Match Score",
      key: "matchScore",
      render: (c: any) => (
        <div className="flex-row">
          <div className={styles.matchScoreBg}>
            <div
              className={styles.matchScoreBar}
              style={{ width: `${c.matchScore || 0}%` }}
            />
          </div>
          <span className="text-sm font-semibold">{c.matchScore || 0}%</span>
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
      return <div className={styles.rankBadge1}>1</div>;
    case 1:
      return <div className={styles.rankBadge2}>2</div>;
    case 2:
      return <div className={styles.rankBadge3}>3</div>;
    default:
      return <span className={styles.rankBadgeOther}>{index + 1}</span>;
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
      <div className="flex-row-12">
        <div className={styles.leaderboardAvatar}>{item.name.charAt(0)}</div>
        <div>
          <div
            onClick={() => navigate(`/candidates/${item.id}`)}
            style={{ cursor: "pointer" }}
            className="font-semibold hover-glow"
          >
            {item.name}
          </div>
          <div className="text-xs-muted">{item.position}</div>
        </div>
      </div>
    ),
  },
  {
    header: "Avg. Rating",
    key: "averageRating",
    render: (item) => (
      <div className="flex-row">
        <div
          className={styles.ratingCircle}
          style={{
            borderColor:
              item.averageRating >= 4
                ? "var(--accent-success)"
                : item.averageRating >= 3
                  ? "var(--accent-primary)"
                  : "var(--border-glass)",
          }}
        >
          <span className="font-semibold text-base">{item.averageRating}</span>
        </div>
        <div className="flex-col">
          <div className="flex-row-4">
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
          <span className="text-xs-muted">
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
      <div className="flex-col">
        <div className="flex-row">
          <CustomIcon name="Calendar" size={14} color="var(--accent-primary)" />
          <span className="font-semibold">{item.interviewCount} Sessions</span>
        </div>
        {item.lastInterviewDate && (
          <span className="text-xs-muted">
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
      <div className="flex-row">
        <div
          className="status-dot"
          style={{
            backgroundColor: getRecommendationColor(item.topRecommendation),
          }}
        />
        <span
          className="font-medium"
          style={{
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

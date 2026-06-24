import type { TableColumn } from "../../components/types";
import type { Interview } from "../../types";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import CustomAvatarStack from "../../components/CustomAvatarStack";
import CustomTooltip from "../../components/CustomTooltip";
import { InterviewStatus } from "../../utils/constants";
import styles from "./InterviewList.module.css";

export const statusBadgeVariant = (status: string) => {
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

export const getInterviewColumns = (
  canUpdateInterviews: boolean,
  canDeleteInterviews: boolean,
  setEditingInterview: (interview: Interview) => void,
  setIsModalOpen: (isOpen: boolean) => void,
  handleDelete: (id: string) => void,
): TableColumn<Interview>[] => [
  {
    header: "Candidate",
    key: "candidate",
    render: (i) => (
      <div className={styles.candidateInfo}>
        <div className={styles.candidateAvatar}>
          {i.candidate.name.charAt(0)}
        </div>
        <div>
          <div className="font-semibold">{i.candidate.name}</div>
          <div className="text-xs-muted">{i.candidate.position}</div>
        </div>
      </div>
    ),
  },
  {
    header: "Interview",
    key: "title",
    render: (i) => <span className="font-medium">{i.title}</span>,
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
      <span className="text-sm-muted">
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
      <div className={styles.actions}>
        {canUpdateInterviews && (
          <CustomTooltip text="Edit">
            <CustomButton
              variant="ghost"
              size="sm"
              icon={<CustomIcon name="Edit2" size={17} />}
              onClick={(e) => {
                e.stopPropagation();
                setEditingInterview(i);
                setIsModalOpen(true);
              }}
            />
          </CustomTooltip>
        )}

        {canDeleteInterviews && (
          <CustomTooltip text="Delete">
            <CustomButton
              variant="ghost"
              size="sm"
              icon={<CustomIcon name="Trash2" size={17} />}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(i.id);
              }}
              style={{ color: "var(--accent-danger)" }}
            />
          </CustomTooltip>
        )}
      </div>
    ),
  },
];

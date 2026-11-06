import type React from "react";
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

export const formatInterviewDate = formatDate;
export const formatInterviewTime = formatTime;

/** "Actions" column cell — reused on the grid card so both views share the
 *  same buttons, handlers and permission gating. */
export const InterviewActions = ({
  interview: i,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  iconSize = 17,
  buttonStyle,
}: {
  interview: Interview;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (interview: Interview) => void;
  onDelete: (id: string) => void;
  iconSize?: number;
  buttonStyle?: React.CSSProperties;
}) => (
  <div className={styles.actions}>
    {canUpdate && (
      <CustomTooltip text="Edit">
        <CustomButton
          variant="ghost"
          size="sm"
          icon={<CustomIcon name="Edit2" size={iconSize} />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(i);
          }}
          style={buttonStyle}
        />
      </CustomTooltip>
    )}

    {canDelete && (
      <CustomTooltip text="Delete">
        <CustomButton
          variant="ghost"
          size="sm"
          icon={<CustomIcon name="Trash2" size={iconSize} />}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(i.id);
          }}
          style={{ ...buttonStyle, color: "var(--accent-danger)" }}
        />
      </CustomTooltip>
    )}
  </div>
);

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
      <InterviewActions
        interview={i}
        canUpdate={canUpdateInterviews}
        canDelete={canDeleteInterviews}
        onEdit={(iv) => {
          setEditingInterview(iv);
          setIsModalOpen(true);
        }}
        onDelete={handleDelete}
      />
    ),
  },
];

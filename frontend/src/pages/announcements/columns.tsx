import type { TableColumn } from "../../components/types";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import CustomTooltip from "../../components/CustomTooltip";
import { format } from "date-fns";
import { AnnouncementType } from "../../utils/constants";
import styles from "./columns.module.css";

export interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  isProjectTeamOnly?: boolean;
  author: {
    fullname: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

export const getAnnouncementColumns = (
  entityName: string,
  handleEdit: (ann: Announcement) => void,
  handleDelete: (id: string) => void,
): TableColumn<Announcement>[] => [
  {
    header: "Title",
    key: "title",
    render: (ann) => <div className="font-semibold">{ann.title}</div>,
  },
  {
    header: "Type",
    key: "type",
    render: (ann) => {
      let variant:
        | "info"
        | "warning"
        | "success"
        | "danger"
        | "neutral"
        | "primary" = "neutral";
      if (ann.type === AnnouncementType.EVENT) variant = "info";
      else if (ann.type === AnnouncementType.IMPORTANT) variant = "danger";
      else if (ann.type === AnnouncementType.REVIEW) variant = "success";
      else if (ann.type === AnnouncementType.INFO) variant = "warning";
      else if (ann.type === AnnouncementType.MOMENT) variant = "primary";

      return (
        <div className={styles.typeBadge}>
          <CustomBadge variant={variant}>{ann.type.toUpperCase()}</CustomBadge>
          {ann.project && (
            <span className={styles.projectText}>
              Project: {ann.project.name}
              {ann.isProjectTeamOnly && " (Project Team Only)"}
            </span>
          )}
        </div>
      );
    },
  },
  {
    header: "Scheduled Date",
    key: "date",
    render: (ann) => format(new Date(ann.date), "MMM dd, yyyy"),
  },
  {
    header: "Author",
    key: "author",
    render: (ann) => (
      <div className={styles.authorCell}>
        <span className="font-semibold text-sm">
          {ann.author.fullname}
        </span>
        <span className="text-xs-muted">
          {(ann.author as any).title || (ann.author as any).role?.name}
        </span>
      </div>
    ),
  },
  {
    header: "Actions",
    key: "actions",
    render: (ann) => (
      <div className={styles.actions}>
        <CustomTooltip text={`Edit ${entityName}`}>
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(ann)}
            icon={<CustomIcon name="Edit2" size={16} />}
          />
        </CustomTooltip>
        <CustomTooltip text={`Delete ${entityName}`}>
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(ann.id)}
            icon={
              <CustomIcon name="Trash2" size={16} color="var(--accent-danger)" />
            }
          />
        </CustomTooltip>
      </div>
    ),
  },
];

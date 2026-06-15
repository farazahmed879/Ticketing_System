import React from "react";
import type { TableColumn } from "../../components/types";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import { format } from "date-fns";
import { AnnouncementType } from "../../utils/constants";

export interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
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
    render: (ann) => <div style={{ fontWeight: 600 }}>{ann.title}</div>,
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
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <CustomBadge variant={variant}>{ann.type.toUpperCase()}</CustomBadge>
          {ann.project && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
              Project: {ann.project.name}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
          {ann.author.fullname}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {(ann.author as any).title || (ann.author as any).role?.name}
        </span>
      </div>
    ),
  },
  {
    header: "Actions",
    key: "actions",
    render: (ann) => (
      <div style={{ display: "flex", gap: 8 }}>
        <CustomButton
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(ann)}
          icon={<CustomIcon name="Edit2" size={16} />}
          title={`Edit ${entityName}`}
        />
        <CustomButton
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(ann.id)}
          icon={
            <CustomIcon
              name="Trash2"
              size={16}
              color="var(--accent-danger)"
            />
          }
          title={`Delete ${entityName}`}
        />
      </div>
    ),
  },
];

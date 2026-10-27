import React from "react";
import type { Project } from "../../../types";
import CustomBadge from "../../../components/CustomBadge";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import CustomTooltip from "../../../components/CustomTooltip";
import Highlight from "../../../components/Highlight";
import { statusBadgeVariant } from "../columns";

interface ProjectCardProps {
  project: Project;
  search: string;
  canUpdate: boolean;
  canDelete: boolean;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project: p,
  search,
  canUpdate,
  canDelete,
  onOpen,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className="glass-card"
      onClick={() => onOpen(p)}
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: "pointer",
        transition: "var(--transition-fast)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          className="glass-card"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            background: "rgba(16, 185, 129, 0.1)",
          }}
        >
          <CustomIcon
            name="FolderKanban"
            size={18}
            color="var(--accent-success)"
          />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.95rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <Highlight text={p.name} query={search} />
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {p.description ? (
              <Highlight text={p.description} query={search} />
            ) : (
              "Company project"
            )}
          </div>
        </div>
        <CustomBadge variant={statusBadgeVariant(p.status) as any}>
          {p.status}
        </CustomBadge>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: "0.78rem",
          color: "var(--text-muted)",
        }}
      >
        {p.manager && (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CustomIcon name="User" size={12} color="var(--text-muted)" />
            Manager: {p.manager.fullname}
          </span>
        )}
        {p.teams && p.teams.length > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CustomIcon name="Users" size={12} color="var(--text-muted)" />
            {p.teams.map((t) => t.name).join(", ")}
          </span>
        )}
        <div className="flex-wrap-4" style={{ marginTop: 2 }}>
          {p.clients?.length ? (
            p.clients.map((c) => (
              <span key={c.id} className="chip">
                {c.fullname}
              </span>
            ))
          ) : (
            <span className="text-xs-muted">No clients assigned</span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 10,
          borderTop: "1px solid var(--border-glass)",
        }}
      >
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Created by {p.createdBy ? p.createdBy.fullname : "System"}
        </span>
        {(canUpdate || canDelete) && (
          <div
            style={{ display: "flex", gap: 4 }}
            onClick={(e) => e.stopPropagation()}
          >
            {canUpdate && (
              <CustomTooltip text="Edit">
                <CustomButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(p)}
                  icon={<CustomIcon name="Edit2" size={16} />}
                />
              </CustomTooltip>
            )}
            {canDelete && (
              <CustomTooltip text="Delete">
                <CustomButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(p.id)}
                  icon={<CustomIcon name="Trash2" size={16} />}
                  style={{ color: "var(--accent-danger)" }}
                />
              </CustomTooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;

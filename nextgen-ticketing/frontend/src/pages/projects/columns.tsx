import React from "react";
import type { TableColumn } from "../../components/types";
import type { Project } from "../../types";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import Highlight from "../../components/Highlight";
import { ProjectStatus } from "../../utils/constants";

export const statusBadgeVariant = (status: string) => {
  switch (status) {
    case ProjectStatus.ACTIVE:
      return "success";
    case ProjectStatus.COMPLETED:
      return "info";
    case ProjectStatus.ON_HOLD:
      return "warning";
    case ProjectStatus.CANCELLED:
      return "danger";
    default:
      return "neutral";
  }
};

export const getProjectColumns = (
  search: string,
  canUpdate: boolean,
  canDelete: boolean,
  handleEdit: (project: Project) => void,
  handleDeleteClick: (id: string) => void,
): TableColumn<Project>[] => {
  const cols: TableColumn<Project>[] = [
    {
      header: "Project",
      key: "name",
      render: (p) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            className="glass-card"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(16, 185, 129, 0.1)",
            }}
          >
            <CustomIcon
              name="FolderKanban"
              size={18}
              color="var(--accent-success)"
            />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>
              <Highlight text={p.name} query={search} />
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <span>
                {p.description ? (
                  <Highlight text={p.description} query={search} />
                ) : (
                  "Company project"
                )}
              </span>
              {p.manager && (
                <>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <CustomIcon
                      name="User"
                      size={12}
                      color="var(--text-muted)"
                    />
                    Manager: {p.manager.fullname}
                  </span>
                </>
              )}
              {p.teams && p.teams.length > 0 && (
                <>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <CustomIcon
                      name="Users"
                      size={12}
                      color="var(--text-muted)"
                    />
                    {p.teams.map((t) => t.name).join(", ")}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },

    {
      header: "Clients",
      key: "clients",
      render: (p) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {p.clients?.length ? (
            p.clients.map((c) => (
              <span
                key={c.id}
                style={{
                  fontSize: "0.75rem",
                  background: "rgba(255,255,255,0.05)",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                {c.fullname}
              </span>
            ))
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              No clients assigned
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (p) => (
        <CustomBadge variant={statusBadgeVariant(p.status) as any}>
          {p.status}
        </CustomBadge>
      ),
    },
  ];

  if (canUpdate || canDelete) {
    cols.push({
      header: "Actions",
      key: "actions",
      render: (p) => (
        <div style={{ display: "flex", gap: 8 }}>
          {canUpdate && (
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleEdit(p);
              }}
              icon={<CustomIcon name="Edit2" size={16} />}
            />
          )}
          {canDelete && (
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleDeleteClick(p.id);
              }}
              icon={<CustomIcon name="Trash2" size={16} />}
              style={{ color: "var(--accent-danger)" }}
            />
          )}
        </div>
      ),
    });
  }

  return cols;
};

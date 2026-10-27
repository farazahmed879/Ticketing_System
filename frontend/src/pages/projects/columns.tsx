import React from "react";
import type { TableColumn } from "../../components/types";
import type { Project } from "../../types";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import Highlight from "../../components/Highlight";
import CustomTooltip from "../../components/CustomTooltip";
import { ProjectStatus } from "../../utils/constants";
import styles from "./columns.module.css";

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
        <div className="flex-row-12">
          <div className={`glass-card icon-box ${styles.iconBox}`}>
            <CustomIcon
              name="FolderKanban"
              size={18}
              color="var(--accent-success)"
            />
          </div>
          <div>
            <div className="font-semibold">
              <Highlight text={p.name} query={search} />
            </div>
            <div className={styles.projectMeta}>
              <span>
                {p.description ? (
                  <Highlight text={p.description} query={search} />
                ) : (
                  "Company project"
                )}
              </span>
              {p.manager && (
                <>
                  <span className="separator-dot">•</span>
                  <span className={styles.metaItem}>
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
                  <span className="separator-dot">•</span>
                  <span className={styles.metaItem}>
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
        <div className="flex-wrap-4">
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
    {
      header: "Created By",
      key: "createdBy",
      render: (p) => (
        <span className="text-sm">
          {p.createdBy ? p.createdBy.fullname : "System"}
        </span>
      ),
    },
  ];

  if (canUpdate || canDelete) {
    cols.push({
      header: "Actions",
      key: "actions",
      render: (p) => (
        <div className={styles.actions}>
          {canUpdate && (
            <CustomTooltip text="Edit">
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleEdit(p);
                }}
                icon={<CustomIcon name="Edit2" size={16} />}
              />
            </CustomTooltip>
          )}
          {canDelete && (
            <CustomTooltip text="Delete">
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
            </CustomTooltip>
          )}
        </div>
      ),
    });
  }

  return cols;
};

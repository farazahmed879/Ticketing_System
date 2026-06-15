import React from "react";
import type { TableColumn } from "../../components/types";
import type { Team } from "../../types";
import CustomIcon from "../../components/CustomIcon";
import CustomButton from "../../components/CustomButton";
import Highlight from "../../components/Highlight";
import CustomAvatarStack from "../../components/CustomAvatarStack";

export const getTeamColumns = (
  search: string,
  canManageTeams: boolean,
  handleEdit: (t: Team) => void,
  handleDelete: (id: string) => void,
): TableColumn<Team>[] => [
  {
    header: "Team Name",
    key: "name",
    render: (t) => (
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
            background: "rgba(59, 130, 246, 0.1)",
          }}
        >
          <CustomIcon
            name="Users"
            size={18}
            color="var(--accent-secondary)"
          />
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>
            <Highlight text={t.name} query={search} />
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {t.description ? (
              <Highlight text={t.description} query={search} />
            ) : (
              "Internal team"
            )}
          </div>
        </div>
      </div>
    ),
  },
  {
    header: "Team Lead",
    key: "teamLead",
    render: (t) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {t.teamLead ? (
          <>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--bg-input)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 600,
              }}
            >
              {t.teamLead.image ? (
                <img
                  src={t.teamLead.image}
                  alt={t.teamLead.fullname}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                  }}
                />
              ) : (
                <CustomAvatarStack
                  items={[
                    {
                      id: t.teamLead.id,
                      name: t.teamLead.fullname?.charAt(0),
                    },
                  ]}
                  limit={3}
                  size={26}
                />
              )}
            </div>
            <span style={{ fontSize: "0.85rem" }}>{t.teamLead.fullname}</span>
          </>
        ) : (
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            No Team Lead
          </span>
        )}
      </div>
    ),
  },
  {
    header: "Members",
    key: "members",
    render: (t) => (
      <CustomAvatarStack
        items={
          t.members?.map((m) => ({
            id: m.id,
            name: m.fullname,
            image: m.image,
          })) || []
        }
        limit={3}
        size={26}
      />
    ),
  },
  {
    header: "Projects",
    key: "projects",
    render: (t) => (
      <span style={{ fontSize: "0.9rem" }}>
        {t.projects?.length || 0} Assigned
      </span>
    ),
  },
  ...(canManageTeams
    ? [
        {
          header: "Actions",
          key: "actions" as keyof Team,
          render: (t: Team) => (
            <div style={{ display: "flex", gap: 8 }}>
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(t);
                }}
                icon={<CustomIcon name="Edit2" size={16} />}
              />
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(t.id);
                }}
                icon={<CustomIcon name="Trash2" size={16} />}
                style={{ color: "var(--accent-danger)" }}
              />
            </div>
          ),
        },
      ]
    : []),
];

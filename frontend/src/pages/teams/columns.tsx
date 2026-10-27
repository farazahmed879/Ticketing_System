import type { TableColumn } from "../../components/types";
import type { Team } from "../../types";
import CustomIcon from "../../components/CustomIcon";
import CustomButton from "../../components/CustomButton";
import Highlight from "../../components/Highlight";
import CustomAvatarStack from "../../components/CustomAvatarStack";
import CustomTooltip from "../../components/CustomTooltip";
import styles from "./columns.module.css";
import CustomImage from "../../components/CustomImage";

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
      <div className="flex-row-12">
        <div className={`glass-card icon-box ${styles.iconBox}`}>
          <CustomIcon name="Users" size={18} color="var(--accent-secondary)" />
        </div>
        <div>
          <div className="font-semibold">
            <Highlight text={t.name} query={search} />
          </div>
          <div className="text-xs-muted">
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
      <div className={styles.leadCell}>
        {t.teamLead ? (
          <>
            <div className={styles.leadAvatar}>
              {t.teamLead.image ? (
                <CustomImage src={t.teamLead.image} alt={t.teamLead.fullname} />
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
            <span className="text-sm">{t.teamLead.fullname}</span>
          </>
        ) : (
          <span className="text-sm-muted">No Team Lead</span>
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
      <span className="text-base-sm">
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
            <div className={styles.actions}>
              <CustomTooltip text="Edit">
                <CustomButton
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(t);
                  }}
                  icon={<CustomIcon name="Edit2" size={16} />}
                />
              </CustomTooltip>
              <CustomTooltip text="Delete">
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
              </CustomTooltip>
            </div>
          ),
        },
      ]
    : []),
];

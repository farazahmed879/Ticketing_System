import type { TableColumn } from "../../components/types";
import { canDeleteRecords } from "../../utils/deleteAccess";
import type { Team } from "../../types";
import CustomIcon from "../../components/CustomIcon";
import CustomButton from "../../components/CustomButton";
import Highlight from "../../components/Highlight";
import CustomAvatarStack from "../../components/CustomAvatarStack";
import CustomTooltip from "../../components/CustomTooltip";
import { getTaskDescriptionPlainText } from "../timesheet/components/TaskDescriptionEditor";
import styles from "./columns.module.css";
import CustomImage from "../../components/CustomImage";
import CustomBadge from "../../components/CustomBadge";

/** Team type pill; shared by the table column and the grid card. */
export const TeamTypeBadge = ({ team }: { team: Team }) => {
  if (team.teamType === "TECHNICAL")
    return <CustomBadge variant="info">Technical</CustomBadge>;
  if (team.teamType === "ORGANIZATIONAL")
    return <CustomBadge variant="warning">Organizational</CustomBadge>;
  return <span className="text-sm-muted">Not set</span>;
};

/** Technical teams have a Team Lead; organizational teams have a Manager. */
export const getLeadLabel = (team: Team) =>
  team.teamType === "ORGANIZATIONAL" ? "Manager" : "Team Lead";

/** Team lead avatar + name; shared by the table column and the grid card. */
export const TeamLeadCell = ({ team }: { team: Team }) => (
  <div className={styles.leadCell}>
    {team.teamLead ? (
      <>
        <div className={styles.leadAvatar}>
          {team.teamLead.image ? (
            <CustomImage src={team.teamLead.image} alt={team.teamLead.fullname} />
          ) : (
            <CustomAvatarStack
              items={[
                {
                  id: team.teamLead.id,
                  name: team.teamLead.fullname?.charAt(0),
                },
              ]}
              limit={3}
              size={26}
            />
          )}
        </div>
        <span className="text-sm">{team.teamLead.fullname}</span>
      </>
    ) : (
      <span className="text-sm-muted">No {getLeadLabel(team)}</span>
    )}
  </div>
);

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
              <Highlight
                text={getTaskDescriptionPlainText(t.description)}
                query={search}
              />
            ) : (
              "Internal team"
            )}
          </div>
        </div>
      </div>
    ),
  },
  {
    header: "Type",
    key: "teamType",
    render: (t) => <TeamTypeBadge team={t} />,
  },
  {
    header: "Lead / Manager",
    key: "teamLead",
    render: (t) => (
      <TeamLeadCell team={t} />
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
      <span className="text-base-sm">{t.projects?.length || 0} Assigned</span>
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
              {canDeleteRecords() && (
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
              )}
            </div>
          ),
        },
      ]
    : []),
];

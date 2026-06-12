import React from "react";
import CustomIcon from "../../../../components/CustomIcon";
import CustomSelect from "../../../../components/CustomSelect";
import CustomButton from "../../../../components/CustomButton";
import CustomDatePicker from "../../../../components/CustomDatePicker";
import styles from "../TicketDetail.module.css";
import tableStyles from "../../../dashboard/Dashboard.module.css";
import { RoleName, StatusName } from "../../../../utils/constants";
import type { TicketDetail as ITicketDetail } from "../../../../types";

interface SidebarDraft {
  statusId: string;
  priorityId: string;
  assigneeId: string;
  qaId: string;
  dueDate: string;
}

interface TicketDetailSidebarProps {
  ticket: ITicketDetail;
  user: any;
  statuses: any[];
  priorities: any[];
  agents: any[];
  qaList: any[];
  canUpdatePriority: boolean;
  canAssign: boolean;
  sidebarDraft: SidebarDraft;
  onSidebarDraftChange: (field: keyof SidebarDraft, value: string) => void;
  handleStartChat: (id: string) => void;
}

const TicketDetailSidebar: React.FC<TicketDetailSidebarProps> = ({
  ticket,
  user,
  statuses,
  priorities,
  agents,
  qaList,
  canUpdatePriority,
  canAssign,
  sidebarDraft,
  onSidebarDraftChange,
  handleStartChat,
}) => {
  const canAssignQA =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.name === RoleName.AGENT;

  return (
    <div className={styles.rightColumn}>
      <div
        className="glass-card"
        style={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div className={styles.sidebarItem}>
          <span className={styles.sidebarLabel}>Status</span>

          {user?.role?.name === RoleName.EMPLOYEE &&
          ticket.status?.name === StatusName.APPROVED ? (
            // Employees cannot change the status of an Approved ticket.
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: ticket.status.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "0.9rem" }}>{ticket.status.name}</span>
            </div>
          ) : (
            <CustomSelect
              options={statuses.map((s) => ({
                value: s.id,
                label: s.name,
                disabled: !(
                  user?.role?.name === RoleName.ADMIN ||
                  user?.role?.permissions?.boardStatuses?.[s.id] === true ||
                  (ticket.owner.id === user?.id &&
                    ((s.name.toLowerCase() === StatusName.OPEN.toLowerCase() &&
                      canAssign) ||
                      s.name.toLowerCase() === StatusName.TRASH.toLowerCase() ||
                      s.name.toLowerCase() === StatusName.FAILED.toLowerCase()))
                ),
                icon: (
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: s.color,
                    }}
                  />
                ),
              }))}
              value={sidebarDraft.statusId}
              onChange={(val) => onSidebarDraftChange("statusId", val)}
              placeholder="Change status..."
            />
          )}
        </div>

        <div className={styles.sidebarItem}>
          <span className={styles.sidebarLabel}>Priority</span>
          {canUpdatePriority ? (
            <CustomSelect
              options={priorities.map((p) => ({
                value: p.id,
                label: p.name,
                icon: (
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: p.color,
                    }}
                  />
                ),
              }))}
              value={sidebarDraft.priorityId}
              onChange={(val) => onSidebarDraftChange("priorityId", val)}
              placeholder="Priority"
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: ticket.priority.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "0.9rem" }}>{ticket.priority.name}</span>
            </div>
          )}
        </div>

        <div className={styles.sidebarItem}>
          <span className={styles.sidebarLabel}>Owner</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              className={tableStyles.avatar}
              style={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CustomIcon name="User" size={16} />
            </div>
            <span style={{ fontSize: "0.9rem" }}>{ticket.owner.fullname}</span>
            {ticket.owner.id !== user?.id && (
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={() => handleStartChat(ticket.owner.id)}
                icon={<CustomIcon name="MessageSquare" size={14} />}
                title="Chat with Owner"
                style={{
                  padding: 0,
                  minHeight: "auto",
                  color: "var(--accent-primary)",
                }}
              />
            )}
          </div>
        </div>

        <div className={styles.sidebarItem}>
          <span className={styles.sidebarLabel}>Assignee</span>
          {canAssign ? (
            <CustomSelect
              options={[
                {
                  value: "",
                  label: "Unassigned",
                  icon: <CustomIcon name="UserPlus" size={16} />,
                },
                ...agents.map((agent) => ({
                  value: agent.id,
                  label: agent.fullname,
                  image: agent.image,
                })),
              ]}
              value={sidebarDraft.assigneeId}
              onChange={(val) => onSidebarDraftChange("assigneeId", val)}
              placeholder="Assign ticket..."
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                className={tableStyles.avatar}
                style={{
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {ticket?.assignee?.image ? (
                  <img
                    src={ticket?.assignee?.image}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  <CustomIcon name="UserPlus" size={16} />
                )}
              </div>
              <span style={{ fontSize: "0.9rem" }}>
                {ticket?.assignee?.fullname || "Unassigned"}
              </span>
              {ticket?.assignee && ticket?.assignee?.id !== user?.id && (
                <CustomButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartChat(ticket.assignee!.id)}
                  icon={<CustomIcon name="MessageSquare" size={14} />}
                  title="Chat with Assignee"
                  style={{
                    padding: 0,
                    minHeight: "auto",
                    color: "var(--accent-secondary)",
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* QA Assignee — hidden from clients */}
        {user?.role?.name !== RoleName.CUSTOMER && (
        <div className={styles.sidebarItem}>
          <span className={styles.sidebarLabel}>QA Assignee</span>
          {canAssignQA ? (
            <CustomSelect
              options={[
                {
                  value: "",
                  label: "Unassigned",
                  icon: <CustomIcon name="UserPlus" size={16} />,
                },
                ...qaList.map((qaUser) => ({
                  value: qaUser.id,
                  label: qaUser.fullname,
                  image: qaUser.image,
                })),
              ]}
              value={sidebarDraft.qaId}
              onChange={(val) => onSidebarDraftChange("qaId", val)}
              placeholder="Assign QA..."
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                className={tableStyles.avatar}
                style={{
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {ticket?.qa?.image ? (
                  <img
                    src={ticket?.qa?.image}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  <CustomIcon name="UserPlus" size={16} />
                )}
              </div>
              <span style={{ fontSize: "0.9rem" }}>
                {ticket?.qa?.fullname || "Unassigned"}
              </span>
              {ticket?.qa && ticket?.qa?.id !== user?.id && (
                <CustomButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartChat(ticket.qa!.id)}
                  icon={<CustomIcon name="MessageSquare" size={14} />}
                  title="Chat with QA"
                  style={{
                    padding: 0,
                    minHeight: "auto",
                    color: "var(--accent-secondary)",
                  }}
                />
              )}
            </div>
          )}
        </div>
        )}

        <div className={styles.sidebarItem}>
          <span className={styles.sidebarLabel}>Details</span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
              }}
            >
              <CustomIcon name="Tag" size={16} />
              <span>Type: {ticket.type?.name || "Issue"}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
              }}
            >
              <CustomIcon name="Layers" size={16} />
              <span>Project: {ticket.project?.name || "None"}</span>
            </div>
            {user?.role?.name === RoleName.CUSTOMER || user?.role?.name === RoleName.EMPLOYEE ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                }}
              >
                <CustomIcon name="Calendar" size={16} />
                <span>
                  Due Date:{" "}
                  {ticket.dueDate
                    ? new Date(ticket.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Not set"}
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <CustomDatePicker
                  label={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <CustomIcon name="Calendar" size={16} />
                      <span>Due Date</span>
                    </div>
                  }
                  value={sidebarDraft.dueDate}
                  onChange={(val) => onSidebarDraftChange("dueDate", val)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
              }}
            >
              <CustomIcon name="Clock" size={16} />
              <span>
                Created:{" "}
                {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
              }}
            >
              <CustomIcon name="Clock" size={16} />
              <span>
                Updated:{" "}
                {new Date(ticket.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailSidebar;

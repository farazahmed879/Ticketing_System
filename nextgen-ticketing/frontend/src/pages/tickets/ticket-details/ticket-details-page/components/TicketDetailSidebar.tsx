import React from "react";
import styles from "../TicketDetail.module.css";
import CustomIcon from "../../../../../components/CustomIcon";
import CustomDatePicker from "../../../../../components/CustomDatePicker";
import { RoleName, StatusName } from "../../../../../utils/constants";
import { canEmployeeEditDueDate } from "../../../shared/ticketDecisions";
import { TicketSidebarStatusPriority } from "./TicketSidebarStatusPriority";
import { TicketSidebarAssignments } from "./TicketSidebarAssignments";
import { TicketSidebarDetails } from "./TicketSidebarDetails";
import { TicketSidebarReadOnly } from "./TicketSidebarReadOnly";
import type { TicketDetailSidebarProps } from "../../../../../types";

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
  // handleStartChat is passed but not read here
}) => {
  const canAssignQA =
    user?.role?.name === RoleName.ADMIN || user?.role?.name === RoleName.AGENT;

  // Clients get a purely read-only detail view — no status/assignee/priority/
  // date editors. They act on a ticket only via the decision banner.
  const role = user?.role?.name;
  const isClient = role === RoleName.CUSTOMER;
  const isAdmin = role === RoleName.ADMIN;
  const isManager = role === RoleName.AGENT;
  const isEmployee = role === RoleName.EMPLOYEE;

  // Per-field editability for staff. Anything not editable is rendered as a
  // one-line row inside the Details section instead of its own editor box.
  const statusEditable = !(
    isEmployee && ticket.status?.name === StatusName.APPROVED
  );
  const priorityEditable = !!canUpdatePriority;
  const assigneeEditable = !!canAssign;
  const qaEditable = canAssignQA;
  const labelsEditable =
    isAdmin || isManager || ticket.assignee?.id === user?.id;
  const dueDateEditable =
    isAdmin ||
    isManager ||
    (isEmployee && canEmployeeEditDueDate(ticket.status?.name));

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
        {isClient ? (
          <TicketSidebarReadOnly ticket={ticket} user={user} />
        ) : (
          <>
            <TicketSidebarStatusPriority
              ticket={ticket}
              user={user}
              statuses={statuses}
              priorities={priorities}
              canUpdatePriority={canUpdatePriority}
              canAssign={canAssign}
              sidebarDraft={sidebarDraft}
              onSidebarDraftChange={onSidebarDraftChange}
              statusEditable={statusEditable}
              priorityEditable={priorityEditable}
            />

            <TicketSidebarAssignments
              ticket={ticket}
              user={user}
              agents={agents}
              qaList={qaList}
              canAssign={canAssign}
              canAssignQA={canAssignQA}
              sidebarDraft={sidebarDraft}
              onSidebarDraftChange={onSidebarDraftChange}
              labelsEditable={labelsEditable}
            />

            {dueDateEditable && (
              <div className={styles.sidebarItem}>
                <CustomDatePicker
                  label={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <CustomIcon name="Calendar" size={16} />
                      <span>Due Date</span>
                    </div>
                  }
                  value={sidebarDraft.dueDate}
                  onChange={(val: string) =>
                    onSidebarDraftChange("dueDate", val)
                  }
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            )}

            <TicketSidebarDetails
              ticket={ticket}
              user={user}
              statusEditable={statusEditable}
              priorityEditable={priorityEditable}
              assigneeEditable={assigneeEditable}
              qaEditable={qaEditable}
              labelsEditable={labelsEditable}
              dueDateEditable={dueDateEditable}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default TicketDetailSidebar;

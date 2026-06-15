import React from "react";
import styles from "../TicketDetail.module.css";
import { RoleName } from "../../../../../utils/constants";
import { TicketSidebarStatusPriority } from "./TicketSidebarStatusPriority";
import { TicketSidebarAssignments } from "./TicketSidebarAssignments";
import { TicketSidebarDetails } from "./TicketSidebarDetails";
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
        <TicketSidebarStatusPriority
          ticket={ticket}
          user={user}
          statuses={statuses}
          priorities={priorities}
          canUpdatePriority={canUpdatePriority}
          canAssign={canAssign}
          sidebarDraft={sidebarDraft}
          onSidebarDraftChange={onSidebarDraftChange}
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
        />

        <TicketSidebarDetails
          ticket={ticket}
          user={user}
          sidebarDraft={sidebarDraft}
          onSidebarDraftChange={onSidebarDraftChange}
        />
      </div>
    </div>
  );
};

export default TicketDetailSidebar;

import CustomSelect from "../../../../../components/CustomSelect";
import styles from "../TicketDetail.module.css";
import { RoleName, StatusName } from "../../../../../utils/constants";
import type { TicketDetailSidebarProps } from "../../../../../types";

export const TicketSidebarStatusPriority = ({
  ticket,
  user,
  statuses,
  priorities,
  canUpdatePriority,
  canAssign,
  sidebarDraft,
  onSidebarDraftChange,
}: Pick<TicketDetailSidebarProps, "ticket" | "user" | "statuses" | "priorities" | "canUpdatePriority" | "canAssign" | "sidebarDraft" | "onSidebarDraftChange">) => {
  return (
    <>
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
            options={statuses.map((s: any) => ({
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
            onChange={(val: any) => onSidebarDraftChange("statusId", val)}
            placeholder="Change status..."
          />
        )}
      </div>

      <div className={styles.sidebarItem}>
        <span className={styles.sidebarLabel}>Priority</span>
        {canUpdatePriority ? (
          <CustomSelect
            options={priorities.map((p: any) => ({
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
            onChange={(val: any) => onSidebarDraftChange("priorityId", val)}
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
    </>
  );
};

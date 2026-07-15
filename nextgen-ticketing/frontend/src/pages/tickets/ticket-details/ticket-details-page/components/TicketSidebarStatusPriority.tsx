import CustomSelect from "../../../../../components/CustomSelect";
import styles from "../TicketDetail.module.css";
import { StatusName } from "../../../../../utils/constants";
import type { TicketDetailSidebarProps } from "../../../../../types";
import { ROLE_TYPE } from "../../../../roles/roleConstants";
import {
  statusDisplayName,
  statusOptionsForUser,
} from "../../../shared/ticketDecisions";

/**
 * Renders the Status / Priority editors — but only the ones the current user can
 * actually edit. Non-editable values are shown by TicketSidebarDetails as plain
 * one-line rows instead of a box.
 */
export const TicketSidebarStatusPriority = ({
  ticket,
  user,
  priorities,
  canAssign,
  sidebarDraft,
  onSidebarDraftChange,
  statusEditable,
  priorityEditable,
}: Pick<
  TicketDetailSidebarProps,
  | "ticket"
  | "user"
  | "statuses"
  | "priorities"
  | "canUpdatePriority"
  | "canAssign"
  | "sidebarDraft"
  | "onSidebarDraftChange"
> & { statusEditable: boolean; priorityEditable: boolean }) => {
  return (
    <>
      {statusEditable && (
        <div className={styles.sidebarItem}>
          <span className={styles.sidebarLabel}>Status</span>
          <CustomSelect
            options={statusOptionsForUser(user, ticket?.status).map((s) => ({
              value: s.id,
              label: statusDisplayName(s.name, user),
              disabled: !(
                user?.role?.roleType === ROLE_TYPE.ADMIN ||
                user?.role?.permissions?.boardStatuses?.[s.id] === true ||
                // The ticket's team lead may approve it; QA may approve too.
                ((ticket?.teamLeadIds?.includes(user?.id) ||
                  user?.role?.roleType === ROLE_TYPE.QA) &&
                  s.name === StatusName.APPROVED) ||
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
            onChange={(val: string) => onSidebarDraftChange("statusId", val)}
            placeholder="Change status..."
          />
        </div>
      )}

      {priorityEditable && (
        <div className={styles.sidebarItem}>
          <span className={styles.sidebarLabel}>Priority</span>
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
            onChange={(val: string) => onSidebarDraftChange("priorityId", val)}
            placeholder="Priority"
          />
        </div>
      )}
    </>
  );
};

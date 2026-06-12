import { RoleName, StatusName } from "../../../utils/constants";

/**
 * Shared logic for the ticket detail surfaces (modal + full page) so the same
 * behaviour doesn't have to be re-implemented in each component.
 *
 * Keep this file framework-agnostic (pure functions only) — the components own
 * their own state and submission path (the modal submits via `onTicketUpdate`,
 * the page via `executeUpdate`); this module just builds the payloads and the
 * confirmation copy they share.
 */

export type ClientDecision = "satisfied" | "unsatisfied" | "cancel";

/** The status a client decision moves the ticket to. */
export const decisionTargetStatusName = (decision: ClientDecision): string => {
  if (decision === "satisfied") return StatusName.CLOSED;
  if (decision === "unsatisfied") return StatusName.FAILED;
  return StatusName.TRASH; // cancel
};

/**
 * Build the update body for a client decision (Cancel / Satisfied /
 * Unsatisfied). Returns null when the ticket or target status is missing, so
 * callers can simply `if (!body) return;`.
 *
 * Includes `targetStatusName` + `currentStatusName` — the backend's role-based
 * transition rules key off these, so they must always be sent.
 */
export const buildClientDecisionBody = (
  decision: ClientDecision,
  ticket: any,
  statuses: any[],
): any | null => {
  if (!ticket) return null;
  const targetStatusName = decisionTargetStatusName(decision);
  const targetStatus = statuses.find((s: any) => s.name === targetStatusName);
  if (!targetStatus) return null;

  return {
    ticketId: ticket.id,
    statusId: targetStatus.id,
    targetStatusName: targetStatus.name,
    currentStatusName: ticket.status?.name || "",
    priorityId: ticket.priority?.id,
    assigneeId: ticket.assignee?.id || null,
    issue: ticket.issue,
  };
};

export interface DecisionDialog {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: "danger" | "warning" | "success";
}

/** Confirmation-dialog copy/style for a pending client decision. */
export const getDecisionDialog = (
  decision: ClientDecision | null,
): DecisionDialog => {
  switch (decision) {
    case "cancel":
      return {
        title: "Cancel Ticket",
        message:
          "Are you sure you want to cancel this ticket? This action cannot be undone.",
        confirmText: "Yes, Cancel Ticket",
        cancelText: "No, Keep It",
        type: "danger",
      };
    case "satisfied":
      return {
        title: "Mark as Satisfied",
        message:
          "Are you sure you are satisfied with the resolution? This will close the ticket.",
        confirmText: "Yes, I'm Satisfied",
        cancelText: "Cancel",
        type: "success",
      };
    case "unsatisfied":
    default:
      return {
        title: "Mark as Unsatisfied",
        message:
          "Are you sure you are unsatisfied? This will return the ticket to the team.",
        confirmText: "Yes, I'm Unsatisfied",
        cancelText: "Cancel",
        type: "warning",
      };
  }
};

/**
 * The status fields the backend's role-based transition rules require for a
 * sidebar/dropdown status change. Without these the rules are silently skipped.
 */
export const buildStatusTransitionFields = (
  currentStatusName: string,
  targetStatusId: string,
  statuses: any[],
): { currentStatusName: string; targetStatusName: string } => ({
  currentStatusName,
  targetStatusName:
    statuses.find((s: any) => s.id === targetStatusId)?.name || "",
});

/**
 * Whether the "Cancel Ticket" affordance should be shown. Cancelling is only
 * offered on an unassigned (NEW) ticket, to the client who owns it OR a manager.
 * Shared so the modal and the detail page stay in sync.
 */
export const canShowCancelBanner = (
  roleName: string | undefined,
  isOwner: boolean,
  statusName: string | undefined,
): boolean =>
  statusName === StatusName.NEW &&
  ((roleName === RoleName.CUSTOMER && isOwner) || roleName === RoleName.AGENT);

/**
 * Employees may set/change the due date only while the ticket is in the
 * "Assigned" status (i.e. assigned to an employee) — read-only otherwise.
 */
export const canEmployeeEditDueDate = (
  statusName: string | undefined,
): boolean => statusName === StatusName.OPEN;

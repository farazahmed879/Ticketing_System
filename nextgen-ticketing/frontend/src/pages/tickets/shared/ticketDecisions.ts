/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusName, UIMessages } from "../../../utils/constants";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { ROLE_TYPE } from "../../roles/roleConstants";

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
  ((roleName === ROLE_TYPE.CUSTOMER && isOwner) ||
    roleName === ROLE_TYPE.AGENT);

/**
 * Employees may set/change the due date only while the ticket is in the
 * "Assigned" status (i.e. assigned to an employee) — read-only otherwise.
 */
export const canEmployeeEditDueDate = (
  statusName: string | undefined,
): boolean => statusName === StatusName.OPEN;

/** Notification kinds (mirrors NotificationContext's NotificationType). */
type NotificationType = "success" | "error" | "info" | "warning";

/** Side-effect callbacks the status handler needs from the calling surface. */
export interface StatusChangeDeps {
  showNotification: (type: NotificationType, message: string) => void;
  setIsLoading: (loading: boolean, message: string) => void;
  /** Surface-specific success side effect (close modal, refetch board, ...). */
  onSuccess?: () => void;
}

/**
 * Reusable ticket status-update handler — shared by the board, the detail modal
 * and the detail page. Runs the client-side permission gate, submits the update
 * and reports the result. Dependencies (notifications / loading / success) are
 * injected so this stays free of any single surface's hooks.
 *
 * The backend still enforces the authoritative transition rules; this gate only
 * keeps the UX honest and avoids a doomed request.
 */
export const handleStatusChange = async (
  body: any,
  user: any,
  { showNotification, setIsLoading, onSuccess }: StatusChangeDeps,
): Promise<void> => {
  const isStatusChanging =
    !!body.targetStatusName &&
    !!body.currentStatusName &&
    body.targetStatusName !== body.currentStatusName;

  // Closed tickets are terminal — nothing to do.
  if (body.currentStatusName === StatusName.CLOSED) return;

  const teamLeadIds: string[] = body.teamLeadIds || [];
  body.isLead = teamLeadIds.includes(user?.id);
  // Admins and managers may cancel a ticket even without an explicit
  // board-status permission (managers have no Cancelled column, so the
  // Cancel action in the modal is their only path). The backend still
  // enforces the real transition rules.
  const isCancelByStaff =
    body.targetStatusName === StatusName.TRASH &&
    (user?.role?.roleType === ROLE_TYPE.ADMIN ||
      user?.role?.roleType === ROLE_TYPE.AGENT);

  // A ticket owner may take the basic actions on their own ticket (move it to
  // Open, or Close/Fail/Cancel it — i.e. the client decisions) without an
  // explicit board-status permission. Surfaces that support this pass `ownerId`
  // on the body. The backend still enforces the real transition rules.
  const isOwner = !!body.ownerId && body.ownerId === user?.id;
  const isOwnerBasicAction =
    isOwner &&
    [
      StatusName.OPEN,
      StatusName.CLOSED,
      StatusName.TRASH,
      StatusName.FAILED,
    ].includes(body.targetStatusName);

  const isStatusAllowed =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.permissions?.boardStatuses?.[body?.statusId] === true ||
    isCancelByStaff ||
    isOwnerBasicAction;

  if (isStatusChanging && !isStatusAllowed && !teamLeadIds.includes(user?.id)) {
    showNotification(
      "error",
      UIMessages.BOARD.ACCESS_DENIED(body.targetStatusName || "this status"),
    );
    return;
  }

  // A team lead acting on a team member's ticket (not their own) manages it
  // (assign → Open, review a Resolved ticket) but does not do the dev work
  // itself, so they cannot move it into In Progress or Resolved.
  if (teamLeadIds.includes(user?.id) && body.assigneeId !== user?.id) {
    if (
      [StatusName.IN_PROCESS, StatusName.RESOLVED].includes(
        body.targetStatusName,
      ) &&
      body.currentStatusName !== body.targetStatusName
    ) {
      showNotification(
        "error",
        UIMessages.BOARD.ACCESS_DENIED(body.targetStatusName || "this status"),
      );
      return;
    }
  }

  try {
    setIsLoading(true, UIMessages.LOADING.UPDATING_STATUS);
    await api.put(API_ROUTES.TICKETS.BY_ID(body.ticketId), body);
    showNotification("success", UIMessages.BOARD.UPDATE_SUCCESS);
    onSuccess?.();
  } catch (err: any) {
    console.error("Failed to update status", err);
    showNotification(
      "error",
      err.response?.data?.error || "Failed to update ticket status",
    );
  } finally {
    setIsLoading(false, "");
  }
};

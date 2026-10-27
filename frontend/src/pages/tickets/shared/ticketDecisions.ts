/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  StatusName,
  TICKET_STATUS_IDS,
  TICKET_STATUSES,
  UIMessages,
} from "../../../utils/constants";
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

/**
 * The status label the given user sees on the kanban board. Staff roles see
 * the "Resolved" column as "Done"; clients see "Resolved". Any user-facing
 * message that names a status must go through this so it always matches the
 * column heading for that user's role.
 */
export const statusDisplayName = (
  statusName: string | undefined,
  user: any,
): string => {
  if (!statusName) return "";
  const isClient = user?.role?.roleType === ROLE_TYPE.CUSTOMER;
  // Staff see the "Resolved" column as "Done".
  if (!isClient && statusName === StatusName.RESOLVED) return "Done";
  // Clients see the "Approved" column as "Resolved".
  if (isClient && statusName === StatusName.APPROVED) {
    return StatusName.RESOLVED;
  }
  return statusName;
};

/**
 * The status badge (name + color) the given user sees for a ticket outside the
 * board — matches the column the ticket appears under on the kanban board.
 * Clients see Resolved tickets under "In Process" on the board, so their badge
 * shows In Process; everything else is the role-mapped display name.
 */
export const displayStatusForUser = (status: any, user: any): any => {
  if (!status) return status;
  if (
    user?.role?.roleType === ROLE_TYPE.CUSTOMER &&
    status.name === StatusName.RESOLVED
  ) {
    const inProcess = TICKET_STATUSES.find(
      (s: any) => s.name === StatusName.IN_PROCESS,
    );
    if (inProcess) return inProcess;
  }
  return { ...status, name: statusDisplayName(status.name, user) };
};

/**
 * The status columns the given user sees on the kanban board — the single
 * source of truth for which statuses a role may see anywhere (board columns,
 * detail-surface status dropdowns). Employees (non-lead) don't see
 * Unassigned/Cancelled; clients don't see Resolved and see Approved labelled
 * "Resolved"; everyone else sees everything but Cancelled.
 */
export const visibleStatusesForUser = (user: any): any[] => {
  const roleType = user?.role?.roleType;
  if (roleType === ROLE_TYPE.EMPLOYEE && !user?.isLead) {
    return TICKET_STATUSES.filter(
      (s: any) => s.name !== StatusName.NEW && s.name !== StatusName.TRASH,
    );
  }
  if (roleType === ROLE_TYPE.CUSTOMER) {
    return TICKET_STATUSES.filter(
      (s: any) => s.name !== StatusName.RESOLVED,
    ).map((s: any) => ({
      ...s,
      name: s.name === StatusName.APPROVED ? StatusName.RESOLVED : s.name,
    }));
  }
  return TICKET_STATUSES.filter((s: any) => s.name !== StatusName.TRASH);
};

/**
 * The options for a status dropdown on the detail surfaces: the statuses this
 * user sees on the board, plus the ticket's current status when it isn't one
 * of them (e.g. an employee viewing an Unassigned ticket) — otherwise the
 * select couldn't render the current value.
 */
export const statusOptionsForUser = (user: any, currentStatus: any): any[] => {
  const visible = visibleStatusesForUser(user);
  if (
    currentStatus?.id &&
    !visible.some((s: any) => s.id === currentStatus.id)
  ) {
    return [currentStatus, ...visible];
  }
  return visible;
};

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
 * Whether this user may edit the ticket's due date. Single source of truth for
 * the detail modal AND the detail page so the two surfaces can never disagree.
 *
 * Mirrors the backend rule (admins/managers/employees-with-rights may edit,
 * QA and clients may not) and blocks edits on terminal (Cancelled/Closed)
 * tickets and on Approved tickets — once QA has approved the work, the due
 * date is locked for everyone.
 */
export const canEditDueDate = (user: any, ticket: any): boolean => {
  const role = user?.role?.roleType;
  if (role === ROLE_TYPE.CUSTOMER || role === ROLE_TYPE.QA) return false;

  const statusName = ticket?.status?.name;
  if (
    statusName === StatusName.TRASH ||
    statusName === StatusName.CLOSED ||
    statusName === StatusName.APPROVED
  ) {
    return false;
  }

  return (
    role === ROLE_TYPE.ADMIN ||
    role === ROLE_TYPE.AGENT ||
    user?.role?.permissions?.tickets?.update === true ||
    (!!ticket?.owner?.id && ticket.owner.id === user?.id)
  );
};

/**
 * Whether an employee may edit the due date (only allowed while ticket is in Assigned status).
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

  // QA approves finished work without needing an explicit board-status
  // permission. The backend still enforces the real transition rules
  // (only Done tickets can be approved).
  const isQaApprove =
    user?.role?.roleType === ROLE_TYPE.QA &&
    body.targetStatusName === StatusName.APPROVED;

  const isStatusAllowed =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.permissions?.boardStatuses?.[body?.statusId] === true ||
    isCancelByStaff ||
    isOwnerBasicAction ||
    isQaApprove;

  if (isStatusChanging && !isStatusAllowed && !teamLeadIds.includes(user?.id)) {
    showNotification(
      "error",
      UIMessages.BOARD.ACCESS_DENIED(
        statusDisplayName(body.targetStatusName, user) || "this status",
      ),
    );
    return;
  }

  // A Returned ticket must go back through In Process — it can never be moved
  // directly to Done, by any role. Mirrors the backend rule.
  if (
    isStatusChanging &&
    body.currentStatusName === StatusName.FAILED &&
    body.targetStatusName === StatusName.RESOLVED
  ) {
    showNotification(
      "error",
      `Returned tickets cannot be moved directly to ${statusDisplayName(
        StatusName.RESOLVED,
        user,
      )}. Move the ticket to In Progress first.`,
    );
    return;
  }

  // Tickets reach Returned only through the owner's "unsatisfied" decision
  // on an Approved ticket — non-owners may never move a ticket there.
  // Mirrors the backend rule.
  if (
    isStatusChanging &&
    body.targetStatusName === StatusName.FAILED &&
    !isOwner &&
    user?.role?.roleType !== ROLE_TYPE.ADMIN
  ) {
    showNotification(
      "error",
      "Tickets can only be moved to Returned by the ticket owner when they are unsatisfied with the work.",
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
        UIMessages.BOARD.ACCESS_DENIED(
          statusDisplayName(body.targetStatusName, user) || "this status",
        ),
      );
      return;
    }
  }

  if (body.statusId === TICKET_STATUS_IDS.UNASSIGNED) {
    body.assigneeId = null;
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

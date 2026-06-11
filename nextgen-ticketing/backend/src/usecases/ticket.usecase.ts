import { ticketRepository } from "../repositories/ticket.repository";
import prisma from "../prisma";
import {
  StatusName,
  ActionName,
  NotificationMessages,
  RoleName,
  TICKET_STATUSES,
  PRIORITIES,
} from "../utils/constants";
import { startOfDay } from "date-fns";
import { STATUS_CODES } from "http";

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB binary, after base64 decode
const ATTACHMENT_DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,/i;

function validateAttachments(attachments: any): string[] | undefined {
  if (attachments === undefined || attachments === null) return undefined;
  if (!Array.isArray(attachments)) {
    throw new Error("attachments must be an array.");
  }
  if (attachments.length > MAX_ATTACHMENTS) {
    throw new Error(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
  }
  for (const a of attachments) {
    if (typeof a !== "string" || !ATTACHMENT_DATA_URL_RE.test(a)) {
      throw new Error("Attachments must be PNG, JPEG, WebP, or GIF data URLs.");
    }
    const base64 = a.split(",")[1] || "";
    const padding = (base64.match(/=+$/) || [""])[0].length;
    const binarySize = (base64.length * 3) / 4 - padding;
    if (binarySize > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new Error("Each attachment must be 2MB or smaller.");
    }
  }
  return attachments as string[];
}

export const ticketUsecase = {
  async getTickets(filters: any, user: any) {
    const {
      status,
      priority,
      group,
      project,
      owner,
      assignee,
      search,
      page = "0",
      limit = "10",
    } = filters;
    const take = parseInt(limit as string);
    const skip = parseInt(page as string) * take;

    const where: any = { deleted: false };

    // Visibility scoping by role. Kept inside AND so a `search` filter (which
    // also uses OR) can never widen what a restricted user is allowed to see.
    if (user.role === RoleName.CUSTOMER) {
      // Clients see every ticket in their projects (regardless of status),
      // plus any ticket they personally own.
      const projectIds = await ticketRepository.findClientProjectIds(user.id);
      const visibility: any[] = [{ ownerId: user.id }];
      if (projectIds.length) visibility.push({ projectId: { in: projectIds } });
      where.AND = [...(where.AND || []), { OR: visibility }];
    } else if (user.role !== RoleName.ADMIN && user.role !== RoleName.AGENT) {
      where.AND = [
        ...(where.AND || []),
        { OR: [{ ownerId: user.id }, { assigneeId: user.id }] },
      ];
    }

    if (filters.myTickets === "true") {
      if (user.role === RoleName.CUSTOMER) {
        where.AND = [
          ...(where.AND || []),
          { ownerId: user.id },
        ];
      } else {
        where.AND = [
          ...(where.AND || []),
          { OR: [{ ownerId: user.id }, { assigneeId: user.id }] },
        ];
      }
    }

    if (status) {
      const statusObj = TICKET_STATUSES.find((s) => s.name === status);
      if (statusObj) where.statusId = statusObj.id;
    }

    if (priority) {
      const priorityList = (priority as string).split(",");
      const priorityIds = PRIORITIES.filter((p) =>
        priorityList.includes(p.name),
      ).map((p) => p.id);
      if (priorityIds.length > 0) {
        where.priorityId = { in: priorityIds };
      }
    }

    if (group) {
      const groupList = (group as string).split(",");
      where.groupId = { in: groupList };
    }

    if (project) {
      const projectList = (project as string).split(",");
      where.projectId = { in: projectList };
    }

    if (owner) {
      const ownerList = (owner as string).split(",");
      where.ownerId = { in: ownerList };
    }

    if (assignee) {
      const assigneeList = (assignee as string).split(",");
      where.assigneeId = { in: assigneeList };
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { subject: { contains: search as string, mode: "insensitive" } },
            { issue: { contains: search as string, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [tickets, totalCount] = await Promise.all([
      ticketRepository.findMany(where, skip, take),
      ticketRepository.count(where),
    ]);

    return { tickets, totalCount };
  },

  async getTicketById(id: string, user?: any) {
    const ticket = await ticketRepository.findTicketById(id);
    if (!ticket) throw new Error("Ticket not found");

    if (user && user.role === RoleName.CUSTOMER && ticket.comments) {
      ticket.comments = ticket.comments.filter((c: any) => !c.isNote);
    }

    return ticket;
  },

  async createTicket(data: any, user: any) {
    const count = await ticketRepository.count({});
    const uid = count + 1000;

    let finalStatusId = data.statusId;
    if (!finalStatusId) {
      const newStatus = await ticketRepository.findStatusByName(StatusName.NEW);
      finalStatusId = newStatus?.id;
    }

    const validatedAttachments = validateAttachments(data.attachments) ?? [];

    const createData: any = {
      uid,
      subject: data.subject,
      issue: data.issue,
      statusId: finalStatusId,
      priorityId: data.priorityId,
      type: { connect: { id: data.typeId } },
      owner: { connect: { id: user.id } },
      tags: data.tags || [],
      attachments: validatedAttachments,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      history: {
        create: {
          action: ActionName.TICKET_CREATED,
          description: "Ticket was created",
          actor: { connect: { id: user.id } },
        },
      },
    };

    if (data.groupId) createData.group = { connect: { id: data.groupId } };
    if (data.projectId)
      createData.project = { connect: { id: data.projectId } };
    if (data.assigneeId)
      createData.assignee = { connect: { id: data.assigneeId } };

    const ticket = await ticketRepository.createTicket(createData);

    // Return ticket + context for background notification processing
    return {
      ticket,
      backgroundContext: {
        ticketId: ticket.id,
        ticketUid: ticket.uid,
        ownerFullname: ticket.owner?.fullname || "",
        assigneeId: data.assigneeId || null,
        userRole: user.role,
        userId: user.id,
        statusName: ticket.status?.name || StatusName.NEW,
      },
    };
  },

  async updateTicket(id: string, data: any, user: any) {
    // console.log("Data", data);
    // console.log("user", user);
    const existingTicket = (await ticketRepository.findTicketById(id)) as any;
    if (!existingTicket) throw new Error("Ticket not found");

    const actorId = user.id;
    const isAdmin = user.role === RoleName.ADMIN;
    const isManager = user?.role === RoleName.AGENT;
    const isEmployee = user.role === RoleName.EMPLOYEE;
    const isClient = user.role === RoleName.CUSTOMER;

    const isStaff = isAdmin || isManager || isEmployee; // kept for downstream uses
    const isOwner = existingTicket.ownerId === user.id;
    const isAssignee = existingTicket.assigneeId === user.id;

    const targetStatus = data?.targetStatusName?.toLowerCase() || "";
    const currentStatus = data?.currentStatusName?.toLowerCase() || "";

    if (currentStatus == StatusName.TRASH)
      throw new Error("Cancelled Ticket can not be changed.");

    // Status
    if (
      data.statusId !== undefined &&
      data.statusId !== existingTicket.statusId
    ) {
      const current = currentStatus.toLowerCase();
      const target = targetStatus.toLowerCase();

      if (isClient) {
        // Clients can act only on tickets they created, even though they can
        // now view every ticket in their projects.
        if (!isOwner) {
          throw new Error(
            "You can only change the status of tickets you created.",
          );
        }

        const ALLOWED_TARGETS = new Set(
          [StatusName.CLOSED, StatusName.TRASH, StatusName.FAILED].map((s) =>
            s.toLowerCase(),
          ),
        );
        if (!ALLOWED_TARGETS.has(target)) {
          const allowed = [
            StatusName.CLOSED,
            StatusName.TRASH,
            StatusName.FAILED,
          ].join(", ");
          throw new Error(
            `As a client, you can only move tickets to: ${allowed}.`,
          );
        }

        const rules: Array<[string, string, string]> = [
          [
            StatusName.NEW,
            StatusName.TRASH,
            "Only Unassigned tickets can be moved to Trash.",
          ],
          [
            StatusName.APPROVED,
            StatusName.CLOSED,
            "Only Approved tickets can be Closed.",
          ],
          [
            StatusName.APPROVED,
            StatusName.FAILED,
            "Only Approved tickets can be marked as Failed.",
          ],
        ];

        for (const [requiredStatus, ruleTarget, label] of rules) {
          if (
            target === ruleTarget.toLowerCase() &&
            current !== requiredStatus.toLowerCase()
          ) {
            throw new Error(label);
          }
        }
      }

      if (isManager) {
        const rules: Array<[string[], string, string]> = [
          [
            [StatusName.NEW, StatusName.FAILED, StatusName.RESOLVED],
            StatusName.OPEN,
            "Only unassigned, failed, or resolved tickets can be assigned to an employee.",
          ],
          [
            [StatusName.RESOLVED],
            StatusName.APPROVED,
            "Only resolved tickets can be approved.",
          ],
          [
            [
              StatusName.OPEN,
              StatusName.IN_PROCESS,
              StatusName.RESOLVED,
              StatusName.APPROVED,
              StatusName.FAILED,
            ],
            StatusName.IN_PROCESS,
            "Unassigned tickets cannot be moved directly to In Progress.",
          ],
          [
            [StatusName.IN_PROCESS],
            StatusName.RESOLVED,
            "Only tickets in progress can be marked as resolved.",
          ],
        ];

        for (const [
          allowedCurrentStatuses,
          targetStatusName,
          message,
        ] of rules) {
          if (
            target === targetStatusName.toLowerCase() &&
            !allowedCurrentStatuses.some(
              (status) => status.toLowerCase() === current,
            )
          ) {
            throw new Error(message);
          }
        }
      }

      if (isEmployee) {
        const rules: Array<[string[], string, string]> = [
          [
            [StatusName.OPEN],
            StatusName.IN_PROCESS,
            "Only assigned tickets can be moved to In Progress.",
          ],
          [
            [StatusName.IN_PROCESS],
            StatusName.RESOLVED,
            "Only in-progress tickets can be moved to Resolved.",
          ],
        ];

        for (const [requiredStatuses, ruleTarget, message] of rules) {
          if (
            targetStatus === ruleTarget &&
            !requiredStatuses.includes(currentStatus)
          ) {
            throw new Error(message);
          }
        }
      }
    }

    // Priority
    if (
      data.priorityId !== undefined &&
      data.priorityId !== existingTicket.priorityId
    ) {
      if (!isAdmin && !isManager) {
        throw new Error("Only Admins and Managers can change ticket priority.");
      }
    }

    // Type
    if (data.typeId !== undefined && data.typeId !== existingTicket.typeId) {
      if (!!isAdmin && !isManager) {
        throw new Error("Only Admins and Managers can change ticket type.");
      }
    }

    // Assignee
    if (
      data.assigneeId !== undefined &&
      data.assigneeId !== existingTicket.assigneeId
    ) {
      if (!!isAdmin && !isManager) {
        throw new Error("Only Admins and Managers can assign tickets.");
      }
    }

    // Project
    if (data.projectId !== undefined) {
      if (!!isAdmin && !isManager) {
        throw new Error("Only Admins and Managers can change ticket project.");
      }
    }

    // Due date
    const dueDate = existingTicket.dueDate
      ? existingTicket.dueDate.toISOString().split("T")[0]
      : null;

    if (data.dueDate !== undefined && data.dueDate !== dueDate) {
      const canEditDueDate = isAdmin || isManager;
      if (!canEditDueDate) {
        throw new Error(
          "You do not have permission to change ticket due date.",
        );
      }
    }

    // Tags
    if (data.tags !== undefined) {
      const canEditTags = isAdmin || (isEmployee && (isOwner || isAssignee));
      if (!canEditTags) {
        throw new Error("You do not have permission to change ticket tags.");
      }
    }

    const updateData: any = {};
    const historyEntries: any[] = [];

    if (data.subject && data.subject !== existingTicket.subject)
      updateData.subject = data.subject;
    if (data.issue && data.issue !== existingTicket.issue)
      updateData.issue = data.issue;
    if (data.attachments !== undefined) {
      updateData.attachments = validateAttachments(data.attachments) ?? [];
    }

    if (data.statusId && data.statusId !== existingTicket.statusId) {
      const newStatus = TICKET_STATUSES.find(
        (s: any) => s.id === data.statusId,
      );

      updateData.statusId = data.statusId;
      if (newStatus?.isResolved) updateData.closedAt = new Date();
      else updateData.closedAt = null;

      // Sticky failed flag: once returned/failed, keep the flag forever.
      if (newStatus?.name === StatusName.FAILED) updateData.wasFailed = true;

      historyEntries.push({
        action: ActionName.STATUS_CHANGED,
        description: `Status changed from "${existingTicket.status.name}" to "${newStatus?.name}"`,
        actorId,
      });
    }

    if (data.priorityId && data.priorityId !== existingTicket.priorityId) {
      const newPriority = PRIORITIES.find((p: any) => p.id === data.priorityId);
      updateData.priorityId = data.priorityId;
      historyEntries.push({
        action: ActionName.PRIORITY_CHANGED,
        description: `Priority changed from "${existingTicket.priority.name}" to "${newPriority?.name}"`,
        actorId,
      });
    }

    if (data.typeId) updateData.typeId = data.typeId;
    if (data.groupId) updateData.groupId = data.groupId;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;

    if (
      data.assigneeId !== undefined &&
      data.assigneeId !== existingTicket.assigneeId
    ) {
      updateData.assigneeId = data.assigneeId;
      let description = "";
      if (!data.assigneeId) {
        description = `Ticket unassigned (previously assigned to ${
          existingTicket.assignee?.fullname || "Unknown"
        })`;
      } else {
        description = `Ticket assigned to ${
          data?.newAssigneeName || "Unknown"
        } (previously ${existingTicket.assignee?.fullname || "Unassigned"})`;
      }

      historyEntries.push({
        action: ActionName.ASSIGNEE_CHANGED,
        description,
        actorId,
      });
    }

    if (data.tags) updateData.tags = data.tags;
    if (
      data.dueDate !== undefined &&
      data.dueDate !==
        (existingTicket.dueDate ? existingTicket.dueDate.toISOString() : null)
    ) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      historyEntries.push({
        action: ActionName.DUE_DATE_CHANGED,
        description: `Due date changed to ${
          data.dueDate ? new Date(data.dueDate).toLocaleDateString() : "None"
        } (previously ${
          existingTicket.dueDate
            ? existingTicket.dueDate.toLocaleDateString()
            : "None"
        })`,
        actorId,
      });
    }

    if (Object.keys(updateData).length > 0 && historyEntries.length === 0) {
      historyEntries.push({
        action: ActionName.TICKET_UPDATED,
        description: "Ticket details updated",
        actorId,
      });
    }

    updateData.history = { create: historyEntries };

    const ticket = await ticketRepository.updateTicket(id, updateData);

    // Return ticket + context for background notification processing
    return {
      ticket,
      backgroundContext: {
        ticketId: id,
        ticketUid: ticket.uid,
        existingTicket: {
          ownerId: existingTicket.ownerId,
          assigneeId: existingTicket.assigneeId,
          statusId: existingTicket.statusId,
        },
        data: {
          statusId: data.statusId,
          assigneeId: data.assigneeId,
          newAssigneeName: data.newAssigneeName,
        },
        historyEntries,
        actorId,
        isStaff,
        statusName: ticket.status.name,
      },
    };
  },

  async batchUpdateTickets(data: any, user: any) {
    const { ticketIds, statusId, priorityId, groupId, projectId, assigneeId } =
      data;
    const actorId = user.id;

    const updateData: any = {};
    if (statusId) updateData.statusId = statusId;
    if (priorityId) updateData.priorityId = priorityId;
    if (groupId) updateData.groupId = groupId;
    if (projectId !== undefined) updateData.projectId = projectId;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;

    // Sticky failed flag when batch-moving tickets to "Returned" (Failed).
    if (statusId) {
      const batchTargetStatus = TICKET_STATUSES.find(
        (s: any) => s.id === statusId,
      );
      if (batchTargetStatus?.name === StatusName.FAILED)
        updateData.wasFailed = true;
    }

    await ticketRepository.updateMany(ticketIds, updateData);

    if (statusId) {
      const targetStatus = await ticketRepository.findStatusById(statusId);
      const isStaff =
        user.role === RoleName.ADMIN ||
        user.role === RoleName.AGENT ||
        user.role === RoleName.EMPLOYEE;

      if (isStaff && targetStatus?.name === StatusName.IN_PROCESS) {
        const tickets = await ticketRepository.findManyByIds(ticketIds);
        for (const ticket of tickets) {
          await this.handleTimesheetTask(ticket, actorId);
        }
      }
    }

    return { updated: ticketIds.length };
  },

  async deleteTicket(id: string, user: any) {
    return ticketRepository.deleteTicket(id);
  },

  async addComment(id: string, data: any, user: any) {
    const authorId = data.authorId || user.id;
    const ticketId = data.ticketId || id;
    const attachments = validateAttachments(data.attachments) ?? [];

    const newComment = await ticketRepository.addComment({
      comment: data.comment,
      isNote: data.isNote || false,
      attachments,
      authorId,
      ticketId,
    });

    await prisma.history.create({
      data: {
        action: data.isNote ? ActionName.NOTE_ADDED : ActionName.COMMENT_ADDED,
        description: data.isNote ? "Internal note added" : "New comment added",
        actorId: authorId,
        ticketId: id,
      },
    });

    // Return comment + context for background notification processing
    return {
      comment: newComment,
      backgroundContext: {
        ticketId,
        commentId: newComment.id,
        authorId,
        authorFullname: newComment.author.fullname,
      },
    };
  },

  async getTicketHistory(filters: any) {
    const { status, page = "0", limit = "25" } = filters;
    const take = parseInt(limit as string);
    const skip = parseInt(page as string) * take;

    const where: any = { deleted: false, status: { isResolved: true } };
    if (status) where.status = { name: status as string };

    const [tickets, totalCount] = await Promise.all([
      ticketRepository.findMany(where, skip, take),
      ticketRepository.count(where),
    ]);

    return { tickets, totalCount };
  },

  async getTimeline(ticketId: string) {
    return ticketRepository.getTimeline(ticketId);
  },

  /**
   * Background: send notifications for a newly created ticket.
   * Called via setImmediate in the controller after the HTTP response is sent.
   */
  async sendCreateNotifications(ctx: any) {
    const notifications: { userId: string; notification: any }[] = [];

    // Notify assignee
    if (ctx.assigneeId) {
      const notification = await ticketRepository.createNotification({
        title: "New Ticket Assigned",
        message: `Ticket #${ctx.ticketUid} has been assigned to you.`,
        type: "assignment",
        userId: ctx.assigneeId,
        data: { ticketId: ctx.ticketId, uid: ctx.ticketUid },
      });
      notifications.push({ userId: ctx.assigneeId, notification });
    }

    // Notify staff when a customer creates a ticket
    if (ctx.userRole === RoleName.CUSTOMER) {
      const staff = await ticketRepository.findStaff();
      const staffToNotify = staff.filter((s: any) => s.id !== ctx.assigneeId);
      const staffNotifications = await Promise.all(
        staffToNotify.map(async (s: any) => {
          const notification = await ticketRepository.createNotification({
            title: NotificationMessages.TITLES.CUSTOMER_TICKET,
            message: NotificationMessages.CUSTOMER_TICKET_CREATED(
              ctx.ticketUid,
              ctx.ownerFullname,
            ),
            type: "ticket_created",
            userId: s.id,
            data: { ticketId: ctx.ticketId, uid: ctx.ticketUid },
          });
          return { userId: s.id, notification };
        }),
      );
      notifications.push(...staffNotifications);
    }

    // Auto-create timesheet task
    if (
      (ctx.userRole === RoleName.ADMIN ||
        ctx.userRole === RoleName.AGENT ||
        ctx.userRole === RoleName.EMPLOYEE) &&
      ctx.statusName === StatusName.IN_PROCESS
    ) {
      // We need the full ticket for handleTimesheetTask
      const ticket = await ticketRepository.findTicketById(ctx.ticketId);
      if (ticket) await this.handleTimesheetTask(ticket, ctx.userId);
    }

    return notifications;
  },

  /**
   * Background: send notifications for a ticket update.
   * Called via setImmediate in the controller after the HTTP response is sent.
   */
  async sendUpdateNotifications(ctx: any) {
    // Build a summary of what changed for the notification message
    const changes: string[] = [];
    for (const entry of ctx.historyEntries) {
      changes.push(entry.description);
    }
    const changeSummary =
      changes.length > 0 ? changes.join("; ") : "Ticket details updated";

    // Staff (Admin, Manager, Employee) see the "Resolved" status as "Dev-Done",
    // so relabel it in their notification text (e.g. "Dev-Done → In Process"
    // instead of "Resolved → In Process"). Clients still see "Resolved".
    const summaryMentionsResolved = changeSummary.includes(StatusName.RESOLVED);
    const staffChangeSummary = summaryMentionsResolved
      ? changeSummary.split(StatusName.RESOLVED).join("Dev-Done")
      : changeSummary;

    // Collect all user IDs to notify (admins, managers, employees + assignee)
    const notifyIds = new Set<string>();

    // Get all staff (Admin, Manager, Employee)
    const staff = await ticketRepository.findStaff();
    for (const s of staff) {
      notifyIds.add(s.id);
    }

    // Also notify the assigned employee (current or newly assigned)
    const assigneeId = ctx.data.assigneeId ?? ctx.existingTicket.assigneeId;
    if (assigneeId) {
      notifyIds.add(assigneeId);
    }

    // A new (non-null) assignee, different from before, counts as an assignment.
    const isAssignmentChange =
      !!ctx.data.assigneeId &&
      ctx.data.assigneeId !== ctx.existingTicket.assigneeId;

    // Resolve the assignee's name for the owner's notification. Prefer the name
    // the client sent; otherwise look it up so the message is accurate no
    // matter which UI (or role) triggered the assignment.
    let assigneeName: string = ctx.data.newAssigneeName || "";
    if (isAssignmentChange && !assigneeName) {
      const assignee = await prisma.user.findUnique({
        where: { id: ctx.data.assigneeId },
        select: { fullname: true },
      });
      assigneeName = assignee?.fullname || "";
    }

    // Status transitions that matter to the owner.
    const isStatusChange =
      ctx.data.statusId && ctx.data.statusId !== ctx.existingTicket.statusId;
    const isStatusApproved =
      isStatusChange && ctx.statusName === StatusName.APPROVED;
    const isStatusInProcess =
      isStatusChange && ctx.statusName === StatusName.IN_PROCESS;

    // Notify the ticket owner when:
    //  - the status changes to Approved or In Process, or
    //  - the ticket is (re)assigned to a user, or
    //  - the owner is staff (already covered via findStaff() above).
    const ownerIsStaff = staff.some(
      (s: any) => s.id === ctx.existingTicket.ownerId,
    );

    // Whether the owner is a client. Needed both to send the client-specific
    // "resolved" message on Approve, and to keep showing "Resolved" (not
    // "Dev-Done") to a client owner. Look it up only when it can matter.
    let ownerIsClient = false;
    if (
      (isStatusApproved || summaryMentionsResolved) &&
      ctx.existingTicket.ownerId &&
      !ownerIsStaff
    ) {
      const owner = (await prisma.user.findUnique({
        where: { id: ctx.existingTicket.ownerId },
        select: { role: { select: { roleType: true } } },
      })) as any;
      ownerIsClient = owner?.role?.roleType === "isCustomer";
    }

    if (
      ctx.existingTicket.ownerId &&
      (ownerIsStaff ||
        isStatusApproved ||
        isStatusInProcess ||
        isAssignmentChange)
    ) {
      notifyIds.add(ctx.existingTicket.ownerId);
    }

    // Don't notify the user who made the update
    notifyIds.delete(ctx.actorId);

    // Create all notifications in parallel
    const notifications = await Promise.all(
      Array.from(notifyIds).map(async (targetUserId) => {
        // The newly-assigned user gets the "assigned to you" message.
        const isAssignment =
          isAssignmentChange && targetUserId === ctx.data.assigneeId;
        // The owner (when it's not them being assigned) gets a tailored
        // "your ticket has been assigned to X" message.
        const isOwnerAssignmentNotice =
          isAssignmentChange &&
          targetUserId === ctx.existingTicket.ownerId &&
          targetUserId !== ctx.data.assigneeId;

        const isOwner = targetUserId === ctx.existingTicket.ownerId;

        // Staff see the "Dev-Done" relabel; a client owner keeps "Resolved".
        const recipientSummary =
          isOwner && ownerIsClient ? changeSummary : staffChangeSummary;

        let title: string = NotificationMessages.TITLES.UPDATE;
        let message = `Ticket #${ctx.ticketUid} updated: ${recipientSummary}`;
        let type = "ticket_updated";

        if (isAssignment) {
          title = NotificationMessages.TITLES.ASSIGNMENT;
          message = NotificationMessages.TICKET_ASSIGNED(ctx.ticketUid);
          type = "assignment";
        } else if (isOwnerAssignmentNotice) {
          title = NotificationMessages.TITLES.ASSIGNMENT;
          message = NotificationMessages.TICKET_ASSIGNED_TO_OWNER(
            ctx.ticketUid,
            assigneeName || "a team member",
          );
          type = "assignment";
        } else if (isStatusInProcess && isOwner) {
          title = NotificationMessages.TITLES.UPDATE;
          message = NotificationMessages.TICKET_IN_PROCESS_OWNER(ctx.ticketUid);
          type = "ticket_updated";
        } else if (isStatusApproved && isOwner && ownerIsClient) {
          title = NotificationMessages.TITLES.RESOLVED;
          message = NotificationMessages.TICKET_RESOLVED_OWNER(ctx.ticketUid);
          type = "ticket_updated";
        }

        const notification = await ticketRepository.createNotification({
          title,
          message,
          type,
          userId: targetUserId,
          data: { ticketId: ctx.ticketId, uid: ctx.ticketUid },
        });
        return { userId: targetUserId, notification };
      }),
    );

    // Auto-create timesheet task
    if (
      ctx.data.statusId &&
      ctx.isStaff &&
      ctx.statusName === StatusName.IN_PROCESS
    ) {
      const ticket = await ticketRepository.findTicketById(ctx.ticketId);
      if (ticket) await this.handleTimesheetTask(ticket, ctx.actorId);
    }

    return notifications;
  },

  /**
   * Background: send notifications for a new comment.
   * Called via setImmediate in the controller after the HTTP response is sent.
   */
  async sendCommentNotifications(ctx: any) {
    const ticket = await ticketRepository.findTicketById(ctx.ticketId);
    if (!ticket) return [];

    const notifyIds = new Set<string>();
    if (ticket.assigneeId && ticket.assigneeId !== ctx.authorId)
      notifyIds.add(ticket.assigneeId);
    if (ticket.ownerId && ticket.ownerId !== ctx.authorId)
      notifyIds.add(ticket.ownerId);

    // If a client commented, notify managers
    const author = await prisma.user.findUnique({
      where: { id: ctx.authorId },
      include: { role: true },
    });

    if (author?.role?.name === RoleName.CUSTOMER) {
      // 1. Notify all users with role 'Manager' (RoleName.AGENT)
      const managers = await prisma.user.findMany({
        where: {
          role: { name: RoleName.AGENT },
          deleted: false,
        },
      });
      for (const m of managers) {
        if (m.id !== ctx.authorId) {
          notifyIds.add(m.id);
        }
      }

      // 2. Notify team managers of the assignee's teams (if assigned)
      if (ticket.assigneeId) {
        const assigneeTeams = await prisma.team.findMany({
          where: {
            memberIds: { has: ticket.assigneeId },
            deleted: false,
          },
          select: { managerId: true },
        });
        for (const team of assigneeTeams) {
          if (team.managerId && team.managerId !== ctx.authorId) {
            notifyIds.add(team.managerId);
          }
        }
      }
    }

    // Create all notifications in parallel
    const notifications = await Promise.all(
      Array.from(notifyIds).map(async (targetUserId) => {
        const notification = await ticketRepository.createNotification({
          title: "New Comment",
          message: `New comment on Ticket #${ticket.uid} by ${ctx.authorFullname}`,
          type: "comment",
          userId: targetUserId,
          data: {
            ticketId: ctx.ticketId,
            commentId: ctx.commentId,
            uid: ticket.uid,
          },
        });
        return { userId: targetUserId, notification };
      }),
    );

    return notifications;
  },

  async handleTimesheetTask(ticket: any, userId: string) {
    const today = startOfDay(new Date());
    try {
      const entry = await (prisma as any).timesheetEntry.upsert({
        where: { userId_date: { userId, date: today } },
        update: {},
        create: {
          userId,
          date: today,
          totalHours: 0,
          status: StatusName.PENDING,
        },
      });

      const existingTask = await (prisma as any).timesheetTask.findFirst({
        where: { entryId: entry.id, ticketId: ticket.id },
      });

      if (!existingTask) {
        await (prisma as any).timesheetTask.create({
          data: {
            description: `Working on Ticket #${ticket.uid}: ${ticket.subject}`,
            hours: 0,
            projectId: (ticket as any).projectId ?? null,
            ticketId: ticket.id,
            entryId: entry.id,
          },
        });

        await ticketRepository.addComment({
          comment: `[System] Ticket moved to "In Process". Automatically added to today's activity.`,
          isNote: true,
          authorId: userId,
          ticketId: ticket.id,
        });
      }
    } catch (error) {
      console.error("Failed to handle timesheet task:", error);
    }
  },
};

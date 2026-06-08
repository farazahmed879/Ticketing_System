import { ticketRepository } from "../repositories/ticket.repository";
import prisma from "../prisma";
import {
  StatusName,
  ActionName,
  NotificationMessages,
  RoleName,
} from "../utils/constants";
import { startOfDay } from "date-fns";

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
  async autoFailOverdueTickets() {
    const endOfYesterday = new Date();
    endOfYesterday.setHours(0, 0, 0, 0);

    const overdueTickets =
      await ticketRepository.findOverdueTickets(endOfYesterday);

    if (overdueTickets.length > 0) {
      const failedStatus = await ticketRepository.findStatusByName(
        StatusName.FAILED,
      );
      if (failedStatus) {
        await ticketRepository.updateStatusMany(
          overdueTickets.map((t) => t.id),
          failedStatus.id,
        );
      }
    }
  },

  async getTickets(filters: any, user: any) {
    // await this.autoFailOverdueTickets();

    const {
      status,
      priority,
      group,
      owner,
      assignee,
      search,
      page = "0",
      limit = "10",
    } = filters;
    const take = parseInt(limit as string);
    const skip = parseInt(page as string) * take;

    const where: any = { deleted: false };

    if (user.role !== RoleName.ADMIN && user.role !== RoleName.AGENT) {
      where.OR = [{ ownerId: user.id }, { assigneeId: user.id }];
    }

    if (status) where.status = { name: status as string };

    if (priority) {
      const priorityList = (priority as string).split(",");
      where.priority = { name: { in: priorityList } };
    }

    if (group) {
      const groupList = (group as string).split(",");
      where.groupId = { in: groupList };
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
      where.OR = [
        { subject: { contains: search as string, mode: "insensitive" } },
        { issue: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [tickets, totalCount] = await Promise.all([
      ticketRepository.findMany(where, skip, take),
      ticketRepository.count(where),
    ]);

    return { tickets, totalCount };
  },

  async getTicketById(id: string) {
    const ticket = await ticketRepository.findTicketById(id);
    if (!ticket) throw new Error("Ticket not found");
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
      status: { connect: { id: finalStatusId } },
      priority: { connect: { id: data.priorityId } },
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

    const notifications = [];

    if (data.assigneeId) {
      const notification = await ticketRepository.createNotification({
        title: "New Ticket Assigned",
        message: `Ticket #${ticket.uid} has been assigned to you.`,
        type: "assignment",
        userId: data.assigneeId,
        data: { ticketId: ticket.id, uid: ticket.uid },
      });
      notifications.push({ userId: data.assigneeId, notification });
    }

    if (user.role === RoleName.CUSTOMER) {
      const staff = await ticketRepository.findStaff();
      for (const s of staff) {
        if (s.id === data.assigneeId) continue;
        const staffNotification = await ticketRepository.createNotification({
          title: NotificationMessages.TITLES.CUSTOMER_TICKET,
          message: NotificationMessages.CUSTOMER_TICKET_CREATED(
            ticket.uid,
            ticket.owner.fullname,
          ),
          type: "ticket_created",
          userId: s.id,
          data: { ticketId: ticket.id, uid: ticket.uid },
        });
        notifications.push({ userId: s.id, notification: staffNotification });
      }
    }

    // Auto-create timesheet task
    if (
      (user.role === RoleName.ADMIN ||
        user.role === RoleName.AGENT ||
        user.role === RoleName.EMPLOYEE) &&
      ticket.status.name === StatusName.IN_PROCESS
    ) {
      await this.handleTimesheetTask(ticket, user.id);
    }

    return { ticket, notifications };
  },

  async updateTicket(id: string, data: any, user: any) {
    console.log("Data", data);
    console.log("user", user);
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
    const ticketIsNew = existingTicket.status?.name === StatusName.NEW;

    const targetStatus = data?.targetStatusName?.toLowerCase() || "";
    const currentStatus = data?.currentStatusName?.toLowerCase() || "";

    if (currentStatus == StatusName.TRASH)
      throw new Error("Trash Ticket can not be changed.");

    // --- RBAC: gate each editable field per the role matrix ---
    // Subject / Description

    //pata nahi kya bala hai ye.. bad mai dekhte
    // if (
    //   data.subject !== undefined ||
    //   data.issue !== undefined ||
    //   data.attachments !== undefined
    // ) {
    //   const canEditContent =
    //     isAdmin ||
    //     (isEmployee && (isOwner || isAssignee)) ||
    //     (isClient && isOwner && ticketIsNew);
    //   if (!canEditContent) {
    //     throw new Error(
    //       "You do not have permission to edit this ticket's content.",
    //     );
    //   }
    // }

    // Status
    if (
      data.statusId !== undefined &&
      data.statusId !== existingTicket.statusId
    ) {
      // Server-side security check: an unassigned ticket cannot move to a
      // working column. The same update may set an assignee in the same call
      // (e.g., from the modal where assignee+status save together) — that's
      // allowed. Terminal moves (Trash/Failed/Closed) are also allowed.
      // const willHaveAssignee =
      //   data.assigneeId !== undefined
      //     ? !!data.assigneeId
      //     : !!existingTicket.assigneeId;
      // if (!willHaveAssignee) {
      //   const targetRecord = await ticketRepository.findStatusById(
      //     data.statusId,
      //   );
      //   const targetName = (targetRecord?.name || "").toLowerCase();
      //   const allowedTargets = new Set([
      //     StatusName.NEW.toLowerCase(),
      //     StatusName.TRASH.toLowerCase(),
      //     StatusName.FAILED.toLowerCase(),
      //     StatusName.CLOSED.toLowerCase(),
      //   ]);
      //   if (!allowedTargets.has(targetName)) {
      //     throw new Error(
      //       "Cannot move an unassigned ticket to a working column. Please assign it to a team member first.",
      //     );
      //   }
      // }

      // const st = await ticketRepository.findStatusById(data.statusId);

      const current = currentStatus.toLowerCase();
      const target = targetStatus.toLowerCase();

      if (isClient) {
        console.log("client target", target);
        console.log("client current", current);
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

    console.log("data.dueDate", data.dueDate);
    console.log("existing dueDate", dueDate);

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
      const newStatus = await ticketRepository.findStatusById(data.statusId);
      updateData.statusId = data.statusId;
      if (newStatus?.isResolved) updateData.closedAt = new Date();
      else updateData.closedAt = null;

      historyEntries.push({
        action: ActionName.STATUS_CHANGED,
        description: `Status changed from "${existingTicket.status.name}" to "${newStatus?.name}"`,
        actorId,
      });
    }

    if (data.priorityId && data.priorityId !== existingTicket.priorityId) {
      const newPriority = await ticketRepository.findPriorityById(
        data.priorityId,
      );
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
        const newAssignee = await ticketRepository.findUserById(
          data.assigneeId,
        );
        description = `Ticket assigned to ${
          newAssignee?.fullname || "Unknown"
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

    const notifications = [];

    // Build a summary of what changed for the notification message
    const changes: string[] = [];
    for (const entry of historyEntries) {
      changes.push(entry.description);
    }
    const changeSummary =
      changes.length > 0 ? changes.join("; ") : "Ticket details updated";

    // Collect all user IDs to notify (admins, managers, employees + assignee)
    const notifyIds = new Set<string>();

    // Get all staff (Admin, Manager, Employee)
    const staff = await ticketRepository.findStaff();
    for (const s of staff) {
      notifyIds.add(s.id);
    }

    // Also notify the assigned employee (current or newly assigned)
    const assigneeId = data.assigneeId ?? existingTicket.assigneeId;
    if (assigneeId) {
      notifyIds.add(assigneeId);
    }

    // console.log("ticket.status.name", ticket);

    // Notify the ticket owner (client) only when status changes to Approved
    // Staff owners are already included via findStaff() above
    const isStatusApproved =
      data.statusId &&
      data.statusId !== existingTicket.statusId &&
      ticket.status.name === StatusName.APPROVED;
    const ownerIsStaff = staff.some((s) => s.id === existingTicket.ownerId);
    if (existingTicket.ownerId && (ownerIsStaff || isStatusApproved)) {
      notifyIds.add(existingTicket.ownerId);
    }

    // Don't notify the user who made the update
    notifyIds.delete(actorId);

    for (const targetUserId of notifyIds) {
      const isAssignment =
        data.assigneeId &&
        data.assigneeId !== existingTicket.assigneeId &&
        targetUserId === data.assigneeId;
      const notification = await ticketRepository.createNotification({
        title: isAssignment
          ? NotificationMessages.TITLES.ASSIGNMENT
          : NotificationMessages.TITLES.UPDATE,
        message: isAssignment
          ? NotificationMessages.TICKET_ASSIGNED(ticket.uid)
          : `Ticket #${ticket.uid} updated: ${changeSummary}`,
        type: isAssignment ? "assignment" : "ticket_updated",
        userId: targetUserId,
        data: { ticketId: ticket.id, uid: ticket.uid },
      });
      notifications.push({ userId: targetUserId, notification });
    }

    // Auto-create timesheet task
    if (
      data.statusId &&
      isStaff &&
      ticket.status.name === StatusName.IN_PROCESS
    ) {
      await this.handleTimesheetTask(ticket, actorId);
    }

    return { ticket, notifications };
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

    const ticket = await ticketRepository.findTicketById(ticketId);
    const notifications = [];

    if (ticket) {
      const notifyIds = new Set<string>();
      if (ticket.assigneeId && ticket.assigneeId !== authorId)
        notifyIds.add(ticket.assigneeId);
      if (ticket.ownerId && ticket.ownerId !== authorId)
        notifyIds.add(ticket.ownerId);

      for (const targetUserId of notifyIds) {
        const notification = await ticketRepository.createNotification({
          title: "New Comment",
          message: `New comment on Ticket #${ticket.uid} by ${newComment.author.fullname}`,
          type: "comment",
          userId: targetUserId,
          data: { ticketId, commentId: newComment.id, uid: ticket.uid },
        });
        notifications.push({ userId: targetUserId, notification });
      }
    }

    return { comment: newComment, notifications };
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

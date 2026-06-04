import { ticketRepository } from "../repositories/ticket.repository";
import prisma from "../prisma";
import {
  StatusName,
  ActionName,
  NotificationMessages,
  RoleName,
} from "../utils/constants";
import { startOfDay } from "date-fns";

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
    await this.autoFailOverdueTickets();

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

    const createData: any = {
      uid,
      subject: data.subject,
      issue: data.issue,
      status: { connect: { id: finalStatusId } },
      priority: { connect: { id: data.priorityId } },
      type: { connect: { id: data.typeId } },
      owner: { connect: { id: user.id } },
      tags: data.tags || [],
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
    // console.log("Data", data);
    const existingTicket = (await ticketRepository.findTicketById(id)) as any;
    if (!existingTicket) throw new Error("Ticket not found");

    const actorId = user.id;
    const isStaff =
      user.role === RoleName.ADMIN ||
      user.role === RoleName.AGENT ||
      user.role === RoleName.EMPLOYEE;

    // // RBAC for non-staff
    // if (!isStaff && data.statusId) {
    //   const targetStatus = await ticketRepository.findStatusById(data.statusId);
    //   const statusName = targetStatus?.name.toLowerCase();
    //   const isBasicAction =
    //     statusName === StatusName.CANCELLED.toLowerCase() ||
    //     statusName === StatusName.OPEN.toLowerCase() ||
    //     statusName === StatusName.FAILED.toLowerCase();

    //   if (!isBasicAction) {
    //     throw new Error("You can only update tickets to Failed or Cancelled");
    //   }

    //   if (existingTicket.ownerId !== user.id) {
    //     throw new Error("You can only update your own tickets");
    //   }
    // }

    // RBAC for Priority

    // console.log("user", user);
    // if (data.priorityId && data.priorityId !== existingTicket.priorityId) {
    //   const canUpdatePriority =
    //     user.role === RoleName.ADMIN || user.permissions?.tickets?.priority;
    //   if (!canUpdatePriority) {
    //     throw new Error("You do not have permission to change ticket priority");
    //   }
    // }

    const updateData: any = {};
    const historyEntries: any[] = [];

    if (data.subject && data.subject !== existingTicket.subject)
      updateData.subject = data.subject;
    if (data.issue && data.issue !== existingTicket.issue)
      updateData.issue = data.issue;

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

    const newComment = await ticketRepository.addComment({
      comment: data.comment,
      isNote: data.isNote || false,
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

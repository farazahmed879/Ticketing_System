import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { io } from "../index";
import { emitNotificationToUser } from "../socketio/events";
import { RoleName, StatusName, ActionName, NotificationMessages } from "../utils/constants";

const prisma = new PrismaClient();

// Get all tickets with filtering
export const getTickets = async (req: AuthRequest, res: Response) => {
  const {
    status,
    priority,
    group,
    owner,
    assignee,
    search,
    page = "0",
    limit = "25",
  } = req.query;
  const take = parseInt(limit as string);
  const skip = parseInt(page as string) * take;

  try {
    const where: any = { deleted: false };

    // Enforce ownership or assignment visibility for non-Admin/Agent roles
    const userRole = req.user?.role;
    const userId = req.user?.id;
    if (userRole !== RoleName.ADMIN && userRole !== RoleName.AGENT) {
      where.OR = [{ ownerId: userId }, { assigneeId: userId }];
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
      prisma.ticket.findMany({
        where,
        include: {
          status: true,
          priority: true,
          type: true,
          owner: {
            select: { id: true, fullname: true, email: true, image: true },
          },
          assignee: {
            select: { id: true, fullname: true, email: true, image: true },
          },
          group: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: take === -1 ? undefined : take,
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({ success: true, tickets, totalCount });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create a new ticket
export const createTicket = async (req: AuthRequest, res: Response) => {
  const {
    subject,
    issue,
    statusId,
    priorityId,
    typeId,
    groupId,
    assigneeId,
    tags,
    dueDate,
  } = req.body;
  const ownerId = req.user?.id;
  if (!ownerId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const count = await prisma.ticket.count();
    const uid = count + 1000;

    let finalStatusId = statusId;
    if (!finalStatusId) {
      const newStatus = await prisma.status.findUnique({
        where: { name: StatusName.NEW },
      });
      finalStatusId = newStatus?.id;
    }

    const createData: any = {
      uid,
      subject,
      issue,
      status: { connect: { id: finalStatusId } },
      priority: { connect: { id: priorityId } },
      type: { connect: { id: typeId } },
      owner: { connect: { id: ownerId } },
      tags: tags || [],
      dueDate: dueDate ? new Date(dueDate) : null,
      history: {
        create: {
          action: ActionName.TICKET_CREATED,
          description: "Ticket was created",
          actor: { connect: { id: ownerId } },
        },
      },
    };

    if (groupId) createData.group = { connect: { id: groupId } };
    if (assigneeId) createData.assignee = { connect: { id: assigneeId } };

    const ticket = await prisma.ticket.create({
      data: createData,
      include: {
        status: true,
        priority: true,
        type: true,
        owner: true,
        group: true,
        assignee: true,
      },
    });

    // Notify assignee if assigned on creation
    if (assigneeId) {
      const notification = await prisma.notification.create({
        data: {
          title: "New Ticket Assigned",
          message: `Ticket #${ticket.uid} has been assigned to you.`,
          type: "assignment",
          userId: assigneeId,
          data: { ticketId: ticket.id, uid: ticket.uid },
        },
      });
      emitNotificationToUser(io, assigneeId, notification);
    }

    // Notify all Admins and Agents if created by a Customer
    if (req.user?.role === RoleName.CUSTOMER) {
      const staff = await prisma.user.findMany({
        where: {
          OR: [
            { role: { name: RoleName.ADMIN } },
            { role: { name: RoleName.AGENT } },
          ],
          deleted: false,
        },
      });

      for (const s of staff) {
        // Skip if this staff is already the assignee (already notified above)
        if (s.id === assigneeId) continue;

        const staffNotification = await prisma.notification.create({
          data: {
            title: NotificationMessages.TITLES.CUSTOMER_TICKET,
            message: NotificationMessages.CUSTOMER_TICKET_CREATED(ticket.uid, ticket.owner.fullname),
            type: "ticket_created",
            userId: s.id,
            data: { ticketId: ticket.id, uid: ticket.uid },
          },
        });
        emitNotificationToUser(io, s.id, staffNotification);
      }
    }

    // Emit real-time update
    io.emit("ticket:updated", { ticketId: ticket.id });

    res.status(201).json({ success: true, ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single ticket with comments and history
export const getTicketById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: id as string },
      include: {
        status: true,
        priority: true,
        type: true,
        owner: {
          select: {
            id: true,
            fullname: true,
            email: true,
            image: true,
            title: true,
          },
        },
        assignee: {
          select: {
            id: true,
            fullname: true,
            email: true,
            image: true,
            title: true,
          },
        },
        group: true,
        comments: {
          include: {
            author: { select: { id: true, fullname: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        history: {
          include: { actor: { select: { id: true, fullname: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json({ success: true, ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update ticket (general)
export const updateTicket = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const actorId = req.user?.id;
  if (!actorId) return res.status(401).json({ message: "Unauthorized" });

  const {
    subject,
    issue,
    statusId,
    priorityId,
    typeId,
    groupId,
    assigneeId,
    tags,
    dueDate,
  } = req.body;

  // RBAC: Customers can only change status to 'Cancelled' or 'Open' (if re-opening)
  const isStaff =
    req.user?.role === RoleName.ADMIN ||
    req.user?.role === RoleName.AGENT ||
    req.user?.role === RoleName.EMPLOYEE;

  if (!isStaff && statusId) {
    const targetStatus = await prisma.status.findUnique({
      where: { id: statusId },
    });
    const statusName = targetStatus?.name.toLowerCase();
    const isBasicAction =
      statusName === StatusName.CANCELLED.toLowerCase() ||
      statusName === StatusName.OPEN.toLowerCase() ||
      statusName === StatusName.FAILED.toLowerCase();

    if (!isBasicAction) {
      return res.status(403).json({
        success: false,
        error: "You can only update tickets to  Failed or Cancelled",
      });
    }

    // Ensure they only update their own tickets
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: id as string },
    });
    if (existingTicket && existingTicket.ownerId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: "You can only update your own tickets",
      });
    }
  }

  try {
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: id as string },
      include: { status: true, priority: true, assignee: true },
    });
    if (!existingTicket)
      return res.status(404).json({ message: "Ticket not found" });

    // RBAC for Priority
    if (priorityId && priorityId !== existingTicket.priorityId) {
      const canUpdatePriority =
        req.user?.role === RoleName.ADMIN || req.user?.permissions?.tickets?.priority;
      if (!canUpdatePriority) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to change ticket priority",
        });
      }
    }

    const data: any = {};
    const historyEntries: any[] = [];

    if (subject && subject !== existingTicket.subject) data.subject = subject;
    if (issue && issue !== existingTicket.issue) data.issue = issue;

    if (statusId && statusId !== existingTicket.statusId) {
      const newStatus = await prisma.status.findUnique({
        where: { id: statusId },
      });
      data.statusId = statusId;
      if (newStatus?.isResolved) data.closedAt = new Date();
      else data.closedAt = null;

      historyEntries.push({
        action: ActionName.STATUS_CHANGED,
        description: `Status changed from "${existingTicket.status.name}" to "${newStatus?.name}"`,
        actorId,
      });
    }

    if (priorityId && priorityId !== existingTicket.priorityId) {
      const newPriority = await prisma.priority.findUnique({
        where: { id: priorityId },
      });
      data.priorityId = priorityId;
      historyEntries.push({
        action: ActionName.PRIORITY_CHANGED,
        description: `Priority changed from "${existingTicket.priority.name}" to "${newPriority?.name}"`,
        actorId,
      });
    }

    if (typeId) data.typeId = typeId;
    if (groupId) data.groupId = groupId;

    if (assigneeId !== undefined && assigneeId !== existingTicket.assigneeId) {
      data.assigneeId = assigneeId;
      let description = "";
      if (!assigneeId) {
        description = `Ticket unassigned (previously assigned to ${existingTicket.assignee?.fullname || "Unknown"})`;
      } else {
        const newAssignee = await prisma.user.findUnique({
          where: { id: assigneeId },
        });
        description = `Ticket assigned to ${newAssignee?.fullname || "Unknown"} (previously ${existingTicket.assignee?.fullname || "Unassigned"})`;
      }

      historyEntries.push({
        action: ActionName.ASSIGNEE_CHANGED,
        description,
        actorId,
      });
    }

    if (tags) data.tags = tags;
    if (dueDate) data.dueDate = new Date(dueDate);

    // If no specific property changes but some data was sent, add a generic entry if history is empty
    if (Object.keys(data).length > 0 && historyEntries.length === 0) {
      historyEntries.push({
        action: ActionName.TICKET_UPDATED,
        description: "Ticket details updated",
        actorId,
      });
    }

    const ticket = await prisma.ticket.update({
      where: { id: id as string },
      data: {
        ...data,
        history: {
          create: historyEntries,
        },
      },
      include: {
        status: true,
        priority: true,
        type: true,
        owner: true,
        assignee: true,
      },
    });

    // Notify assignee if changed
    if (assigneeId && assigneeId !== existingTicket.assigneeId) {
      const notification = await prisma.notification.create({
        data: {
          title: "Ticket Assigned",
          message: `Ticket #${ticket.uid} has been assigned to you.`,
          type: "assignment",
          userId: assigneeId,
          data: { ticketId: ticket.id, uid: ticket.uid },
        },
      });
      emitNotificationToUser(io, assigneeId, notification);
    }

    // Emit real-time update to all clients
    io.emit("ticket:updated", { ticketId: ticket.id });

    res.json({ success: true, ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Batch update tickets
export const batchUpdateTickets = async (req: AuthRequest, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) return res.status(401).json({ message: "Unauthorized" });

  const { ticketIds, statusId, priorityId, groupId, assigneeId } = req.body;
  try {
    const data: any = {};
    if (statusId) data.statusId = statusId;
    if (priorityId) data.priorityId = priorityId;
    if (groupId) data.groupId = groupId;
    if (assigneeId !== undefined) data.assigneeId = assigneeId;

    await prisma.ticket.updateMany({
      where: { id: { in: ticketIds } },
      data,
    });

    res.json({ success: true, updated: ticketIds.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Soft-delete ticket
export const deleteTicket = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const actorId = req.user?.id;
  if (!actorId) return res.status(401).json({ message: "Unauthorized" });

  try {
    await prisma.ticket.update({
      where: { id: id as string },
      data: {
        deleted: true,
        history: {
          create: {
            action: ActionName.TICKET_DELETED,
            description: "Ticket was deleted",
            actorId,
          },
        },
      },
    });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add comment to ticket
export const addComment = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    comment,
    isNote,
    authorId: bodyAuthorId,
    ticketId: bodyTicketId,
  } = req.body;

  const authorId = bodyAuthorId || req.user?.id;
  const ticketId = bodyTicketId || id;

  if (!authorId) return res.status(401).json({ message: "Unauthorized" });
  if (!ticketId)
    return res.status(400).json({ message: "Ticket ID is required" });

  try {
    const newComment = await prisma.comment.create({
      data: {
        comment,
        isNote: isNote || false,
        authorId: authorId as string,
        ticketId: ticketId as string,
      },
      include: {
        author: { select: { id: true, fullname: true, image: true } },
      },
    });

    await prisma.history.create({
      data: {
        action: isNote ? ActionName.NOTE_ADDED : ActionName.COMMENT_ADDED,
        description: isNote ? "Internal note added" : "New comment added",
        actorId: authorId as string,
        ticketId: id as string,
      },
    });

    // Get ticket info for notifications
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId as string },
      select: { uid: true, ownerId: true, assigneeId: true },
    });

    if (ticket) {
      const notifyIds = new Set<string>();
      if (ticket.assigneeId && ticket.assigneeId !== authorId)
        notifyIds.add(ticket.assigneeId);
      if (ticket.ownerId && ticket.ownerId !== authorId)
        notifyIds.add(ticket.ownerId);

      for (const targetUserId of notifyIds) {
        const notification = await prisma.notification.create({
          data: {
            title: "New Comment",
            message: `New comment on Ticket #${ticket.uid} by ${newComment.author.fullname}`,
            type: "comment",
            userId: targetUserId,
            data: { ticketId, commentId: newComment.id, uid: ticket.uid },
          },
        });
        emitNotificationToUser(io, targetUserId, notification);
      }

      // Emit real-time update for comment refresh
      io.emit("ticket:updated", { ticketId });
    }

    res.status(201).json({ success: true, comment: newComment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get ticket history (completed, expired, revoked)
export const getTicketHistory = async (req: AuthRequest, res: Response) => {
  const { status, page = "0", limit = "25" } = req.query;
  const take = parseInt(limit as string);
  const skip = parseInt(page as string) * take;

  try {
    const where: any = { deleted: false, status: { isResolved: true } };
    if (status) where.status = { name: status as string };

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          status: true,
          priority: true,
          owner: {
            select: { id: true, fullname: true, email: true, image: true },
          },
          assignee: {
            select: { id: true, fullname: true, email: true, image: true },
          },
          group: { select: { id: true, name: true } },
        },
        orderBy: { closedAt: "desc" },
        skip,
        take,
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({ success: true, tickets, totalCount });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

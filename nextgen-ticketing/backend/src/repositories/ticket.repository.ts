import prisma from "../prisma";
import { StatusName, ActionName, RoleName, TICKET_STATUSES, PRIORITIES } from "../utils/constants";

// Helper function to map string IDs back to status and priority objects
const mapTicketStatusAndPriority = (ticket: any) => {
  if (!ticket) return ticket;
  const status = TICKET_STATUSES.find(s => s.id === ticket.statusId) || null;
  const priority = PRIORITIES.find(p => p.id === ticket.priorityId) || null;
  return { ...ticket, status, priority };
};

export const ticketRepository = {
  async findMany(where: any, skip: number, take: number) {
    const tickets = await prisma.ticket.findMany({
      where,
      // Omit attachments and issue here so list payloads stay small.
      // Attachments and issue are still fetched in findTicketById for the detail page.
      omit: { attachments: true, issue: true },
      include: {
        type: true,
        owner: {
          select: { id: true, fullname: true, email: true, image: true },
        },
        assignee: {
          select: { id: true, fullname: true, email: true, image: true },
        },
        group: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: take === -1 ? undefined : take,
    });
    return tickets.map(mapTicketStatusAndPriority);
  },

  async count(where: any) {
    return prisma.ticket.count({ where });
  },

  async findOverdueTickets(endOfYesterday: Date) {
    return prisma.ticket.findMany({
      where: {
        deleted: false,
        dueDate: { not: null, lt: endOfYesterday },
        statusId: {
          in: TICKET_STATUSES.filter(
            (s) => !s.isResolved && s.name !== StatusName.FAILED,
          ).map((s) => s.id),
        },
      },
      select: { id: true },
    });
  },

  async updateStatusMany(ids: string[], statusId: string) {
    return prisma.ticket.updateMany({
      where: { id: { in: ids } },
      data: { statusId },
    });
  },

  async findStatusByName(name: string) {
    return TICKET_STATUSES.find(s => s.name === name) || null;
  },

  async findStatusById(id: string) {
    return TICKET_STATUSES.find(s => s.id === id) || null;
  },

  async findPriorityById(id: string) {
    return PRIORITIES.find(p => p.id === id) || null;
  },

  async findPriorityByName(name: string) {
    return PRIORITIES.find(p => p.name === name) || null;
  },

  async findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findTypeById(id: string) {
    return prisma.type.findUnique({ where: { id } });
  },

  async findTypeByName(name: string) {
    return prisma.type.findUnique({ where: { name } });
  },

  async findTicketById(id: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        type: true,
        owner: {
          select: { id: true, fullname: true, email: true, image: true },
        },
        assignee: {
          select: { id: true, fullname: true, email: true, image: true },
        },
        group: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        comments: {
          include: {
            author: { select: { id: true, fullname: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        history: {
          include: {
            actor: { select: { id: true, fullname: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return mapTicketStatusAndPriority(ticket);
  },

  async createTicket(data: any) {
    const ticket = await prisma.ticket.create({
      data,
      include: {
        type: true,
        owner: true,
        group: true,
        project: true,
        assignee: true,
      },
    });
    return mapTicketStatusAndPriority(ticket);
  },

  async updateTicket(id: string, data: any) {
    const ticket = await prisma.ticket.update({
      where: { id },
      data,
      include: {
        type: true,
        owner: true,
        group: true,
        project: true,
        assignee: true,
      },
    });
    return mapTicketStatusAndPriority(ticket);
  },

  async deleteTicket(id: string) {
    return prisma.ticket.update({
      where: { id },
      data: { deleted: true },
    });
  },

  async addComment(data: any) {
    return prisma.comment.create({
      data,
      include: {
        author: { select: { id: true, fullname: true, image: true } },
      },
    });
  },

  async createNotification(data: any) {
    return prisma.notification.create({ data });
  },

  async findStaff() {
    return prisma.user.findMany({
      where: {
        OR: [
          { role: { name: RoleName.ADMIN } },
          { role: { name: RoleName.AGENT } },
        ],
        deleted: false,
      },
    });
  },

  async updateMany(ids: string[], data: any) {
    return prisma.ticket.updateMany({
      where: { id: { in: ids } },
      data,
    });
  },

  async findManyByIds(ids: string[]) {
    return prisma.ticket.findMany({
      where: { id: { in: ids } },
    });
  },

  async getTimeline(ticketId: string) {
    return prisma.history.findMany({
      where: { ticketId },
      include: {
        actor: { select: { id: true, fullname: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};

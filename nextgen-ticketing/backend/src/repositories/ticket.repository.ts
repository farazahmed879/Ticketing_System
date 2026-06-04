import prisma from "../prisma";
import { StatusName, ActionName, RoleName } from "../utils/constants";

export const ticketRepository = {
  async findMany(where: any, skip: number, take: number) {
    return prisma.ticket.findMany({
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
        project: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: take === -1 ? undefined : take,
    });
  },

  async count(where: any) {
    return prisma.ticket.count({ where });
  },

  async findOverdueTickets(endOfYesterday: Date) {
    return prisma.ticket.findMany({
      where: {
        deleted: false,
        dueDate: { not: null, lt: endOfYesterday },
        status: {
          isResolved: false,
          name: { not: StatusName.FAILED },
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
    return prisma.status.findUnique({ where: { name } });
  },

  async findStatusById(id: string) {
    return prisma.status.findUnique({ where: { id } });
  },

  async findPriorityById(id: string) {
    return prisma.priority.findUnique({ where: { id } });
  },

  async findPriorityByName(name: string) {
    return prisma.priority.findUnique({ where: { name } });
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
    return prisma.ticket.findUnique({
      where: { id },
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
        project: { select: { id: true, name: true } },
        comments: {
          include: {
            author: { select: { id: true, fullname: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        history: {
          include: {
            actor: { select: { id: true, fullname: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  },

  async createTicket(data: any) {
    return prisma.ticket.create({
      data,
      include: {
        status: true,
        priority: true,
        type: true,
        owner: true,
        group: true,
        project: true,
        assignee: true,
      },
    });
  },

  async updateTicket(id: string, data: any) {
    return prisma.ticket.update({
      where: { id },
      data,
      include: {
        status: true,
        priority: true,
        type: true,
        owner: true,
        group: true,
        project: true,
        assignee: true,
      },
    });
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

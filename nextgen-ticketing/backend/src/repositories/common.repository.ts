import prisma from "../prisma";
import { RoleName, TICKET_STATUSES, PRIORITIES } from "../utils/constants";

export const commonRepository = {
  async findStatuses() {
    return TICKET_STATUSES.sort((a, b) => a.order - b.order);
  },

  async findPriorities() {
    return PRIORITIES.sort((a, b) => a.order - b.order);
  },

  async findTypes() {
    return prisma.type.findMany();
  },

  async findRoles() {
    return prisma.role.findMany();
  },

  async findGroups(skip: number, take: number, userId?: string) {
    const where: any = { deleted: false };
    if (userId) where.memberIds = { has: userId };
    return prisma.group.findMany({
      where,
      skip,
      take,
      include: {
        members: {
          select: { id: true, fullname: true, email: true, image: true },
        },
        _count: { select: { tickets: true } },
      },
    });
  },

  async findGroupById(id: string) {
    return prisma.group.findFirst({
      where: { id, deleted: false } as any,
      include: {
        members: {
          select: { id: true, fullname: true, email: true, image: true },
        },
      },
    });
  },

  async countGroups(userId?: string) {
    const where: any = { deleted: false };
    if (userId) where.memberIds = { has: userId };
    return prisma.group.count({ where });
  },

  async createGroup(data: any) {
    return prisma.group.create({
      data,
      include: {
        members: {
          select: { id: true, fullname: true, email: true, image: true },
        },
      },
    });
  },

  async updateGroup(id: string, data: any) {
    return prisma.group.update({
      where: { id },
      data,
      include: {
        members: {
          select: { id: true, fullname: true, email: true, image: true },
        },
      },
    });
  },

  async deleteGroup(id: string) {
    return prisma.group.update({
      where: { id },
      data: { deleted: true } as any,
    });
  },

  async countTicketsInGroup(groupId: string) {
    return prisma.ticket.count({ where: { groupId } });
  },

  async getDashboardStats(user?: any) {
    const isCustomer =
      user?.role.toLowerCase() === RoleName.CUSTOMER.toLowerCase();

    const isEmployee =
      user?.role.toLowerCase() === RoleName.EMPLOYEE.toLowerCase();
    const userId = user?.id;
    const ticketWhere: any = { deleted: false };
    if (isCustomer) {
      ticketWhere.ownerId = userId;
    } else if (isEmployee) {
      ticketWhere.OR = [{ ownerId: userId }, { assigneeId: userId }];
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const unresolvedStatusIds = TICKET_STATUSES.filter(s => !s.isResolved).map(s => s.id);
    const resolvedStatusIds = TICKET_STATUSES.filter(s => s.isResolved).map(s => s.id);

    const [totalTickets, openTickets, resolvedTickets, totalUsers, recentTickets, recentUsers] = await Promise.all([
      prisma.ticket.count({ where: ticketWhere }),
      prisma.ticket.count({
        where: { ...ticketWhere, statusId: { in: unresolvedStatusIds } },
      }),
      prisma.ticket.count({
        where: { ...ticketWhere, statusId: { in: resolvedStatusIds } },
      }),
      prisma.user.count({ where: { deleted: false } }),
      prisma.ticket.findMany({
        where: ticketWhere,
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          owner: { select: { id: true, fullname: true, image: true } },
          assignee: { select: { id: true, fullname: true, image: true } },
        },
      }),
      prisma.user.findMany({
        where: {
          deleted: false,
          createdAt: { gte: sevenDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullname: true,
          image: true,
          title: true,
          createdAt: true,
        },
      }),
    ]);

    const mappedRecentTickets = recentTickets.map(ticket => ({
      ...ticket,
      status: TICKET_STATUSES.find(s => s.id === ticket.statusId) || null,
      priority: PRIORITIES.find(p => p.id === ticket.priorityId) || null,
    }));

    return [totalTickets, openTickets, resolvedTickets, totalUsers, mappedRecentTickets, recentUsers];
  },
};

import prisma from "../prisma";
import { RoleName } from "../utils/constants";

export const commonRepository = {
  async findStatuses() {
    return prisma.status.findMany({ orderBy: { order: "asc" } });
  },

  async findPriorities() {
    return prisma.priority.findMany({ orderBy: { order: "asc" } });
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
    return Promise.all([
      prisma.ticket.count({ where: ticketWhere }),
      prisma.ticket.count({
        where: { ...ticketWhere, status: { isResolved: false } },
      }),
      prisma.ticket.count({
        where: { ...ticketWhere, status: { isResolved: true } },
      }),
      prisma.user.count({ where: { deleted: false } }),
      prisma.ticket.findMany({
        where: ticketWhere,
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          status: true,
          priority: true,
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
  },
};

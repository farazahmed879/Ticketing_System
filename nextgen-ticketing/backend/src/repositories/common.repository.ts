import prisma from "../prisma";
import {
  RoleType,
  TICKET_STATUSES,
  PRIORITIES,
  TICKET_TYPES,
} from "../utils/constants";

export const commonRepository = {
  async findStatuses() {
    return TICKET_STATUSES.sort((a, b) => a.order - b.order);
  },

  async findPriorities() {
    return PRIORITIES.sort((a, b) => a.order - b.order);
  },

  async findTypes() {
    return TICKET_TYPES;
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
    const isCustomer = user?.role === RoleType.CUSTOMER;

    const isEmployee = user?.role === RoleType.EMPLOYEE;
    const userId = user?.id;
    const ticketWhere: any = { deleted: false };

    let clientProjectIds: string[] = [];
    if (isCustomer) {
      const clientProjects = await prisma.project.findMany({
        where: { deleted: false, clientIds: { has: userId } },
        select: { id: true },
      });
      clientProjectIds = clientProjects.map((p) => p.id);
      const visibility: any[] = [{ ownerId: userId }];
      if (clientProjectIds.length > 0) {
        visibility.push({ projectId: { in: clientProjectIds } });
      }
      ticketWhere.OR = visibility;
    } else if (isEmployee) {
      ticketWhere.OR = [{ ownerId: userId }, { assigneeId: userId }];
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const unresolvedStatusIds = TICKET_STATUSES.filter(
      (s) => !s.isResolved,
    ).map((s) => s.id);
    const resolvedStatusIds = TICKET_STATUSES.filter((s) => s.isResolved).map(
      (s) => s.id,
    );

    // Dynamic stats depending on role
    let totalTicketsPromise;
    let openTicketsPromise;
    let resolvedTicketsPromise;

    let projectTicketsPromise = Promise.resolve(0);
    let projectOpenTicketsPromise = Promise.resolve(0);
    let projectResolvedTicketsPromise = Promise.resolve(0);

    if (isCustomer) {
      // Count for client's own created tickets
      totalTicketsPromise = prisma.ticket.count({
        where: { deleted: false, ownerId: userId },
      });
      openTicketsPromise = prisma.ticket.count({
        where: {
          deleted: false,
          ownerId: userId,
          statusId: { in: unresolvedStatusIds },
        },
      });
      resolvedTicketsPromise = prisma.ticket.count({
        where: {
          deleted: false,
          ownerId: userId,
          statusId: { in: resolvedStatusIds },
        },
      });

      // Count for client's project tickets
      if (clientProjectIds.length > 0) {
        projectTicketsPromise = prisma.ticket.count({
          where: { deleted: false, projectId: { in: clientProjectIds } },
        });
        projectOpenTicketsPromise = prisma.ticket.count({
          where: {
            deleted: false,
            projectId: { in: clientProjectIds },
            statusId: { in: unresolvedStatusIds },
          },
        });
        projectResolvedTicketsPromise = prisma.ticket.count({
          where: {
            deleted: false,
            projectId: { in: clientProjectIds },
            statusId: { in: resolvedStatusIds },
          },
        });
      }
    } else {
      totalTicketsPromise = prisma.ticket.count({ where: ticketWhere });
      openTicketsPromise = prisma.ticket.count({
        where: { ...ticketWhere, statusId: { in: unresolvedStatusIds } },
      });
      resolvedTicketsPromise = prisma.ticket.count({
        where: { ...ticketWhere, statusId: { in: resolvedStatusIds } },
      });
    }

    const [
      totalTickets,
      openTickets,
      resolvedTickets,
      projectTickets,
      projectOpenTickets,
      projectResolvedTickets,
      totalUsers,
      recentTickets,
      recentUsers,
    ] = await Promise.all([
      totalTicketsPromise,
      openTicketsPromise,
      resolvedTicketsPromise,
      projectTicketsPromise,
      projectOpenTicketsPromise,
      projectResolvedTicketsPromise,
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
          role: { select: { id: true, name: true, roleType: true } },
        },
      }),
    ]);

    const mappedRecentTickets = recentTickets.map((ticket) => ({
      ...ticket,
      status: TICKET_STATUSES.find((s) => s.id === ticket.statusId) || null,
      priority: PRIORITIES.find((p) => p.id === ticket.priorityId) || null,
    }));

    return {
      totalTickets,
      openTickets,
      resolvedTickets,
      projectTickets,
      projectOpenTickets,
      projectResolvedTickets,
      totalUsers,
      recentTickets: mappedRecentTickets,
      recentUsers,
    };
  },
};

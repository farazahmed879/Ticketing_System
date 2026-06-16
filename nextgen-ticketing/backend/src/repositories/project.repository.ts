import prisma from "../prisma";
import { TICKET_STATUSES, PRIORITIES } from "../utils/constants";

export const projectRepository = {
  async findMany(params: any = {}) {
    const { departmentId, clientId, managerId, status, search } = params;
    const where: any = { deleted: false };

    if (departmentId) where.departmentId = departmentId;
    if (clientId) where.clientIds = { has: clientId };
    if (managerId) where.managerId = managerId;
    if (status) where.status = status;

    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { status: { contains: term, mode: "insensitive" } },
        { clients: { some: { fullname: { contains: term, mode: "insensitive" } } } },
      ];
    }

    return prisma.project.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        clients: { select: { id: true, fullname: true, image: true } },
        manager: { select: { id: true, fullname: true, image: true } },
        teams: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    const project = await prisma.project.findFirst({
      where: { id, deleted: false },
      include: {
        department: { select: { id: true, name: true } },
        clients: { select: { id: true, fullname: true, image: true } },
        manager: { select: { id: true, fullname: true, image: true } },
        teams: { select: { id: true, name: true } },
        tickets: {
          where: { deleted: false },
          select: {
            id: true,
            uid: true,
            subject: true,
            createdAt: true,
            statusId: true,
            priorityId: true,
            owner: { select: { id: true, fullname: true, image: true } },
            assignee: { select: { id: true, fullname: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) return null;

    const mappedTickets = project.tickets.map((ticket: any) => ({
      ...ticket,
      status: TICKET_STATUSES.find(s => s.id === ticket.statusId) || null,
      priority: PRIORITIES.find(p => p.id === ticket.priorityId) || null,
    }));

    return { ...project, tickets: mappedTickets };
  },

  async create(data: any) {
    // Convert teamIds → a relation connect so both sides of the m2m
    // (Project.teamIds and Team.projectIds) stay in sync.
    const { teamIds, ...rest } = data;
    return prisma.project.create({
      data: {
        ...rest,
        ...(Array.isArray(teamIds)
          ? { teams: { connect: teamIds.map((id: string) => ({ id })) } }
          : {}),
      },
      include: {
        department: true,
        clients: true,
        manager: true,
        teams: { select: { id: true, name: true } },
      },
    });
  },

  async update(id: string, data: any) {
    // `set` replaces the team list while keeping both sides of the m2m in sync.
    const { teamIds, ...rest } = data;
    return prisma.project.update({
      where: { id },
      data: {
        ...rest,
        ...(Array.isArray(teamIds)
          ? { teams: { set: teamIds.map((tid: string) => ({ id: tid })) } }
          : {}),
      },
      include: {
        department: true,
        clients: true,
        manager: true,
        teams: { select: { id: true, name: true } },
      },
    });
  },

  async delete(id: string) {
    return prisma.project.update({
      where: { id },
      data: { deleted: true },
    });
  },

  async findByIdWithMembers(id: string) {
    return prisma.project.findFirst({
      where: { id, deleted: false },
      include: {
        teams: {
          select: {
            name: true,
            teamLeadId: true,
            members: {
              select: {
                id: true,
                fullname: true,
                image: true,
                role: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  },
};

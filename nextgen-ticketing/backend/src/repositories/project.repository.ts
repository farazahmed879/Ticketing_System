import prisma from "../prisma";
import { TICKET_STATUSES, PRIORITIES } from "../utils/constants";

export const projectRepository = {
  async findMany(params: any = {}) {
    const { departmentId, clientId, managerId, teamLeadId, status } = params;
    const where: any = { deleted: false };
    
    if (departmentId) where.departmentId = departmentId;
    if (clientId) where.clientIds = { has: clientId };
    if (managerId) where.managerId = managerId;
    if (teamLeadId) where.teamLeadId = teamLeadId;
    if (status) where.status = status;

    return prisma.project.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        clients: { select: { id: true, fullname: true, image: true } },
        manager: { select: { id: true, fullname: true, image: true } },
        teamLead: { select: { id: true, fullname: true, image: true } },
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
        teamLead: { select: { id: true, fullname: true, image: true } },
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
    return prisma.project.create({
      data,
      include: {
        department: true,
        clients: true,
        manager: true,
        teamLead: true,
      },
    });
  },

  async update(id: string, data: any) {
    return prisma.project.update({
      where: { id },
      data,
      include: {
        department: true,
        clients: true,
        manager: true,
        teamLead: true,
      },
    });
  },

  async delete(id: string) {
    return prisma.project.update({
      where: { id },
      data: { deleted: true },
    });
  },
};

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
        qa: {
          select: { id: true, fullname: true, email: true, image: true },
        },
        group: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, managerId: true } },
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
        qa: {
          select: { id: true, fullname: true, email: true, image: true },
        },
        group: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, managerId: true } },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                fullname: true,
                image: true,
                role: { select: { name: true, isCustomer: true } },
              },
            },
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
        qa: true,
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
        qa: true,
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

  async findAdmins() {
    return prisma.user.findMany({
      where: {
        role: { name: RoleName.ADMIN },
        deleted: false,
      },
    });
  },

  async findTeamLeads() {
    return prisma.user.findMany({
      where: {
        isLead: true,
        deleted: false,
      },
      select: { id: true },
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

  // Project ids a manager manages (Project.managerId === user).
  async findManagedProjectIds(userId: string) {
    const projects = await prisma.project.findMany({
      where: { deleted: false, managerId: userId },
      select: { id: true },
    });
    return projects.map((p) => p.id);
  },

  // Project ids a client is attached to (Project.clientIds contains the user).
  async findClientProjectIds(userId: string) {
    const projects = await prisma.project.findMany({
      where: { deleted: false, clientIds: { has: userId } },
      select: { id: true },
    });
    return projects.map((p) => p.id);
  },

  // Members of every team this user is the lead of (used so team leads can see
  // and act on all tickets assigned to their team members). Returns an empty
  // array when the user leads no team. The lead is normally a member of their
  // own team, so they are typically included via memberIds.
  async findLedTeamMemberIds(userId: string) {
    const teams = await prisma.team.findMany({
      where: { deleted: false, teamLeadId: userId },
      select: { memberIds: true },
    });
    const ids = new Set<string>();
    for (const t of teams) {
      for (const m of t.memberIds) ids.add(m);
    }
    return Array.from(ids);
  },

  // Project ids of every team this user is the lead of (so a team lead can see
  // the unassigned tickets in their team's project(s)). Resolved from the
  // Project side (Project.teamIds) so it works even if Team.projectIds is not
  // in sync.
  async findLedTeamProjectIds(userId: string) {
    const ledTeams = await prisma.team.findMany({
      where: { deleted: false, teamLeadId: userId },
      select: { id: true },
    });
    const ledTeamIds = ledTeams.map((t) => t.id);
    if (!ledTeamIds.length) return [];
    const projects = await prisma.project.findMany({
      where: { deleted: false, teamIds: { hasSome: ledTeamIds } },
      select: { id: true },
    });
    return projects.map((p) => p.id);
  },

  // Teams used to resolve a ticket's team lead: any team that belongs to one of
  // the given projects. Returns each team's projects, members, and lead.
  // (memberIds is accepted for call-site compatibility but the lead is resolved
  // by project.)
  async findTeamsByMembersAndProjects(
    memberIds: string[],
    projectIds: string[],
  ) {
    if (!projectIds.length) return [];
    return prisma.team.findMany({
      where: {
        deleted: false,
        projectIds: { hasSome: projectIds },
      },
      select: { memberIds: true, projectIds: true, teamLeadId: true },
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

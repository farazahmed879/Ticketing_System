import prisma from "../prisma";
import { TICKET_STATUSES, PRIORITIES } from "../utils/constants";

export const projectRepository = {
  async findMany(params: any = {}, skip?: number, take?: number) {
    const { departmentId, clientId, managerId, teamMemberId, status, search } =
      params;
    const where: any = { deleted: false };

    if (departmentId) where.departmentId = departmentId;
    if (clientId) where.clientIds = { has: clientId };
    if (managerId) where.managerId = managerId;
    // Only projects whose team(s) include this user as a member.
    if (teamMemberId)
      where.teams = { some: { memberIds: { has: teamMemberId } } };
    if (status) where.status = status;

    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { status: { contains: term, mode: "insensitive" } },
        {
          clients: {
            some: { fullname: { contains: term, mode: "insensitive" } },
          },
        },
      ];
    }

    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        include: {
          department: { select: { id: true, name: true } },
          clients: { select: { id: true, fullname: true, image: true } },
          manager: { select: { id: true, fullname: true, image: true } },
          createdBy: { select: { id: true, fullname: true, image: true } },
          teams: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.project.count({ where }),
    ]);

    return { projects, total };
  },

  async findById(id: string) {
    const project = await prisma.project.findFirst({
      where: { id, deleted: false },
      include: {
        department: { select: { id: true, name: true } },
        clients: { select: { id: true, fullname: true, image: true } },
        manager: { select: { id: true, fullname: true, image: true } },
        createdBy: { select: { id: true, fullname: true, image: true } },
        teams: {
          select: {
            id: true,
            name: true,
            teamLead: { select: { id: true, fullname: true, image: true } },
          },
        },
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
      status: TICKET_STATUSES.find((s) => s.id === ticket.statusId) || null,
      priority: PRIORITIES.find((p) => p.id === ticket.priorityId) || null,
    }));

    return { ...project, tickets: mappedTickets };
  },

  async create(data: any) {
    // Convert teamIds → a relation connect so both sides of the m2m
    // (Project.teamIds and Team.projectIds) stay in sync.
    const { teamIds, ...rest } = data;
    // Project Manager is optional: normalize "" → null so Prisma leaves the
    // relation unset instead of rejecting an invalid ObjectId.
    if (!rest.managerId) rest.managerId = null;
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
    // Allow clearing the (optional) Project Manager by sending "" / null.
    if (rest.managerId !== undefined && !rest.managerId) rest.managerId = null;
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
                role: { select: { name: true, roleType: true } },
              },
            },
          },
        },
      },
    });
  },

  async getDeveloperHours(projectId: string, startDate?: string, endDate?: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, deleted: false },
      include: {
        teams: {
          select: {
            id: true,
            name: true,
            members: {
              select: {
                id: true,
                fullname: true,
                email: true,
                image: true,
                role: { select: { id: true, name: true, roleType: true } },
              },
            },
          },
        },
      },
    });

    if (!project) return null;

    const taskWhere: any = {
      OR: [
        { projectId },
        { ticket: { projectId } },
      ],
    };

    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }
      taskWhere.entry = {
        date: dateFilter,
      };
    }

    const tasks = await prisma.timesheetTask.findMany({
      where: taskWhere,
      include: {
        entry: {
          select: {
            id: true,
            date: true,
            userId: true,
            entryType: true,
            user: {
              select: {
                id: true,
                fullname: true,
                email: true,
                image: true,
                role: { select: { id: true, name: true, roleType: true } },
              },
            },
          },
        },
        ticket: {
          select: {
            id: true,
            uid: true,
            subject: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const devMap = new Map<string, any>();

    // Seed with project's assigned team members
    project.teams.forEach((team) => {
      team.members.forEach((member) => {
        if (!devMap.has(member.id)) {
          devMap.set(member.id, {
            id: member.id,
            fullname: member.fullname,
            email: member.email,
            image: member.image,
            role: member.role?.name || "Developer",
            teamNames: [team.name],
            totalHours: 0,
            taskCount: 0,
            recentTasks: [],
          });
        } else {
          const existing = devMap.get(member.id);
          if (!existing.teamNames.includes(team.name)) {
            existing.teamNames.push(team.name);
          }
        }
      });
    });

    let totalProjectHours = 0;

    tasks.forEach((task) => {
      const user = task.entry?.user;
      if (!user) return;

      const hours = Number(task.hours) || 0;
      totalProjectHours += hours;

      if (!devMap.has(user.id)) {
        devMap.set(user.id, {
          id: user.id,
          fullname: user.fullname,
          email: user.email,
          image: user.image,
          role: user.role?.name || "Developer",
          teamNames: [],
          totalHours: 0,
          taskCount: 0,
          recentTasks: [],
        });
      }

      const dev = devMap.get(user.id);
      dev.totalHours = Math.round((dev.totalHours + hours) * 100) / 100;
      dev.taskCount += 1;

      if (dev.recentTasks.length < 5) {
        dev.recentTasks.push({
          id: task.id,
          description: task.description,
          hours: task.hours,
          date: task.entry.date,
          ticket: task.ticket
            ? { id: task.ticket.id, uid: task.ticket.uid, subject: task.ticket.subject }
            : null,
        });
      }
    });

    totalProjectHours = Math.round(totalProjectHours * 100) / 100;

    const developers = Array.from(devMap.values())
      .map((dev) => ({
        ...dev,
        percentage:
          totalProjectHours > 0
            ? Math.round((dev.totalHours / totalProjectHours) * 100)
            : 0,
      }))
      .sort((a, b) => b.totalHours - a.totalHours || a.fullname.localeCompare(b.fullname));

    return {
      projectId,
      projectName: project.name,
      totalHours: totalProjectHours,
      developerCount: developers.length,
      developers,
    };
  },
};

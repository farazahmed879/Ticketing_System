import { requestRepository } from "../repositories/request.repository";
import { userRepository } from "../repositories/user.repository";
import prisma from "../prisma";

export const requestUsecase = {
  async getRequests(userId?: string) {
    const where: any = {};
    if (userId) where.userId = userId;
    return requestRepository.findMany(where);
  },

  async getRequestById(id: string) {
    return requestRepository.findById(id);
  },

  async checkUsersInSameTeam(userId1: string, userId2: string) {
    const teams1 = await (prisma as any).team.findMany({
      where: {
        OR: [{ memberIds: { has: userId1 } }, { managerId: userId1 }],
      },
      select: { id: true },
    });

    const teamIds1 = teams1.map((t: any) => t.id);

    const teams2 = await (prisma as any).team.findMany({
      where: {
        AND: [
          { id: { in: teamIds1 } },
          { OR: [{ memberIds: { has: userId2 } }, { managerId: userId2 }] },
        ],
      },
    });

    return teams2.length > 0;
  },

  async createRequest(data: {
    type: string;
    userId: string;
    message?: string;
    data?: any;
  }) {
    const request = await requestRepository.create({
      type: data.type,
      userId: data.userId,
      message: data.message,
      data: data.data,
      status: "PENDING",
    });

    const notifications = [];
    const creator = await userRepository.findById(data.userId);
    const admins = await userRepository.findAdmins();

    const targetUserIds = new Set<string>();

    // 1. Add all Admins (they see everything)
    admins.forEach((admin) => {
      if (admin.id !== data.userId) targetUserIds.add(admin.id);
    });

    // Fetch all teams where this user is either a member or a manager
    const allTeams = await (prisma as any).team.findMany({
      where: {
        OR: [{ memberIds: { has: data.userId } }, { managerId: data.userId }],
      },
      include: {
        manager: {
          select: { id: true, fullname: true, email: true },
        },
        members: {
          where: { deleted: false },
          include: { role: true },
        },
      },
    });

    if (allTeams.length > 0) {
      allTeams.forEach((team: any) => {
        // 2. Add Team Manager
        if (team.manager && team.manager.id !== data.userId) {
          targetUserIds.add(team.manager.id);
        }
      });
    }

    for (const targetId of targetUserIds) {
      const notification = await requestRepository.createNotification({
        title: "New Request Submitted",
        message: `${creator?.fullname || "A user"} has submitted a ${data.type.toLowerCase().replace("_", " ")} request.`,
        type: "request",
        userId: targetId,
        data: { requestId: request.id },
      });
      notifications.push({ userId: targetId, notification });
    }

    return { request, notifications };
  },

  async updateRequestStatus(id: string, status: string, message: string) {
    const request = await requestRepository.update(id, {
      status,
      message,
      updatedAt: new Date(),
    });

    let notification = null;
    if (request.userId) {
      notification = await requestRepository.createNotification({
        title: `Request ${status}`,
        message: `Your ${request.type
          .toLowerCase()
          .replace("_", " ")} request has been ${status.toLowerCase()}. ${
          message || ""
        }`,
        type: "request",
        userId: request.userId,
        data: { requestId: request.id },
      });
    }

    return { request, notification };
  },

  async deleteRequest(id: string) {
    return requestRepository.delete(id);
  },
};

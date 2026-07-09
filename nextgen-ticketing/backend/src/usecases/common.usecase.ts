import { commonRepository } from "../repositories/common.repository";
import { announcementRepository } from "../repositories/announcement.repository";
import { basePrisma as prisma } from "../prisma";
import { RoleType } from "../utils/constants";

export const commonUsecase = {
  async getStatuses() {
    return commonRepository.findStatuses();
  },

  async getPriorities() {
    return commonRepository.findPriorities();
  },

  async getTypes() {
    return commonRepository.findTypes();
  },

  async getRoles() {
    return commonRepository.findRoles();
  },

  async getGroups(limitStr: string, pageStr: string, type: string, userId?: string) {
    const limit = parseInt(limitStr) || 50;
    const page = parseInt(pageStr) || 0;
    const skip = page * limit;

    const targetUserId = type === "all" ? undefined : userId;
    return commonRepository.findGroups(skip, limit, targetUserId);
  },

  async createGroup(data: any) {
    const groupData = {
      name: data.name,
      memberIds: data.memberIds || [],
      isPublic: data.isPublic || false,
    };
    return commonRepository.createGroup(groupData);
  },

  async updateGroup(id: string, data: any) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.memberIds) updateData.memberIds = data.memberIds;
    if (typeof data.isPublic === "boolean") updateData.isPublic = data.isPublic;

    return commonRepository.updateGroup(id, updateData);
  },

  async deleteGroup(id: string) {
    const ticketCount = await commonRepository.countTicketsInGroup(id);
    if (ticketCount > 0) {
      throw new Error("Unable to delete group with tickets.");
    }
    return commonRepository.deleteGroup(id);
  },

  async getDashboardStats(user?: any) {
    const result = await commonRepository.getDashboardStats(user);

    let announcementsWhere: any = {};
    if (user?.role === RoleType.CUSTOMER) {
      announcementsWhere.authorId = user.id;
    }

    const [announcements, seenNotifications] = await Promise.all([
      announcementRepository.findMany(announcementsWhere, 0, -1),
      prisma.notification.findMany({
        where: {
          userId: user?.id,
          type: "seen_moment",
        },
      }),
    ]);

    const seenMomentIds = seenNotifications
      .map((n) => (n.data as any)?.momentId)
      .filter(Boolean);

    return {
      stats: {
        totalTickets: result.totalTickets,
        openTickets: result.openTickets,
        resolvedTickets: result.resolvedTickets,
        projectTickets: result.projectTickets,
        projectOpenTickets: result.projectOpenTickets,
        projectResolvedTickets: result.projectResolvedTickets,
        users: result.totalUsers,
      },
      recentTickets: result.recentTickets,
      newHires: result.recentUsers,
      announcements,
      seenMomentIds,
    };
  },

  async getSystemSettings() {
    // Upsert so there's always a settings row
    return prisma.systemSetting.upsert({
      where: { key: "global" },
      update: {},
      create: { key: "global" },
    });
  },

  async updateSystemSettings(data: any) {
    const updateData: any = {};
    if (typeof data.autoCloseDays === "number") {
      updateData.autoCloseDays = data.autoCloseDays;
    }
    if (typeof data.autoCloseEnabled === "boolean") {
      updateData.autoCloseEnabled = data.autoCloseEnabled;
    }
    if (typeof data.notificationRetentionDays === "number") {
      updateData.notificationRetentionDays = data.notificationRetentionDays;
    }
    if (typeof data.notificationRetentionEnabled === "boolean") {
      updateData.notificationRetentionEnabled = data.notificationRetentionEnabled;
    }
    return prisma.systemSetting.upsert({
      where: { key: "global" },
      update: updateData,
      create: { key: "global", ...updateData },
    });
  },
};

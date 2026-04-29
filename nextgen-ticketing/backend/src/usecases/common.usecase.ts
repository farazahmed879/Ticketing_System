import { commonRepository } from "../repositories/common.repository";

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

  async getDashboardStats() {
    const [totalTickets, openTickets, resolvedTickets, users, recentTickets] =
      await commonRepository.getDashboardStats();

    return {
      stats: { totalTickets, openTickets, resolvedTickets, users },
      recentTickets,
    };
  },
};

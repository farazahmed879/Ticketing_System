import { teamRepository } from "../repositories/team.repository";

export const teamUsecase = {
  async getTeams(limitStr: string = "25", pageStr: string = "0") {
    const limit = parseInt(limitStr);
    const page = parseInt(pageStr);
    const skip = page * limit;

    return teamRepository.findMany(skip, limit);
  },

  async createTeam(data: any) {
    const teamData = {
      name: data.name,
      memberIds: data.memberIds || [],
    };
    return teamRepository.create(teamData);
  },

  async updateTeam(id: string, data: any) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.memberIds) updateData.memberIds = data.memberIds;

    return teamRepository.update(id, updateData);
  },

  async deleteTeam(id: string) {
    return teamRepository.delete(id);
  },
};

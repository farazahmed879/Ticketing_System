import { teamRepository } from "../repositories/team.repository";
import { userRepository } from "../repositories/user.repository";

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
      managerId: data.managerId,
      memberIds: data.memberIds || [],
      projectIds: data.projectIds || [],
      departmentId: data.departmentId || null,
    };
    return teamRepository.create(teamData);
  },

  async updateTeam(id: string, data: any) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.managerId !== undefined) updateData.managerId = data.managerId;
    if (data.memberIds) updateData.memberIds = data.memberIds;
    if (data.projectIds) updateData.projectIds = data.projectIds;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId || null;

    return teamRepository.update(id, updateData);
  },

  async deleteTeam(id: string) {
    return teamRepository.delete(id);
  },

  async getMyTeam(userId: string) {
    const userData = await userRepository.findUserWithTeams(userId);
    if (!userData) throw new Error("User not found");

    // Merge member teams and managed teams, deduplicate by ID
    const allTeams = [...(userData.teams || []), ...(userData.managedTeams || [])];
    const uniqueTeams = allTeams.reduce((acc: any[], team: any) => {
      if (!acc.find((t: any) => t.id === team.id)) {
        acc.push(team);
      }
      return acc;
    }, []);

    return { teams: uniqueTeams, count: uniqueTeams.length };
  },
};

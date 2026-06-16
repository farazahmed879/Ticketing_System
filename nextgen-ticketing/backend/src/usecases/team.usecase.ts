import { teamRepository } from "../repositories/team.repository";
import { userRepository } from "../repositories/user.repository";

export const teamUsecase = {
  async getTeams(
    limitStr: string = "25",
    pageStr: string = "0",
    search?: string,
  ) {
    const limit = parseInt(limitStr);
    const page = parseInt(pageStr);

    // limit = -1 means "return all" (used by selects/option lists).
    if (limit === -1) return teamRepository.findMany(0, undefined, search);

    return teamRepository.findMany(page * limit, limit, search);
  },

  async getTeamById(id: string) {
    const team = await teamRepository.findById(id);
    if (!team) throw new Error("Team not found");
    return team;
  },

  async createTeam(data: any) {
    // The team lead is always a member of the team.
    const memberIds: string[] = Array.from(
      new Set([
        ...(data.memberIds || []),
        ...(data.teamLeadId ? [data.teamLeadId] : []),
      ]),
    );
    const teamData = {
      name: data.name,
      description: data.description || null,
      teamLeadId: data.teamLeadId || null,
      // Use connect (not a raw memberIds scalar) so both sides of the m2m
      // stay in sync — Team.memberIds AND each User.teamIds. Without this,
      // getMyTeam (which reads User.teams) would never see the team.
      members: { connect: memberIds.map((id) => ({ id })) },
    };
    return teamRepository.create(teamData);
  },

  async updateTeam(id: string, data: any) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description || null;
    if (data.teamLeadId !== undefined)
      updateData.teamLeadId = data.teamLeadId || null;
    // `set` replaces the member list while keeping both sides of the m2m synced.
    // The team lead is always kept in the member list.
    if (data.memberIds) {
      const memberIds: string[] = Array.from(
        new Set([
          ...(data.memberIds as string[]),
          ...(data.teamLeadId ? [data.teamLeadId] : []),
        ]),
      );
      updateData.members = {
        set: memberIds.map((mid) => ({ id: mid })),
      };
    } else if (data.teamLeadId) {
      // Lead changed without resending the member list — make sure the new
      // lead is still a member of the team.
      updateData.members = { connect: [{ id: data.teamLeadId }] };
    }

    return teamRepository.update(id, updateData);
  },

  async deleteTeam(id: string) {
    return teamRepository.delete(id);
  },

  async getMyTeam(userId: string) {
    const userData = await userRepository.findUserWithTeams(userId);
    if (!userData) throw new Error("User not found");

    // Merge member teams and led teams; deduplicate by ID
    const allTeams = [
      ...(userData.teams || []),
      ...((userData as any).ledTeams || []),
    ];
    const uniqueTeams = allTeams.reduce((acc: any[], team: any) => {
      if (!acc.find((t: any) => t.id === team.id)) {
        acc.push(team);
      }
      return acc;
    }, []);

    return { teams: uniqueTeams, count: uniqueTeams.length };
  },
};

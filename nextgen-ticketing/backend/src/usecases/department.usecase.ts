import { departmentRepository } from "../repositories/department.repository";

export const departmentUsecase = {
  async getDepartments() {
    return departmentRepository.findMany();
  },

  async createDepartment(data: any) {
    const deptData = {
      name: data.name,
      description: data.description,
      teamIds: data.teamIds || [],
      groupIds: data.groupIds || [],
      allGroups: data.allGroups || false,
    };
    return departmentRepository.create(deptData);
  },

  async updateDepartment(id: string, data: any) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.teamIds) updateData.teamIds = data.teamIds;
    if (data.groupIds) updateData.groupIds = data.groupIds;
    if (typeof data.allGroups === "boolean") updateData.allGroups = data.allGroups;

    return departmentRepository.update(id, updateData);
  },

  async deleteDepartment(id: string) {
    return departmentRepository.delete(id);
  },
};

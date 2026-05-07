import { departmentRepository } from "../repositories/department.repository";

export const departmentUsecase = {
  async getDepartments() {
    return departmentRepository.findMany();
  },

  async createDepartment(data: any) {
    const deptData = {
      name: data.name,
      description: data.description,
    };
    return departmentRepository.create(deptData);
  },

  async updateDepartment(id: string, data: any) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    return departmentRepository.update(id, updateData);
  },

  async deleteDepartment(id: string) {
    return departmentRepository.delete(id);
  },
};

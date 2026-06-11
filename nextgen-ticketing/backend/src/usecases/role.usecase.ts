import { roleRepository } from "../repositories/role.repository";

export const roleUsecase = {
  async getRoles(limit?: string, page?: string) {
    const take = limit ? parseInt(limit) : undefined;
    const skip = page && take ? parseInt(page) * take : undefined;

    const [roles, total] = await Promise.all([
      roleRepository.findMany(skip, take),
      roleRepository.count(),
    ]);

    return { roles, total };
  },

  async createRole(data: any) {
    const roleData = {
      name: data.name,
      description: data.description,
      roleType: data.isAdmin ? "isAdmin" :
                data.isAgent ? "isAgent" :
                data.isCustomer ? "isCustomer" :
                data.isEmployee ? "isEmployee" :
                data.isHR ? "isHR" :
                data.isQA ? "isQA" : "isEmployee",
      permissions: data.permissions || {},
    };
    return roleRepository.create(roleData);
  },

  async updateRole(id: string, data: any) {
    const roleData = {
      name: data.name,
      description: data.description,
      roleType: data.isAdmin ? "isAdmin" :
                data.isAgent ? "isAgent" :
                data.isCustomer ? "isCustomer" :
                data.isEmployee ? "isEmployee" :
                data.isHR ? "isHR" :
                data.isQA ? "isQA" : undefined,
      permissions: data.permissions || {},
    };
    return roleRepository.update(id, roleData);
  },

  async deleteRole(id: string) {
    const usersCount = await roleRepository.countUsers(id);
    if (usersCount > 0) {
      throw new Error("Cannot delete role assigned to users");
    }
    return roleRepository.delete(id);
  },
};

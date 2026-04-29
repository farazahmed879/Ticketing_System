import prisma from "../prisma";

export const roleRepository = {
  async findMany(skip?: number, take?: number) {
    return prisma.role.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
      skip,
      take,
    });
  },

  async count() {
    return prisma.role.count();
  },
  
  async findByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  },

  async create(data: any) {
    return prisma.role.create({ data });
  },

  async update(id: string, data: any) {
    return prisma.role.update({
      where: { id },
      data,
    });
  },

  async countUsers(roleId: string) {
    return prisma.user.count({ where: { roleId } });
  },

  async delete(id: string) {
    return prisma.role.delete({ where: { id } });
  },
};

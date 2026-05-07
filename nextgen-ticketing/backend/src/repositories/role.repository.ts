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
    return prisma.role.count({ where: { deleted: false } as any });
  },
  
  async findByName(name: string) {
    return prisma.role.findFirst({ where: { name, deleted: false } as any });
  },

  async findById(id: string) {
    return prisma.role.findFirst({
      where: { id, deleted: false } as any,
    });
  },

  async create(data: any) {
    return prisma.role.create({ data });
  },

  async update(id: string, data: any) {
    return prisma.role.update({
      where: { id } as any,
      data,
    });
  },

  async countUsers(roleId: string) {
    return prisma.user.count({ where: { roleId } });
  },

  async delete(id: string) {
    return prisma.role.update({
      where: { id } as any,
      data: { deleted: true } as any,
    });
  },
};

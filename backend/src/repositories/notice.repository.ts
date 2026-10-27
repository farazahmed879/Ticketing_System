import prisma from "../prisma";

export const noticeRepository = {
  async findMany() {
    return prisma.notice.findMany({
      where: { deleted: false } as any,
      orderBy: { createdAt: "desc" },
    });
  },

  async findActive() {
    return prisma.notice.findMany({
      where: { active: true, deleted: false } as any,
      orderBy: { updatedAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.notice.findFirst({
      where: { id, deleted: false } as any,
    });
  },

  async create(data: any) {
    return prisma.notice.create({ data } as any);
  },

  async update(id: string, data: any) {
    return prisma.notice.update({
      where: { id } as any,
      data,
    });
  },

  async deactivateAll() {
    return prisma.notice.updateMany({ data: { active: false } as any });
  },

  async delete(id: string) {
    return prisma.notice.update({
      where: { id } as any,
      data: { deleted: true } as any,
    });
  },
};

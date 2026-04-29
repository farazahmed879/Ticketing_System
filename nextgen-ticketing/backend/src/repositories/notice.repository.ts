import prisma from "../prisma";

export const noticeRepository = {
  async findMany() {
    return prisma.notice.findMany({ orderBy: { createdAt: "desc" } });
  },

  async create(data: any) {
    return prisma.notice.create({ data });
  },

  async update(id: string, data: any) {
    return prisma.notice.update({
      where: { id },
      data,
    });
  },

  async deactivateAll() {
    return prisma.notice.updateMany({ data: { active: false } });
  },

  async delete(id: string) {
    return prisma.notice.delete({ where: { id } });
  },
};

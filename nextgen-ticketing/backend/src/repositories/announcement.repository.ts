import prisma from "../prisma";

export const announcementRepository = {
  async findMany(where: any) {
    try {
      if (!(prisma as any).announcement) {
        console.error("Prisma Error: 'announcement' model not found on prisma client. Please run 'prisma generate'.");
        return [];
      }
      return await (prisma as any).announcement.findMany({
        where: { ...where, deleted: false },
        include: {
          author: {
            select: { 
              id: true, 
              fullname: true, 
              image: true,
              title: true,
              role: {
                select: { name: true }
              }
            },
          },
        },
        orderBy: { date: "desc" },
      });
    } catch (error) {
      console.error("AnnouncementRepository.findMany Error:", error);
      throw error;
    }
  },

  async findById(id: string) {
    return (prisma as any).announcement.findUnique({
      where: { id },
      include: {
        author: {
          select: { 
            id: true, 
            fullname: true, 
            image: true,
            title: true,
            role: {
              select: { name: true }
            }
          },
        },
      },
    });
  },

  async create(data: any) {
    return (prisma as any).announcement.create({
      data,
      include: {
        author: {
          select: { 
            id: true, 
            fullname: true, 
            image: true,
            title: true,
            role: {
              select: { name: true }
            }
          },
        },
      },
    });
  },

  async update(id: string, data: any) {
    return (prisma as any).announcement.update({
      where: { id },
      data,
      include: {
        author: {
          select: { id: true, fullname: true, image: true },
        },
      },
    });
  },

  async delete(id: string) {
    return (prisma as any).announcement.update({
      where: { id },
      data: { deleted: true },
    });
  },
};

import prisma from "../prisma";

export const userRepository = {
  async findMany(where: any, skip: number, take: number | undefined) {
    return prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullname: true,
        username: true,
        image: true,
        title: true,
        workNumber: true,
        mobileNumber: true,
        primaryContact: true,
        secondaryContact: true,
        cnic: true,
        linkedInUrl: true,
        gitUrl: true,
        address: true,
        emergencyContact: true,
        primaryResumeUrl: true,
        jpPatternResumeUrl: true,
        nationality: true,
        location: true,
        employeeType: true,
        branch: true,
        lastOnline: true,
        deleted: true,
        createdAt: true,
        role: true,
        groups: { select: { id: true, name: true } },
        teams: { select: { id: true, name: true } },
      },
      skip,
      take,
      orderBy: { fullname: "asc" },
    });
  },

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: { role: true } });
  },

  async create(data: any) {
    return prisma.user.create({ data, include: { role: true } });
  },

  async update(id: string, data: any) {
    return prisma.user.update({
      where: { id },
      data,
      include: {
        role: true,
        groups: { select: { id: true, name: true } },
        teams: { select: { id: true, name: true } },
      },
    });
  },

  async count(where: any) {
    return prisma.user.count({ where });
  },

  async findAdmins() {
    return prisma.user.findMany({
      where: {
        role: {
          name: "Admin"
        },
        deleted: false
      },
    });
  },

  async findUserWithTeams(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
            manager: {
              select: { id: true, fullname: true, email: true }
            },
            members: {
              where: { deleted: false },
              include: { role: true }
            }
          }
        },
        managedTeams: {
          include: {
            manager: {
              select: { id: true, fullname: true, email: true }
            },
            members: {
              where: { deleted: false },
              include: { role: true }
            }
          }
        }
      }
    });
  },
};

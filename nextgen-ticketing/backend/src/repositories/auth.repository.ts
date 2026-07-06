import prisma from "../prisma";
import { RoleName } from "../utils/constants";

export const authRepository = {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  },

  async findUserByUsername(username: string) {
    return prisma.user.findFirst({
      where: { username, deleted: false },
      include: { role: true },
    });
  },

  async findUserByEmailOrUsername(identifier: string) {
    // Login is only allowed via company email or username — never the
    // personal `email` field.
    return prisma.user.findFirst({
      where: {
        OR: [
          { companyEmail: identifier },
          { username: identifier },
        ],
        deleted: false,
      },
      include: { role: true },
    });
  },

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  },

  async findRoleByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  },

  async createRole(data: any) {
    return prisma.role.create({ data });
  },

  async createUser(data: any) {
    return prisma.user.create({
      data,
      include: { role: true },
    });
  },

  async createRequest(data: any) {
    return (prisma as any).userRequest.create({ data });
  },

  async findStaff() {
    return prisma.user.findMany({
      where: {
        OR: [
          { role: { name: RoleName.ADMIN } },
          { role: { name: RoleName.AGENT } },
        ],
        deleted: false,
      },
    });
  },

  async createNotification(data: any) {
    return prisma.notification.create({ data });
  },
};

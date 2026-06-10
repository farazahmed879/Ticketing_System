import prisma from "../prisma";

export const chatRepository = {
  async findRoomsByUserId(userId: string) {
    return prisma.chatRoom.findMany({
      where: { memberIds: { has: userId } },
      include: {
        members: {
          select: {
            id: true,
            fullname: true,
            email: true,
            image: true,
            lastOnline: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, fullname: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  async findRoomById(id: string) {
    return prisma.chatRoom.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            fullname: true,
            email: true,
            image: true,
            lastOnline: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: { select: { id: true, fullname: true, image: true } },
          },
        },
      },
    });
  },

  async findDirectRoom(userId: string, partnerId: string) {
    return prisma.chatRoom.findFirst({
      where: {
        isGroup: false,
        AND: [
          { memberIds: { has: userId } },
          { memberIds: { has: partnerId } },
        ],
      },
      include: {
        members: { select: { id: true, fullname: true, email: true, image: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  },

  async createRoom(data: any) {
    return prisma.chatRoom.create({
      data,
      include: {
        members: { select: { id: true, fullname: true, email: true, image: true } },
      },
    });
  },

  async updateRoom(id: string, data: any) {
    return prisma.chatRoom.update({
      where: { id },
      data,
      include: {
        members: { select: { id: true, fullname: true, email: true, image: true } },
      },
    });
  },

  async createMessage(data: any) {
    return prisma.chatMessage.create({
      data,
      include: {
        sender: { select: { id: true, fullname: true, image: true } },
      },
    });
  },

  async findUserWithRole(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  },

  async findStaffForChat(userId: string) {
    return prisma.user.findMany({
      where: {
        id: { not: userId },
        deleted: false,
        role: {
          OR: [
            { isAdmin: true },
            { isAgent: true },
            { name: { in: ["Admin", "Agent"], mode: "insensitive" } },
          ],
        },
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        image: true,
        role: { select: { name: true, isAdmin: true, isAgent: true } },
      },
    });
  },

  // Internal users only: Admin, Manager, Employee, HR (anyone who is not a
  // client). Used for the Employee chat partner list.
  async findInternalUsersForChat(userId: string) {
    return prisma.user.findMany({
      where: {
        id: { not: userId },
        deleted: false,
        role: { isCustomer: false },
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        image: true,
        role: { select: { name: true, isAdmin: true, isAgent: true } },
      },
    });
  },

  async findAdminsForChat() {
    return prisma.user.findMany({
      where: {
        deleted: false,
        role: {
          OR: [
            { isAdmin: true },
            { name: { equals: "Admin", mode: "insensitive" } },
          ],
        },
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        image: true,
        role: { select: { name: true, isAdmin: true, isAgent: true } },
      },
    });
  },

  async findAssignedCustomers(userId: string) {
    const tickets = await prisma.ticket.findMany({
      where: { assigneeId: userId },
      select: { ownerId: true },
    });
    const customerIds = [...new Set(tickets.map((t) => t.ownerId))];

    return prisma.user.findMany({
      where: { id: { in: customerIds }, deleted: false },
      select: {
        id: true,
        fullname: true,
        email: true,
        image: true,
        role: { select: { name: true, isAdmin: true, isAgent: true } },
      },
    });
  },

  async findAllUsersForChat(userId: string) {
    return prisma.user.findMany({
      where: { id: { not: userId }, deleted: false },
      select: {
        id: true,
        fullname: true,
        email: true,
        image: true,
        role: { select: { name: true, isAdmin: true, isAgent: true } },
      },
    });
  },
};

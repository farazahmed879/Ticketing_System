import prisma from "../prisma";
import { RoleType } from "../utils/constants";

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
            replyTo: {
              select: {
                id: true,
                body: true,
                sender: { select: { fullname: true } },
              },
            },
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
        members: {
          select: { id: true, fullname: true, email: true, image: true },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  },

  // Self-chat ("message yourself") room: a direct room whose only member is
  // the user. findDirectRoom can't be used for this — with partnerId ===
  // userId its two `has` conditions both match any room containing the user.
  async findSelfRoom(userId: string) {
    return prisma.chatRoom.findFirst({
      where: { isGroup: false, memberIds: { equals: [userId] } },
      include: {
        members: {
          select: { id: true, fullname: true, email: true, image: true },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  },

  async createRoom(data: any) {
    return prisma.chatRoom.create({
      data,
      include: {
        members: {
          select: { id: true, fullname: true, email: true, image: true },
        },
      },
    });
  },

  async updateRoom(id: string, data: any) {
    return prisma.chatRoom.update({
      where: { id },
      data,
      include: {
        members: {
          select: { id: true, fullname: true, email: true, image: true },
        },
      },
    });
  },

  // Messages the user hasn't seen in a room (optionally only after their
  // history cutoff). Raw command because Prisma's list-negation filters
  // (NOT+has / isEmpty) don't match Mongo docs where the array field is
  // missing (messages created before read receipts existed).
  async countUnseenMessages(roomId: string, userId: string, after?: Date) {
    const res: any = await prisma.$runCommandRaw({
      count: "ChatMessage",
      query: {
        roomId: { $oid: roomId },
        senderId: { $ne: { $oid: userId } },
        seenByIds: { $ne: { $oid: userId } },
        ...(after ? { createdAt: { $gt: { $date: after.toISOString() } } } : {}),
      },
    });
    return (res?.n as number) || 0;
  },

  // Mark every message in the room (not sent by the user) as seen by them.
  async markRoomSeen(roomId: string, userId: string) {
    return prisma.$runCommandRaw({
      update: "ChatMessage",
      updates: [
        {
          q: {
            roomId: { $oid: roomId },
            senderId: { $ne: { $oid: userId } },
            seenByIds: { $ne: { $oid: userId } },
          },
          u: { $addToSet: { seenByIds: { $oid: userId } } },
          multi: true,
        },
      ],
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
        deleted: false,
        OR: [
          { role: { roleType: { in: [RoleType.ADMIN, RoleType.AGENT] } } },
          // Everyone can message themselves.
          { id: userId },
        ],
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        image: true,
        role: { select: { name: true, roleType: true } },
      },
    });
  },

  // Internal users only: Admin, Manager, Employee, HR (anyone who is not a
  // client). Used for the Employee chat partner list.
  async findInternalUsersForChat(userId: string) {
    return prisma.user.findMany({
      where: {
        deleted: false,
        role: { roleType: { not: RoleType.CUSTOMER } },
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        image: true,
        role: { select: { name: true, roleType: true } },
      },
    });
  },

  async findAdminsForChat() {
    return prisma.user.findMany({
      where: {
        deleted: false,
        role: { roleType: RoleType.ADMIN },
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        image: true,
        role: { select: { name: true, roleType: true } },
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
        role: { select: { name: true, roleType: true } },
      },
    });
  },

  async findAllUsersForChat(_userId: string) {
    // Includes the caller — everyone can message themselves.
    return prisma.user.findMany({
      where: { deleted: false },
      select: {
        id: true,
        fullname: true,
        email: true,
        image: true,
        role: { select: { name: true, roleType: true } },
      },
    });
  },
};

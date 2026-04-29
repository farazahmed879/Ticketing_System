import { chatRepository } from "../repositories/chat.repository";
import prisma from "../prisma";

export const chatUsecase = {
  async getConversations(userId: string) {
    const rooms = await chatRepository.findRoomsByUserId(userId);

    return rooms.map((room: any) => {
      const partner = room.isGroup
        ? null
        : room.members.find((m: any) => m.id !== userId);
      const lastMsg = room.messages[0];
      const senderName = lastMsg?.sender?.fullname || "Someone";
      return {
        id: room.id,
        isGroup: room.isGroup,
        name: room.isGroup ? room.name : null,
        members: room.members,
        partner,
        recentMessage: lastMsg
          ? lastMsg.senderId === userId
            ? `You: ${lastMsg.body}`
            : `${senderName}: ${lastMsg.body}`
          : "New Conversation",
        updatedAt: room.updatedAt,
      };
    });
  },

  async getConversation(id: string, userId: string) {
    const room = await chatRepository.findRoomById(id);
    if (!room) throw new Error("Conversation not found");
    if (!room.memberIds.includes(userId)) throw new Error("Access denied");

    const partner = room.members.find((m: any) => m.id !== userId);
    return { ...room, partner };
  },

  async startConversation(userId: string, partnerId: string) {
    if (userId === partnerId) throw new Error("Cannot chat with yourself");

    const [me, partner] = await Promise.all([
      chatRepository.findUserWithRole(userId),
      chatRepository.findUserWithRole(partnerId),
    ]);

    if (!me || !partner) throw new Error("User not found");

    const isMeAdmin = me.role.isAdmin || me.role.name.toLowerCase() === "admin";
    const isMeAgent = me.role.isAgent || me.role.name.toLowerCase() === "agent";
    const isMeCustomer =
      me.role.isCustomer || me.role.name.toLowerCase() === "customer";
    const isMeEmployee =
      me.role.isEmployee || me.role.name.toLowerCase() === "employee";

    let allowed = false;

    if (isMeAdmin) {
      allowed = true;
    } else if (isMeCustomer) {
      if (partner.role.isAdmin || partner.role.name.toLowerCase() === "admin") {
        allowed = true;
      }
    } else if (isMeEmployee || isMeAgent) {
      if (
        partner.role.isAdmin ||
        partner.role.name.toLowerCase() === "admin" ||
        partner.role.isAgent ||
        partner.role.name.toLowerCase() === "agent"
      ) {
        allowed = true;
      } else if (
        partner.role.isCustomer ||
        partner.role.name.toLowerCase() === "customer"
      ) {
        const assignment = await (prisma as any).ticket.findFirst({
          where: { ownerId: partner.id, assigneeId: me.id },
        });
        if (assignment) allowed = true;
      }
    }

    if (!allowed) {
      throw new Error(
        "You do not have permission to start a conversation with this user"
      );
    }

    const existing = await chatRepository.findDirectRoom(userId, partnerId);
    if (existing) return existing;

    return chatRepository.createRoom({ memberIds: [userId, partnerId] });
  },

  async sendMessage(id: string, userId: string, body: string) {
    const message = await chatRepository.createMessage({
      body,
      senderId: userId,
      roomId: id,
    });

    await chatRepository.updateRoom(id, { updatedAt: new Date() });

    return message;
  },

  async getChatPartners(userId: string) {
    const me = await chatRepository.findUserWithRole(userId);
    if (!me) throw new Error("User not found");

    const isMeAdmin = me.role.isAdmin || me.role.name.toLowerCase() === "admin";
    const isMeAgent = me.role.isAgent || me.role.name.toLowerCase() === "agent";
    const isMeCustomer =
      me.role.isCustomer || me.role.name.toLowerCase() === "customer";
    const isMeEmployee =
      me.role.isEmployee || me.role.name.toLowerCase() === "employee";

    if (isMeAdmin) {
      return chatRepository.findAllUsersForChat(userId);
    } else if (isMeCustomer) {
      return chatRepository.findAdminsForChat();
    } else if (isMeEmployee || isMeAgent) {
      const staff = await chatRepository.findStaffForChat(userId);
      const customers = await chatRepository.findAssignedCustomers(userId);
      return [...staff, ...customers];
    }

    return [];
  },

  async createGroupChat(userId: string, name: string, memberIds: string[]) {
    const me = await chatRepository.findUserWithRole(userId);
    if (!me) throw new Error("User not found");

    const isAdmin = me.role.isAdmin || me.role.name.toLowerCase() === "admin";
    const isAgent = me.role.isAgent || me.role.name.toLowerCase() === "agent";
    if (!isAdmin && !isAgent) {
      throw new Error("Only Admins and Agents can create group chats");
    }

    const allMemberIds = [...new Set([userId, ...memberIds])];

    return chatRepository.createRoom({
      name: name.trim(),
      isGroup: true,
      memberIds: allMemberIds,
    });
  },

  async updateGroupMembers(
    id: string,
    userId: string,
    addMemberIds?: string[],
    removeMemberIds?: string[]
  ) {
    const me = await chatRepository.findUserWithRole(userId);
    if (!me) throw new Error("User not found");

    const isAdmin = me.role.isAdmin || me.role.name.toLowerCase() === "admin";
    const isAgent = me.role.isAgent || me.role.name.toLowerCase() === "agent";
    if (!isAdmin && !isAgent) {
      throw new Error("Only Admins and Agents can manage group members");
    }

    const room = await chatRepository.findRoomById(id);
    if (!room || !room.isGroup) throw new Error("Group not found");
    if (!room.memberIds.includes(userId)) throw new Error("Access denied");

    let newMemberIds = [...room.memberIds];
    if (addMemberIds?.length) {
      newMemberIds = [...new Set([...newMemberIds, ...addMemberIds])];
    }
    if (removeMemberIds?.length) {
      newMemberIds = newMemberIds.filter(
        (mid) => !removeMemberIds.includes(mid) || mid === userId
      );
    }

    return chatRepository.updateRoom(id, { memberIds: newMemberIds });
  },
};

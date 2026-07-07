import { chatRepository } from "../repositories/chat.repository";

export const chatUsecase = {
  async getConversations(userId: string) {
    const rooms = await chatRepository.findRoomsByUserId(userId);
    const visibleRooms = rooms.filter((r: any) => !(r.hiddenByIds || []).includes(userId));

    return visibleRooms.map((room: any) => {
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

    const isMeAdmin = me.role.isAdmin;
    const isMeAgent = me.role.isAgent;
    const isMeCustomer = me.role.isCustomer;
    const isMeEmployee = me.role.isEmployee;

    let allowed = false;

    if (isMeAdmin) {
      allowed = true;
    } else if (isMeCustomer) {
      if (
        partner.role.isAdmin ||
        partner.role.isAgent
      ) {
        allowed = true;
      }
    } else if (isMeEmployee) {
      // Employees may only chat with internal staff (Admin, Manager,
      // Employee, HR) — never clients.
      if (!partner.role.isCustomer) {
        allowed = true;
      }
    } else if (isMeAgent) {
      // Managers can chat with everyone.
      allowed = true;
    }

    if (!allowed) {
      throw new Error(
        "You do not have permission to start a conversation with this user",
      );
    }

    const existing = await chatRepository.findDirectRoom(userId, partnerId);
    if (existing) return existing;

    return chatRepository.createRoom({ memberIds: [userId, partnerId] });
  },

  async hideConversation(id: string, userId: string) {
    const room = await chatRepository.findRoomById(id);
    if (!room) throw new Error("Conversation not found");
    if (!room.memberIds.includes(userId)) throw new Error("Access denied");

    const hiddenByIds = Array.from(new Set([...((room as any).hiddenByIds || []), userId]));
    return chatRepository.updateRoom(id, { hiddenByIds });
  },

  async sendMessage(id: string, userId: string, body: string) {
    const message = await chatRepository.createMessage({
      body,
      senderId: userId,
      roomId: id,
    });

    await chatRepository.updateRoom(id, { updatedAt: new Date(), hiddenByIds: [] });

    return message;
  },

  async getChatPartners(userId: string) {
    const me = await chatRepository.findUserWithRole(userId);
    if (!me) throw new Error("User not found");

    const isMeAdmin = me.role.isAdmin;
    const isMeAgent = me.role.isAgent;
    const isMeCustomer = me.role.isCustomer;
    const isMeEmployee = me.role.isEmployee;

    if (isMeAdmin) {
      return chatRepository.findAllUsersForChat(userId);
    } else if (isMeCustomer) {
      return chatRepository.findStaffForChat(userId);
    } else if (isMeEmployee) {
      // Employees can only message internal staff: Admin, Manager, Employee, HR.
      return chatRepository.findInternalUsersForChat(userId);
    } else if (isMeAgent) {
      // Managers can chat with everyone (same as Admin).
      return chatRepository.findAllUsersForChat(userId);
    }

    return [];
  },

  async createGroupChat(userId: string, name: string, memberIds: string[]) {
    const me = await chatRepository.findUserWithRole(userId);
    if (!me) throw new Error("User not found");

    const isAdmin = me.role.isAdmin;
    const isAgent = me.role.isAgent;
    const isLead = (me as any).isLead === true;

    if (!isAdmin && !isAgent && !isLead) {
      throw new Error("Only Admins, Managers, and Team Leads can create group chats");
    }

    if (isLead && !isAdmin && !isAgent && memberIds?.length) {
      const addedUsers = await Promise.all(
        memberIds.map((mid) => chatRepository.findUserWithRole(mid))
      );
      const hasClient = addedUsers.some(
        (u: any) => u && u.role.isCustomer
      );
      if (hasClient) {
        throw new Error("Team Leads cannot add clients to a group chat");
      }
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
    removeMemberIds?: string[],
  ) {
    const me = await chatRepository.findUserWithRole(userId);
    if (!me) throw new Error("User not found");

    const isAdmin = me.role.isAdmin;
    const isAgent = me.role.isAgent;
    const isLead = (me as any).isLead === true;

    if (!isAdmin && !isAgent && !isLead) {
      throw new Error("Only Admins, Managers, and Team Leads can manage group members");
    }

    if (isLead && !isAdmin && !isAgent && addMemberIds?.length) {
      const addedUsers = await Promise.all(
        addMemberIds.map((mid) => chatRepository.findUserWithRole(mid))
      );
      const hasClient = addedUsers.some(
        (u: any) => u && u.role.isCustomer
      );
      if (hasClient) {
        throw new Error("Team Leads cannot add clients to a group chat");
      }
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
        (mid) => !removeMemberIds.includes(mid) || mid === userId,
      );
    }

    return chatRepository.updateRoom(id, { memberIds: newMemberIds });
  },
};

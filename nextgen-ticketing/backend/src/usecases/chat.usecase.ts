import { chatRepository } from "../repositories/chat.repository";
import { RoleType } from "../utils/constants";

// The Role model stores a single roleType string (the legacy isAdmin/isAgent/
// isCustomer/isEmployee booleans were removed in the role-type refactor).
const isAdminRole = (role: any) => role?.roleType === RoleType.ADMIN;
const isAgentRole = (role: any) => role?.roleType === RoleType.AGENT;
const isCustomerRole = (role: any) => role?.roleType === RoleType.CUSTOMER;

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

    let allowed = false;

    console.log("me.role", me.role);
    console.log("partner.role", partner.role);

    if (isAdminRole(me.role) || isAgentRole(me.role)) {
      // Admins and Managers can chat with everyone.
      allowed = true;
    } else if (isCustomerRole(me.role)) {
      if (isAdminRole(partner.role) || isAgentRole(partner.role)) {
        allowed = true;
      }
    } else {
      // Internal staff (Employee, HR, QA) may only chat with other internal
      // staff — never clients.
      if (!isCustomerRole(partner.role)) {
        allowed = true;
      }
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

    console.log("chat partners - me.role", me.role);

    if (isAdminRole(me.role) || isAgentRole(me.role)) {
      // Admins and Managers can chat with everyone.
      return chatRepository.findAllUsersForChat(userId);
    }

    if (isCustomerRole(me.role)) {
      return chatRepository.findStaffForChat(userId);
    }

    // Internal staff (Employee, HR, QA) can only message other internal staff.
    return chatRepository.findInternalUsersForChat(userId);
  },

  async createGroupChat(userId: string, name: string, memberIds: string[]) {
    const me = await chatRepository.findUserWithRole(userId);
    if (!me) throw new Error("User not found");

    const isAdmin = isAdminRole(me.role);
    const isAgent = isAgentRole(me.role);
    const isLead = (me as any).isLead === true;

    if (!isAdmin && !isAgent && !isLead) {
      throw new Error("Only Admins, Managers, and Team Leads can create group chats");
    }

    if (isLead && !isAdmin && !isAgent && memberIds?.length) {
      const addedUsers = await Promise.all(
        memberIds.map((mid) => chatRepository.findUserWithRole(mid))
      );
      const hasClient = addedUsers.some(
        (u: any) => u && isCustomerRole(u.role)
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

    const isAdmin = isAdminRole(me.role);
    const isAgent = isAgentRole(me.role);
    const isLead = (me as any).isLead === true;

    if (!isAdmin && !isAgent && !isLead) {
      throw new Error("Only Admins, Managers, and Team Leads can manage group members");
    }

    if (isLead && !isAdmin && !isAgent && addMemberIds?.length) {
      const addedUsers = await Promise.all(
        addMemberIds.map((mid) => chatRepository.findUserWithRole(mid))
      );
      const hasClient = addedUsers.some(
        (u: any) => u && isCustomerRole(u.role)
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

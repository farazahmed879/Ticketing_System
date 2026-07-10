import { chatRepository } from "../repositories/chat.repository";
import { RoleType } from "../utils/constants";

// The Role model stores a single roleType string (the legacy isAdmin/isAgent/
// isCustomer/isEmployee booleans were removed in the role-type refactor).
const isAdminRole = (role: any) => role?.roleType === RoleType.ADMIN;
const isAgentRole = (role: any) => role?.roleType === RoleType.AGENT;
const isCustomerRole = (role: any) => role?.roleType === RoleType.CUSTOMER;

// Preview label for attachment-only messages: the embedded filename for
// documents (`data:<mime>;name=<encoded>;base64,...`), a photo label for
// plain images.
function attachmentPreviewLabel(attachments?: string[]): string {
  if (!attachments || attachments.length === 0) return "";
  const m = /^data:([^;,]+)(?:;name=([^;,]*))?;base64,/i.exec(attachments[0]);
  const mime = m?.[1] || "";
  if (m?.[2]) {
    try {
      return decodeURIComponent(m[2]);
    } catch {
      return m[2];
    }
  }
  if (/^image\//i.test(mime)) {
    return attachments.length > 1
      ? `📷 ${attachments.length} Photos`
      : "📷 Photo";
  }
  return "📎 File";
}

export const chatUsecase = {
  async getConversations(userId: string) {
    const rooms = await chatRepository.findRoomsByUserId(userId);
    const visibleRooms = rooms.filter(
      (r: any) => !(r.hiddenByIds || []).includes(userId),
    );

    const conversations = await Promise.all(
      visibleRooms.map(async (room: any) => {
        const partner = room.isGroup
          ? null
          : room.members.find((m: any) => m.id !== userId);
        // Ignore messages from before this user's history cutoff (set when
        // they deleted the conversation).
        const clearedAt = (
          (room as any).clearedAtByUser as Record<string, string> | undefined
        )?.[userId];
        const latest = room.messages[0];
        const lastMsg =
          latest &&
          clearedAt &&
          new Date(latest.createdAt) <= new Date(clearedAt)
            ? null
            : latest;
        const senderName = lastMsg?.sender?.fullname || "Someone";
        const preview = lastMsg
          ? lastMsg.body || attachmentPreviewLabel((lastMsg as any).attachments)
          : "";
        // Unread badge comes from real read receipts, not the notification
        // center.
        const unseenCount = await chatRepository.countUnseenMessages(
          room.id,
          userId,
          clearedAt ? new Date(clearedAt) : undefined,
        );
        return {
          id: room.id,
          isGroup: room.isGroup,
          name: room.isGroup ? room.name : null,
          members: room.members,
          partner,
          recentMessage: lastMsg
            ? lastMsg.senderId === userId
              ? `You: ${preview}`
              : `${senderName}: ${preview}`
            : "New Conversation",
          updatedAt: room.updatedAt,
          unseenCount,
          // Direct chats only appear once they hold at least one message the
          // user can still see; groups stay visible even when empty.
          hasVisibleMessages: room.isGroup || !!lastMsg,
        };
      }),
    );
    return conversations
      .filter((c: any) => c.hasVisibleMessages)
      .map(({ hasVisibleMessages: _omit, ...conv }: any) => conv);
  },

  async getConversation(id: string, userId: string) {
    const room = await chatRepository.findRoomById(id);
    if (!room) throw new Error("Conversation not found");
    if (!room.memberIds.includes(userId)) throw new Error("Access denied");

    // Respect this user's history cutoff: messages from before they deleted
    // the conversation stay hidden for them.
    const clearedAt = (
      (room as any).clearedAtByUser as Record<string, string> | undefined
    )?.[userId];
    const messages = clearedAt
      ? room.messages.filter(
          (m: any) => new Date(m.createdAt) > new Date(clearedAt),
        )
      : room.messages;

    const partner = room.members.find((m: any) => m.id !== userId);
    return { ...room, messages, partner };
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

  // Deleting a conversation only removes it for the caller (via hiddenByIds);
  // the other members keep the conversation and its history. If the chat
  // resumes later, the caller only sees messages sent after their delete
  // (clearedAtByUser cutoff).
  async deleteConversation(id: string, userId: string) {
    const room = await chatRepository.findRoomById(id);
    if (!room) throw new Error("Conversation not found");
    if (!room.memberIds.includes(userId)) throw new Error("Access denied");

    const hiddenByIds = Array.from(
      new Set([...((room as any).hiddenByIds || []), userId]),
    );
    const clearedAtByUser = {
      ...(((room as any).clearedAtByUser as Record<string, string>) || {}),
      [userId]: new Date().toISOString(),
    };
    return chatRepository.updateRoom(id, { hiddenByIds, clearedAtByUser });
  },

  async hideConversation(id: string, userId: string) {
    const room = await chatRepository.findRoomById(id);
    if (!room) throw new Error("Conversation not found");
    if (!room.memberIds.includes(userId)) throw new Error("Access denied");

    const hiddenByIds = Array.from(
      new Set([...((room as any).hiddenByIds || []), userId]),
    );
    return chatRepository.updateRoom(id, { hiddenByIds });
  },

  async sendMessage(id: string, userId: string, body: string) {
    const message = await chatRepository.createMessage({
      body,
      senderId: userId,
      roomId: id,
    });

    await chatRepository.updateRoom(id, {
      updatedAt: new Date(),
      hiddenByIds: [],
    });

    return message;
  },

  async getChatPartners(userId: string) {
    const me = await chatRepository.findUserWithRole(userId);
    if (!me) throw new Error("User not found");

    console.log("chat partners - me.role", me.role.roleType);

    if (isAdminRole(me.role) || isAgentRole(me.role)) {
      // Admins and Managers can chat with everyone.
      console.log("Admin or Agent");
      return chatRepository.findAllUsersForChat(userId);
    }

    if (isCustomerRole(me.role)) {
      console.log("Client");
      return chatRepository.findStaffForChat(userId);
    }

    console.log("i am normal user");
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
      throw new Error(
        "Only Admins, Managers, and Team Leads can create group chats",
      );
    }

    if (isLead && !isAdmin && !isAgent && memberIds?.length) {
      const addedUsers = await Promise.all(
        memberIds.map((mid) => chatRepository.findUserWithRole(mid)),
      );
      const hasClient = addedUsers.some(
        (u: any) => u && isCustomerRole(u.role),
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
      throw new Error(
        "Only Admins, Managers, and Team Leads can manage group members",
      );
    }

    if (isLead && !isAdmin && !isAgent && addMemberIds?.length) {
      const addedUsers = await Promise.all(
        addMemberIds.map((mid) => chatRepository.findUserWithRole(mid)),
      );
      const hasClient = addedUsers.some(
        (u: any) => u && isCustomerRole(u.role),
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

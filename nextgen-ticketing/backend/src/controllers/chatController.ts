import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient() as any; // cast to any to handle schema fields before client regeneration

// Get all conversations for the logged-in user
export const getConversations = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const rooms = await prisma.chatRoom.findMany({
      where: { memberIds: { has: userId } },
      include: {
        members: { select: { id: true, fullname: true, email: true, image: true, lastOnline: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, fullname: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const conversations = rooms.map((room: any) => {
      const partner = room.isGroup ? null : room.members.find((m: any) => m.id !== userId);
      const lastMsg = room.messages[0];
      const senderName = lastMsg?.sender?.fullname || 'Someone';
      return {
        id: room.id,
        isGroup: room.isGroup,
        name: room.isGroup ? room.name : null,
        members: room.members,
        partner,
        recentMessage: lastMsg
          ? (lastMsg.senderId === userId ? `You: ${lastMsg.body}` : `${senderName}: ${lastMsg.body}`)
          : 'New Conversation',
        updatedAt: room.updatedAt,
      };
    });

    res.json({ success: true, conversations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single conversation with messages
export const getConversation = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const room = await prisma.chatRoom.findUnique({
      where: { id: id as string },
      include: {
        members: { select: { id: true, fullname: true, email: true, image: true, lastOnline: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, fullname: true, image: true } } },
        },
      },
    });

    if (!room) return res.status(404).json({ message: 'Conversation not found' });
    if (!room.memberIds.includes(userId)) return res.status(403).json({ message: 'Access denied' });

    const partner = room.members.find((m: any) => m.id !== userId);
    res.json({ success: true, conversation: { ...room, partner } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Start or get existing conversation with a user
export const startConversation = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { partnerId } = req.body;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (userId === partnerId) return res.status(400).json({ message: 'Cannot chat with yourself' });

  try {
    // Fetch both users with their roles to check permissions
    const [me, partner] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, include: { role: true } }),
      prisma.user.findUnique({ where: { id: partnerId }, include: { role: true } })
    ]);

    if (!me || !partner) return res.status(404).json({ message: 'User not found' });

    const isMeAdmin = me.role.isAdmin || me.role.name.toLowerCase() === 'admin';
    const isMeAgent = me.role.isAgent || me.role.name.toLowerCase() === 'agent';
    const isMeCustomer = me.role.isCustomer || me.role.name.toLowerCase() === 'customer';
    const isMeEmployee = me.role.isEmployee || me.role.name.toLowerCase() === 'employee';

    // RBAC: Chat Permissions
    let allowed = false;

    if (isMeAdmin) {
      // Admin can chat with all non-deleted users except self
      allowed = true;
    } else if (isMeCustomer) {
      // Customer can ONLY initiate chat with Admin
      if (partner.role.isAdmin || partner.role.name.toLowerCase() === 'admin') {
        allowed = true;
      }
    } else if (isMeEmployee || isMeAgent) {
      // Employee/Agent can chat with Admin or other Agents
      if (partner.role.isAdmin || partner.role.name.toLowerCase() === 'admin' || partner.role.isAgent || partner.role.name.toLowerCase() === 'agent') {
        allowed = true;
      } else if (partner.role.isCustomer || partner.role.name.toLowerCase() === 'customer') {
        // Can chat with customer only if assigned to their ticket
        const assignment = await prisma.ticket.findFirst({
          where: { ownerId: partner.id, assigneeId: me.id }
        });
        if (assignment) allowed = true;
      }
    }

    if (!allowed) {
      return res.status(403).json({ message: 'You do not have permission to start a conversation with this user' });
    }

    // Check if a room already exists between these two users
    const existing = await prisma.chatRoom.findFirst({
      where: {
        AND: [
          { memberIds: { has: userId } },
          { memberIds: { has: partnerId } },
        ],
      },
      include: { 
        members: { select: { id: true, fullname: true, email: true, image: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
    });

    if (existing) return res.json({ success: true, conversation: existing });

    const room = await prisma.chatRoom.create({
      data: { memberIds: [userId, partnerId] },
      include: { members: { select: { id: true, fullname: true, email: true, image: true } } },
    });

    res.status(201).json({ success: true, conversation: room });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Send a message (REST fallback — primary is Socket.io)
export const sendMessage = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { body } = req.body;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const message = await prisma.chatMessage.create({
      data: { body, senderId: userId, roomId: id as string },
      include: { sender: { select: { id: true, fullname: true, image: true } } },
    });

    // Update room timestamp
    await prisma.chatRoom.update({ where: { id: id as string }, data: { updatedAt: new Date() } });

    res.status(201).json({ success: true, message });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
// Get users that the current user is allowed to start a chat with
export const getChatPartners = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const me = await prisma.user.findUnique({ 
      where: { id: userId }, 
      include: { role: true } 
    });

    if (!me) return res.status(404).json({ message: 'User not found' });

    let users: any[] = [];
    const isMeAdmin = me.role.isAdmin || me.role.name.toLowerCase() === 'admin';
    const isMeAgent = me.role.isAgent || me.role.name.toLowerCase() === 'agent';
    const isMeCustomer = me.role.isCustomer || me.role.name.toLowerCase() === 'customer';
    const isMeEmployee = me.role.isEmployee || me.role.name.toLowerCase() === 'employee';

    if (isMeAdmin) {
      // Admin can chat with all non-deleted users except self
      users = await prisma.user.findMany({
        where: { id: { not: userId }, deleted: false },
        select: { id: true, fullname: true, email: true, image: true, role: { select: { name: true, isAdmin: true, isAgent: true } } }
      });
    } else if (isMeCustomer) {
      // Customer can ONLY see/initiate chat with Admin
      users = await prisma.user.findMany({
        where: { 
          deleted: false,
          role: { 
            OR: [
              { isAdmin: true }, 
              { name: { equals: 'Admin', mode: 'insensitive' } }
            ] 
          }
        },
        select: { id: true, fullname: true, email: true, image: true, role: { select: { name: true, isAdmin: true, isAgent: true } } }
      });
    } else if (isMeEmployee || isMeAgent) {
      // Employee/Agent can chat with Admin, other Agents, and assigned Customers
      
      // 1. Get Admins and Agents
      const staff = await prisma.user.findMany({
        where: { 
          id: { not: userId },
          deleted: false,
          role: { 
            OR: [
              { isAdmin: true }, 
              { isAgent: true },
              { name: { in: ['Admin', 'Agent'], mode: 'insensitive' } }
            ] 
          }
        },
        select: { id: true, fullname: true, email: true, image: true, role: { select: { name: true, isAdmin: true, isAgent: true } } }
      });

      // 2. Get Assigned Customers
      const tickets = await prisma.ticket.findMany({
        where: { assigneeId: userId },
        select: { ownerId: true }
      });
      const customerIds = [...new Set(tickets.map((t: any) => t.ownerId))];
      
      const customers = await prisma.user.findMany({
        where: { id: { in: customerIds }, deleted: false },
        select: { id: true, fullname: true, email: true, image: true, role: { select: { name: true, isAdmin: true, isAgent: true } } }
      });

      users = [...staff, ...customers];
    }

    res.json({ success: true, partners: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
// Create a group chat (Admin or Agent only)
export const createGroupChat = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const { name, memberIds } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'Group name is required' });
  if (!memberIds || memberIds.length < 1) return res.status(400).json({ message: 'At least one other member required' });

  try {
    const me = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!me) return res.status(404).json({ message: 'User not found' });

    const isAdmin = me.role.isAdmin || me.role.name.toLowerCase() === 'admin';
    const isAgent = me.role.isAgent || me.role.name.toLowerCase() === 'agent';
    if (!isAdmin && !isAgent) {
      return res.status(403).json({ message: 'Only Admins and Agents can create group chats' });
    }

    const allMemberIds = [...new Set([userId, ...memberIds])];

    const room = await prisma.chatRoom.create({
      data: {
        name: name.trim(),
        isGroup: true,
        memberIds: allMemberIds,
      },
      include: {
        members: { select: { id: true, fullname: true, email: true, image: true } },
      },
    });

    res.status(201).json({ success: true, conversation: room });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update group members (add or remove) — Admin or Agent only
export const updateGroupMembers = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const id = req.params.id as string;
  const { addMemberIds, removeMemberIds } = req.body as { addMemberIds?: string[], removeMemberIds?: string[] };
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const me = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!me) return res.status(404).json({ message: 'User not found' });

    const isAdmin = me.role.isAdmin || me.role.name.toLowerCase() === 'admin';
    const isAgent = me.role.isAgent || me.role.name.toLowerCase() === 'agent';
    if (!isAdmin && !isAgent) {
      return res.status(403).json({ message: 'Only Admins and Agents can manage group members' });
    }

    const room = await prisma.chatRoom.findUnique({ where: { id } });
    if (!room || !room.isGroup) return res.status(404).json({ message: 'Group not found' });
    if (!room.memberIds.includes(userId)) return res.status(403).json({ message: 'Access denied' });

    let newMemberIds = [...room.memberIds];
    if (addMemberIds?.length) {
      newMemberIds = [...new Set([...newMemberIds, ...addMemberIds])];
    }
    if (removeMemberIds?.length) {
      // Never remove yourself as a safety guard
      newMemberIds = newMemberIds.filter(mid => !removeMemberIds.includes(mid) || mid === userId);
    }

    const updated = await prisma.chatRoom.update({
      where: { id },
      data: { memberIds: newMemberIds },
      include: { members: { select: { id: true, fullname: true, email: true, image: true } } },
    });

    res.json({ success: true, conversation: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

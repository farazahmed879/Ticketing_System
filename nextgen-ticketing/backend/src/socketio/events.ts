import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { SocketEvent } from '../utils/constants';

// Using centralized prisma client

import { OnlineUser } from '../types';

const onlineUsers: Map<string, OnlineUser> = new Map();

export function setupSocketEvents(io: Server) {
  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`User connected: ${user.id} (${socket.id})`);

    // Track online user
    const existing = onlineUsers.get(user.id);
    if (existing) {
      existing.socketIds.push(socket.id);
    } else {
      onlineUsers.set(user.id, {
        userId: user.id,
        fullname: '',
        socketIds: [socket.id],
        status: 'active',
      });
    }

    // Broadcast online users
    broadcastOnlineUsers(io);

    // ========== CHAT EVENTS ==========
    socket.on(SocketEvent.CHAT_SEND, async (data: { roomId: string; body: string }) => {
      try {
        const message = await prisma.chatMessage.create({
          data: { body: data.body, senderId: user.id, roomId: data.roomId },
          include: { sender: { select: { id: true, fullname: true, image: true } } },
        });
        await prisma.chatRoom.update({ where: { id: data.roomId }, data: { updatedAt: new Date() } });

        // Get room members and emit to them
        const room = await prisma.chatRoom.findUnique({ where: { id: data.roomId } });
        if (room) {
          for (const memberId of room.memberIds) {
            // Send message via socket
            const memberOnline = onlineUsers.get(memberId);
            if (memberOnline) {
              memberOnline.socketIds.forEach((sid) => {
                io.to(sid).emit(SocketEvent.CHAT_RECEIVE, { roomId: data.roomId, message });
              });
            }

            // Create notification for other members
            if (memberId !== user.id) {
              const notification = await prisma.notification.create({
                data: {
                  title: 'New Message',
                  message: `${message.sender.fullname} sent a message: "${data.body.substring(0, 50)}${data.body.length > 50 ? '...' : ''}"`,
                  type: 'message',
                  userId: memberId,
                  data: { roomId: data.roomId, senderId: user.id }
                }
              });
              emitNotificationToUser(io, memberId, notification);
            }
          }
        }
      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    socket.on(SocketEvent.CHAT_TYPING, (data: { roomId: string; toUserId: string }) => {
      const target = onlineUsers.get(data.toUserId);
      if (target) {
        target.socketIds.forEach((sid) => {
          io.to(sid).emit(SocketEvent.CHAT_TYPING, { roomId: data.roomId, userId: user.id });
        });
      }
    });

    socket.on(SocketEvent.CHAT_STOP_TYPING, (data: { roomId: string; toUserId: string }) => {
      const target = onlineUsers.get(data.toUserId);
      if (target) {
        target.socketIds.forEach((sid) => {
          io.to(sid).emit(SocketEvent.CHAT_STOP_TYPING, { roomId: data.roomId, userId: user.id });
        });
      }
    });

    // ========== NOTIFICATION EVENTS ==========
    socket.on(SocketEvent.NOTIFICATIONS_GET, async () => {
      try {
        const [items, count] = await Promise.all([
          prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
          prisma.notification.count({ where: { userId: user.id, unread: true } }),
        ]);
        socket.emit(SocketEvent.NOTIFICATIONS_UPDATE, { items, count });
      } catch {
        socket.emit('notifications:error', { message: 'Failed to load notifications' });
      }
    });

    socket.on('notifications:markRead', async (notificationId: string) => {
      try {
        await prisma.notification.update({ where: { id: notificationId }, data: { unread: false } });
        const count = await prisma.notification.count({ where: { userId: user.id, unread: true } });
        socket.emit(SocketEvent.NOTIFICATIONS_UPDATE, { count });
      } catch {}
    });
    
    socket.on('notifications:markAllRead', async () => {
      try {
        await prisma.notification.updateMany({ 
          where: { userId: user.id, unread: true }, 
          data: { unread: false } 
        });
        socket.emit(SocketEvent.NOTIFICATIONS_UPDATE, { count: 0 });
      } catch {}
    });

    socket.on('notifications:clear', async () => {
      try {
        await prisma.notification.deleteMany({ where: { userId: user.id } });
        socket.emit(SocketEvent.NOTIFICATIONS_UPDATE, { items: [], count: 0 });
      } catch {}
    });

    // ========== TICKET EVENTS ==========
    socket.on(SocketEvent.TICKET_UPDATED, (data: { ticketId: string }) => {
      io.emit(SocketEvent.TICKET_UPDATED, data);
    });

    // ========== ONLINE STATUS ==========
    socket.on('status:set', (data: { status: 'active' | 'idle' }) => {
      const u = onlineUsers.get(user.id);
      if (u) {
        u.status = data.status;
        broadcastOnlineUsers(io);
      }
    });

    // ========== DISCONNECT ==========
    socket.on('disconnect', () => {
      const u = onlineUsers.get(user.id);
      if (u) {
        u.socketIds = u.socketIds.filter((sid) => sid !== socket.id);
        if (u.socketIds.length === 0) {
          onlineUsers.delete(user.id);
          // Update lastOnline
          prisma.user.update({ where: { id: user.id }, data: { lastOnline: new Date() } }).catch(() => {});
        }
        broadcastOnlineUsers(io);
      }
      console.log(`User disconnected: ${user.id} (${socket.id})`);
    });
  });
}

function broadcastOnlineUsers(io: Server) {
  const users = Array.from(onlineUsers.values()).map((u) => ({
    userId: u.userId,
    status: u.status,
  }));
  io.emit(SocketEvent.USERS_ONLINE, users);
}

// Helper: send notification to a specific user via socket
export function emitNotificationToUser(io: Server, userId: string, notification: any) {
  const user = onlineUsers.get(userId);
  if (user) {
    user.socketIds.forEach((sid) => {
      io.to(sid).emit(SocketEvent.NOTIFICATIONS_NEW, notification);
    });
  }
}

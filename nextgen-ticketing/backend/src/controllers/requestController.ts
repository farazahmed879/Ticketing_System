import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient() as any;

export const getRequests = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // Only Admin and Agent can see requests
    if (user.role !== 'Admin' && user.role !== 'Agent') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const requests = await prisma.userRequest.findMany({
      include: {
        user: { select: { id: true, fullname: true, email: true, image: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, requests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateRequestStatus = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;
  const { status, message } = req.body;

  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    if (user.role !== 'Admin' && user.role !== 'Agent') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const request = await prisma.userRequest.update({
      where: { id },
      data: { status, message, updatedAt: new Date() },
      include: { user: true }
    });

    // Create a notification for the user who made the request
    if (request.userId) {
      await prisma.notification.create({
        data: {
          title: `Request ${status}`,
          message: `Your ${request.type.toLowerCase().replace('_', ' ')} request has been ${status.toLowerCase()}. ${message || ''}`,
          type: 'request',
          userId: request.userId,
          data: { requestId: request.id }
        }
      });
    }

    res.json({ success: true, request });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteRequest = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!user || user.role !== 'Admin') return res.status(401).json({ message: 'Unauthorized' });

  try {
    await prisma.userRequest.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

import { Request, Response } from "express";
import { announcementRepository } from "../repositories/announcement.repository";
import { RoleType } from "../utils/constants";
import prisma from "../prisma";

export const announcementController = {
  async getAnnouncements(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const skip = (page - 1) * limit;

      const user = (req as any).user;
      let where: any = {};

      if (user.role !== RoleType.ADMIN && user.role !== RoleType.AGENT) {
        where.authorId = user.id;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const [announcements, total] = await Promise.all([
        announcementRepository.findMany(where, skip, limit),
        announcementRepository.count(where),
      ]);

      res.json({
        announcements,
        pagination: {
          total,
          page,
          limit,
          totalPages: limit === -1 ? 1 : Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async getDashboardAnnouncements(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const skip = (page - 1) * limit;

      const user = (req as any).user;
      let where: any = {};

      if (user.role === RoleType.CUSTOMER) {
        where.authorId = user.id;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const [announcements, total, seenNotifications] = await Promise.all([
        announcementRepository.findMany(where, skip, limit),
        announcementRepository.count(where),
        prisma.notification.findMany({
          where: {
            userId: user.id,
            type: "seen_moment",
          },
        }),
      ]);

      const seenMomentIds = seenNotifications
        .map((n) => (n.data as any)?.momentId)
        .filter(Boolean);

      res.json({
        announcements,
        seenMomentIds,
        pagination: {
          total,
          page,
          limit,
          totalPages: limit === -1 ? 1 : Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async markMomentAsSeen(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const notifications = await prisma.notification.findMany({
        where: {
          userId: user.id,
          type: "seen_moment",
        },
      });

      const alreadySeen = notifications.some((n) => (n.data as any)?.momentId === id);

      if (!alreadySeen) {
        await prisma.notification.create({
          data: {
            title: "Seen Moment",
            message: `User has seen moment of joy ${id}`,
            type: "seen_moment",
            unread: false,
            userId: user.id,
            data: { momentId: id },
          },
        });
      }

      res.json({ message: "Moment marked as seen" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async getAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const announcement = await announcementRepository.findById(id as string);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }

      if (
        user.role !== RoleType.ADMIN &&
        user.role !== RoleType.AGENT &&
        announcement.authorId !== user.id
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json({ announcement });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async createAnnouncement(req: Request, res: Response) {
    try {
      const { title, description, date, type, projectId, shouldPopout } = req.body;
      const authorId = (req as any).user.id;

      const announcement = await announcementRepository.create({
        title,
        description,
        date: new Date(date),
        type,
        authorId,
        projectId: projectId || null,
        shouldPopout: !!shouldPopout,
      });

      res.status(201).json({ announcement });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async updateAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, date, type, projectId, shouldPopout } = req.body;
      const user = (req as any).user;

      const existing = await announcementRepository.findById(id as string);
      if (!existing) {
        return res.status(404).json({ message: "Announcement not found" });
      }

      if (
        user.role !== RoleType.ADMIN &&
        user.role !== RoleType.AGENT &&
        existing.authorId !== user.id
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      const announcement = await announcementRepository.update(id as string, {
        title,
        description,
        date: date ? new Date(date) : undefined,
        type,
        projectId: projectId || null,
        shouldPopout: shouldPopout !== undefined ? !!shouldPopout : undefined,
      });

      res.json({ announcement });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async deleteAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const existing = await announcementRepository.findById(id as string);
      if (!existing) {
        return res.status(404).json({ message: "Announcement not found" });
      }

      if (
        user.role !== RoleType.ADMIN &&
        user.role !== RoleType.AGENT &&
        existing.authorId !== user.id
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      await announcementRepository.delete(id as string);
      res.json({ message: "Announcement deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};

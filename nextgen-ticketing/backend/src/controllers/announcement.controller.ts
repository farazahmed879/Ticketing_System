import { Request, Response } from "express";
import { announcementRepository } from "../repositories/announcement.repository";

export const announcementController = {
  async getAnnouncements(req: Request, res: Response) {
    try {
      const announcements = await announcementRepository.findMany({});
      res.json({ announcements });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async getAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const announcement = await announcementRepository.findById(id as string);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      res.json({ announcement });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async createAnnouncement(req: Request, res: Response) {
    try {
      const { title, description, date, type } = req.body;
      const authorId = (req as any).user.id;

      const announcement = await announcementRepository.create({
        title,
        description,
        date: new Date(date),
        type,
        authorId,
      });

      res.status(201).json({ announcement });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async updateAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, date, type } = req.body;

      const announcement = await announcementRepository.update(id as string, {
        title,
        description,
        date: date ? new Date(date) : undefined,
        type,
      });

      res.json({ announcement });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async deleteAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await announcementRepository.delete(id as string);
      res.json({ message: "Announcement deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};

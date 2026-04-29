import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { noticeUsecase } from "../usecases/notice.usecase";

export const noticeController = {
  async getNotices(req: Request, res: Response) {
    try {
      const notices = await noticeUsecase.getNotices();
      res.json({ success: true, notices });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createNotice(req: AuthRequest, res: Response) {
    try {
      const notice = await noticeUsecase.createNotice(req.body);
      res.status(201).json({ success: true, notice });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateNotice(req: AuthRequest, res: Response) {
    try {
      const notice = await noticeUsecase.updateNotice(req.params.id as string, req.body);
      res.json({ success: true, notice });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async activateNotice(req: AuthRequest, res: Response) {
    try {
      const notice = await noticeUsecase.activateNotice(req.params.id as string);
      res.json({ success: true, notice });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async clearNotices(req: AuthRequest, res: Response) {
    try {
      await noticeUsecase.clearNotices();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteNotice(req: AuthRequest, res: Response) {
    try {
      await noticeUsecase.deleteNotice(req.params.id as string);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

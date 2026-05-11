import { Response } from "express";
import { AuthRequest } from "../types";
import { chatUsecase } from "../usecases/chat.usecase";

export const chatController = {
  async getConversations(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const conversations = await chatUsecase.getConversations(userId);
      res.json({ success: true, conversations });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getConversation(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const conversation = await chatUsecase.getConversation(
        req.params.id as string,
        userId,
      );
      res.json({ success: true, conversation });
    } catch (error: any) {
      const status =
        error.message === "Conversation not found"
          ? 404
          : error.message === "Access denied"
            ? 403
            : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async startConversation(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const conversation = await chatUsecase.startConversation(
        userId,
        req.body.partnerId,
      );
      const status = (conversation as any).createdAt ? 201 : 200;
      res.status(status).json({ success: true, conversation });
    } catch (error: any) {
      const status =
        error.message.includes("permission") ||
        error.message.includes("yourself")
          ? 403
          : error.message === "User not found"
            ? 404
            : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async sendMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const message = await chatUsecase.sendMessage(
        req.params.id as string,
        userId,
        req.body.body,
      );
      res.status(201).json({ success: true, message });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getChatPartners(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const partners = await chatUsecase.getChatPartners(userId);
      res.json({ success: true, partners });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createGroupChat(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { name, memberIds } = req.body;
      if (!name || !name.trim())
        return res.status(400).json({ message: "Group name is required" });
      if (!memberIds || memberIds.length < 1)
        return res
          .status(400)
          .json({ message: "At least one other member required" });

      const conversation = await chatUsecase.createGroupChat(
        userId,
        name,
        memberIds,
      );
      res.status(201).json({ success: true, conversation });
    } catch (error: any) {
      const status = error.message.includes("Only Admins") ? 403 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async updateGroupMembers(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const conversation = await chatUsecase.updateGroupMembers(
        req.params.id as string,
        userId,
        req.body.addMemberIds,
        req.body.removeMemberIds,
      );
      res.json({ success: true, conversation });
    } catch (error: any) {
      const status =
        error.message.includes("Only Admins") ||
        error.message.includes("Access denied")
          ? 403
          : error.message.includes("not found")
            ? 404
            : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },
};

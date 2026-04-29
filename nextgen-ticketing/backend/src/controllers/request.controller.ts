import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { requestUsecase } from "../usecases/request.usecase";

export const requestController = {
  async getRequests(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      let userIdFilter: string | undefined = undefined;
      
      // If user is not Admin or Agent, only show their own requests
      if (user.role !== "Admin" && user.role !== "Agent") {
        userIdFilter = user.id;
      }

      const requests = await requestUsecase.getRequests(userIdFilter);
      res.json({ success: true, requests });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createRequest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { type, message, data } = req.body;
      const request = await requestUsecase.createRequest({
        type,
        userId,
        message,
        data,
      });

      res.status(201).json({ success: true, request });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateRequestStatus(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      if (user.role !== "Admin" && user.role !== "Agent") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const { status, message } = req.body;

      const request = await requestUsecase.updateRequestStatus(id as string, status, message);
      res.json({ success: true, request });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteRequest(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || user.role !== "Admin") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await requestUsecase.deleteRequest(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

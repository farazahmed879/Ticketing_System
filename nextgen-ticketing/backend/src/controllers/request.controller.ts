import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { requestUsecase } from "../usecases/request.usecase";
import { emitNotificationToUser } from "../socketio/events";

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
      const { request, notifications } = await requestUsecase.createRequest({
        type,
        userId,
        message,
        data,
      });

      // Emit notifications
      const io = req.app.get("io");
      if (io && notifications) {
        notifications.forEach((n: any) => {
          emitNotificationToUser(io, n.userId, n.notification);
        });
      }

      res.status(201).json({ success: true, request });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateRequestStatus(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const request = await requestUsecase.getRequestById(id as string);
      
      if (!request) {
        return res.status(404).json({ success: false, message: "Request not found" });
      }

      // 1. Check basic permission: Admin or role with requests.update = true
      const isAdmin = user.role === "Admin";
      const hasUpdatePermission = (user.permissions as any)?.requests?.update === true;

      if (!isAdmin && !hasUpdatePermission) {
        return res.status(403).json({ success: false, message: "Access denied: Missing update permission" });
      }

      // 2. Team-based restriction for non-admins
      if (!isAdmin) {
        // Prevent approving own request
        if (request.userId === user.id) {
          return res.status(403).json({ success: false, message: "Access denied: You cannot approve your own request" });
        }

        if (!request.userId) {
          return res.status(400).json({ success: false, message: "Invalid request: No user associated" });
        }

        const areInSameTeam = await requestUsecase.checkUsersInSameTeam(user.id, request.userId as string);
        if (!areInSameTeam) {
          return res.status(403).json({ success: false, message: "Access denied: You can only manage requests from your own team members" });
        }
      }

      const { status, message } = req.body;
      const { request: updatedRequest, notification } = await requestUsecase.updateRequestStatus(id as string, status, message);

      // Emit notification to the user
      const io = req.app.get("io");
      if (io && notification) {
        emitNotificationToUser(io, notification.userId, notification);
      }

      res.json({ success: true, request: updatedRequest });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteRequest(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const request = await requestUsecase.getRequestById(id as string);
      
      if (!request) {
        return res.status(404).json({ success: false, message: "Request not found" });
      }

      // Allow owner or Admin to delete
      const isOwner = request.userId === user.id;
      const isAdmin = user.role === "Admin" || (user.permissions as any)?.requests?.delete === true;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: "Access denied: Cannot delete other users' requests" });
      }

      await requestUsecase.deleteRequest(id as string);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

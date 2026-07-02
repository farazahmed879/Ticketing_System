import { Response } from "express";
import { AuthRequest } from "../types";
import { requestUsecase } from "../usecases/request.usecase";
import { emitNotificationToUser } from "../socketio/events";

export const requestController = {
  async getRequests(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      // Admins and Agents see every request.
      if (user.role === "Admin" || user.role === "Agent") {
        const requests = await requestUsecase.getRequests();
        return res.json({ success: true, requests });
      }

      // Everyone else sees their own requests plus, if they lead any teams,
      // the requests of those teams' members.
      const memberIds = await requestUsecase.getLedTeamMemberIds(user.id);
      const scope = Array.from(new Set([user.id, ...memberIds]));
      const requests = await requestUsecase.getRequests(scope);
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
        return res
          .status(404)
          .json({ success: false, message: "Request not found" });
      }

      // Authority is derived server-side (the JWT only carries { id, role },
      // never permissions): Admins and Agents may act on any request; everyone
      // else must be the team lead of the request's owner.
      const isAdmin = user.role === "Admin";
      const isAgent = user.role === "Agent";

      if (!isAdmin) {
        // Prevent approving your own request.
        if (request.userId === user.id) {
          return res
            .status(403)
            .json({
              success: false,
              message: "Access denied: You cannot approve your own request",
            });
        }

        if (!request.userId) {
          return res
            .status(400)
            .json({
              success: false,
              message: "Invalid request: No user associated",
            });
        }

        // Non-Agents must be the team lead of the requester.
        if (!isAgent) {
          const isLead = await requestUsecase.isTeamLeadOfMember(
            user.id,
            request.userId as string,
          );
          if (!isLead) {
            return res
              .status(403)
              .json({
                success: false,
                message:
                  "Access denied: You can only manage requests from your team members",
              });
          }
        }
      }

      const { status, message } = req.body;
      const { request: updatedRequest, notification } =
        await requestUsecase.updateRequestStatus(id as string, status, message);

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
        return res
          .status(404)
          .json({ success: false, message: "Request not found" });
      }

      // Allow owner or Admin to delete
      const isOwner = request.userId === user.id;
      const isAdmin =
        user.role === "Admin" ||
        (user.permissions as any)?.requests?.delete === true;

      if (!isOwner && !isAdmin) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Access denied: Cannot delete other users' requests",
          });
      }

      await requestUsecase.deleteRequest(id as string);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

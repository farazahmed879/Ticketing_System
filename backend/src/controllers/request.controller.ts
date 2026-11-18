import { Response } from "express";
import { AuthRequest } from "../types";
import { requestUsecase, LEAVE_TYPES } from "../usecases/request.usecase";
import { emitNotificationToUser } from "../socketio/events";
import { RoleType } from "../utils/constants";
import { callerMayUseDeletePower } from "../middleware/auth";

export const requestController = {
  async getRequests(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const ctx = await requestUsecase.getReviewContext(user.id);

      // Admins and Agents see every request. Everyone else sees their own
      // requests plus, if they lead any teams, those teams' members' requests.
      // HR additionally sees every leave request, since HR approves leave.
      const seesAll =
        user.role === RoleType.ADMIN || user.role === RoleType.AGENT;
      const isHr = user.role === RoleType.HR;
      const ownScope = new Set([user.id, ...ctx.ledMemberIds]);
      let requests = await requestUsecase.getRequests(
        seesAll || isHr ? undefined : Array.from(ownScope),
      );
      if (isHr) {
        requests = requests.filter(
          (r) => (r.userId && ownScope.has(r.userId)) || LEAVE_TYPES.has(r.type),
        );
      }

      // Tell the UI which requests this user may approve/reject.
      const roles = await requestUsecase.getRoleTypes(
        requests.filter((r) => LEAVE_TYPES.has(r.type)).map((r) => r.userId),
      );
      const withReview = requests.map((r) => ({
        ...r,
        canReview:
          r.status === "PENDING" &&
          requestUsecase.canReview(user, r.userId, ctx, {
            isLeave: LEAVE_TYPES.has(r.type),
            requesterRole: r.userId ? roles.get(r.userId) : null,
          }).allowed,
      }));
      res.json({ success: true, requests: withReview });
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
      // never permissions). See requestUsecase.canReview for the rules.
      if (user.role !== RoleType.ADMIN && !request.userId) {
        return res.status(400).json({
          success: false,
          message: "Invalid request: No user associated",
        });
      }
      const ctx = await requestUsecase.getReviewContext(user.id);
      const isLeave = LEAVE_TYPES.has(request.type);
      const requesterRole = isLeave && request.userId
        ? (await requestUsecase.getRoleTypes([request.userId])).get(request.userId)
        : null;
      const review = requestUsecase.canReview(user, request.userId, ctx, {
        isLeave,
        requesterRole,
      });
      if (!review.allowed) {
        return res.status(403).json({
          success: false,
          message: `Access denied: ${review.reason}`,
        });
      }

      const { status, message } = req.body;
      const { request: updatedRequest, notification } =
        await requestUsecase.updateRequestStatus(id as string, status, message, user.id);

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
      // Loads role, permissions and canDelete fresh (JWT only has id + role).
      const mayUseDeletePower = await callerMayUseDeletePower(req);
      const isAdmin =
        mayUseDeletePower &&
        (user.role === RoleType.ADMIN ||
          (user.permissions as any)?.requests?.delete === true);

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

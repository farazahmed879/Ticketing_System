import { Request, Response, NextFunction } from "express";
import { authUsecase } from "../usecases/auth.usecase";
import { emitNotificationToUser } from "../socketio/events";
import {
  startSession,
  refreshSession,
  endSession,
  clearRefreshCookie,
  SessionError,
} from "../services/sessionService";

/**
 * Public self-registration is off unless ALLOW_PUBLIC_REGISTRATION=true.
 * The frontend has no sign-up page (accounts are created by Admin/HR), and an
 * open endpoint lets anyone on the internet get a logged-in Client account.
 */
export const registrationEnabled = (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (process.env.ALLOW_PUBLIC_REGISTRATION === "true") return next();
  return res
    .status(403)
    .json({ message: "Self-registration is disabled. Please contact an administrator." });
};

export const authController = {
  async login(req: Request, res: Response) {
    const { email, password, remember } = req.body;
    try {
      const result = await authUsecase.login(email, password);
      // Default to a remembered session when the client doesn't say.
      const token = await startSession(
        req,
        res,
        { id: result.user.id, roleType: result.user.role.roleType },
        remember !== false,
      );
      res.json({ ...result, token });
    } catch (error: any) {
      const status = error.message === "Invalid credentials" ? 401 : 500;
      res.status(status).json({ message: error.message });
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const token = await refreshSession(req, res);
      res.json({ token });
    } catch (error: any) {
      if (error instanceof SessionError) {
        clearRefreshCookie(res);
        return res.status(401).json({ message: error.message });
      }
      console.error("[auth] refresh failed:", error);
      res.status(500).json({ message: "Could not refresh session" });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      await endSession(req, res);
      res.json({ success: true });
    } catch (error) {
      console.error("[auth] logout failed:", error);
      clearRefreshCookie(res);
      res.json({ success: true });
    }
  },

  async getMe(req: any, res: Response) {
    try {
      const result = await authUsecase.getMe(req.user.id);
      res.json(result);
    } catch (error: any) {
      const status = error.message === "User not found" ? 404 : 500;
      res.status(status).json({ message: error.message });
    }
  },

  async register(req: Request, res: Response) {
    const { email, password, fullname, username } = req.body;
    try {
      const result = await authUsecase.register(email, password, fullname, username);
      const token = await startSession(
        req,
        res,
        { id: result.user.id, roleType: result.user.role.roleType },
        true,
      );
      res.status(201).json({ ...result, token });
    } catch (error: any) {
      const status =
        error.message === "Email already exists" ||
        error.message === "Username already taken"
          ? 409
          : 500;
      res.status(status).json({ message: error.message });
    }
  },

  async loginHelp(req: Request, res: Response) {
    const { email, type, query } = req.body;
    try {
      const { notifications } = await authUsecase.loginHelp(email, type, query);

      const io = req.app.get("io");
      if (io) {
        for (const n of notifications) {
          emitNotificationToUser(io, n.userId, n.notification);
        }
      }

      res.json({
        success: true,
        message:
          "Your request has been sent to the administrator. We will contact you soon.",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};

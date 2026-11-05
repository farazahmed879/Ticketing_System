import { Request, Response, NextFunction } from "express";
import { authUsecase } from "../usecases/auth.usecase";
import { emitNotificationToUser } from "../socketio/events";

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
    const { email, password } = req.body;
    try {
      const result = await authUsecase.login(email, password);
      res.json(result);
    } catch (error: any) {
      const status = error.message === "Invalid credentials" ? 401 : 500;
      res.status(status).json({ message: error.message });
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
      res.status(201).json(result);
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

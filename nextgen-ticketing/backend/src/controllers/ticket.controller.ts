import { Response } from "express";
import { AuthRequest } from "../types";
import { ticketUsecase } from "../usecases/ticket.usecase";
import { emitNotificationToUser } from "../socketio/events";

export const ticketController = {
  async getTickets(req: AuthRequest, res: Response) {
    try {
      const result = await ticketUsecase.getTickets(req.query, req.user);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createTicket(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { ticket, notifications } = await ticketUsecase.createTicket(
        req.body,
        user,
      );

      const io = req.app.get("io");
      if (io) {
        for (const n of notifications) {
          emitNotificationToUser(io, n.userId, n.notification);
        }
        io.emit("ticket:updated", { ticketId: ticket.id });
      }

      res.status(201).json({ success: true, ticket });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getTicketById(req: AuthRequest, res: Response) {
    try {
      const ticket = await ticketUsecase.getTicketById(req.params.id as string);
      res.json({ success: true, ticket });
    } catch (error: any) {
      const status = error.message === "Ticket not found" ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async updateTicket(req: AuthRequest, res: Response) {
    try {
      // console.log("updateTicket controller");
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { ticket, notifications } = await ticketUsecase.updateTicket(
        req.params.id as string,
        req.body,
        user,
      );

      // console.log("notifications", notifications);

      const io = req.app.get("io");
      if (io) {
        for (const n of notifications) {
          emitNotificationToUser(io, n.userId, n.notification);
        }
        io.emit("ticket:updated", { ticketId: ticket.id });
      }

      res.json({ success: true, ticket });
    } catch (error: any) {
      const status =
        error.message.includes("permission") ||
        error.message.includes("You can only update")
          ? 403
          : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async batchUpdateTickets(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const result = await ticketUsecase.batchUpdateTickets(req.body, user);

      const io = req.app.get("io");
      if (io) {
        io.emit("ticket:updated", { batch: true });
      }

      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteTicket(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      await ticketUsecase.deleteTicket(req.params.id as string, user);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async addComment(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { comment, notifications } = await ticketUsecase.addComment(
        req.params.id as string,
        req.body,
        user,
      );

      const io = req.app.get("io");
      if (io) {
        for (const n of notifications) {
          emitNotificationToUser(io, n.userId, n.notification);
        }
        io.emit("ticket:updated", { ticketId: req.params.id });
      }

      res.status(201).json({ success: true, comment });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getTicketHistory(req: AuthRequest, res: Response) {
    try {
      const result = await ticketUsecase.getTicketHistory(req.query);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getTimeline(req: AuthRequest, res: Response) {
    try {
      const history = await ticketUsecase.getTimeline(req.params.id as string);
      res.json({ success: true, history });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

import { Request, Response } from "express";
import { announcementRepository } from "../repositories/announcement.repository";
import { RoleType, SocketEvent } from "../utils/constants";
import prisma from "../prisma";
import { announcementFeedUsecase } from "../usecases/announcementFeed.usecase";
import { emitNotificationToUser } from "../socketio/events";
import { validateFileAttachments } from "../utils/attachments";

/** Announcement types the feed can be filtered by. */
const FEED_TYPES = new Set(["event", "important", "info", "review", "moment"]);

const REACTION_LABELS: Record<string, string> = {
  like: "liked",
  love: "loved",
  celebrate: "celebrated",
  clap: "applauded",
  haha: "laughed at",
  wow: "was amazed by",
};

/** Notify a shoutout's author about activity on their post (never themselves). */
async function notifyAuthor(
  req: Request,
  post: { id: string; title: string; authorId: string },
  actor: { id: string },
  message: (name: string) => string,
) {
  if (post.authorId === actor.id) return;
  const actorUser = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { fullname: true },
  });
  const notification = await prisma.notification.create({
    data: {
      title: "Shoutout activity",
      message: message(actorUser?.fullname || "Someone"),
      type: "shoutout",
      userId: post.authorId,
      data: { announcementId: post.id },
    },
  });
  const io = req.app.get("io");
  if (io) emitNotificationToUser(io, post.authorId, notification);
}

function sendError(res: Response, error: any) {
  res.status(error.status || 500).json({ message: error.message });
}

export const announcementController = {
  // ---------- Feed (wall) ----------

  async getFeed(req: Request, res: Response) {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 50);
      const search = ((req.query.search as string) || "").trim();
      const user = (req as any).user;
      // Comma-separated type filters, e.g. ?types=event or ?excludeTypes=important,event
      const parseTypes = (v: unknown) =>
        typeof v === "string"
          ? v.split(",").map((t) => t.trim()).filter((t) => FEED_TYPES.has(t))
          : [];
      res.json(
        await announcementFeedUsecase.getFeed(user, page, limit, search, {
          types: parseTypes(req.query.types),
          excludeTypes: parseTypes(req.query.excludeTypes),
        }),
      );
    } catch (error: any) {
      sendError(res, error);
    }
  },

  /** Sidebar badge: new shoutouts the user hasn't seen yet. */
  async getFeedUnreadCount(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      res.json({ count: await announcementFeedUsecase.unreadCount(user) });
    } catch (error: any) {
      sendError(res, error);
    }
  },

  /** The user opened the wall: clear their "new shoutout" notifications. */
  async markFeedSeen(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      await announcementFeedUsecase.markAllSeen(user);
      res.json({ count: 0 });
    } catch (error: any) {
      sendError(res, error);
    }
  },

  async getFeedPost(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const post = await announcementFeedUsecase.getPost(user, req.params.id as string);
      res.json({ post });
    } catch (error: any) {
      sendError(res, error);
    }
  },

  async setReaction(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = req.params.id as string;
      const type = req.body?.type ?? null;
      const { post, isNew } = await announcementFeedUsecase.setReaction(user, id, type);

      req.app.get("io")?.emit(SocketEvent.ANNOUNCEMENT_ACTIVITY, { announcementId: id });
      if (isNew && type) {
        await notifyAuthor(req, post, user, (name) =>
          `${name} ${REACTION_LABELS[type] || "reacted to"} your shoutout "${post.title}".`,
        );
      }
      res.json({ post: await announcementFeedUsecase.getPost(user, id) });
    } catch (error: any) {
      sendError(res, error);
    }
  },

  async getComments(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const comments = await announcementFeedUsecase.listComments(user, req.params.id as string);
      res.json({ comments });
    } catch (error: any) {
      sendError(res, error);
    }
  },

  async addComment(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = req.params.id as string;
      const { post, comment } = await announcementFeedUsecase.addComment(
        user,
        id,
        req.body?.content,
      );

      req.app.get("io")?.emit(SocketEvent.ANNOUNCEMENT_ACTIVITY, { announcementId: id });
      await notifyAuthor(req, post, user, (name) =>
        `${name} commented on your shoutout "${post.title}".`,
      );
      res.status(201).json({ comment });
    } catch (error: any) {
      sendError(res, error);
    }
  },

  async deleteComment(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = req.params.id as string;
      await announcementFeedUsecase.deleteComment(user, id, req.params.commentId as string);
      req.app.get("io")?.emit(SocketEvent.ANNOUNCEMENT_ACTIVITY, { announcementId: id });
      res.json({ message: "Comment deleted" });
    } catch (error: any) {
      sendError(res, error);
    }
  },

  // ---------- Existing CRUD ----------

  async getAnnouncements(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const skip = (page - 1) * limit;

      const user = (req as any).user;
      let where: any = {};

      if (user.role !== RoleType.ADMIN && user.role !== RoleType.AGENT) {
        where.authorId = user.id;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const [announcements, total] = await Promise.all([
        announcementRepository.findMany(where, skip, limit),
        announcementRepository.count(where),
      ]);

      res.json({
        announcements,
        pagination: {
          total,
          page,
          limit,
          totalPages: limit === -1 ? 1 : Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async getDashboardAnnouncements(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const skip = (page - 1) * limit;

      const user = (req as any).user;
      let where: any = {};

      if (user.role === RoleType.CUSTOMER) {
        where.authorId = user.id;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const [announcements, total, seenNotifications] = await Promise.all([
        announcementRepository.findMany(where, skip, limit),
        announcementRepository.count(where),
        prisma.notification.findMany({
          where: {
            userId: user.id,
            type: "seen_moment",
          },
        }),
      ]);

      const seenMomentIds = seenNotifications
        .map((n) => (n.data as any)?.momentId)
        .filter(Boolean);

      res.json({
        announcements,
        seenMomentIds,
        pagination: {
          total,
          page,
          limit,
          totalPages: limit === -1 ? 1 : Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async markMomentAsSeen(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const notifications = await prisma.notification.findMany({
        where: {
          userId: user.id,
          type: "seen_moment",
        },
      });

      const alreadySeen = notifications.some((n) => (n.data as any)?.momentId === id);

      if (!alreadySeen) {
        await prisma.notification.create({
          data: {
            title: "Seen Moment",
            message: `User has seen moment of joy ${id}`,
            type: "seen_moment",
            unread: false,
            userId: user.id,
            data: { momentId: id },
          },
        });
      }

      res.json({ message: "Moment marked as seen" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async getAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const announcement = await announcementRepository.findById(id as string);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }

      if (
        user.role !== RoleType.ADMIN &&
        user.role !== RoleType.AGENT &&
        announcement.authorId !== user.id
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json({ announcement });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async createAnnouncement(req: Request, res: Response) {
    try {
      const { title, description, date, type, projectId, shouldPopout, isProjectTeamOnly } = req.body;
      const authorId = (req as any).user.id;
      const attachments = validateFileAttachments(req.body.attachments) || [];

      const announcement = await announcementRepository.create({
        title,
        description,
        date: new Date(date),
        type,
        authorId,
        projectId: projectId || null,
        shouldPopout: !!shouldPopout,
        isProjectTeamOnly: !!isProjectTeamOnly,
        attachments,
      });

      const io = req.app.get("io");
      io?.emit(SocketEvent.ANNOUNCEMENT_UPDATED);
      res.status(201).json({ announcement });

      // Notify the audience after responding so posting stays fast.
      announcementFeedUsecase
        .notifyNewPost(announcement)
        .then((notifications) => {
          if (io) notifications.forEach((n) => emitNotificationToUser(io, n.userId, n));
        })
        .catch((err) => console.error("[shoutouts] new-post notifications failed:", err));
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message });
    }
  },

  async updateAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, date, type, projectId, shouldPopout, isProjectTeamOnly } = req.body;
      const user = (req as any).user;
      const attachments = validateFileAttachments(req.body.attachments);

      const existing = await announcementRepository.findById(id as string);
      if (!existing) {
        return res.status(404).json({ message: "Announcement not found" });
      }

      if (
        user.role !== RoleType.ADMIN &&
        user.role !== RoleType.AGENT &&
        existing.authorId !== user.id
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      const announcement = await announcementRepository.update(id as string, {
        title,
        description,
        date: date ? new Date(date) : undefined,
        type,
        projectId: projectId || null,
        shouldPopout: shouldPopout !== undefined ? !!shouldPopout : undefined,
        isProjectTeamOnly: isProjectTeamOnly !== undefined ? !!isProjectTeamOnly : undefined,
        attachments,
      });

      req.app.get("io")?.emit(SocketEvent.ANNOUNCEMENT_UPDATED);
      res.json({ announcement });
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message });
    }
  },

  async deleteAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const attachments = validateFileAttachments(req.body.attachments);

      const existing = await announcementRepository.findById(id as string);
      if (!existing) {
        return res.status(404).json({ message: "Announcement not found" });
      }

      if (
        user.role !== RoleType.ADMIN &&
        user.role !== RoleType.AGENT &&
        existing.authorId !== user.id
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      await announcementRepository.delete(id as string);
      req.app.get("io")?.emit(SocketEvent.ANNOUNCEMENT_UPDATED);
      res.json({ message: "Announcement deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};

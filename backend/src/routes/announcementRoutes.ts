import { Router } from "express";
import { announcementController } from "../controllers/announcement.controller";
import { authMiddleware, requirePermission } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, announcementController.getAnnouncements);
router.get("/dashboard", authMiddleware, announcementController.getDashboardAnnouncements);
router.post("/moments/:id/seen", authMiddleware, announcementController.markMomentAsSeen);

// Feed (wall): posts with reactions and comments. Must stay above "/:id".
router.get("/feed", authMiddleware, announcementController.getFeed);
router.get("/feed/unread-count", authMiddleware, announcementController.getFeedUnreadCount);
router.post("/feed/seen", authMiddleware, announcementController.markFeedSeen);
router.get("/feed/:id", authMiddleware, announcementController.getFeedPost);
router.put("/:id/reaction", authMiddleware, announcementController.setReaction);
router.get("/:id/comments", authMiddleware, announcementController.getComments);
router.post("/:id/comments", authMiddleware, announcementController.addComment);
router.delete("/:id/comments/:commentId", authMiddleware, announcementController.deleteComment);

router.get("/:id", authMiddleware, announcementController.getAnnouncement);
router.post("/", authMiddleware, requirePermission("announcements.create"), announcementController.createAnnouncement);
router.put("/:id", authMiddleware, announcementController.updateAnnouncement);
router.delete("/:id", authMiddleware, announcementController.deleteAnnouncement);

export default router;

import { Router } from "express";
import { announcementController } from "../controllers/announcement.controller";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, announcementController.getAnnouncements);
router.get("/dashboard", authMiddleware, announcementController.getDashboardAnnouncements);
router.post("/moments/:id/seen", authMiddleware, announcementController.markMomentAsSeen);
router.get("/:id", authMiddleware, announcementController.getAnnouncement);
router.post("/", authMiddleware, announcementController.createAnnouncement);
router.put("/:id", authMiddleware, announcementController.updateAnnouncement);
router.delete("/:id", authMiddleware, announcementController.deleteAnnouncement);

export default router;

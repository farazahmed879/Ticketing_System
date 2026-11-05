import { Router } from "express";
import { projectController } from "../controllers/project.controller";
import { authMiddleware, requirePermission, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, projectController.getAll);
router.get("/:id", authMiddleware, projectController.getById);
router.get("/:id/members", authMiddleware, projectController.getMembers);
router.get("/:id/developer-hours", authMiddleware, projectController.getDeveloperHours);
router.post("/", authMiddleware, requirePermission("groups.create"), projectController.create);
router.put("/:id", authMiddleware, requirePermission("groups.update"), projectController.update);
router.delete("/:id", authMiddleware, requirePermission("groups.delete"), projectController.delete);

export default router;

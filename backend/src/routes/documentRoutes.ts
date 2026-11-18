import { Router } from "express";
import { documentController } from "../controllers/document.controller";
import { authMiddleware, requireAdmin, denyRestrictedDelete } from "../middleware/auth";

/**
 * HR documents (pay slips, offer letters, ...). Managed by admin-type roles
 * (Admin and Sub Admin); Sub Admin can't delete. Employees can read the
 * documents issued to them via /mine and /:id.
 */
const router = Router();

router.use(authMiddleware);

router.get("/company", requireAdmin, documentController.getCompany);
router.put("/company", requireAdmin, documentController.updateCompany);

router.get("/mine", documentController.mine);
router.get("/prefill/:userId", requireAdmin, documentController.prefill);
router.get("/candidates", requireAdmin, documentController.candidates);
router.get("/", requireAdmin, documentController.list);
router.post("/", requireAdmin, documentController.create);
router.get("/:id", documentController.getById);
router.put("/:id", requireAdmin, documentController.update);
router.delete("/:id", requireAdmin, denyRestrictedDelete, documentController.remove);

export default router;

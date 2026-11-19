import { Router } from "express";
import { documentController } from "../controllers/document.controller";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { AuthRequest } from "../types";

/**
 * HR documents (pay slips, offer letters, ...). Managed by admin-type roles
 * (Admin and Sub Admin). Both can delete documents: an intentional exception
 * to Sub Admin's no-delete rule. Employees can read the
 * documents issued to them via /mine and /:id.
 */
const router = Router();

router.use(authMiddleware);

// Document passphrase: only Admin / Sub Admin can set it or unlock documents.
// Wrong guesses are limited per user and IP.
const passphraseLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  countFailuresOnly: true,
  key: (req) => `${req.ip}|${(req as AuthRequest).user?.id ?? ""}`,
  message: "Too many incorrect passphrase attempts. Please wait 15 minutes and try again.",
});
router.get("/vault", requireAdmin, documentController.vaultStatus);
router.post("/vault/setup", requireAdmin, documentController.vaultSetup);
router.post("/vault/unlock", requireAdmin, passphraseLimiter, documentController.vaultUnlock);
router.post("/vault/change", requireAdmin, passphraseLimiter, documentController.vaultChange);
router.post("/vault/lock", requireAdmin, documentController.vaultLock);

router.get("/company", requireAdmin, documentController.getCompany);
router.put("/company", requireAdmin, documentController.updateCompany);

router.get("/mine", documentController.mine);
router.get("/prefill/:userId", requireAdmin, documentController.prefill);
router.get("/candidates", requireAdmin, documentController.candidates);
router.get("/", requireAdmin, documentController.list);
router.post("/", requireAdmin, documentController.create);
router.get("/:id", documentController.getById);
router.put("/:id", requireAdmin, documentController.update);
router.post("/:id/deliver", requireAdmin, documentController.deliver);
router.delete("/:id", requireAdmin, documentController.remove);

export default router;

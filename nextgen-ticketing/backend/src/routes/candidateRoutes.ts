import { Router } from "express";
import multer from "multer";
import { candidateController } from "../controllers/candidate.controller";
import { authMiddleware, checkRole } from "../middleware/auth";
import { RoleName, RoleType } from "../utils/constants";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}); // 10MB

const allowedRoles = [RoleName.ADMIN, RoleName.AGENT, RoleName.HR, RoleType.HR];

router.get("/", authMiddleware, candidateController.getAllCandidates);
router.get(
  "/",
  authMiddleware,
  checkRole(allowedRoles),
  candidateController.getAllCandidates,
);
router.get(
  "/leaderboard",
  authMiddleware,
  checkRole(allowedRoles),
  candidateController.getLeaderboard,
);
router.get(
  "/:id",
  authMiddleware,
  checkRole(allowedRoles),
  candidateController.getCandidateById,
);
router.post(
  "/",
  authMiddleware,
  checkRole(allowedRoles),
  candidateController.createCandidate,
);
router.post(
  "/upload-resume",
  authMiddleware,
  checkRole(allowedRoles),
  upload.single("resume"),
  candidateController.uploadResume,
);
router.post(
  "/:id/convert",
  authMiddleware,
  checkRole(allowedRoles),
  candidateController.convertToUser,
);
router.put(
  "/:id",
  authMiddleware,
  checkRole(allowedRoles),
  candidateController.updateCandidate,
);
router.delete(
  "/:id",
  authMiddleware,
  checkRole(allowedRoles),
  candidateController.deleteCandidate,
);

export default router;

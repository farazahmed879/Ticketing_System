import { Router } from "express";
import multer from "multer";
import { candidateController } from "../controllers/candidate.controller";
import { authMiddleware, checkRole } from "../middleware/auth";
import { RoleType } from "../utils/constants";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}); // 10MB

const allowedRoles = [RoleType.ADMIN, RoleType.AGENT, RoleType.HR];

router.get(
  "/",
  authMiddleware,
  checkRole(allowedRoles),
  candidateController.getAllCandidates,
);
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
  "/positions",
  authMiddleware,
  checkRole(allowedRoles),
  candidateController.getPositionSuggestions,
);

// Job-status polling for async bulk upload. Must be registered before /:id.
router.get(
  "/jobs",
  authMiddleware,
  checkRole(allowedRoles),
  candidateController.getResumeJobs,
);
router.post(
  "/jobs/:jobId/assign-title",
  authMiddleware,
  checkRole(allowedRoles),
  candidateController.assignJobTitle,
);
router.post(
  "/jobs/:jobId/resolve-duplicate",
  authMiddleware,
  checkRole(allowedRoles),
  candidateController.resolveDuplicateJob,
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
// Async bulk intake: file -> Drive -> ResumeJob -> 202 {jobId}. Heavy work
// happens in the worker process, not here.
router.post(
  "/bulk-upload",
  authMiddleware,
  checkRole(allowedRoles),
  upload.single("resume"),
  candidateController.bulkUploadResume,
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

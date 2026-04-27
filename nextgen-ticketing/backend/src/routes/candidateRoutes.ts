import { Router } from 'express';
import multer from 'multer';
import {
  getAllCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  uploadResume,
} from '../controllers/candidateController';
import { authMiddleware, checkRole } from '../middleware/auth';
import { RoleName } from '../utils/constants';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

const allowedRoles = [RoleName.ADMIN, RoleName.AGENT, RoleName.EMPLOYEE];

router.get('/', authMiddleware, checkRole(allowedRoles), getAllCandidates);
router.get('/:id', authMiddleware, checkRole(allowedRoles), getCandidateById);
router.post('/', authMiddleware, checkRole(allowedRoles), createCandidate);
router.post('/upload-resume', authMiddleware, checkRole(allowedRoles), upload.single('resume'), uploadResume);
router.put('/:id', authMiddleware, checkRole(allowedRoles), updateCandidate);
router.delete('/:id', authMiddleware, checkRole(allowedRoles), deleteCandidate);

export default router;


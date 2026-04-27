import { Router } from 'express';
import {
  getAllInterviews,
  getInterviewById,
  createInterview,
  updateInterview,
  updateInterviewStatus,
  deleteInterview,
  submitFeedback,
} from '../controllers/interviewController';
import { authMiddleware, checkRole } from '../middleware/auth';
import { RoleName } from '../utils/constants';

const router = Router();

const allowedRoles = [RoleName.ADMIN, RoleName.AGENT, RoleName.EMPLOYEE];

router.get('/', authMiddleware, checkRole(allowedRoles), getAllInterviews);
router.get('/:id', authMiddleware, checkRole(allowedRoles), getInterviewById);
router.post('/', authMiddleware, checkRole(allowedRoles), createInterview);
router.put('/:id', authMiddleware, checkRole(allowedRoles), updateInterview);
router.put('/:id/status', authMiddleware, checkRole(allowedRoles), updateInterviewStatus);
router.delete('/:id', authMiddleware, checkRole(allowedRoles), deleteInterview);
router.post('/:id/feedback', authMiddleware, checkRole(allowedRoles), submitFeedback);

export default router;

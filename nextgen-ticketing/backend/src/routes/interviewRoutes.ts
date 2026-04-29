import { Router } from 'express';
import { interviewController } from '../controllers/interview.controller';
import { authMiddleware, checkRole } from '../middleware/auth';
import { RoleName } from '../utils/constants';

const router = Router();

const allowedRoles = [RoleName.ADMIN, RoleName.AGENT, RoleName.EMPLOYEE];

router.get('/', authMiddleware, checkRole(allowedRoles), interviewController.getAllInterviews);
router.get('/:id', authMiddleware, checkRole(allowedRoles), interviewController.getInterviewById);
router.post('/', authMiddleware, checkRole(allowedRoles), interviewController.createInterview);
router.put('/:id', authMiddleware, checkRole(allowedRoles), interviewController.updateInterview);
router.put('/:id/status', authMiddleware, checkRole(allowedRoles), interviewController.updateInterviewStatus);
router.delete('/:id', authMiddleware, checkRole(allowedRoles), interviewController.deleteInterview);
router.post('/:id/feedback', authMiddleware, checkRole(allowedRoles), interviewController.submitFeedback);

export default router;

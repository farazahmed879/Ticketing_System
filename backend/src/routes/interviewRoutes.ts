import { Router } from 'express';
import { interviewController } from '../controllers/interview.controller';
import { authMiddleware, checkRole, requirePermissionOrRoles } from '../middleware/auth';
import { RoleType } from '../utils/constants';

const router = Router();

const allowedRoles = [RoleType.ADMIN, RoleType.AGENT, RoleType.EMPLOYEE, RoleType.HR];

router.get('/', authMiddleware, checkRole(allowedRoles), interviewController.getAllInterviews);
router.get('/:id', authMiddleware, checkRole(allowedRoles), interviewController.getInterviewById);
// Changes need the role's interviews.<action> permission (HR always allowed),
// mirroring the frontend. Employees only view and give feedback.
const canInterview = (action: 'create' | 'update' | 'delete') =>
  requirePermissionOrRoles(`interviews.${action}`, [RoleType.HR]);

router.post('/', authMiddleware, canInterview('create'), interviewController.createInterview);
router.put('/:id', authMiddleware, canInterview('update'), interviewController.updateInterview);
// Cancelling needs interviews.update; a panel member may still mark their
// interview Completed (checked in the controller).
router.put('/:id/status', authMiddleware, checkRole(allowedRoles), interviewController.updateInterviewStatus);
router.delete('/:id', authMiddleware, canInterview('delete'), interviewController.deleteInterview);
router.post('/:id/feedback', authMiddleware, checkRole(allowedRoles), interviewController.submitFeedback);

export default router;

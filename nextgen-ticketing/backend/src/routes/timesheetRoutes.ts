import { Router } from 'express';
import { timesheetController } from '../controllers/timesheet.controller';
import { authMiddleware, checkRole } from '../middleware/auth';
import { RoleType } from '../utils/constants';

const router = Router();

router.get('/entries', authMiddleware, timesheetController.getEntries);
router.post('/entries', authMiddleware, timesheetController.upsertEntry);

// Approval routes - Manager/Admin/HR only
const reviewRoles = [RoleType.AGENT, RoleType.ADMIN, RoleType.HR];
router.get('/pending', authMiddleware, checkRole(reviewRoles), timesheetController.getPendingEntries);
router.post('/approve/:id', authMiddleware, checkRole(reviewRoles), timesheetController.approveEntry);
router.post('/reject/:id', authMiddleware, checkRole(reviewRoles), timesheetController.rejectEntry);

router.get('/report', authMiddleware, timesheetController.getMonthlyReport);

export default router;

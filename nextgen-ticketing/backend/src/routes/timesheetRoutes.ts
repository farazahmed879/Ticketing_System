import { Router } from 'express';
import { timesheetController } from '../controllers/timesheet.controller';
import { authMiddleware, checkRole } from '../middleware/auth';
import { RoleType } from '../utils/constants';

const router = Router();

router.get('/entries', authMiddleware, timesheetController.getEntries);
router.post('/entries', authMiddleware, timesheetController.upsertEntry);

// Approval routes - Agent/Admin only
router.get('/pending', authMiddleware, checkRole([RoleType.AGENT, RoleType.ADMIN]), timesheetController.getPendingEntries);
router.post('/approve/:id', authMiddleware, checkRole([RoleType.AGENT, RoleType.ADMIN]), timesheetController.approveEntry);
router.post('/reject/:id', authMiddleware, checkRole([RoleType.AGENT, RoleType.ADMIN]), timesheetController.rejectEntry);

router.get('/report', authMiddleware, timesheetController.getMonthlyReport);

export default router;

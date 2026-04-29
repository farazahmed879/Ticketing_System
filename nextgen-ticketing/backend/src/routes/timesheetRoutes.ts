import { Router } from 'express';
import { timesheetController } from '../controllers/timesheet.controller';
import { authMiddleware, checkRole } from '../middleware/auth';
import { RoleName } from '../utils/constants';

const router = Router();

router.get('/entries', authMiddleware, timesheetController.getEntries);
router.post('/entries', authMiddleware, timesheetController.upsertEntry);

// Approval routes - Agent/Admin only
router.get('/pending', authMiddleware, checkRole([RoleName.AGENT, RoleName.ADMIN]), timesheetController.getPendingEntries);
router.post('/approve/:id', authMiddleware, checkRole([RoleName.AGENT, RoleName.ADMIN]), timesheetController.approveEntry);
router.post('/reject/:id', authMiddleware, checkRole([RoleName.AGENT, RoleName.ADMIN]), timesheetController.rejectEntry);

router.get('/report', authMiddleware, timesheetController.getMonthlyReport);

export default router;

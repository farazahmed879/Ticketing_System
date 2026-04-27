import { Router } from 'express';
import {
  getEntries, upsertEntry, approveEntry, rejectEntry,
  getPendingEntries, getMonthlyReport
} from '../controllers/timesheetController';
import { authMiddleware, checkRole } from '../middleware/auth';
import { RoleName } from '../utils/constants';

const router = Router();

router.get('/entries', authMiddleware, getEntries);
router.post('/entries', authMiddleware, upsertEntry);

// Approval routes - Agent/Admin only
router.get('/pending', authMiddleware, checkRole([RoleName.AGENT, RoleName.ADMIN]), getPendingEntries);
router.post('/approve/:id', authMiddleware, checkRole([RoleName.AGENT, RoleName.ADMIN]), approveEntry);
router.post('/reject/:id', authMiddleware, checkRole([RoleName.AGENT, RoleName.ADMIN]), rejectEntry);

router.get('/report', authMiddleware, getMonthlyReport);

export default router;

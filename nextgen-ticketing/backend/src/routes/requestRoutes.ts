import { Router } from 'express';
import { getRequests, updateRequestStatus, deleteRequest } from '../controllers/requestController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, getRequests);
router.patch('/:id', authMiddleware, updateRequestStatus);
router.delete('/:id', authMiddleware, deleteRequest);

export default router;

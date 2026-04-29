import { Router } from 'express';
import { requestController } from '../controllers/request.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, requestController.getRequests);
router.patch('/:id', authMiddleware, requestController.updateRequestStatus);
router.delete('/:id', authMiddleware, requestController.deleteRequest);

export default router;

import { Router } from 'express';
import { roleController } from '../controllers/role.controller';
import { authMiddleware, checkRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', roleController.getRoles);
router.post('/', checkRole(['Admin']), roleController.createRole);
router.put('/:id', checkRole(['Admin']), roleController.updateRole);
router.delete('/:id', checkRole(['Admin']), roleController.deleteRole);

export default router;

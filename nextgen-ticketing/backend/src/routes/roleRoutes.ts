import { Router } from 'express';
import { roleController } from '../controllers/role.controller';
import { authMiddleware, checkRole } from '../middleware/auth';
import { RoleType } from '../utils/constants';

const router = Router();

router.use(authMiddleware);

router.get('/', roleController.getRoles);
router.post('/', checkRole([RoleType.ADMIN]), roleController.createRole);
router.put('/:id', checkRole([RoleType.ADMIN]), roleController.updateRole);
router.delete('/:id', checkRole([RoleType.ADMIN]), roleController.deleteRole);

export default router;

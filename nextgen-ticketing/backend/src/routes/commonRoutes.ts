import { Router } from 'express';
import { commonController } from '../controllers/common.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Common
 *   description: Utility metadata, groups, and dashboard
 */

/**
 * @swagger
 * /api/common/statuses:
 *   get:
 *     summary: Get all ticket statuses
 *     tags: [Common]
 *     responses:
 *       200:
 *         description: List of statuses
 */
router.get('/statuses', commonController.getStatuses);

/**
 * @swagger
 * /api/common/priorities:
 *   get:
 *     summary: Get all ticket priorities
 *     tags: [Common]
 *     responses:
 *       200:
 *         description: List of priorities
 */
router.get('/priorities', commonController.getPriorities);

/**
 * @swagger
 * /api/common/types:
 *   get:
 *     summary: Get all ticket types
 *     tags: [Common]
 *     responses:
 *       200:
 *         description: List of types
 */
router.get('/types', commonController.getTypes);

/**
 * @swagger
 * /api/common/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Common]
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get('/roles', commonController.getRoles);

/**
 * @swagger
 * /api/common/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Common]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats with recent tickets
 */
router.get('/dashboard', authMiddleware, commonController.getDashboardStats);

/**
 * @swagger
 * /api/common/groups:
 *   get:
 *     summary: Get all groups
 *     tags: [Common]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, user]
 *     responses:
 *       200:
 *         description: List of groups
 */
router.get('/groups', authMiddleware, commonController.getGroups);

/**
 * @swagger
 * /api/common/groups:
 *   post:
 *     summary: Create a group
 *     tags: [Common]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Group created
 */
router.post('/groups', authMiddleware, commonController.createGroup);

/**
 * @swagger
 * /api/common/groups/{id}:
 *   put:
 *     summary: Update a group
 *     tags: [Common]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group updated
 */
router.put('/groups/:id', authMiddleware, commonController.updateGroup);

/**
 * @swagger
 * /api/common/groups/{id}:
 *   delete:
 *     summary: Delete a group
 *     tags: [Common]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group deleted
 */
router.delete('/groups/:id', authMiddleware, commonController.deleteGroup);

// System Settings (admin-only)
router.get('/settings', authMiddleware, commonController.getSystemSettings);
router.put('/settings', authMiddleware, commonController.updateSystemSettings);

export default router;

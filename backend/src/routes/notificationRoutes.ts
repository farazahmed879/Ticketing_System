import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notifications (live updates via Socket.io)
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications for the current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of notifications with unread count
 */
router.get('/', authMiddleware, notificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
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
 *         description: Notification marked read
 */
router.put('/:id/read', authMiddleware, notificationController.markRead);
router.put('/read-all', authMiddleware, notificationController.markAllRead);

/**
 * @swagger
 * /api/notifications/clear:
 *   delete:
 *     summary: Clear all notifications for current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications cleared
 */
router.delete('/clear', authMiddleware, notificationController.clearNotifications);

export default router;

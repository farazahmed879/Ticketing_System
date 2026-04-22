import { Router } from 'express';
import { getNotifications, markRead, clearNotifications, markAllRead } from '../controllers/notificationController';
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
router.get('/', authMiddleware, getNotifications);

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
router.put('/:id/read', authMiddleware, markRead);
router.put('/read-all', authMiddleware, markAllRead);

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
router.delete('/clear', authMiddleware, clearNotifications);

export default router;

import { Router } from 'express';
import { getNotices, createNotice, updateNotice, activateNotice, clearNotices, deleteNotice } from '../controllers/noticeController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notices
 *   description: System-wide notices / announcements
 */

/**
 * @swagger
 * /api/notices:
 *   get:
 *     summary: Get all notices
 *     tags: [Notices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notices
 */
router.get('/', authMiddleware, getNotices);

/**
 * @swagger
 * /api/notices:
 *   post:
 *     summary: Create a notice
 *     tags: [Notices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, message]
 *             properties:
 *               name:
 *                 type: string
 *               message:
 *                 type: string
 *               color:
 *                 type: string
 *               fontColor:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notice created
 */
router.post('/', authMiddleware, createNotice);

/**
 * @swagger
 * /api/notices/{id}:
 *   put:
 *     summary: Update a notice
 *     tags: [Notices]
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
 *         description: Notice updated
 */
router.put('/:id', authMiddleware, updateNotice);

/**
 * @swagger
 * /api/notices/{id}/activate:
 *   put:
 *     summary: Activate a notice (deactivates all others)
 *     tags: [Notices]
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
 *         description: Notice activated
 */
router.put('/:id/activate', authMiddleware, activateNotice);

/**
 * @swagger
 * /api/notices/clear:
 *   get:
 *     summary: Deactivate all notices
 *     tags: [Notices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notices deactivated
 */
router.get('/clear', authMiddleware, clearNotices);

/**
 * @swagger
 * /api/notices/{id}:
 *   delete:
 *     summary: Delete a notice
 *     tags: [Notices]
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
 *         description: Notice deleted
 */
router.delete('/:id', authMiddleware, deleteNotice);

export default router;

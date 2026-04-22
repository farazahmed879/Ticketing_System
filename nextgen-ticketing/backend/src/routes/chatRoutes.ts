import { Router } from 'express';
import { getConversations, getConversation, startConversation, sendMessage, getChatPartners, createGroupChat, updateGroupMembers } from '../controllers/chatController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Real-time messaging (REST fallback, primary via Socket.io)
 */

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get all conversations for the logged-in user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations with recent messages
 */
router.get('/conversations', authMiddleware, getConversations);
router.get('/partners', authMiddleware, getChatPartners);
router.post('/groups', authMiddleware, createGroupChat);
router.patch('/groups/:id/members', authMiddleware, updateGroupMembers);

/**
 * @swagger
 * /api/messages/conversations:
 *   post:
 *     summary: Start a new conversation with a user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [partnerId]
 *             properties:
 *               partnerId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Conversation created or existing returned
 */
router.post('/conversations', authMiddleware, startConversation);

/**
 * @swagger
 * /api/messages/conversations/{id}:
 *   get:
 *     summary: Get a conversation with all messages
 *     tags: [Chat]
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
 *         description: Conversation with messages
 */
router.get('/conversations/:id', authMiddleware, getConversation);

/**
 * @swagger
 * /api/messages/conversations/{id}:
 *   post:
 *     summary: Send a message in a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post('/conversations/:id', authMiddleware, sendMessage);

export default router;

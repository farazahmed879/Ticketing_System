import { Router } from 'express';
import { ticketController } from '../controllers/ticket.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Ticket management
 */

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Get all tickets with filtering and pagination
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: group
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of tickets with total count
 */
router.get('/', authMiddleware, ticketController.getTickets);

/**
 * @swagger
 * /api/tickets/history:
 *   get:
 *     summary: Get ticket history (Completed, Expired, Revoked)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Resolved, Closed, Revoked, Expired]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Historical/resolved tickets
 */
router.get('/history', authMiddleware, ticketController.getTicketHistory);

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: Create a new ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, issue, statusId, priorityId, typeId, groupId]
 *             properties:
 *               subject:
 *                 type: string
 *               issue:
 *                 type: string
 *               statusId:
 *                 type: string
 *               priorityId:
 *                 type: string
 *               typeId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               assigneeId:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Ticket created
 */
router.post('/', authMiddleware, ticketController.createTicket);

/**
 * @swagger
 * /api/tickets/batch:
 *   put:
 *     summary: Batch update multiple tickets
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ticketIds]
 *             properties:
 *               ticketIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               statusId:
 *                 type: string
 *               priorityId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               assigneeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tickets updated
 */
router.put('/batch', authMiddleware, ticketController.batchUpdateTickets);

/**
 * @swagger
 * /api/tickets/{id}:
 *   get:
 *     summary: Get ticket by ID (with comments, history)
 *     tags: [Tickets]
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
 *         description: Full ticket details
 */
router.get('/:id', authMiddleware, ticketController.getTicketById);

/**
 * @swagger
 * /api/tickets/{id}:
 *   put:
 *     summary: Update a ticket
 *     tags: [Tickets]
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
 *             properties:
 *               subject:
 *                 type: string
 *               issue:
 *                 type: string
 *               statusId:
 *                 type: string
 *               priorityId:
 *                 type: string
 *               assigneeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket updated
 */
router.put('/:id', authMiddleware, ticketController.updateTicket);

/**
 * @swagger
 * /api/tickets/{id}:
 *   delete:
 *     summary: Soft-delete a ticket
 *     tags: [Tickets]
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
 *         description: Ticket deleted
 */
router.delete('/:id', authMiddleware, ticketController.deleteTicket);

/**
 * @swagger
 * /api/tickets/{id}/comments:
 *   post:
 *     summary: Add a comment or internal note to a ticket
 *     tags: [Tickets]
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
 *             required: [comment]
 *             properties:
 *               comment:
 *                 type: string
 *               isNote:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Comment added
 */
router.post('/:id/comments', authMiddleware, ticketController.addComment);

export default router;

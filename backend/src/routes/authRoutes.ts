import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';
import { loginAccountLimiter, loginIpLimiter, publicWriteLimiter } from '../middleware/rateLimit';
import { validateBody, schemas } from '../middleware/validate';
import { registrationEnabled } from '../controllers/auth.controller';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', loginIpLimiter, validateBody(schemas.login), loginAccountLimiter, authController.login);
router.post('/login-help', publicWriteLimiter, validateBody(schemas.loginHelp), authController.loginHelp);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, fullname]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               fullname: { type: string }
 *     responses:
 *       201:
 *         description: User registered
 */
router.post('/register', registrationEnabled, publicWriteLimiter, validateBody(schemas.register), authController.register);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info retrieved
 */
router.get('/me', authMiddleware, authController.getMe);

export default router;

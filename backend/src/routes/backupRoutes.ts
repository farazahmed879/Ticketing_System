import { Router, Response } from 'express';
import { authMiddleware, requireRoleTypes } from '../middleware/auth';
import { AuthRequest } from '../types';
import { RoleType } from '../utils/constants';
import prisma from '../prisma';
import {
  startBackup,
  listBackups,
  BackupInProgressError,
} from '../services/dbBackupService';
import { streamFromGoogleDrive } from '../services/googleDriveService';

const router = Router();

// Admins and Managers only (role re-checked in the DB on every call).
router.use(authMiddleware, requireRoleTypes([RoleType.ADMIN, RoleType.AGENT]));

/**
 * @swagger
 * /api/backups:
 *   get:
 *     summary: Backup history (newest first)
 *     tags: [Backups]
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  const page = Math.max(0, parseInt(String(req.query.page ?? '0'), 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
  try {
    res.json(await listBackups(page, limit));
  } catch (err) {
    console.error('[backups] list failed:', err);
    res.status(500).json({ message: 'Failed to load backups' });
  }
});

/**
 * @swagger
 * /api/backups:
 *   post:
 *     summary: Start a manual backup (runs in the background)
 *     tags: [Backups]
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { fullname: true },
    });
    const backup = await startBackup('MANUAL', {
      id: req.user!.id,
      name: user?.fullname || 'Unknown',
    });
    res.status(202).json({ backup });
  } catch (err) {
    if (err instanceof BackupInProgressError) {
      return res.status(409).json({ message: err.message });
    }
    console.error('[backups] start failed:', err);
    res.status(500).json({ message: 'Failed to start backup' });
  }
});

/**
 * @swagger
 * /api/backups/{id}/download:
 *   get:
 *     summary: Download a backup file (proxied from Google Drive)
 *     tags: [Backups]
 */
router.get('/:id/download', async (req: AuthRequest, res: Response) => {
  try {
    const backup = await prisma.dbBackup.findUnique({ where: { id: String(req.params.id) } });
    if (!backup || backup.status !== 'SUCCESS' || !backup.driveFileId || backup.fileDeleted) {
      return res.status(404).json({ message: 'Backup file not available' });
    }
    const stream = await streamFromGoogleDrive(backup.driveFileId);
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.fileName}"`);
    if (backup.sizeBytes) res.setHeader('Content-Length', String(backup.sizeBytes));
    stream.on('error', (err) => {
      console.error('[backups] download stream failed:', err);
      res.destroy(err as Error);
    });
    stream.pipe(res);
  } catch (err) {
    console.error('[backups] download failed:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Failed to download backup' });
  }
});

export default router;

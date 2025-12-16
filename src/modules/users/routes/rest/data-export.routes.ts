import { Router } from 'express';
import { DataExportService } from '../../services/data-export.service';
import { requireAuth } from '../../../../middleware/auth';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const dataExportService = new DataExportService();

/**
 * @swagger
 * /api/users/{userId}/data-export:
 *   get:
 *     summary: Export user data (GDPR compliance)
 *     tags: [Data Export]
 */
router.get('/users/:userId/data-export',
  requireAuth,
  validate({ params: z.object({ userId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const data = await dataExportService.exportUserData(userId);
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error exporting user data:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to export user data' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/data-export/email:
 *   post:
 *     summary: Export user data and send via email
 *     tags: [Data Export]
 */
router.post('/users/:userId/data-export/email',
  requireAuth,
  validate({ params: z.object({ userId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await dataExportService.exportAndEmailUserData(userId);
      
      res.json({
        success: true,
        message: 'Data export sent to your email address'
      });
    } catch (error) {
      console.error('Error exporting and emailing user data:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to export and email user data' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/delete-account:
 *   delete:
 *     summary: Delete user account and all data (GDPR right to be forgotten)
 *     tags: [Data Export]
 */
router.delete('/users/:userId/delete-account',
  requireAuth,
  validate({ params: z.object({ userId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Export data before deletion
      try {
        await dataExportService.exportAndEmailUserData(userId);
      } catch (exportError) {
        console.error('Error exporting data before deletion:', exportError);
        // Continue with deletion even if export fails
      }

      await dataExportService.deleteUserAccount(userId);
      
      res.json({
        success: true,
        message: 'Account and all associated data deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user account:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to delete user account' });
    }
  }
);

export default router;

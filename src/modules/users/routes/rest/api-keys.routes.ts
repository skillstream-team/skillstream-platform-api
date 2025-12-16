import { Router } from 'express';
import { ApiKeysService } from '../../services/api-keys.service';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const apiKeysService = new ApiKeysService();

/**
 * @swagger
 * /api/api-keys:
 *   post:
 *     summary: Create API key
 *     tags: [API Keys]
 */
const createApiKeySchema = z.object({
  name: z.string().min(1),
  permissions: z.array(z.string()).min(1),
  rateLimit: z.number().optional(),
  expiresAt: z.string().datetime().optional(),
});

router.post('/api-keys',
  requireAuth,
  validate({ body: createApiKeySchema }),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const apiKey = await apiKeysService.createApiKey({
        ...req.body,
        userId,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      });
      
      res.status(201).json({
        success: true,
        data: apiKey,
        message: 'API key created successfully. Save this key - it will not be shown again.'
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to create API key' });
    }
  }
);

/**
 * @swagger
 * /api/api-keys:
 *   get:
 *     summary: Get user's API keys
 *     tags: [API Keys]
 */
router.get('/api-keys',
  requireAuth,
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const isAdmin = (req as any).user?.role === 'ADMIN';
      
      const apiKeys = isAdmin
        ? await apiKeysService.getAllApiKeys()
        : await apiKeysService.getUserApiKeys(userId);
      
      res.json({
        success: true,
        data: apiKeys
      });
    } catch (error) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({ error: 'Failed to fetch API keys' });
    }
  }
);

/**
 * @swagger
 * /api/api-keys/{id}:
 *   get:
 *     summary: Get API key by ID
 *     tags: [API Keys]
 */
router.get('/api-keys/:id',
  requireAuth,
  validate({ params: z.object({ id: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const isAdmin = (req as any).user?.role === 'ADMIN';
      
      const apiKey = await apiKeysService.getApiKeyById(id, isAdmin ? undefined : userId);
      
      res.json({
        success: true,
        data: apiKey
      });
    } catch (error) {
      console.error('Error fetching API key:', error);
      res.status(404).json({ error: (error as Error).message || 'API key not found' });
    }
  }
);

/**
 * @swagger
 * /api/api-keys/{id}:
 *   put:
 *     summary: Update API key
 *     tags: [API Keys]
 */
const updateApiKeySchema = z.object({
  name: z.string().min(1).optional(),
  permissions: z.array(z.string()).min(1).optional(),
  rateLimit: z.number().optional(),
  expiresAt: z.string().datetime().optional(),
});

router.put('/api-keys/:id',
  requireAuth,
  validate({ 
    params: z.object({ id: z.string().min(1) }),
    body: updateApiKeySchema 
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const isAdmin = (req as any).user?.role === 'ADMIN';
      
      const apiKey = await apiKeysService.updateApiKey(
        id,
        {
          ...req.body,
          expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        },
        isAdmin ? undefined : userId
      );
      
      res.json({
        success: true,
        data: apiKey,
        message: 'API key updated successfully'
      });
    } catch (error) {
      console.error('Error updating API key:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to update API key' });
    }
  }
);

/**
 * @swagger
 * /api/api-keys/{id}:
 *   delete:
 *     summary: Delete API key
 *     tags: [API Keys]
 */
router.delete('/api-keys/:id',
  requireAuth,
  validate({ params: z.object({ id: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const isAdmin = (req as any).user?.role === 'ADMIN';
      
      await apiKeysService.deleteApiKey(id, isAdmin ? undefined : userId);
      
      res.json({
        success: true,
        message: 'API key deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting API key:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to delete API key' });
    }
  }
);

/**
 * @swagger
 * /api/api-keys/{id}/toggle:
 *   put:
 *     summary: Toggle API key active status
 *     tags: [API Keys]
 */
router.put('/api-keys/:id/toggle',
  requireAuth,
  validate({ 
    params: z.object({ id: z.string().min(1) }),
    body: z.object({ isActive: z.boolean() })
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const isAdmin = (req as any).user?.role === 'ADMIN';
      
      const apiKey = await apiKeysService.toggleApiKey(id, req.body.isActive, isAdmin ? undefined : userId);
      
      res.json({
        success: true,
        data: apiKey,
        message: `API key ${req.body.isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling API key:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to toggle API key' });
    }
  }
);

export default router;

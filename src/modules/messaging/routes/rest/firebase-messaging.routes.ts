// src/modules/messaging/routes/rest/firebase-messaging.routes.ts
import { Router } from 'express';
import { FirebaseMessagingService } from '../../services/firebase-messaging.service';
import { requireAuth } from '../../../../middleware/auth';
import { validate } from '../../../../middleware/validation';
import { createMessageSchema, createConversationSchema } from '../../../../utils/validation-schemas';

const router = Router();
const messagingService = new FirebaseMessagingService();

/**
 * Create a new conversation (direct or group)
 */
router.post('/conversations', 
  requireAuth,
  validate({ body: createConversationSchema }),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const conversation = await messagingService.createConversation(userId, req.body);
      res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create conversation',
      });
    }
  }
);

/**
 * Get conversations for the authenticated user
 */
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await messagingService.getConversations(userId, {
      type: req.query.type as 'direct' | 'group' | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch conversations',
    });
  }
});

/**
 * Get a single conversation by ID
 */
router.get('/conversations/:conversationId', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.conversationId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const conversation = await messagingService.getConversationById(conversationId, userId);
    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(error instanceof Error && error.message === 'Conversation not found' ? 404 : 500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch conversation',
    });
  }
});

/**
 * Send a message
 */
router.post('/messages', 
  requireAuth,
  validate({ body: createMessageSchema }),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const message = await messagingService.sendMessage(userId, req.body);
      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  }
);

/**
 * Get messages for a conversation
 */
router.get('/conversations/:conversationId/messages', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.conversationId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const result = await messagingService.getMessages(conversationId, userId, {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      before: req.query.before ? new Date(req.query.before as string) : undefined,
      after: req.query.after ? new Date(req.query.after as string) : undefined,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch messages',
    });
  }
});

export default router;


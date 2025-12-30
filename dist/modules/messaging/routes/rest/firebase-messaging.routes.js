"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/messaging/routes/rest/firebase-messaging.routes.ts
const express_1 = require("express");
const firebase_messaging_service_1 = require("../../services/firebase-messaging.service");
const auth_1 = require("../../../../middleware/auth");
const validation_1 = require("../../../../middleware/validation");
const validation_schemas_1 = require("../../../../utils/validation-schemas");
const router = (0, express_1.Router)();
const messagingService = new firebase_messaging_service_1.FirebaseMessagingService();
/**
 * Create a new conversation (direct or group)
 */
router.post('/conversations', auth_1.requireAuth, (0, validation_1.validate)({ body: validation_schemas_1.createConversationSchema }), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const conversation = await messagingService.createConversation(userId, req.body);
        res.status(201).json({
            success: true,
            data: conversation,
        });
    }
    catch (error) {
        console.error('Error creating conversation:', error);
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Failed to create conversation',
        });
    }
});
/**
 * Get conversations for the authenticated user
 */
router.get('/conversations', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const result = await messagingService.getConversations(userId, {
            type: req.query.type,
            search: req.query.search,
            page: req.query.page ? parseInt(req.query.page) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined,
        });
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to fetch conversations',
        });
    }
});
/**
 * Get a single conversation by ID
 */
router.get('/conversations/:conversationId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
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
    }
    catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(error instanceof Error && error.message === 'Conversation not found' ? 404 : 500).json({
            error: error instanceof Error ? error.message : 'Failed to fetch conversation',
        });
    }
});
/**
 * Send a message
 */
router.post('/messages', auth_1.requireAuth, (0, validation_1.validate)({ body: validation_schemas_1.createMessageSchema }), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const message = await messagingService.sendMessage(userId, req.body);
        res.status(201).json({
            success: true,
            data: message,
        });
    }
    catch (error) {
        console.error('Error sending message:', error);
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Failed to send message',
        });
    }
});
/**
 * Get messages for a conversation
 */
router.get('/conversations/:conversationId/messages', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const conversationId = req.params.conversationId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
            return res.status(400).json({ error: 'Invalid conversation ID' });
        }
        const result = await messagingService.getMessages(conversationId, userId, {
            page: req.query.page ? parseInt(req.query.page) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined,
            before: req.query.before ? new Date(req.query.before) : undefined,
            after: req.query.after ? new Date(req.query.after) : undefined,
        });
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to fetch messages',
        });
    }
});
exports.default = router;

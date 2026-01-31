"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/messaging/routes/rest/messaging.routes.ts
const express_1 = require("express");
const messaging_service_1 = require("../../services/messaging.service");
const file_upload_service_1 = require("../../services/file-upload.service");
const auth_1 = require("../../../../middleware/auth");
const validation_1 = require("../../../../middleware/validation");
const validation_schemas_1 = require("../../../../utils/validation-schemas");
const rate_limit_1 = require("../../../../middleware/rate-limit");
const logger_1 = require("../../../../utils/logger");
const router = (0, express_1.Router)();
const messagingService = new messaging_service_1.MessagingService();
const fileUploadService = new file_upload_service_1.MessagingFileUploadService();
/**
 * @swagger
 * /api/messaging/conversations:
 *   post:
 *     summary: Create a new conversation (direct or group)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - participantIds
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [direct, group]
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs (minimum 2 for direct, can be more for group)
 *               name:
 *                 type: string
 *                 description: Required for group conversations
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
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
        logger_1.logger.error('Error creating conversation', error, {
            userId: req.user?.id,
        });
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Failed to create conversation',
        });
    }
});
/**
 * @swagger
 * /api/messaging/conversations:
 *   get:
 *     summary: Get conversations for the authenticated user
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [direct, group]
 *         description: Filter by conversation type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search conversations by name or description
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of conversations to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of conversations to skip
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/conversations', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const result = await messagingService.getConversations(userId, {
            userId,
            type: req.query.type,
            search: req.query.search,
            page: req.query.page ? parseInt(req.query.page) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined,
        });
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching conversations', error, {
            userId: req.user?.id,
        });
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to fetch conversations',
        });
    }
});
/**
 * @swagger
 * /api/messaging/conversations/{conversationId}:
 *   get:
 *     summary: Get a single conversation by ID
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation retrieved successfully
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
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
        logger_1.logger.error('Error fetching conversation', error, {
            userId: req.user?.id,
            conversationId: req.params.conversationId,
        });
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ error: error.message });
        }
        else {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to fetch conversation',
            });
        }
    }
});
/**
 * @swagger
 * /api/messaging/conversations/{conversationId}:
 *   put:
 *     summary: Update a conversation
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conversation updated successfully
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
router.put('/conversations/:conversationId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const conversationId = req.params.conversationId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!conversationId) {
            return res.status(400).json({ error: 'Invalid conversation ID' });
        }
        const conversation = await messagingService.updateConversation(conversationId, userId, req.body);
        res.json({
            success: true,
            data: conversation,
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating conversation', error, {
            userId: req.user?.id,
            conversationId: req.params.conversationId,
        });
        if (error instanceof Error && error.message.includes('permission')) {
            res.status(403).json({ error: error.message });
        }
        else if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ error: error.message });
        }
        else {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to update conversation',
            });
        }
    }
});
/**
 * @swagger
 * /api/messaging/conversations/{conversationId}:
 *   delete:
 *     summary: Delete a conversation
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
router.delete('/conversations/:conversationId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const conversationId = req.params.conversationId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!conversationId) {
            return res.status(400).json({ error: 'Invalid conversation ID' });
        }
        await messagingService.deleteConversation(conversationId, userId);
        res.json({
            success: true,
            message: 'Conversation deleted successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting conversation', error, {
            userId: req.user?.id,
            conversationId: req.params.conversationId,
        });
        if (error instanceof Error && error.message.includes('permission')) {
            res.status(403).json({ error: error.message });
        }
        else if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ error: error.message });
        }
        else {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to delete conversation',
            });
        }
    }
});
/**
 * @swagger
 * /api/messaging/conversations/{conversationId}/participants:
 *   post:
 *     summary: Add participants to a conversation
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantIds
 *             properties:
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Participants added successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Permission denied
 *       500:
 *         description: Server error
 */
router.post('/conversations/:conversationId/participants', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const conversationId = req.params.conversationId;
        const { participantIds } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!conversationId) {
            return res.status(400).json({ error: 'Invalid conversation ID' });
        }
        if (!Array.isArray(participantIds) || participantIds.length === 0) {
            return res.status(400).json({ error: 'participantIds must be a non-empty array' });
        }
        await messagingService.addParticipants(conversationId, userId, participantIds);
        res.json({
            success: true,
            message: 'Participants added successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error adding participants', error, {
            userId: req.user?.id,
            conversationId: req.params.conversationId,
        });
        if (error instanceof Error && error.message.includes('permission')) {
            res.status(403).json({ error: error.message });
        }
        else {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to add participants',
            });
        }
    }
});
/**
 * @swagger
 * /api/messaging/conversations/{conversationId}/participants/{participantId}:
 *   delete:
 *     summary: Remove a participant from a conversation
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of participant to remove
 *     responses:
 *       200:
 *         description: Participant removed successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Permission denied
 *       500:
 *         description: Server error
 */
router.delete('/conversations/:conversationId/participants/:participantId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const conversationId = req.params.conversationId;
        const participantId = req.params.participantId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!conversationId || !participantId) {
            return res.status(400).json({ error: 'Invalid conversation ID or participant ID' });
        }
        await messagingService.removeParticipant(conversationId, userId, participantId);
        res.json({
            success: true,
            message: 'Participant removed successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error removing participant', error, {
            userId: req.user?.id,
            conversationId: req.params.conversationId,
            participantId: req.params.participantId,
        });
        if (error instanceof Error && error.message.includes('permission')) {
            res.status(403).json({ error: error.message });
        }
        else {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to remove participant',
            });
        }
    }
});
/**
 * @swagger
 * /api/messaging/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: Conversation ID (optional if receiverId is provided)
 *               receiverId:
 *                 type: string
 *                 description: Receiver ID (required if conversationId is not provided)
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, image, file, system]
 *                 default: text
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                     url:
 *                       type: string
 *                     size:
 *                       type: integer
 *                     mimeType:
 *                       type: string
 *               replyToId:
 *                 type: string
 *                 description: ID of message to reply to
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/messages', auth_1.requireAuth, rate_limit_1.messagingRateLimiter, (0, validation_1.validate)({ body: validation_schemas_1.createMessageSchema }), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        logger_1.logger.debug('Sending message', {
            userId,
            conversationId: req.body.conversationId,
            receiverId: req.body.receiverId,
            contentLength: req.body.content?.length,
        });
        const message = await messagingService.sendMessage(userId, req.body);
        res.status(201).json({
            success: true,
            data: message,
        });
    }
    catch (error) {
        logger_1.logger.error('Error sending message', error, {
            userId: req.user?.id,
            conversationId: req.body.conversationId,
        });
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Failed to send message',
        });
    }
});
/**
 * @swagger
 * /api/messaging/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of messages to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of messages to skip
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this date
 *       - in: query
 *         name: after
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages after this date
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       500:
 *         description: Server error
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
            conversationId,
            userId,
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
        logger_1.logger.error('Error fetching messages', error, {
            userId: req.user?.id,
            conversationId: req.params.conversationId,
        });
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to fetch messages',
        });
    }
});
/**
 * @swagger
 * /api/messaging/messages/{messageId}:
 *   put:
 *     summary: Update a message
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Message updated successfully
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.put('/messages/:messageId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const messageId = req.params.messageId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!messageId) {
            return res.status(400).json({ error: 'Invalid message ID' });
        }
        const message = await messagingService.updateMessage(messageId, userId, req.body);
        res.json({
            success: true,
            data: message,
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating message', error, {
            userId: req.user?.id,
            messageId: req.params.messageId,
        });
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ error: error.message });
        }
        else if (error instanceof Error && error.message.includes('permission')) {
            res.status(403).json({ error: error.message });
        }
        else {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to update message',
            });
        }
    }
});
/**
 * @swagger
 * /api/messaging/messages/{messageId}:
 *   delete:
 *     summary: Delete a message (soft delete)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.delete('/messages/:messageId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const messageId = req.params.messageId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!messageId) {
            return res.status(400).json({ error: 'Invalid message ID' });
        }
        await messagingService.deleteMessage(messageId, userId);
        res.json({
            success: true,
            message: 'Message deleted successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting message', error, {
            userId: req.user?.id,
            messageId: req.params.messageId,
        });
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ error: error.message });
        }
        else if (error instanceof Error && error.message.includes('permission')) {
            res.status(403).json({ error: error.message });
        }
        else {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to delete message',
            });
        }
    }
});
/**
 * @swagger
 * /api/messaging/conversations/{conversationId}/read:
 *   post:
 *     summary: Mark all messages in a conversation as read
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *       500:
 *         description: Server error
 */
router.post('/conversations/:conversationId/read', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const conversationId = req.params.conversationId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
            return res.status(400).json({ error: 'Invalid conversation ID' });
        }
        const result = await messagingService.markMessagesAsRead(conversationId, userId);
        res.json({
            success: true,
            markedCount: result.markedCount,
        });
    }
    catch (error) {
        logger_1.logger.error('Error marking messages as read', error, {
            userId: req.user?.id,
            conversationId: req.params.conversationId,
        });
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to mark messages as read',
        });
    }
});
/**
 * @swagger
 * /api/messaging/upload:
 *   post:
 *     summary: Upload a file for message attachment
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - filename
 *               - contentType
 *             properties:
 *               file:
 *                 type: string
 *                 format: base64
 *                 description: Base64 encoded file content
 *               filename:
 *                 type: string
 *               contentType:
 *                 type: string
 *                 example: "image/png"
 *               conversationId:
 *                 type: string
 *                 description: Optional conversation ID for organizing files
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/upload', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { file, filename, contentType, conversationId } = req.body;
        if (!file || !filename || !contentType) {
            return res.status(400).json({
                error: 'file (base64), filename, and contentType are required',
            });
        }
        // Decode base64 file
        const fileBuffer = Buffer.from(file, 'base64');
        const uploadResult = await fileUploadService.uploadFile({
            file: fileBuffer,
            filename,
            contentType,
            conversationId,
        });
        res.json({
            success: true,
            data: uploadResult,
        });
    }
    catch (error) {
        logger_1.logger.error('Error uploading file', error, {
            userId: req.user?.id,
        });
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to upload file',
        });
    }
});
/**
 * @swagger
 * /api/messaging/messages/search:
 *   get:
 *     summary: Search messages
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *         description: Optional conversation ID to search within
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Search results
 *       500:
 *         description: Server error
 */
router.get('/messages/search', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const messages = await messagingService.searchMessages(userId, {
            query: req.query.query,
            conversationId: req.query.conversationId,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined,
        });
        res.json({
            success: true,
            data: messages,
            count: messages.length,
        });
    }
    catch (error) {
        logger_1.logger.error('Error searching messages', error, {
            userId: req.user?.id,
        });
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to search messages',
        });
    }
});
/**
 * @swagger
 * /api/messaging/messages/{messageId}/reactions:
 *   post:
 *     summary: Add a reaction to a message
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 example: "👍"
 *     responses:
 *       200:
 *         description: Reaction added successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/messages/:messageId/reactions', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const messageId = req.params.messageId;
        const { emoji } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!messageId || !emoji) {
            return res.status(400).json({ error: 'Message ID and emoji are required' });
        }
        const message = await messagingService.addReaction(messageId, userId, emoji);
        res.json({
            success: true,
            data: message,
        });
    }
    catch (error) {
        logger_1.logger.error('Error adding reaction', error, {
            userId: req.user?.id,
            messageId: req.params.messageId,
        });
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Failed to add reaction',
        });
    }
});
/**
 * @swagger
 * /api/messaging/messages/{messageId}/reactions:
 *   delete:
 *     summary: Remove a reaction from a message
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reaction removed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.delete('/messages/:messageId/reactions', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const messageId = req.params.messageId;
        const { emoji } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!messageId || !emoji) {
            return res.status(400).json({ error: 'Message ID and emoji are required' });
        }
        const message = await messagingService.removeReaction(messageId, userId, emoji);
        res.json({
            success: true,
            data: message,
        });
    }
    catch (error) {
        logger_1.logger.error('Error removing reaction', error, {
            userId: req.user?.id,
            messageId: req.params.messageId,
        });
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Failed to remove reaction',
        });
    }
});
/**
 * @swagger
 * /api/messaging/messages/{messageId}/read:
 *   post:
 *     summary: Mark a specific message as read
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message marked as read successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/messages/:messageId/read', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const messageId = req.params.messageId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!messageId) {
            return res.status(400).json({ error: 'Invalid message ID' });
        }
        const message = await messagingService.markMessageAsRead(messageId, userId);
        res.json({
            success: true,
            data: message,
        });
    }
    catch (error) {
        logger_1.logger.error('Error marking message as read', error, {
            userId: req.user?.id,
            messageId: req.params.messageId,
        });
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Failed to mark message as read',
        });
    }
});
exports.default = router;

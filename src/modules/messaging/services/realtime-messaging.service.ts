// src/modules/messaging/services/realtime-messaging.service.ts
import { Server as SocketIOServer } from 'socket.io';
import { MessagingService } from './messaging.service';
import { logger } from '../../../utils/logger';

export class RealtimeMessagingService {
  private io: SocketIOServer;
  private messagingService: MessagingService;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(io: SocketIOServer) {
    this.io = io;
    this.messagingService = new MessagingService();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Add authentication middleware
    this.io.use((socket, next) => {
      // Try to get token from handshake auth or query
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (token && typeof token === 'string') {
        try {
          // Verify JWT token (you'll need to import verifyToken)
          const { verifyToken } = require('../../../utils/jwt');
          const payload = verifyToken(token);
          socket.data.userId = payload.id || payload.userId;
          next();
        } catch (error) {
          // Allow connection but require auth in events
          next();
        }
      } else {
        // Allow connection but require auth in events
        next();
      }
    });

    this.io.on('connection', (socket) => {
      logger.info('User connected to messaging', { socketId: socket.id });

      // User joins their personal room
      socket.on('join_user', async (data: { userId?: string }) => {
        try {
          const userId = data.userId || socket.data.userId;
          if (!userId) {
            socket.emit('error', { message: 'User ID required' });
            return;
          }
          socket.join(`user-${userId}`);

          // Track socket for this user
          if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
          }
          this.userSockets.get(userId)!.add(socket.id);

          // Join all conversation rooms for this user
          const conversations = await this.messagingService.getConversations(userId, {
            userId,
            limit: 100,
          });

          conversations.conversations.forEach((conv: any) => {
            socket.join(`conversation-${conv.id}`);
          });

          logger.info('User joined messaging rooms', { userId });
        } catch (error) {
          const errorUserId = data.userId || socket.data.userId;
          logger.error('Error joining user room', error, { userId: errorUserId });
        }
      });

      // Join a specific conversation room
      socket.on('join_conversation', async (data: { conversationId: string; userId: string }) => {
        try {
          const { conversationId, userId } = data;

          // Verify user is a participant
          await this.messagingService.getConversationById(conversationId, userId);

          socket.join(`conversation-${conversationId}`);
          logger.info('User joined conversation', { userId, conversationId });
        } catch (error) {
          const errorUserId = data.userId;
          const errorConversationId = data.conversationId;
          logger.error('Error joining conversation', error, { userId: errorUserId, conversationId: errorConversationId });
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Leave a conversation room
      socket.on('leave_conversation', (data: { conversationId: string }) => {
        const { conversationId } = data;
        socket.leave(`conversation-${conversationId}`);
        logger.debug('User left conversation', { conversationId });
      });

      // Send a message
      socket.on('send_message', async (data: {
        conversationId?: string;
        receiverId?: string;
        content: string;
        type?: 'text' | 'image' | 'file' | 'system';
        attachments?: any[];
        replyToId?: string;
      }) => {
        try {
          // Get sender ID from socket (should be set when joining)
          const userId = this.getUserIdFromSocket(socket);
          if (!userId) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }

          // Send message via service
          const message = await this.messagingService.sendMessage(userId, data);

          // Emit to all participants in the conversation
          this.io.to(`conversation-${message.conversationId}`).emit('new_message', {
            type: 'message',
            data: message,
          });

          // Also emit to sender's personal room for confirmation
          socket.emit('message_sent', {
            type: 'message_sent',
            data: message,
          });

          logger.info('Message sent via Socket.IO', {
            conversationId: message.conversationId,
            messageId: message.id,
            userId,
          });
        } catch (error) {
          const errorUserId = this.getUserIdFromSocket(socket);
          logger.error('Error sending message via Socket.IO', error, {
            userId: errorUserId || undefined,
            conversationId: data.conversationId,
          });
          socket.emit('error', {
            message: error instanceof Error ? error.message : 'Failed to send message',
          });
        }
      });

      // Typing indicator
      socket.on('typing_start', (data: { conversationId: string; userId: string }) => {
        const { conversationId, userId } = data;
        socket.to(`conversation-${conversationId}`).emit('user_typing', {
          conversationId,
          userId,
          isTyping: true,
        });
      });

      socket.on('typing_stop', (data: { conversationId: string; userId: string }) => {
        const { conversationId, userId } = data;
        socket.to(`conversation-${conversationId}`).emit('user_typing', {
          conversationId,
          userId,
          isTyping: false,
        });
      });

      // Mark messages as read (conversation level)
      socket.on('mark_read', async (data: { conversationId: string; userId: string }) => {
        try {
          const { conversationId, userId } = data;
          await this.messagingService.markMessagesAsRead(conversationId, userId);

          // Notify other participants
          socket.to(`conversation-${conversationId}`).emit('messages_read', {
            conversationId,
            userId,
            readAt: new Date(),
          });
        } catch (error) {
          const errorUserId = data.userId;
          const errorConversationId = data.conversationId;
          logger.error('Error marking messages as read via Socket.IO', error, {
            userId: errorUserId,
            conversationId: errorConversationId,
          });
          socket.emit('error', {
            message: error instanceof Error ? error.message : 'Failed to mark as read',
          });
        }
      });

      // Mark a specific message as read
      socket.on('mark_message_read', async (data: { messageId: string }) => {
        try {
          const userId = this.getUserIdFromSocket(socket);
          if (!userId) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }

          const { messageId } = data;
          const message = await this.messagingService.markMessageAsRead(messageId, userId);

          // Notify conversation participants
          this.io.to(`conversation-${message.conversationId}`).emit('message_read', {
            type: 'message_read',
            data: {
              messageId,
              userId,
              readAt: new Date(),
            },
          });
        } catch (error) {
          const errorUserId = this.getUserIdFromSocket(socket);
          const errorMessageId = data.messageId;
          logger.error('Error marking message as read via Socket.IO', error, {
            userId: errorUserId || undefined,
            messageId: errorMessageId,
          });
          socket.emit('error', {
            message: error instanceof Error ? error.message : 'Failed to mark message as read',
          });
        }
      });

      // Add reaction to a message
      socket.on('add_reaction', async (data: { messageId: string; emoji: string }) => {
        try {
          const userId = this.getUserIdFromSocket(socket);
          if (!userId) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }

          const { messageId, emoji } = data;
          const message = await this.messagingService.addReaction(messageId, userId, emoji);

          // Notify conversation participants
          this.io.to(`conversation-${message.conversationId}`).emit('reaction_added', {
            type: 'reaction_added',
            data: {
              messageId,
              userId,
              emoji,
              message,
            },
          });
        } catch (error) {
          const errorUserId = this.getUserIdFromSocket(socket);
          const errorMessageId = data.messageId;
          const errorEmoji = data.emoji;
          logger.error('Error adding reaction via Socket.IO', error, {
            userId: errorUserId || undefined,
            messageId: errorMessageId,
            emoji: errorEmoji,
          });
          socket.emit('error', {
            message: error instanceof Error ? error.message : 'Failed to add reaction',
          });
        }
      });

      // Remove reaction from a message
      socket.on('remove_reaction', async (data: { messageId: string; emoji: string }) => {
        try {
          const userId = this.getUserIdFromSocket(socket);
          if (!userId) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }

          const { messageId, emoji } = data;
          const message = await this.messagingService.removeReaction(messageId, userId, emoji);

          // Notify conversation participants
          this.io.to(`conversation-${message.conversationId}`).emit('reaction_removed', {
            type: 'reaction_removed',
            data: {
              messageId,
              userId,
              emoji,
              message,
            },
          });
        } catch (error) {
          const errorUserId = this.getUserIdFromSocket(socket);
          const errorMessageId = data.messageId;
          const errorEmoji = data.emoji;
          logger.error('Error removing reaction via Socket.IO', error, {
            userId: errorUserId || undefined,
            messageId: errorMessageId,
            emoji: errorEmoji,
          });
          socket.emit('error', {
            message: error instanceof Error ? error.message : 'Failed to remove reaction',
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info('User disconnected from messaging', { socketId: socket.id });

        // Remove socket from user tracking
        for (const [userId, sockets] of this.userSockets.entries()) {
          if (sockets.has(socket.id)) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
              this.userSockets.delete(userId);
            }
            break;
          }
        }
      });
    });
  }

  private getUserIdFromSocket(socket: any): string | null {
    // Get userId from authenticated socket data (set by middleware)
    // Fallback to handshake auth if middleware didn't set it
    return socket.data?.userId || socket.handshake?.auth?.userId || null;
  }

  /**
   * Emit a new message to conversation participants
   */
  public emitNewMessage(conversationId: string, message: any) {
    this.io.to(`conversation-${conversationId}`).emit('new_message', {
      type: 'message',
      data: message,
    });
  }

  /**
   * Emit conversation update to participants
   */
  public emitConversationUpdate(conversationId: string, update: any) {
    this.io.to(`conversation-${conversationId}`).emit('conversation_updated', {
      type: 'conversation_update',
      data: update,
    });
  }

  /**
   * Emit notification to a specific user
   */
  public emitNotification(userId: string, notification: any) {
    this.io.to(`user-${userId}`).emit('notification', {
      type: 'notification',
      data: notification,
    });
  }
}


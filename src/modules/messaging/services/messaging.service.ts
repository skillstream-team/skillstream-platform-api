// src/modules/messaging/services/messaging.service.ts
import { prisma } from '../../../utils/prisma';
import { logger } from '../../../utils/logger';
import {
  CreateMessageDto,
  UpdateMessageDto,
  MessageResponseDto,
  CreateConversationDto,
  UpdateConversationDto,
  ConversationResponseDto,
  ConversationFiltersDto,
  MessageFiltersDto,
} from '../dtos/message.dto';

export class MessagingService {
  // ===========================================
  // CONVERSATION MANAGEMENT
  // ===========================================

  /**
   * Create a new conversation (direct or group)
   */
  async createConversation(
    createdBy: string,
    data: CreateConversationDto
  ): Promise<ConversationResponseDto> {
    try {
      // Validate participant count
      if (data.participantIds.length < 2) {
        throw new Error('A conversation must have at least 2 participants');
      }

      // For direct messages, check if conversation already exists
      if (data.type === 'direct') {
        if (data.participantIds.length !== 2) {
          throw new Error('Direct conversations must have exactly 2 participants');
        }

        // Check if conversation already exists between these two users
        // Find conversations where both users are participants
        const allConversations = await prisma.conversation.findMany({
          where: {
            type: 'direct',
            participants: {
              some: {
                userId: { in: data.participantIds },
                leftAt: null,
              },
            },
          },
          include: {
            participants: {
              where: {
                leftAt: null,
              },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
            creator: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        });

        // Find conversation with exactly these two participants
        const existingConversation = allConversations.find((conv: any) => {
          const participantUserIds = conv.participants.map((p: any) => p.userId).sort();
          const requestedUserIds = [...data.participantIds].sort();
          return (
            participantUserIds.length === 2 &&
            participantUserIds[0] === requestedUserIds[0] &&
            participantUserIds[1] === requestedUserIds[1]
          );
        });

        if (existingConversation) {
          return this.mapConversationToDto(existingConversation);
        }
      } else {
        // Group conversation requires a name
        if (!data.name) {
          throw new Error('Group conversations must have a name');
        }
      }

      // Ensure creator is in participants
      if (!data.participantIds.includes(createdBy)) {
        data.participantIds.push(createdBy);
      }

      // Create conversation with participants
      const conversation = await prisma.conversation.create({
        data: {
          type: data.type,
          name: data.name,
          description: data.description,
          createdBy,
          participants: {
            create: data.participantIds.map((userId) => ({
              userId,
              role: userId === createdBy ? 'admin' : 'member',
            })),
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          messages: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
              receiver: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      return this.mapConversationToDto(conversation);
    } catch (error) {
      throw new Error(
        `Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get conversations for a user
   */
  async getConversations(
    userId: string,
    filters: ConversationFiltersDto
  ): Promise<{
    conversations: ConversationResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const where: any = {
        participants: {
          some: {
            userId,
            leftAt: null, // Only active participants
          },
        },
      };

      if (filters.type) {
        where.type = filters.type;
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Convert offset/limit to page-based if needed
      const page = filters.page || (filters.offset ? Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1 : 1);
      const limit = Math.min(filters.limit || 50, 100);
      const skip = (page - 1) * limit;

      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where,
          include: {
            participants: {
              where: {
                leftAt: null, // Only include active participants in the response
              },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
            creator: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            messages: {
              take: 1,
              orderBy: {
                createdAt: 'desc',
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
                receiver: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: limit,
          skip: skip,
        }),
        prisma.conversation.count({ where }),
      ]);

      // Get unread counts for each conversation
      const conversationsWithUnread = await Promise.all(
        conversations.map(async (conv: any) => {
          const participant = conv.participants.find((p: any) => p.userId === userId);
          const unreadCount = await prisma.message.count({
            where: {
              conversationId: conv.id,
              isRead: false,
              senderId: { not: userId },
              createdAt: {
                gt: participant?.lastReadAt || new Date(0),
              },
            },
          });

          return {
            ...conv,
            unreadCount,
          };
        })
      );

      return {
        conversations: conversationsWithUnread.map((conv: any) => this.mapConversationToDto(conv)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get conversations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a single conversation by ID
   */
  async getConversationById(
    conversationId: string,
    userId: string
  ): Promise<ConversationResponseDto> {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: {
              userId,
              leftAt: null,
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          messages: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
              receiver: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      const participant = conversation.participants.find((p) => p.userId === userId);
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          isRead: false,
          senderId: { not: userId },
          createdAt: {
            gt: participant?.lastReadAt || new Date(0),
          },
        },
      });

      return this.mapConversationToDto({ ...conversation, unreadCount });
    } catch (error) {
      throw new Error(
        `Failed to get conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update a conversation
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    data: UpdateConversationDto
  ): Promise<ConversationResponseDto> {
    try {
      // Check if user is admin or creator
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [
            { createdBy: userId },
            {
              participants: {
                some: {
                  userId,
                  role: 'admin',
                  leftAt: null,
                },
              },
            },
          ],
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found or you do not have permission to update it');
      }

      const updated = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          messages: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
              receiver: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      return this.mapConversationToDto(updated);
    } catch (error) {
      throw new Error(
        `Failed to update conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Add participants to a conversation
   */
  async addParticipants(
    conversationId: string,
    userId: string,
    participantIds: string[]
  ): Promise<void> {
    try {
      // Check if user has permission (admin or creator)
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [
            { createdBy: userId },
            {
              participants: {
                some: {
                  userId,
                  role: 'admin',
                  leftAt: null,
                },
              },
            },
          ],
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found or you do not have permission');
      }

      // Add participants
      await prisma.conversationParticipant.createMany({
        data: participantIds.map((pid) => ({
          conversationId,
          userId: pid,
          role: 'member',
        })),
      });
    } catch (error) {
      throw new Error(
        `Failed to add participants: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Remove participant from conversation (leave or remove)
   */
  async removeParticipant(
    conversationId: string,
    userId: string,
    participantIdToRemove: string
  ): Promise<void> {
    try {
      // Check if user has permission or is removing themselves
      const canRemove =
        userId === participantIdToRemove ||
        (await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [
              { createdBy: userId },
              {
                participants: {
                  some: {
                    userId,
                    role: 'admin',
                    leftAt: null,
                  },
                },
              },
            ],
          },
        }));

      if (!canRemove) {
        throw new Error('You do not have permission to remove this participant');
      }

      await prisma.conversationParticipant.updateMany({
        where: {
          conversationId,
          userId: participantIdToRemove,
        },
        data: {
          leftAt: new Date(),
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to remove participant: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a conversation (soft delete by marking all participants as left)
   * Any participant can delete a conversation - for direct messages, this removes it for both users
   */
  async deleteConversation(
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      // Check if user is a participant in the conversation
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
          leftAt: null, // Must be an active participant
        },
        include: {
          conversation: {
            include: {
              participants: true,
            },
          },
        },
      });

      if (!participant) {
        throw new Error('Conversation not found or you are not a participant');
      }

      const conversation = participant.conversation;

      // For direct messages, mark all participants as left (removes for both users)
      // For group messages, only creator or admin can delete for everyone
      if (conversation.type === 'direct') {
        // Direct message: mark all participants as left
        await prisma.conversationParticipant.updateMany({
          where: {
            conversationId,
            leftAt: null, // Only update active participants
          },
          data: {
            leftAt: new Date(),
          },
        });
      } else {
        // Group message: only creator or admin can delete
        const isCreator = conversation.createdBy === userId;
        const isAdmin = participant.role === 'admin';

        if (!isCreator && !isAdmin) {
          throw new Error('Only the creator or an admin can delete group conversations');
        }

        // Mark all participants as left
        await prisma.conversationParticipant.updateMany({
          where: {
            conversationId,
            leftAt: null, // Only update active participants
          },
          data: {
            leftAt: new Date(),
          },
        });
      }
    } catch (error) {
      throw new Error(
        `Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ===========================================
  // MESSAGE MANAGEMENT
  // ===========================================

  /**
   * Send a message
   */
  async sendMessage(senderId: string, data: CreateMessageDto): Promise<MessageResponseDto> {
    try {
      let conversationId = data.conversationId;

      // If no conversationId, create or find direct conversation
      if (!conversationId) {
        if (!data.receiverId) {
          throw new Error('Either conversationId or receiverId must be provided');
        }

        // Find or create direct conversation
        const conversation = await this.createConversation(senderId, {
          type: 'direct',
          participantIds: [senderId, data.receiverId],
        });

        conversationId = conversation.id;
      }

      // Verify user is a participant, auto-add if missing
      // Use upsert to handle race conditions atomically
      let participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId: senderId,
          leftAt: null,
        },
      });

      if (!participant) {
        logger.debug('User not found as active participant, attempting to add/rejoin', {
          userId: senderId,
          conversationId,
        });

        // Verify conversation exists
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          logger.error('Conversation not found', undefined, { conversationId, userId: senderId });
          throw new Error('Conversation not found');
        }

        // Use upsert to handle race conditions
        try {
          participant = await prisma.conversationParticipant.upsert({
            where: {
              conversationId_userId: {
                conversationId,
                userId: senderId,
              },
            },
            update: {
              leftAt: null, // Rejoin if they left
              role: 'member',
            },
            create: {
              conversationId,
              userId: senderId,
              role: 'member',
            },
          });
          logger.info('User added/rejoined conversation', {
            userId: senderId,
            conversationId,
            action: participant.leftAt ? 'rejoined' : 'added',
          });
        } catch (upsertError: any) {
          // If upsert fails, try to find the participant again (may have been created by concurrent request)
          participant = await prisma.conversationParticipant.findFirst({
            where: {
              conversationId,
              userId: senderId,
              leftAt: null,
            },
          });

          if (!participant) {
            logger.error('Failed to add participant', upsertError, {
              userId: senderId,
              conversationId,
              errorCode: upsertError.code,
            });
            throw new Error('Failed to add user as participant. Please try again.');
          }
        }
      }

      // Determine receiver for direct messages
      let receiverId = data.receiverId;
      if (!receiverId && conversationId) {
        const conversation = await prisma.conversation.findFirst({
          where: { id: conversationId },
          include: {
            participants: {
              where: {
                userId: { not: senderId },
                leftAt: null,
              },
            },
          },
        });

        if (conversation?.type === 'direct' && conversation.participants.length > 0) {
          receiverId = conversation.participants[0].userId;
        }
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId,
          receiverId,
          content: data.content,
          type: data.type || 'text',
          attachments: data.attachments || null,
          replyToId: data.replyToId,
          metadata: data.metadata || null,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      // Update conversation's updatedAt
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return this.mapMessageToDto(message);
    } catch (error) {
      throw new Error(
        `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    filters: MessageFiltersDto
  ): Promise<{
    messages: MessageResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      // Verify user is a participant, auto-add if missing (same logic as sendMessage)
      let participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
          leftAt: null,
        },
      });

      if (!participant) {
        logger.debug('User not found as active participant in getMessages, attempting to add/rejoin', {
          userId,
          conversationId,
        });

        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          throw new Error('Conversation not found');
        }

        // Use upsert to handle race conditions
        try {
          participant = await prisma.conversationParticipant.upsert({
            where: {
              conversationId_userId: {
                conversationId,
                userId,
              },
            },
            update: {
              leftAt: null,
              role: 'member',
            },
            create: {
              conversationId,
              userId,
              role: 'member',
            },
          });
          logger.info('User added/rejoined conversation in getMessages', {
            userId,
            conversationId,
          });
        } catch (upsertError: any) {
          // If upsert fails, try to find the participant again
          participant = await prisma.conversationParticipant.findFirst({
            where: {
              conversationId,
              userId,
              leftAt: null,
            },
          });

          if (!participant) {
            logger.error('Failed to add participant in getMessages', upsertError, {
              userId,
              conversationId,
              errorCode: upsertError.code,
            });
            throw new Error('Failed to add user as participant. Please try again.');
          }
        }
      }

      const where: any = {
        conversationId,
        isDeleted: false,
      };

      if (filters.before) {
        where.createdAt = { ...where.createdAt, lt: filters.before };
      }

      if (filters.after) {
        where.createdAt = { ...where.createdAt, gt: filters.after };
      }

      // Convert offset/limit to page-based if needed
      const page = filters.page || (filters.offset ? Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1 : 1);
      const limit = Math.min(filters.limit || 50, 100);
      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            receiver: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            replyTo: {
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
            reads: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: skip,
        }),
        prisma.message.count({ where }),
      ]);

      return {
        messages: messages.reverse().map((msg: any) => this.mapMessageToDto(msg)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update a message
   */
  async updateMessage(
    messageId: string,
    userId: string,
    data: UpdateMessageDto
  ): Promise<MessageResponseDto> {
    try {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          senderId: userId,
          isDeleted: false,
        },
      });

      if (!message) {
        throw new Error('Message not found or you do not have permission to update it');
      }

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: {
          ...(data.content && { content: data.content }),
          ...(data.metadata !== undefined && { metadata: data.metadata }),
          isEdited: true,
          editedAt: new Date(),
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      return this.mapMessageToDto(updated);
    } catch (error) {
      throw new Error(
        `Failed to update message: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          senderId: userId,
          isDeleted: false,
        },
      });

      if (!message) {
        throw new Error('Message not found or you do not have permission to delete it');
      }

      await prisma.message.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          content: '[Message deleted]',
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string, userId: string): Promise<{ markedCount: number }> {
    try {
      // Verify user is a participant
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
          leftAt: null,
        },
      });

      if (!participant) {
        throw new Error('You are not a participant in this conversation');
      }

      // Mark all unread messages as read
      const result = await prisma.message.updateMany({
        where: {
          conversationId,
          receiverId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Update participant's lastReadAt
      await prisma.conversationParticipant.update({
        where: {
          id: participant.id,
        },
        data: {
          lastReadAt: new Date(),
        },
      });

      return { markedCount: result.count };
    } catch (error) {
      throw new Error(
        `Failed to mark messages as read: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ===========================================
  // MESSAGE SEARCH
  // ===========================================

  /**
   * Search messages
   */
  async searchMessages(
    userId: string,
    filters: {
      conversationId?: string;
      query: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<MessageResponseDto[]> {
    try {
      const where: any = {
        content: {
          contains: filters.query,
          mode: 'insensitive',
        },
        isDeleted: false,
      };

      if (filters.conversationId) {
        // Verify user is a participant
        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            conversationId: filters.conversationId,
            userId,
            leftAt: null,
          },
        });

        if (!participant) {
          throw new Error('You are not a participant in this conversation');
        }

        where.conversationId = filters.conversationId;
      } else {
        // Search across all user's conversations
        const userConversations = await prisma.conversationParticipant.findMany({
          where: {
            userId,
            leftAt: null,
          },
          select: {
            conversationId: true,
          },
        });

        where.conversationId = {
          in: userConversations.map((c) => c.conversationId),
        };
      }

      const messages = await prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
          reads: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      });

      return messages.map((msg: any) => this.mapMessageToDto(msg));
    } catch (error) {
      throw new Error(
        `Failed to search messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ===========================================
  // MESSAGE REACTIONS
  // ===========================================

  /**
   * Add a reaction to a message
   */
  async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<MessageResponseDto> {
    try {
      // Verify user can access this message
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          isDeleted: false,
        },
        include: {
          conversation: {
            include: {
              participants: {
                where: {
                  userId,
                  leftAt: null,
                },
              },
            },
          },
        },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      if (message.conversation.participants.length === 0) {
        throw new Error('You are not a participant in this conversation');
      }

      // Add or update reaction
      await prisma.messageReaction.upsert({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji,
          },
        },
        create: {
          messageId,
          userId,
          emoji,
        },
        update: {},
      });

      // Return updated message with reactions
      return await this.getMessageById(messageId, userId);
    } catch (error) {
      throw new Error(
        `Failed to add reaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<MessageResponseDto> {
    try {
      await prisma.messageReaction.deleteMany({
        where: {
          messageId,
          userId,
          emoji,
        },
      });

      // Return updated message
      return await this.getMessageById(messageId, userId);
    } catch (error) {
      throw new Error(
        `Failed to remove reaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ===========================================
  // PER-MESSAGE READ RECEIPTS
  // ===========================================

  /**
   * Mark a specific message as read
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<MessageResponseDto> {
    try {
      // Verify user can access this message
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          isDeleted: false,
        },
        include: {
          conversation: {
            include: {
              participants: {
                where: {
                  userId,
                  leftAt: null,
                },
              },
            },
          },
        },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      if (message.conversation.participants.length === 0) {
        throw new Error('You are not a participant in this conversation');
      }

      // Create or update read receipt
      await prisma.messageRead.upsert({
        where: {
          messageId_userId: {
            messageId,
            userId,
          },
        },
        create: {
          messageId,
          userId,
        },
        update: {
          readAt: new Date(),
        },
      });

      // Update message isRead flag if user is the receiver
      if (message.receiverId === userId) {
        await prisma.message.update({
          where: { id: messageId },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });
      }

      // Return updated message
      return await this.getMessageById(messageId, userId);
    } catch (error) {
      throw new Error(
        `Failed to mark message as read: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a single message by ID with all details
   */
  private async getMessageById(messageId: string, userId: string): Promise<MessageResponseDto> {
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        reads: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    return this.mapMessageToDto(message);
  }

  // ===========================================
  // HELPER METHODS
  // ===========================================

  private mapMessageToDto(message: any): MessageResponseDto {
    // Sender is required, so provide fallback if missing
    const sender = message.sender || {
      id: message.senderId,
      username: 'Unknown',
      email: '',
      firstName: null,
      lastName: null,
      avatar: null,
    };

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender: {
        id: sender.id,
        username: sender.username,
        email: sender.email,
        firstName: sender.firstName || null,
        lastName: sender.lastName || null,
        avatar: sender.avatar || null,
      },
      receiverId: message.receiverId || undefined,
      receiver: message.receiver ? {
        id: message.receiver.id,
        username: message.receiver.username,
        email: message.receiver.email,
        firstName: message.receiver.firstName || null,
        lastName: message.receiver.lastName || null,
        avatar: message.receiver.avatar || null,
      } : undefined,
      content: message.content,
      type: message.type,
      attachments: (message.attachments as any) || undefined,
      isRead: message.isRead,
      readAt: message.readAt || undefined,
      isEdited: message.isEdited,
      editedAt: message.editedAt || undefined,
      isDeleted: message.isDeleted,
      deletedAt: message.deletedAt || undefined,
      replyToId: message.replyToId || undefined,
      replyTo: message.replyTo ? this.mapMessageToDto(message.replyTo) : undefined,
      reactions: message.reactions
        ? message.reactions.map((r: any) => ({
            id: r.id,
            emoji: r.emoji,
            userId: r.userId,
            user: r.user,
            createdAt: r.createdAt,
          }))
        : undefined,
      readBy: message.reads
        ? message.reads.map((r: any) => ({
            id: r.id,
            userId: r.userId,
            user: r.user,
            readAt: r.readAt,
          }))
        : undefined,
      metadata: (message.metadata as any) || undefined,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  private mapConversationToDto(conversation: any): ConversationResponseDto {
    const activeParticipants = (conversation.participants || []).filter((p: any) => !p.leftAt);
    
    return {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name || undefined,
      description: conversation.description || undefined,
      createdBy: conversation.createdBy,
      creator: conversation.creator,
      participantIds: activeParticipants.map((p: any) => p.userId),
      participants: activeParticipants.map((p: any) => ({
        id: p.user?.id || p.userId,
        userId: p.userId,
        username: p.user?.username || '',
        email: p.user?.email || '',
        firstName: p.user?.firstName || null,
        lastName: p.user?.lastName || null,
        avatar: p.user?.avatar || null,
        role: p.role,
        joinedAt: p.joinedAt,
        lastReadAt: p.lastReadAt || undefined,
        isMuted: p.isMuted,
        // Keep nested user for backward compatibility
        user: p.user,
      })),
      lastMessage:
        conversation.messages && conversation.messages.length > 0
          ? this.mapMessageToDto(conversation.messages[0])
          : undefined,
      unreadCount: conversation.unreadCount || 0,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}


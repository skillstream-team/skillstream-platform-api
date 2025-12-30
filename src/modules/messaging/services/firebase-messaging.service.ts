// src/modules/messaging/services/firebase-messaging.service.ts
import { getFirestore } from '../../../utils/firebase';
import admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface CreateConversationDto {
  type: 'direct' | 'group';
  participantIds: string[];
  name?: string;
  description?: string;
}

export interface CreateMessageDto {
  conversationId?: string;
  receiverId?: string;
  content: string;
  type?: 'text' | 'image' | 'file' | 'system';
  attachments?: Array<{
    filename: string;
    url: string;
    size?: number;
    mimeType?: string;
  }>;
  replyToId?: string;
  metadata?: any;
}

export interface ConversationResponseDto {
  id: string;
  type: string;
  name?: string;
  description?: string;
  createdBy: string;
  participantIds: string[];
  participants: Array<{
    id: string;
    userId: string;
    username: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
    role: string;
    joinedAt: Date;
    lastReadAt?: Date;
    isMuted: boolean;
  }>;
  lastMessage?: MessageResponseDto;
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageResponseDto {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId?: string;
  content: string;
  type: string;
  attachments?: Array<{
    filename: string;
    url: string;
    size?: number;
    mimeType?: string;
  }>;
  replyToId?: string;
  metadata?: any;
  isRead: boolean;
  readAt?: Date;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: string;
    username: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  };
  receiver?: {
    id: string;
    username: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  };
}

export class FirebaseMessagingService {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = getFirestore();
  }

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

      // Ensure creator is in participants
      if (!data.participantIds.includes(createdBy)) {
        data.participantIds.push(createdBy);
      }

      // For direct messages, check if conversation already exists
      if (data.type === 'direct') {
        if (data.participantIds.length !== 2) {
          throw new Error('Direct conversations must have exactly 2 participants');
        }

        // Check if conversation already exists between these two users
        const [userId1, userId2] = data.participantIds.sort();
        const existingConversations = await this.db
          .collection('conversations')
          .where('type', '==', 'direct')
          .where('participantIds', '==', [userId1, userId2])
          .limit(1)
          .get();

        if (!existingConversations.empty) {
          const existingDoc = existingConversations.docs[0];
          return this.mapConversationToDto(existingDoc.id, existingDoc.data());
        }
      } else {
        // Group conversation requires a name
        if (!data.name) {
          throw new Error('Group conversations must have a name');
        }
      }

      // Create conversation document
      const conversationData = {
        type: data.type,
        name: data.name || null,
        description: data.description || null,
        createdBy,
        participantIds: data.participantIds,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const conversationRef = await this.db.collection('conversations').add(conversationData);

      // Create participant documents
      const participantPromises = data.participantIds.map(async (userId) => {
        await this.db.collection('conversations').doc(conversationRef.id).collection('participants').add({
          userId,
          role: userId === createdBy ? 'admin' : 'member',
          joinedAt: Timestamp.now(),
          lastReadAt: null,
          isMuted: false,
          leftAt: null,
        });
      });

      await Promise.all(participantPromises);

      // Fetch user data for participants
      const conversation = await this.db.collection('conversations').doc(conversationRef.id).get();
      return this.mapConversationToDto(conversationRef.id, conversation.data()!);
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
    filters: {
      type?: 'direct' | 'group';
      search?: string;
      limit?: number;
      offset?: number;
      page?: number;
    }
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
      let query: admin.firestore.Query = this.db.collection('conversations');

      // Filter by type if provided
      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }

      // Filter by participant (user must be in participantIds array)
      query = query.where('participantIds', 'array-contains', userId);

      // Apply pagination
      const page = filters.page || (filters.offset ? Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1 : 1);
      const limit = Math.min(filters.limit || 50, 100);
      const skip = (page - 1) * limit;

      if (skip > 0) {
        // Note: Firestore doesn't support offset, so we'd need to use cursor-based pagination
        // For simplicity, we'll fetch all and paginate in memory (not ideal for large datasets)
      }

      query = query.orderBy('updatedAt', 'desc').limit(limit);

      const snapshot = await query.get();
      const conversations: ConversationResponseDto[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const conversation = await this.mapConversationToDto(doc.id, data);
        
        // Apply search filter if provided
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const matchesName = conversation.name?.toLowerCase().includes(searchLower);
          const matchesDescription = conversation.description?.toLowerCase().includes(searchLower);
          if (!matchesName && !matchesDescription) {
            continue;
          }
        }

        conversations.push(conversation);
      }

      // Get total count (simplified - in production, use a separate counter)
      const totalSnapshot = await this.db
        .collection('conversations')
        .where('participantIds', 'array-contains', userId)
        .get();
      const total = totalSnapshot.size;

      return {
        conversations,
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
      const conversationDoc = await this.db.collection('conversations').doc(conversationId).get();

      if (!conversationDoc.exists) {
        throw new Error('Conversation not found');
      }

      const data = conversationDoc.data()!;

      // Verify user is a participant
      if (!data.participantIds || !data.participantIds.includes(userId)) {
        throw new Error('You are not a participant in this conversation');
      }

      return this.mapConversationToDto(conversationId, data);
    } catch (error) {
      throw new Error(
        `Failed to get conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
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

      // Verify user is a participant
      const conversationDoc = await this.db.collection('conversations').doc(conversationId).get();
      if (!conversationDoc.exists) {
        throw new Error('Conversation not found');
      }

      const conversationData = conversationDoc.data()!;
      if (!conversationData.participantIds || !conversationData.participantIds.includes(senderId)) {
        // Auto-add user as participant
        await this.db.collection('conversations').doc(conversationId).update({
          participantIds: [...(conversationData.participantIds || []), senderId],
        });
        
        // Add participant document
        await this.db.collection('conversations').doc(conversationId).collection('participants').add({
          userId: senderId,
          role: 'member',
          joinedAt: Timestamp.now(),
          lastReadAt: null,
          isMuted: false,
          leftAt: null,
        });
      }

      // Determine receiver for direct messages
      let receiverId = data.receiverId;
      if (!receiverId && conversationData.type === 'direct') {
        const otherParticipants = conversationData.participantIds.filter((id: string) => id !== senderId);
        receiverId = otherParticipants[0];
      }

      // Create message document
      const messageData = {
        conversationId,
        senderId,
        receiverId: receiverId || null,
        content: data.content,
        type: data.type || 'text',
        attachments: data.attachments || [],
        replyToId: data.replyToId || null,
        metadata: data.metadata || {},
        isRead: false,
        readAt: null,
        isEdited: false,
        editedAt: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const messageRef = await this.db.collection('conversations').doc(conversationId).collection('messages').add(messageData);

      // Update conversation's updatedAt
      await this.db.collection('conversations').doc(conversationId).update({
        updatedAt: Timestamp.now(),
      });

      // Fetch the created message with user data
      const messageDoc = await messageRef.get();
      return this.mapMessageToDto(messageDoc.id, messageDoc.data()!);
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
    filters: {
      limit?: number;
      offset?: number;
      page?: number;
      before?: Date;
      after?: Date;
    }
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
      // Verify user is a participant
      const conversationDoc = await this.db.collection('conversations').doc(conversationId).get();
      if (!conversationDoc.exists) {
        throw new Error('Conversation not found');
      }

      const conversationData = conversationDoc.data()!;
      if (!conversationData.participantIds || !conversationData.participantIds.includes(userId)) {
        throw new Error('You are not a participant in this conversation');
      }

      let query: admin.firestore.Query = this.db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .where('isDeleted', '==', false);

      // Apply time filters
      if (filters.before) {
        query = query.where('createdAt', '<', Timestamp.fromDate(filters.before));
      }
      if (filters.after) {
        query = query.where('createdAt', '>', Timestamp.fromDate(filters.after));
      }

      // Apply pagination
      const limit = Math.min(filters.limit || 50, 100);
      query = query.orderBy('createdAt', 'desc').limit(limit);

      const snapshot = await query.get();
      const messages: MessageResponseDto[] = [];

      for (const doc of snapshot.docs) {
        const message = await this.mapMessageToDto(doc.id, doc.data());
        messages.push(message);
      }

      // Reverse to get chronological order
      messages.reverse();

      // Get total count
      const totalSnapshot = await this.db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .where('isDeleted', '==', false)
        .get();
      const total = totalSnapshot.size;

      const page = filters.page || 1;

      return {
        messages,
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

  // ===========================================
  // HELPER METHODS
  // ===========================================

  private async mapConversationToDto(
    id: string,
    data: admin.firestore.DocumentData
  ): Promise<ConversationResponseDto> {
    // Fetch participants with user data
    const participantsSnapshot = await this.db
      .collection('conversations')
      .doc(id)
      .collection('participants')
      .where('leftAt', '==', null)
      .get();

    const participants = await Promise.all(
      participantsSnapshot.docs.map(async (doc) => {
        const participantData = doc.data();
        // Fetch user data from your existing user service/API
        // For now, return basic structure - you can enhance this to fetch from your user database
        let userData = null;
        try {
          const userDoc = await this.db.collection('users').doc(participantData.userId).get();
          userData = userDoc.data();
        } catch (error) {
          // If users collection doesn't exist in Firestore, you'll need to fetch from your main database
          // This is a placeholder - implement based on your user storage
          console.warn(`User ${participantData.userId} not found in Firestore, fetch from main DB if needed`);
        }

        return {
          id: userData?.id || participantData.userId,
          userId: participantData.userId,
          username: userData?.username || '',
          email: userData?.email || '',
          firstName: userData?.firstName || null,
          lastName: userData?.lastName || null,
          avatar: userData?.avatar || null,
          role: participantData.role,
          joinedAt: participantData.joinedAt?.toDate() || new Date(),
          lastReadAt: participantData.lastReadAt?.toDate() || undefined,
          isMuted: participantData.isMuted || false,
        };
      })
    );

    // Get last message
    const lastMessageSnapshot = await this.db
      .collection('conversations')
      .doc(id)
      .collection('messages')
      .where('isDeleted', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    let lastMessage: MessageResponseDto | undefined;
    if (!lastMessageSnapshot.empty) {
      const lastMessageDoc = lastMessageSnapshot.docs[0];
      lastMessage = await this.mapMessageToDto(lastMessageDoc.id, lastMessageDoc.data());
    }

    // Get unread count
    const unreadSnapshot = await this.db
      .collection('conversations')
      .doc(id)
      .collection('messages')
      .where('isDeleted', '==', false)
      .where('isRead', '==', false)
      .get();
    const unreadCount = unreadSnapshot.size;

    return {
      id,
      type: data.type,
      name: data.name || undefined,
      description: data.description || undefined,
      createdBy: data.createdBy,
      // Note: creator field removed as it's not in the ConversationResponseDto interface
      // If needed, fetch creator data separately
      participantIds: data.participantIds || [],
      participants,
      lastMessage,
      unreadCount,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }

  private async mapMessageToDto(
    id: string,
    data: admin.firestore.DocumentData
  ): Promise<MessageResponseDto> {
    // Fetch sender and receiver data
    // Note: If users are stored in your main database (not Firestore), 
    // you'll need to fetch from there instead
    let senderData = null;
    let receiverData = null;
    
    try {
      if (data.senderId) {
        const senderDoc = await this.db.collection('users').doc(data.senderId).get();
        senderData = senderDoc.data();
      }
      if (data.receiverId) {
        const receiverDoc = await this.db.collection('users').doc(data.receiverId).get();
        receiverData = receiverDoc.data();
      }
    } catch (error) {
      // If users collection doesn't exist, fetch from your main database
      console.warn('Users not in Firestore, implement fetching from main DB if needed');
    }

    return {
      id,
      conversationId: data.conversationId,
      senderId: data.senderId,
      receiverId: data.receiverId || undefined,
      content: data.content,
      type: data.type,
      attachments: data.attachments || [],
      replyToId: data.replyToId || undefined,
      metadata: data.metadata || {},
      isRead: data.isRead || false,
      readAt: data.readAt?.toDate() || undefined,
      isEdited: data.isEdited || false,
      editedAt: data.editedAt?.toDate() || undefined,
      isDeleted: data.isDeleted || false,
      deletedAt: data.deletedAt?.toDate() || undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      sender: senderData
        ? {
            id: senderData.id || data.senderId,
            username: senderData.username || '',
            email: senderData.email || '',
            firstName: senderData.firstName || null,
            lastName: senderData.lastName || null,
            avatar: senderData.avatar || null,
          }
        : undefined,
      receiver: receiverData
        ? {
            id: receiverData.id || data.receiverId,
            username: receiverData.username || '',
            email: receiverData.email || '',
            firstName: receiverData.firstName || null,
            lastName: receiverData.lastName || null,
            avatar: receiverData.avatar || null,
          }
        : undefined,
    };
  }
}


// src/modules/messaging/dtos/message.dto.ts

export interface CreateMessageDto {
  conversationId?: string; // Optional - will create conversation if not provided
  receiverId?: string; // Required for direct messages if conversationId not provided
  content: string;
  type?: 'text' | 'image' | 'file' | 'system';
  attachments?: Array<{
    filename: string;
    url: string;
    size?: number;
    mimeType?: string;
  }>;
  replyToId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateMessageDto {
  content?: string;
  metadata?: Record<string, any>;
}

export interface MessageResponseDto {
  id: string;
  conversationId: string;
  senderId: string;
  sender: {
    id: string;
    username: string;
    email: string;
  };
  receiverId?: string;
  receiver?: {
    id: string;
    username: string;
    email: string;
  };
  content: string;
  type: string;
  attachments?: Array<{
    filename: string;
    url: string;
    size?: number;
    mimeType?: string;
  }>;
  isRead: boolean;
  readAt?: Date;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  replyToId?: string;
  replyTo?: MessageResponseDto;
  reactions?: Array<{
    id: string;
    emoji: string;
    userId: string;
    user: {
      id: string;
      username: string;
    };
    createdAt: Date;
  }>;
  readBy?: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      username: string;
    };
    readAt: Date;
  }>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConversationDto {
  type: 'direct' | 'group';
  participantIds: string[]; // At least 2 for direct, can be more for group
  name?: string; // Required for group conversations
  description?: string;
}

export interface UpdateConversationDto {
  name?: string;
  description?: string;
}

export interface ConversationResponseDto {
  id: string;
  type: string;
  name?: string;
  description?: string;
  createdBy: string;
  creator: {
    id: string;
    username: string;
    email: string;
  };
  participants: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      username: string;
      email: string;
    };
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

export interface ConversationFiltersDto {
  userId: string;
  type?: 'direct' | 'group';
  search?: string;
  limit?: number;
  offset?: number;
  page?: number;
}

export interface MessageFiltersDto {
  conversationId: string;
  userId: string;
  limit?: number;
  offset?: number;
  page?: number;
  before?: Date; // Get messages before this date
  after?: Date; // Get messages after this date
}

export interface MessageSearchDto {
  conversationId?: string;
  userId: string;
  query: string;
  limit?: number;
  offset?: number;
  page?: number;
}

export interface AddReactionDto {
  messageId: string;
  emoji: string; // e.g., "👍", "❤️", "😂"
}

export interface RemoveReactionDto {
  messageId: string;
  emoji: string;
}

export interface MarkMessageReadDto {
  messageId: string;
}

export interface FileUploadDto {
  file: Buffer;
  filename: string;
  contentType: string;
  conversationId?: string;
}

export interface FileUploadResponseDto {
  key: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}


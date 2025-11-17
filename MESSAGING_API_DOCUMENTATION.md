# Messaging API Documentation

## Base URL
```
https://skillstream-platform-api.onrender.com/api/messaging
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## REST API Endpoints

### 1. Conversations

#### Create Conversation
**POST** `/conversations`

Create a new direct or group conversation.

**Request Body:**
```json
{
  "type": "direct" | "group",
  "participantIds": ["user-id-1", "user-id-2"],
  "name": "Group Name", // Required for group conversations
  "description": "Optional description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conversation-id",
    "type": "direct",
    "name": null,
    "description": null,
    "createdBy": "user-id",
    "creator": {
      "id": "user-id",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "participants": [...],
    "lastMessage": null,
    "unreadCount": 0,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

#### Get Conversations
**GET** `/conversations?type=direct&search=query&limit=50&offset=0`

Get all conversations for the authenticated user.

**Query Parameters:**
- `type` (optional): Filter by `direct` or `group`
- `search` (optional): Search conversations by name/description
- `limit` (optional): Max results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

#### Get Single Conversation
**GET** `/conversations/:conversationId`

Get details of a specific conversation.

**Response:**
```json
{
  "success": true,
  "data": { /* conversation object */ }
}
```

#### Update Conversation
**PUT** `/conversations/:conversationId`

Update conversation name or description (admin/creator only).

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### Add Participants
**POST** `/conversations/:conversationId/participants`

Add users to a conversation (admin/creator only).

**Request Body:**
```json
{
  "participantIds": ["user-id-1", "user-id-2"]
}
```

#### Remove Participant
**DELETE** `/conversations/:conversationId/participants/:participantId`

Remove a participant from a conversation (admin/creator or self).

---

### 2. Messages

#### Send Message
**POST** `/messages`

Send a new message. Creates conversation automatically if `receiverId` is provided without `conversationId`.

**Request Body:**
```json
{
  "conversationId": "conversation-id", // Optional if receiverId provided
  "receiverId": "user-id", // Required if conversationId not provided
  "content": "Hello, this is a message!",
  "type": "text" | "image" | "file" | "system", // Default: "text"
  "attachments": [
    {
      "filename": "image.png",
      "url": "https://...",
      "size": 1024,
      "mimeType": "image/png"
    }
  ],
  "replyToId": "message-id", // Optional: reply to a message
  "metadata": {} // Optional: additional data
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "message-id",
    "conversationId": "conversation-id",
    "senderId": "user-id",
    "sender": { "id": "...", "username": "...", "email": "..." },
    "content": "Hello, this is a message!",
    "type": "text",
    "attachments": [...],
    "isRead": false,
    "isEdited": false,
    "isDeleted": false,
    "reactions": [],
    "readBy": [],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

#### Get Messages
**GET** `/conversations/:conversationId/messages?limit=50&offset=0&before=2025-01-01T00:00:00Z&after=2025-01-01T00:00:00Z`

Get messages for a conversation.

**Query Parameters:**
- `limit` (optional): Max results (default: 50)
- `offset` (optional): Pagination offset
- `before` (optional): Get messages before this date
- `after` (optional): Get messages after this date

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 25
}
```

#### Update Message
**PUT** `/messages/:messageId`

Update a message (sender only).

**Request Body:**
```json
{
  "content": "Updated message content",
  "metadata": {}
}
```

#### Delete Message
**DELETE** `/messages/:messageId`

Soft delete a message (sender only).

**Response:**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

#### Search Messages
**GET** `/messages/search?query=search+term&conversationId=conv-id&limit=50&offset=0`

Search messages across conversations or within a specific conversation.

**Query Parameters:**
- `query` (required): Search term
- `conversationId` (optional): Limit search to specific conversation
- `limit` (optional): Max results
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 5
}
```

---

### 3. Reactions

#### Add Reaction
**POST** `/messages/:messageId/reactions`

Add an emoji reaction to a message.

**Request Body:**
```json
{
  "emoji": "👍"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    /* Updated message with reactions */
    "reactions": [
      {
        "id": "reaction-id",
        "emoji": "👍",
        "userId": "user-id",
        "user": { "id": "...", "username": "..." },
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### Remove Reaction
**DELETE** `/messages/:messageId/reactions`

Remove an emoji reaction from a message.

**Request Body:**
```json
{
  "emoji": "👍"
}
```

---

### 4. Read Receipts

#### Mark Conversation as Read
**POST** `/conversations/:conversationId/read`

Mark all messages in a conversation as read.

**Response:**
```json
{
  "success": true,
  "message": "Messages marked as read successfully"
}
```

#### Mark Message as Read
**POST** `/messages/:messageId/read`

Mark a specific message as read (per-message read receipt).

**Response:**
```json
{
  "success": true,
  "data": {
    /* Updated message with readBy array */
    "readBy": [
      {
        "id": "read-id",
        "userId": "user-id",
        "user": { "id": "...", "username": "..." },
        "readAt": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 5. File Upload

#### Upload File
**POST** `/upload`

Upload a file for use as a message attachment.

**Request Body:**
```json
{
  "file": "base64-encoded-file-content",
  "filename": "document.pdf",
  "contentType": "application/pdf",
  "conversationId": "conversation-id" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "messages/conv-id/1234567890-document.pdf",
    "url": "https://bucket.r2.cloudflarestorage.com/...",
    "filename": "document.pdf",
    "size": 1024,
    "contentType": "application/pdf",
    "uploadedAt": "2025-01-01T00:00:00Z"
  }
}
```

**Usage:**
1. Convert file to base64 on frontend
2. Upload via this endpoint
3. Use returned `url` in message `attachments` array when sending message

---

## Socket.IO Real-Time Events

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('https://skillstream-platform-api.onrender.com', {
  auth: {
    token: 'your-jwt-token'
  },
  transports: ['websocket', 'polling']
});
```

### Emit Events (Client → Server)

#### Join User Room
```javascript
socket.emit('join_user', {
  userId: 'your-user-id'
});
```

#### Join Conversation
```javascript
socket.emit('join_conversation', {
  conversationId: 'conversation-id',
  userId: 'your-user-id'
});
```

#### Leave Conversation
```javascript
socket.emit('leave_conversation', {
  conversationId: 'conversation-id'
});
```

#### Send Message
```javascript
socket.emit('send_message', {
  conversationId: 'conversation-id', // Optional if receiverId provided
  receiverId: 'user-id', // Optional if conversationId provided
  content: 'Hello!',
  type: 'text',
  attachments: [],
  replyToId: 'message-id' // Optional
});
```

#### Typing Indicator
```javascript
// Start typing
socket.emit('typing_start', {
  conversationId: 'conversation-id',
  userId: 'your-user-id'
});

// Stop typing
socket.emit('typing_stop', {
  conversationId: 'conversation-id',
  userId: 'your-user-id'
});
```

#### Mark Conversation as Read
```javascript
socket.emit('mark_read', {
  conversationId: 'conversation-id',
  userId: 'your-user-id'
});
```

#### Mark Message as Read
```javascript
socket.emit('mark_message_read', {
  messageId: 'message-id'
});
```

#### Add Reaction
```javascript
socket.emit('add_reaction', {
  messageId: 'message-id',
  emoji: '👍'
});
```

#### Remove Reaction
```javascript
socket.emit('remove_reaction', {
  messageId: 'message-id',
  emoji: '👍'
});
```

### Listen Events (Server → Client)

#### New Message
```javascript
socket.on('new_message', (data) => {
  console.log('New message:', data);
  // data.type = 'message'
  // data.data = { message object }
});
```

#### Message Sent Confirmation
```javascript
socket.on('message_sent', (data) => {
  console.log('Message sent:', data);
});
```

#### User Typing
```javascript
socket.on('user_typing', (data) => {
  // data = { conversationId, userId, isTyping: true/false }
  if (data.isTyping) {
    // Show typing indicator
  } else {
    // Hide typing indicator
  }
});
```

#### Messages Read (Conversation Level)
```javascript
socket.on('messages_read', (data) => {
  // data = { conversationId, userId, readAt }
  // All messages in conversation marked as read by user
});
```

#### Message Read (Per Message)
```javascript
socket.on('message_read', (data) => {
  // data.type = 'message_read'
  // data.data = { messageId, userId, readAt }
  // Update message readBy array
});
```

#### Reaction Added
```javascript
socket.on('reaction_added', (data) => {
  // data.type = 'reaction_added'
  // data.data = { messageId, userId, emoji, message }
  // Update message reactions
});
```

#### Reaction Removed
```javascript
socket.on('reaction_removed', (data) => {
  // data.type = 'reaction_removed'
  // data.data = { messageId, userId, emoji, message }
  // Update message reactions
});
```

#### Conversation Updated
```javascript
socket.on('conversation_updated', (data) => {
  // data.type = 'conversation_update'
  // data.data = { conversation object }
});
```

#### Error
```javascript
socket.on('error', (data) => {
  console.error('Socket error:', data.message);
});
```

---

## Frontend Integration Example

### React/TypeScript Example

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const API_BASE_URL = 'https://skillstream-platform-api.onrender.com/api/messaging';
const SOCKET_URL = 'https://skillstream-platform-api.onrender.com';

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: { id: string; username: string };
  reactions?: Array<{ emoji: string; userId: string; user: { username: string } }>;
  readBy?: Array<{ userId: string; user: { username: string }; readAt: Date }>;
  createdAt: Date;
}

export function useMessaging(token: string, userId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_user', { userId });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for new messages
    newSocket.on('new_message', (data) => {
      setMessages(prev => [...prev, data.data]);
    });

    // Listen for reactions
    newSocket.on('reaction_added', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.data.messageId ? data.data.message : msg
      ));
    });

    newSocket.on('reaction_removed', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.data.messageId ? data.data.message : msg
      ));
    });

    // Listen for read receipts
    newSocket.on('message_read', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.data.messageId 
          ? { ...msg, readBy: [...(msg.readBy || []), data.data] }
          : msg
      ));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token, userId]);

  // Send message via REST API
  const sendMessage = async (conversationId: string, content: string) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/messages`,
        { conversationId, content, type: 'text' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Send message via Socket.IO (real-time)
  const sendMessageRealtime = (conversationId: string, content: string) => {
    if (socket) {
      socket.emit('send_message', {
        conversationId,
        content,
        type: 'text'
      });
    }
  };

  // Add reaction
  const addReaction = async (messageId: string, emoji: string) => {
    try {
      await axios.post(
        `${API_BASE_URL}/messages/${messageId}/reactions`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Or via Socket.IO
  const addReactionRealtime = (messageId: string, emoji: string) => {
    if (socket) {
      socket.emit('add_reaction', { messageId, emoji });
    }
  };

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    try {
      await axios.post(
        `${API_BASE_URL}/messages/${messageId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Get messages
  const getMessages = async (conversationId: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/conversations/${conversationId}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  };

  // Upload file
  const uploadFile = async (file: File, conversationId?: string) => {
    try {
      const base64 = await fileToBase64(file);
      const response = await axios.post(
        `${API_BASE_URL}/upload`,
        {
          file: base64,
          filename: file.name,
          contentType: file.type,
          conversationId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  // Search messages
  const searchMessages = async (query: string, conversationId?: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/messages/search`,
        {
          params: { query, conversationId },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  };

  return {
    socket,
    messages,
    isConnected,
    sendMessage,
    sendMessageRealtime,
    addReaction,
    addReactionRealtime,
    markAsRead,
    getMessages,
    uploadFile,
    searchMessages
  };
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}
```

---

## Error Handling

All endpoints return errors in this format:
```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error, missing fields)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Best Practices

1. **Use REST for persistence**: Always use REST endpoints to send messages, as they ensure data is saved to the database
2. **Use Socket.IO for real-time updates**: Listen to Socket.IO events for instant updates
3. **Handle reconnection**: Implement reconnection logic for Socket.IO
4. **Cache conversations**: Store conversations locally to reduce API calls
5. **Pagination**: Use `limit` and `offset` for large message lists
6. **File uploads**: Upload files first, then include URLs in message attachments
7. **Error handling**: Always handle errors gracefully and show user-friendly messages

---

## Complete Endpoint List

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/conversations` | Create conversation |
| GET | `/conversations` | Get user's conversations |
| GET | `/conversations/:id` | Get single conversation |
| PUT | `/conversations/:id` | Update conversation |
| POST | `/conversations/:id/participants` | Add participants |
| DELETE | `/conversations/:id/participants/:userId` | Remove participant |
| POST | `/conversations/:id/read` | Mark conversation as read |
| POST | `/messages` | Send message |
| GET | `/conversations/:id/messages` | Get messages |
| PUT | `/messages/:id` | Update message |
| DELETE | `/messages/:id` | Delete message |
| GET | `/messages/search` | Search messages |
| POST | `/messages/:id/reactions` | Add reaction |
| DELETE | `/messages/:id/reactions` | Remove reaction |
| POST | `/messages/:id/read` | Mark message as read |
| POST | `/upload` | Upload file |

---

## Socket.IO Events Summary

### Client Emits:
- `join_user` - Join user's messaging rooms
- `join_conversation` - Join specific conversation
- `leave_conversation` - Leave conversation
- `send_message` - Send message (real-time)
- `typing_start` / `typing_stop` - Typing indicators
- `mark_read` - Mark conversation as read
- `mark_message_read` - Mark specific message as read
- `add_reaction` - Add emoji reaction
- `remove_reaction` - Remove emoji reaction

### Server Emits:
- `new_message` - New message received
- `message_sent` - Message sent confirmation
- `user_typing` - User typing indicator
- `messages_read` - Conversation marked as read
- `message_read` - Specific message marked as read
- `reaction_added` - Reaction added to message
- `reaction_removed` - Reaction removed from message
- `conversation_updated` - Conversation updated
- `error` - Error occurred


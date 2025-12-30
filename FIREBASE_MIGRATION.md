# Firebase Messaging Migration Guide

This document explains how to migrate from the Prisma/Socket.IO messaging system to Firebase Firestore.

## Overview

The messaging system has been completely rewritten to use **Firebase Firestore** for data storage and real-time updates. This eliminates the need for Socket.IO for messaging (though Socket.IO can still be used for other features).

## Key Changes

### Backend
- ✅ Replaced Prisma messaging service with `FirebaseMessagingService`
- ✅ Uses Firestore for all messaging data
- ✅ Real-time updates via Firestore listeners (no Socket.IO needed)
- ✅ Automatic participant management

### Frontend
- ✅ Replaced REST API calls with Firestore real-time listeners
- ✅ Messages update in real-time automatically
- ✅ Conversations list updates in real-time
- ✅ No Socket.IO client needed for messaging

## Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable **Firestore Database**
4. Set up authentication (if not already done)

### 2. Get Firebase Credentials

#### Backend (Service Account)
1. Go to Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download the JSON file
4. Either:
   - Set `FIREBASE_SERVICE_ACCOUNT` environment variable with the JSON content
   - OR set individual variables: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

#### Frontend (Web App Config)
1. Go to Project Settings → General
2. Scroll to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Copy the Firebase configuration object
5. Set environment variables in `.env`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_DATABASE_URL=...
   ```

### 3. Configure Firestore Security Rules

Add these rules to Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Conversations - users can only read/write conversations they're participants in
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participantIds;
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantIds;
        allow create: if request.auth != null && 
          request.auth.uid == request.resource.data.senderId &&
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantIds;
        allow update, delete: if request.auth != null && 
          request.auth.uid == resource.data.senderId;
      }
      
      // Participants subcollection
      match /participants/{participantId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantIds;
      }
    }
    
    // Users collection (for fetching user data)
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Install Dependencies

Backend:
```bash
npm install firebase-admin
```

Frontend:
```bash
npm install firebase
```

### 5. Update Environment Variables

Backend (`.env`):
```bash
# Option 1: Service Account JSON
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# Option 2: Individual credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
```

Frontend (`.env`):
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_DATABASE_URL=...
```

## Data Migration

### Option 1: Manual Migration (Small Datasets)

If you have a small number of conversations/messages, you can manually migrate:

1. Export data from your current database
2. Transform to Firestore format
3. Import using Firebase Console or Admin SDK

### Option 2: Automated Migration Script

Create a migration script to copy data from Prisma to Firestore:

```typescript
// scripts/migrate-messaging-to-firebase.ts
import { prisma } from '../src/utils/prisma';
import { getFirestore } from '../src/utils/firebase';
import { Timestamp } from 'firebase-admin/firestore';

async function migrate() {
  const db = getFirestore();
  
  // Migrate conversations
  const conversations = await prisma.conversation.findMany({
    include: { participants: true, messages: true },
  });
  
  for (const conv of conversations) {
    // Create conversation document
    const convRef = db.collection('conversations').doc(conv.id);
    await convRef.set({
      type: conv.type,
      name: conv.name,
      description: conv.description,
      createdBy: conv.createdBy,
      participantIds: conv.participants.map(p => p.userId),
      createdAt: Timestamp.fromDate(conv.createdAt),
      updatedAt: Timestamp.fromDate(conv.updatedAt),
    });
    
    // Migrate participants
    for (const participant of conv.participants) {
      await convRef.collection('participants').add({
        userId: participant.userId,
        role: participant.role,
        joinedAt: Timestamp.fromDate(participant.joinedAt),
        lastReadAt: participant.lastReadAt ? Timestamp.fromDate(participant.lastReadAt) : null,
        isMuted: participant.isMuted,
        leftAt: participant.leftAt ? Timestamp.fromDate(participant.leftAt) : null,
      });
    }
    
    // Migrate messages
    for (const message of conv.messages) {
      await convRef.collection('messages').add({
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        type: message.type,
        attachments: message.attachments || [],
        replyToId: message.replyToId,
        metadata: message.metadata || {},
        isRead: message.isRead,
        readAt: message.readAt ? Timestamp.fromDate(message.readAt) : null,
        isEdited: message.isEdited,
        editedAt: message.editedAt ? Timestamp.fromDate(message.editedAt) : null,
        isDeleted: message.isDeleted,
        deletedAt: message.deletedAt ? Timestamp.fromDate(message.deletedAt) : null,
        createdAt: Timestamp.fromDate(message.createdAt),
        updatedAt: Timestamp.fromDate(message.updatedAt),
      });
    }
  }
  
  console.log('Migration complete!');
}

migrate().catch(console.error);
```

## Testing

1. **Test Conversation Creation**
   - Create a new conversation
   - Verify it appears in Firestore

2. **Test Message Sending**
   - Send a message
   - Verify it appears in real-time on both clients

3. **Test Real-time Updates**
   - Open two browser windows
   - Send a message from one
   - Verify it appears instantly in the other

## Troubleshooting

### "Firebase not initialized" error
- Check that environment variables are set correctly
- Verify Firebase credentials are valid
- Check that Firebase Admin SDK is initialized before use

### "Permission denied" errors
- Check Firestore security rules
- Verify user authentication
- Ensure user is in participantIds array

### Messages not updating in real-time
- Check that Firestore listeners are set up correctly
- Verify network connection
- Check browser console for errors

## Benefits of Firebase Migration

1. **Real-time by Default**: No need for Socket.IO - Firestore handles real-time updates automatically
2. **Simplified Code**: Less code to maintain, Firebase handles scaling
3. **Better Performance**: Firebase is optimized for real-time data
4. **Automatic Sync**: Offline support and automatic sync built-in
5. **Scalability**: Firebase handles scaling automatically

## Rollback Plan

If you need to rollback:
1. Revert to the previous messaging routes
2. Restore Prisma-based messaging service
3. Re-enable Socket.IO for messaging

The old code is still in the repository, just not being used.


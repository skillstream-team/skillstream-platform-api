# Push Notifications Backend Implementation

This document describes the backend push notification implementation for SkillStream.

## Overview

The backend push notification system uses the Web Push Protocol with VAPID (Voluntary Application Server Identification) keys to send push notifications to users' browsers.

## Setup

### 1. Generate VAPID Keys

First, generate VAPID keys using the `web-push` library:

```bash
npx web-push generate-vapid-keys
```

This will output:
- **Public Key**: Add to your `.env` file as `VAPID_PUBLIC_KEY`
- **Private Key**: Add to your `.env` file as `VAPID_PRIVATE_KEY` (keep this secret!)
- **Contact Email**: Add to your `.env` file as `VAPID_CONTACT_EMAIL` (e.g., `mailto:admin@skillstream.com`)

### 2. Environment Variables

Add the following to your `.env` file:

```env
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_CONTACT_EMAIL=mailto:admin@skillstream.com
```

**Note**: The public key is safe to expose to the frontend. The private key must remain secret and never be exposed.

### 3. Database Migration

The `PushSubscription` model has been added to the Prisma schema. Run migrations:

```bash
npx prisma migrate dev --name add_push_subscriptions
```

Or if you're using MongoDB (no migrations needed), just regenerate the Prisma client:

```bash
npx prisma generate
```

## API Endpoints

### POST `/api/users/push/subscribe`

Subscribe a user to push notifications.

**Authentication**: Required

**Request Body**:
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Successfully subscribed to push notifications"
}
```

### POST `/api/users/push/unsubscribe`

Unsubscribe a user from push notifications.

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Successfully unsubscribed from push notifications"
}
```

### GET `/api/users/push/subscription`

Get the current user's push subscription status.

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "subscribed": true
}
```

### GET `/api/users/push/vapid-key`

Get the VAPID public key for frontend subscription.

**Authentication**: Not required

**Response**: `200 OK`
```json
{
  "publicKey": "your_vapid_public_key"
}
```

## Usage

### Sending Push Notifications

#### Method 1: Using PushNotificationsService Directly

```typescript
import { PushNotificationsService } from './services/push-notifications.service';

const pushService = new PushNotificationsService();

// Send to a single user
await pushService.sendNotification(userId, {
  title: 'New Announcement',
  body: 'Your instructor posted a new announcement',
  icon: '/vite.svg',
  badge: '/vite.svg',
  tag: 'announcement',
  data: {
    url: `/courses/${courseId}`,
    type: 'announcement',
    id: announcementId
  }
});

// Send to multiple users
const results = await pushService.sendNotificationsToUsers(
  [userId1, userId2, userId3],
  {
    title: 'Course Update',
    body: 'A new lesson has been added to your course',
    icon: '/vite.svg',
    data: {
      url: `/courses/${courseId}`,
      type: 'course_update'
    }
  }
);
```

#### Method 2: Automatic Push Notifications via NotificationsService

The `NotificationsService` automatically sends push notifications when creating notifications (if the user has push notifications enabled in their settings):

```typescript
import { NotificationsService } from './services/notifications.service';

const notificationsService = new NotificationsService();

// This will automatically send a push notification if user has push enabled
await notificationsService.createNotification({
  userId: 'user123',
  type: 'announcement',
  title: 'New Announcement',
  message: 'Your instructor posted a new announcement',
  link: `/courses/${courseId}`,
  metadata: { courseId, announcementId }
});

// To disable push notification for a specific notification:
await notificationsService.createNotification(
  {
    userId: 'user123',
    type: 'system',
    title: 'System Update',
    message: 'Maintenance scheduled',
  },
  { sendPush: false } // Disable push for this notification
);
```

### Example: Sending Push Notification on Announcement Creation

```typescript
// In your announcement service or route handler
import { PushNotificationsService } from '../../users/services/push-notifications.service';
import { prisma } from '../../../utils/prisma';

const pushService = new PushNotificationsService();

// When an announcement is created
async function createAnnouncement(courseId: string, announcementData: any) {
  // Create the announcement
  const announcement = await prisma.announcement.create({
    data: announcementData
  });

  // Get all enrolled students
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: { studentId: true }
  });

  const studentIds = enrollments.map(e => e.studentId);

  // Send push notifications to all enrolled students
  const results = await pushService.sendNotificationsToUsers(
    studentIds,
    {
      title: 'New Course Announcement',
      body: announcementData.message,
      icon: '/vite.svg',
      tag: 'announcement',
      data: {
        url: `/courses/${courseId}`,
        type: 'announcement',
        id: announcement.id,
        courseId
      }
    }
  );

  console.log(`Sent push notifications: ${results.success.length} success, ${results.failed.length} failed`);
}
```

## Error Handling

The push notification service automatically handles invalid subscriptions:

- **410 Gone** or **404 Not Found**: The subscription is invalid and will be automatically removed from the database
- **Other errors**: Will be logged but won't remove the subscription (may be a temporary issue)

## Notification Payload Structure

```typescript
interface PushNotificationPayload {
  title: string;        // Required: Notification title
  body: string;          // Required: Notification body text
  icon?: string;         // Optional: Icon URL (defaults to '/vite.svg')
  badge?: string;        // Optional: Badge icon URL (defaults to '/vite.svg')
  image?: string;        // Optional: Large image URL
  tag?: string;          // Optional: Tag to group/replace notifications
  data?: {               // Optional: Custom data payload
    url?: string;        // URL to navigate to when notification is clicked
    type?: string;       // Notification type
    id?: string;         // Related entity ID
    [key: string]: any;  // Additional custom data
  };
}
```

## Security Notes

1. **HTTPS Required**: Push notifications only work over HTTPS (or localhost for development)
2. **VAPID Keys**: Never expose the private key on the frontend or in client-side code
3. **User Consent**: Always request permission before subscribing users
4. **Subscription Validation**: Subscriptions are validated server-side before storing

## Testing

### 1. Test Subscription

```bash
# Subscribe
curl -X POST http://localhost:3000/api/users/push/subscribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "keys": {
        "p256dh": "...",
        "auth": "..."
      }
    }
  }'
```

### 2. Test Notification

You can test sending a notification by creating a simple script or using the service directly in your code.

## Troubleshooting

1. **VAPID keys not configured**: Ensure `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are set in your `.env` file
2. **Subscription fails**: Verify the subscription object structure matches the expected format
3. **Notifications not received**: 
   - Check browser notification permissions
   - Verify service worker is registered
   - Check browser console for errors
   - Ensure HTTPS is used (or localhost for development)
4. **Invalid subscription errors**: The service automatically removes invalid subscriptions (410/404 errors)

## Integration with Frontend

The frontend should:
1. Request notification permission
2. Register service worker
3. Subscribe to push notifications using the VAPID public key
4. Send subscription to `/api/users/push/subscribe`
5. Handle incoming push notifications in the service worker

See the frontend documentation for complete implementation details.


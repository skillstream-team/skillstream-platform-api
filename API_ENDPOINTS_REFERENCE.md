# Complete API Endpoints Reference

**Base URL:** `/api`  
**Authentication:** Bearer token in `Authorization` header (unless specified otherwise)

---

## 🔐 AUTHENTICATION & USER MANAGEMENT

### POST `/api/users/auth/login`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response (200):**
```json
{
  "token": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "user-id",
    "username": "username",
    "email": "user@example.com",
    "role": "STUDENT" | "TEACHER" | "ADMIN",
    "firstName": "First",
    "lastName": "Last",
    "avatar": "avatar-url"
  }
}
```

### POST `/api/users/auth/register`
**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "role": "STUDENT",
  "firstName": "John",
  "lastName": "Doe",
  "referralCode": "REF123" // optional
}
```
**Response (201):** Same as login response

### POST `/api/users/auth/refresh-token`
**Request:**
```json
{
  "token": "refresh-token"
}
```
**Response (200):** Same as login response

### POST `/api/users/auth/forgot-password`
**Request:**
```json
{
  "email": "user@example.com"
}
```
**Response (200):**
```json
{
  "message": "Password reset email sent"
}
```

### POST `/api/users/auth/reset-password`
**Request:**
```json
{
  "token": "reset-token",
  "newPassword": "newpassword123"
}
```
**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

### GET `/api/users/search`
**Query Params:**
- `q` (required): search term
- `limit` (optional): max results (default: 20, max: 50)
- `role` (optional): "STUDENT" | "TEACHER" | "ADMIN"

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "username": "username",
      "email": "email@example.com",
      "firstName": "First",
      "lastName": "Last",
      "role": "STUDENT",
      "avatar": "avatar-url"
    }
  ],
  "count": 1
}
```

---

## 💬 MESSAGING

### POST `/api/messaging/conversations`
**Request:**
```json
{
  "type": "direct" | "group",
  "participantIds": ["user-id-1", "user-id-2"],
  "name": "Group Name", // required for group
  "description": "Description" // optional
}
```
**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "conversation-id",
    "type": "direct",
    "participantIds": ["user-id-1", "user-id-2"],
    "participants": [
      {
        "id": "user-id-1",
        "userId": "user-id-1",
        "username": "username",
        "email": "email@example.com",
        "firstName": "First" | null,
        "lastName": "Last" | null,
        "avatar": "avatar-url" | null,
        "role": "admin" | "member",
        "joinedAt": "2025-12-30T00:00:00.000Z",
        "lastReadAt": null,
        "isMuted": false
      }
    ],
    "lastMessage": null,
    "unreadCount": 0,
    "createdAt": "2025-12-30T00:00:00.000Z",
    "updatedAt": "2025-12-30T00:00:00.000Z"
  }
}
```

### GET `/api/messaging/conversations`
**Query Params:**
- `type` (optional): "direct" | "group"
- `search` (optional): string
- `page` (optional): number
- `limit` (optional): number (default: 50)
- `offset` (optional): number

**Response (200):**
```json
{
  "success": true,
  "conversations": [ /* conversation objects */ ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### GET `/api/messaging/conversations/:conversationId`
**Response (200):**
```json
{
  "success": true,
  "data": { /* conversation object */ }
}
```

### PUT `/api/messaging/conversations/:conversationId`
**Request:**
```json
{
  "name": "Updated name",
  "description": "Updated description"
}
```
**Response (200):**
```json
{
  "success": true,
  "data": { /* updated conversation object */ }
}
```

### POST `/api/messaging/conversations/:conversationId/participants`
**Request:**
```json
{
  "participantIds": ["user-id-3", "user-id-4"]
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "Participants added successfully"
}
```

### DELETE `/api/messaging/conversations/:conversationId/participants/:participantId`
**Response (200):**
```json
{
  "success": true,
  "message": "Participant removed successfully"
}
```

### POST `/api/messaging/conversations/:conversationId/read`
**Response (200):**
```json
{
  "success": true,
  "markedCount": 5
}
```

### POST `/api/messaging/messages`
**Request:**
```json
{
  "content": "Your message here", // required, 1-10000 chars
  "conversationId": "conversation-id", // optional (required if no receiverId)
  "receiverId": "user-id", // optional (required if no conversationId)
  "type": "text" | "image" | "file" | "system", // optional, default: "text"
  "attachments": [ // optional
    {
      "filename": "file.jpg",
      "url": "https://...",
      "size": 1024,
      "mimeType": "image/jpeg"
    }
  ],
  "replyToId": "message-id", // optional
  "metadata": {} // optional
}
```
**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "message-id",
    "conversationId": "conversation-id",
    "senderId": "sender-id",
    "sender": {
      "id": "sender-id",
      "username": "username",
      "email": "email@example.com",
      "firstName": "First" | null,
      "lastName": "Last" | null,
      "avatar": "avatar-url" | null
    },
    "receiverId": "receiver-id",
    "receiver": { /* receiver user object */ },
    "content": "Your message here",
    "type": "text",
    "isRead": false,
    "createdAt": "2025-12-30T00:00:00.000Z",
    "updatedAt": "2025-12-30T00:00:00.000Z"
  }
}
```

### GET `/api/messaging/conversations/:conversationId/messages`
**Query Params:**
- `page` (optional): number
- `limit` (optional): number (default: 50)
- `offset` (optional): number
- `before` (optional): ISO date string
- `after` (optional): ISO date string

**Response (200):**
```json
{
  "success": true,
  "messages": [ /* message objects */ ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### PUT `/api/messaging/messages/:messageId`
**Request:**
```json
{
  "content": "Updated message",
  "metadata": {}
}
```
**Response (200):**
```json
{
  "success": true,
  "data": { /* updated message object */ }
}
```

### DELETE `/api/messaging/messages/:messageId`
**Response (200):**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

### GET `/api/messaging/messages/search`
**Query Params:**
- `query` (required): string
- `conversationId` (optional): string
- `limit` (optional): number (default: 50)
- `offset` (optional): number

**Response (200):**
```json
{
  "success": true,
  "data": [ /* message objects */ ],
  "count": 10
}
```

### POST `/api/messaging/messages/:messageId/reactions`
**Request:**
```json
{
  "emoji": "👍"
}
```
**Response (200):**
```json
{
  "success": true,
  "data": { /* message object with updated reactions */ }
}
```

### DELETE `/api/messaging/messages/:messageId/reactions`
**Request:**
```json
{
  "emoji": "👍"
}
```
**Response (200):**
```json
{
  "success": true,
  "data": { /* message object */ }
}
```

### POST `/api/messaging/messages/:messageId/read`
**Response (200):**
```json
{
  "success": true,
  "data": { /* message object */ }
}
```

### POST `/api/messaging/upload`
**Request:**
```json
{
  "file": "base64-encoded-file",
  "filename": "file.jpg",
  "contentType": "image/jpeg",
  "conversationId": "conversation-id" // optional
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "filename": "file.jpg",
    "size": 1024,
    "mimeType": "image/jpeg"
  }
}
```

---

## 📚 COURSES

### GET `/api/courses`
**Query Params:**
- `page` (optional): number
- `limit` (optional): number
- `search` (optional): string
- `category` (optional): string
- `tags` (optional): string[]
- `instructor` (optional): string
- `level` (optional): string
- `sortBy` (optional): string

**Response (200):**
```json
{
  "courses": [ /* course objects */ ],
  "pagination": { /* pagination object */ }
}
```

### GET `/api/courses/:id`
**Response (200):**
```json
{
  "id": "course-id",
  "title": "Course Title",
  "description": "Course description",
  "instructor": { /* instructor object */ },
  "price": 99.99,
  "rating": 4.5,
  "studentsCount": 1000,
  "createdAt": "2025-12-30T00:00:00.000Z"
  // ... other course fields
}
```

### POST `/api/courses`
**Request:**
```json
{
  "title": "Course Title",
  "description": "Course description",
  "price": 99.99,
  "category": "category-id",
  "tags": ["tag1", "tag2"],
  "level": "beginner" | "intermediate" | "advanced"
}
```
**Response (201):** Course object

### PUT `/api/courses/:id`
**Request:** Partial course object
**Response (200):** Updated course object

### DELETE `/api/courses/:id`
**Response (200):**
```json
{
  "success": true
}
```

---

## ⚠️ ERROR RESPONSES

All endpoints return errors in this format:

**400 Bad Request:**
```json
{
  "error": "Error message here"
}
```

**401 Unauthorized:**
```json
{
  "error": "User not authenticated"
}
```

**403 Forbidden:**
```json
{
  "error": "Permission denied"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to perform operation"
}
```

**Validation Errors (400):**
```json
{
  "error": "Validation error",
  "details": [
    {
      "path": "field-name",
      "message": "Error message"
    }
  ]
}
```

---

## 📝 NOTES

1. **Authentication:** All endpoints (except login/register) require Bearer token in `Authorization: Bearer <token>` header
2. **Base URL:** All endpoints are prefixed with `/api`
3. **Content-Type:** All requests should use `application/json`
4. **Dates:** All dates are in ISO 8601 format (UTC)
5. **Pagination:** Most list endpoints support pagination with `page`, `limit`, and `offset` parameters
6. **Rate Limiting:** 
   - Login: 20 attempts per 5 minutes
   - Registration: 5 attempts per 15 minutes
   - Password Reset: 3 attempts per hour
   - General: 100 requests per 15 minutes

---

---

## 📋 COMPLETE ENDPOINT LIST (All 292 Endpoints)

Below is the complete list of ALL API endpoints organized by module:


## USERS - activity-log

**Base Path:** `/api`

### GET

- **GET** `/api/users/:userId/activity`
  - Get user activity feed

- **GET** `/api/activity/recent`
  - Get recent activities (global feed)

- **GET** `/api/activity/:entity/:entityId`
  - Get activity feed for an entity

---

## USERS - admin-management

**Base Path:** `/api`

### GET

- **GET** `/api/admin/payouts`
  - Get all payout requests (Admin only)

- **GET** `/api/admin/broadcasts`
  - Get broadcast history (Admin only)

- **GET** `/api/admin/logs`
  - Get activity logs (Admin only)

- **GET** `/api/admin/users/export`
  - Export users to CSV (Admin only)

- **GET** `/api/admin/certificate-templates`
  - Get all certificate templates (Admin only)

- **GET** `/api/admin/banners`
  - Get all banners (Admin only)

### POST

- **POST** `/api/admin/payouts/:payoutId/approve`
  - Approve a payout request (Admin only)

- **POST** `/api/admin/payouts/:payoutId/reject`
  - Reject a payout request (Admin only)

- **POST** `/api/admin/users/bulk`
  - Bulk update users (Admin only)

- **POST** `/api/admin/courses/bulk`
  - Bulk update courses (Admin only)

- **POST** `/api/admin/broadcasts`
  - Send broadcast notification (Admin only)

- **POST** `/api/admin/users/import`
  - Import users from CSV (Admin only)

- **POST** `/api/admin/certificate-templates`
  - Create certificate template (Admin only)

- **POST** `/api/admin/banners`
  - Create banner (Admin only)

### PUT

- **PUT** `/api/admin/certificate-templates/:id`
  - Update certificate template (Admin only)

- **PUT** `/api/admin/banners/:id`
  - Update banner (Admin only)

### DELETE

- **DELETE** `/api/admin/certificate-templates/:id`
  - Delete certificate template (Admin only)

- **DELETE** `/api/admin/banners/:id`
  - Delete banner (Admin only)

---

## USERS - admin

**Base Path:** `/api`

### POST

- **POST** `/api/admin/notifications/send`

- **POST** `/api/admin/notifications/send-all`
  - Send system notification to all users (Admin only)

- **POST** `/api/admin/promotional-email/send`
  - Send promotional email to users (Admin only)

- **POST** `/api/admin/promotional-email/send-all`
  - Send promotional email to all users (Admin only)

---

## USERS - analytics

**Base Path:** `/api`

### GET

- **GET** `/api/analytics/platform`
  - Get platform-wide analytics (Admin only)

- **GET** `/api/analytics/courses/:courseId`
  - Get course analytics (Teacher/Admin only)

---

## COURSES - announcements

**Base Path:** `/api`

### GET

- **GET** `/api/`
  - Get announcements (global or filtered)

- **GET** `/api/users/:userId/announcements`
  - Get announcements relevant to a user

- **GET** `/api/courses/:courseId/announcements`
  - Get announcements for a specific course

---

## USERS - api-keys

**Base Path:** `/api`

### GET

- **GET** `/api/api-keys`
  - Get user's API keys

- **GET** `/api/api-keys/:id`
  - Get API key by ID

### POST

- **POST** `/api/api-keys`
  - Create API key

### PUT

- **PUT** `/api/api-keys/:id`
  - Update API key

- **PUT** `/api/api-keys/:id/toggle`
  - Toggle API key active status

### DELETE

- **DELETE** `/api/api-keys/:id`
  - Delete API key

---

## COURSES - attendance

**Base Path:** `/api`

### GET

- **GET** `/api/lessons/:lessonId/attendance`
  - Get attendance records for a lesson

### POST

- **POST** `/api/lessons/:lessonId/attendance`
  - Create or update attendance record

- **POST** `/api/lessons/:lessonId/attendance/:studentId/mark`
  - Mark attendance for a student

---

## COURSES - bookings

**Base Path:** `/api`

### GET

- **GET** `/api/teachers/:teacherId/availability`
  - Get teacher availability

- **GET** `/api/lesson-slots`
  - Get available lesson slots

- **GET** `/api/users/:userId/bookings`
  - Get user's bookings

### POST

- **POST** `/api/teachers/:teacherId/availability`
  - Create or update teacher availability

- **POST** `/api/lesson-slots/:slotId/bookings`
  - Book a lesson slot

### DELETE

- **DELETE** `/api/teachers/:teacherId/availability/:availabilityId`
  - Delete availability block

- **DELETE** `/api/bookings/:bookingId`
  - Cancel a booking

---

## USERS - bulk-operations

**Base Path:** `/api`

### GET

- **GET** `/api/bulk/users/export`
  - Bulk export users as CSV (Admin only)

- **GET** `/api/bulk/courses/export`
  - Bulk export courses as CSV

### POST

- **POST** `/api/bulk/users/import`
  - Bulk import users (Admin only)

- **POST** `/api/bulk/courses/import`
  - Bulk import courses (Admin/Teacher only)

- **POST** `/api/bulk/enrollments`
  - Bulk enroll students (Admin only)

- **POST** `/api/bulk/notifications`
  - Bulk send notifications (Admin only)

- **POST** `/api/bulk/users/delete`
  - Bulk delete users (Admin only)

- **POST** `/api/bulk/users/update-roles`
  - Bulk update user roles (Admin only)

---

## COURSES - bundles

**Base Path:** `/api/bundles`

### GET

- **GET** `/api/bundles/`
  - Get all active course bundles

- **GET** `/api/bundles/:bundleId`
  - Get bundle by ID

### POST

- **POST** `/api/bundles/`

- **POST** `/api/bundles/:bundleId/enroll`
  - Enroll in bundle

---

## COURSES - calendar

**Base Path:** `/api/calendar`

### GET

- **GET** `/api/calendar/events`

- **GET** `/api/calendar/personal`

- **GET** `/api/calendar/reminders/pending`
  - Get pending reminders (admin only)

### POST

- **POST** `/api/calendar/events`

- **POST** `/api/calendar/events/:eventId/attendees`

- **POST** `/api/calendar/sync-deadlines`
  - Create automatic deadline events (admin only)

### PUT

- **PUT** `/api/calendar/events/:eventId`

- **PUT** `/api/calendar/events/:eventId/attendees/:userId/status`

- **PUT** `/api/calendar/reminders/:reminderId/sent`
  - Mark reminder as sent (admin only)

### DELETE

- **DELETE** `/api/calendar/events/:eventId`

- **DELETE** `/api/calendar/events/:eventId/attendees`

---

## COURSES - categories

**Base Path:** `/api/categories`

### GET

- **GET** `/api/categories/`
  - Get all categories

- **GET** `/api/categories/:id`
  - Get a single category by ID or slug

### POST

- **POST** `/api/categories/`
  - Create a new category (Admin only)

- **POST** `/api/categories/seed`
  - Seed default categories (Admin only)

### PUT

- **PUT** `/api/categories/:id`
  - Update a category (Admin only)

### DELETE

- **DELETE** `/api/categories/:id`
  - Delete a category (Admin only)

---

## COURSES - certificates

**Base Path:** `/api`

### GET

- **GET** `/api/courses/:courseId/certificates/:userId`
  - Get certificate metadata

- **GET** `/api/courses/:courseId/certificates/:userId/download`
  - Download certificate as PDF

- **GET** `/api/courses/:courseId/certificates/:userId/check-completion`
  - Check course completion status

### POST

- **POST** `/api/courses/:courseId/certificates/:userId/issue`
  - Manually issue certificate (Teacher/Admin only)

- **POST** `/api/courses/:courseId/certificates/:userId/auto-issue`
  - Attempt to auto-issue certificate if course is completed

---

## COURSES - collaboration

**Base Path:** `/api`

### GET

- **GET** `/api/study-groups`
  - Get study groups

- **GET** `/api/study-groups/:groupId/projects`
  - Get group projects

- **GET** `/api/workspaces`
  - Get shared workspaces

- **GET** `/api/waitlist`
  - Get waitlist

### POST

- **POST** `/api/study-groups`
  - Create a study group

- **POST** `/api/study-groups/:groupId/join`
  - Join a study group

- **POST** `/api/study-groups/:groupId/leave`
  - Leave a study group

- **POST** `/api/study-groups/:groupId/projects`
  - Create a group project

- **POST** `/api/workspaces`
  - Create a shared workspace

- **POST** `/api/waitlist`
  - Join waitlist

### PUT

- **PUT** `/api/workspaces/:workspaceId`
  - Update shared workspace

### DELETE

- **DELETE** `/api/waitlist`
  - Leave waitlist

---

## COURSES - comparison

**Base Path:** `/api/courses`

### GET

- **GET** `/api/courses/compare`
  - Compare courses

---

## COURSES - content-moderation

**Base Path:** `/api`

### GET

- **GET** `/api/content/flags`
  - Get flagged content (Admin/Moderator only)

- **GET** `/api/content/flags/statistics`
  - Get flag statistics (Admin only)

### POST

- **POST** `/api/content/flag`
  - Flag content for review

- **POST** `/api/content/flags/:flagId/review`
  - Review flagged content (Admin/Moderator only)

---

## COURSES - content-versioning

**Base Path:** `/api`

### GET

- **GET** `/api/content/:entityType/:entityId/versions`
  - Get all versions

- **GET** `/api/content/:entityType/:entityId/versions/current`
  - Get current version

- **GET** `/api/content/:entityType/:entityId/versions/:version`
  - Get version by number

### POST

- **POST** `/api/content/:entityType/:entityId/versions`
  - Create a new version (Teacher/Admin only)

- **POST** `/api/content/:entityType/:entityId/versions/:version/restore`
  - Restore a version (Teacher/Admin only)

### DELETE

- **DELETE** `/api/content/:entityType/:entityId/versions/:version`
  - Delete a version (Teacher/Admin only)

---

## COURSES - coupons

**Base Path:** `/api/coupons`

### GET

- **GET** `/api/coupons/`
  - Get all coupons

- **GET** `/api/coupons/:code`
  - Get coupon by code

### POST

- **POST** `/api/coupons/`

- **POST** `/api/coupons/apply`

---

## COURSES - course-import

**Base Path:** `/api/courses`

### GET

- **GET** `/api/courses/import/:id/status`

- **GET** `/api/courses/import`

### POST

- **POST** `/api/courses/import`

- **POST** `/api/courses/import/:id/cancel`

---

## COURSES - courses

**Base Path:** `/api/courses`

### GET

- **GET** `/api/courses/`

- **GET** `/api/courses/:id/preview`

- **GET** `/api/courses/:id`

- **GET** `/api/courses/:id/active-users`

- **GET** `/api/courses/:id/enrollments`

### POST

- **POST** `/api/courses/course`

- **POST** `/api/courses/:id/modules`

- **POST** `/api/courses/:id/modules/:moduleId/lessons`

- **POST** `/api/courses/:id/lessons/:lessonId/quiz`

### PUT

- **PUT** `/api/courses/:id`

### DELETE

- **DELETE** `/api/courses/:id`

---

## COURSES - dashboard

**Base Path:** `/api/dashboard`

### GET

- **GET** `/api/dashboard/`
  - Get student dashboard

---

## USERS - data-export

**Base Path:** `/api`

### GET

- **GET** `/api/users/:userId/data-export`
  - Export user data (GDPR compliance)

### POST

- **POST** `/api/users/:userId/data-export/email`
  - Export user data and send via email

### DELETE

- **DELETE** `/api/users/:userId/delete-account`
  - Delete user account and all data (GDPR right to be forgotten)

---

## COURSES - earnings

**Base Path:** `/api`

### GET

- **GET** `/api/users/:userId/earnings-report`
  - Get earnings report for a teacher

---

## COURSES - forums

**Base Path:** `/api`

### GET

- **GET** `/api/courses/:courseId/forum/posts`
  - Get forum posts for a course

- **GET** `/api/forum/posts/:postId`
  - Get post by ID

- **GET** `/api/forum/posts/:postId/replies`
  - Get replies for a post

### POST

- **POST** `/api/courses/:courseId/forum/posts`
  - Create a forum post

- **POST** `/api/forum/posts/:postId/replies`
  - Create a reply

- **POST** `/api/forum/posts/:postId/upvote`
  - Upvote a post

- **POST** `/api/forum/replies/:replyId/upvote`
  - Upvote a reply

- **POST** `/api/forum/posts/:postId/best-answer`
  - Mark best answer (Teacher only)

### PUT

- **PUT** `/api/forum/posts/:postId/pin`
  - Pin/unpin a post (Teacher/Admin only)

- **PUT** `/api/forum/posts/:postId/lock`
  - Lock/unlock a post (Teacher/Admin only)

---

## USERS - gamification

**Base Path:** `/api`

### GET

- **GET** `/api/users/:userId/gamification`
  - Get user gamification data

- **GET** `/api/leaderboard`
  - Get leaderboard

### POST

- **POST** `/api/users/:userId/login`
  - Record daily login (updates streak)

---

## COURSES - instructor-qa

**Base Path:** `/api/courses`

### GET

- **GET** `/api/courses/:courseId/qa`

- **GET** `/api/courses/qa/my-questions`
  - Get student's questions

### POST

- **POST** `/api/courses/:courseId/qa`

- **POST** `/api/courses/qa/:qaId/answer`

---

## COURSES - learning-paths

**Base Path:** `/api/learning-paths`

### GET

- **GET** `/api/learning-paths/`
  - Get all active learning paths

- **GET** `/api/learning-paths/:pathId`
  - Get learning path by ID

- **GET** `/api/learning-paths/:pathId/progress`
  - Get learning path progress

### POST

- **POST** `/api/learning-paths/`

- **POST** `/api/learning-paths/:pathId/enroll`
  - Enroll in learning path

---

## COURSES - lesson-payment

**Base Path:** `/api`

### GET

- **GET** `/api/lessons/:lessonId/payment/status`
  - Get payment status for a lesson

- **GET** `/api/bookings/:bookingId/payment/status`
  - Get payment status for a booking

### POST

- **POST** `/api/lessons/:lessonId/payment`
  - Create payment for a lesson

- **POST** `/api/bookings/:bookingId/payment`
  - Create payment for a booking

- **POST** `/api/payments/:paymentId/confirm`
  - Confirm a payment (mark as completed)

---

## COURSES - lessons

**Base Path:** `/api`

### GET

- **GET** `/api/lessons`
  - Get lessons (for teacher or student)

### POST

- **POST** `/api/lessons/quick`
  - Create a quick lesson

---

## COURSES - marketing

**Base Path:** `/api`

### GET

- **GET** `/api/courses/:courseId/marketing`
  - Get course details with marketing context

---

## MESSAGING - messaging

**Base Path:** `/api/messaging`

### GET

- **GET** `/api/messaging/conversations`

- **GET** `/api/messaging/conversations/:conversationId`
  - Get a single conversation by ID

- **GET** `/api/messaging/conversations/:conversationId/messages`

- **GET** `/api/messaging/messages/search`

### POST

- **POST** `/api/messaging/conversations`

- **POST** `/api/messaging/conversations/:conversationId/participants`

- **POST** `/api/messaging/messages`

- **POST** `/api/messaging/conversations/:conversationId/read`
  - Mark all messages in a conversation as read

- **POST** `/api/messaging/upload`

- **POST** `/api/messaging/messages/:messageId/reactions`

- **POST** `/api/messaging/messages/:messageId/read`
  - Mark a specific message as read

### PUT

- **PUT** `/api/messaging/conversations/:conversationId`

- **PUT** `/api/messaging/messages/:messageId`

### DELETE

- **DELETE** `/api/messaging/messages/:messageId`

- **DELETE** `/api/messaging/messages/:messageId/reactions`

---

## USERS - notifications

**Base Path:** `/api`

### GET

- **GET** `/api/users/:userId/notifications`
  - Get user notifications

- **GET** `/api/users/:userId/notifications/unread-count`
  - Get unread notification count

### PUT

- **PUT** `/api/users/:userId/notifications/:notificationId/read`
  - Mark notification as read

- **PUT** `/api/users/:userId/notifications/read-all`
  - Mark all notifications as read

### DELETE

- **DELETE** `/api/users/:userId/notifications/:notificationId`
  - Delete notification

- **DELETE** `/api/users/:userId/notifications/read`
  - Delete all read notifications

---

## USERS - oauth

**Base Path:** `/api`

### GET

- **GET** `/api/auth/oauth/google`

- **GET** `/api/auth/oauth/linkedin`

### POST

- **POST** `/api/auth/oauth/google`

- **POST** `/api/auth/oauth/linkedin`

---

## COURSES - polls

**Base Path:** `/api/polls`

### GET

- **GET** `/api/polls/:pollId/results`
  - Get poll results

### POST

- **POST** `/api/polls/:pollId/respond`
  - Respond to a poll

---

## COURSES - prerequisites

**Base Path:** `/api/courses`

### GET

- **GET** `/api/courses/:courseId/prerequisites`
  - Get all prerequisites for a course

- **GET** `/api/courses/:courseId/prerequisites/check`
  - Check if student can enroll (prerequisites check)

- **GET** `/api/courses/:courseId/dependents`
  - Get courses that require this course as a prerequisite

### POST

- **POST** `/api/courses/:courseId/prerequisites`

---

## COURSES - progress

**Base Path:** `/api`

### GET

- **GET** `/api/users/:userId/progress`
  - Get all course progress for a user

- **GET** `/api/users/:userId/progress/courses`
  - Get course progress filtered by status

- **GET** `/api/courses/:courseId/progress`
  - Get progress for current user in a specific course

---

## USERS - push-notifications

**Base Path:** `/api/users`

### GET

- **GET** `/api/users/push/subscription`
  - Get push subscription status

- **GET** `/api/users/push/vapid-key`
  - Get VAPID public key

### POST

- **POST** `/api/users/push/subscribe`

- **POST** `/api/users/push/unsubscribe`
  - Unsubscribe from push notifications

---

## COURSES - recommendations-user

**Base Path:** `/api`

### GET

- **GET** `/api/users/:userId/recommendations/courses`
  - Get personalized course recommendations for a user

---

## COURSES - recommendations

**Base Path:** `/api/recommendations`

### GET

- **GET** `/api/recommendations/:userId`

- **GET** `/api/recommendations/stats/:userId`
  - Get recommendation statistics for a user

### POST

- **POST** `/api/recommendations/generate/:userId`

- **POST** `/api/recommendations/refresh/:userId`
  - Refresh recommendations for a user

- **POST** `/api/recommendations/interaction`

---

## COURSES - referral

**Base Path:** `/api/referrals`

### GET

- **GET** `/api/referrals/code`
  - Get user's referral code

- **GET** `/api/referrals/stats`
  - Get referral statistics

### POST

- **POST** `/api/referrals/apply`

---

## COURSES - resources

**Base Path:** `/api`

### GET

- **GET** `/api/users/:userId/resources/recent`
  - Get recent resources for a user

### POST

- **POST** `/api/lessons/:lessonId/resources`
  - Share a resource in a lesson

- **POST** `/api/lessons/:lessonId/resources/upload`
  - Upload a file and attach to lesson

---

## COURSES - reviews

**Base Path:** `/api`

### GET

- **GET** `/api/courses/:courseId/reviews`
  - Get course reviews

- **GET** `/api/reviews/:reviewId`
  - Get review by ID

### POST

- **POST** `/api/courses/:courseId/reviews`
  - Create a course review

- **POST** `/api/reviews/:reviewId/helpful`
  - Mark review as helpful

- **POST** `/api/reviews/:reviewId/instructor-response`
  - Add instructor response to review (Teacher only)

### PUT

- **PUT** `/api/reviews/:reviewId`
  - Update review

### DELETE

- **DELETE** `/api/reviews/:reviewId`
  - Delete review

---

## USERS - settings

**Base Path:** `/api`

### GET

- **GET** `/api/users/:userId/settings`
  - Get user settings

### POST

- **POST** `/api/users/:userId/settings/two-factor`
  - Enable/disable two-factor authentication

- **POST** `/api/users/:userId/settings/account-deletion`
  - Request account deletion

### PUT

- **PUT** `/api/users/:userId/settings`

- **PUT** `/api/users/:userId/settings/notifications`
  - Update notification preferences

- **PUT** `/api/users/:userId/settings/privacy`
  - Update privacy settings

- **PUT** `/api/users/:userId/settings/learning`
  - Update learning preferences

- **PUT** `/api/users/:userId/settings/account`
  - Update account settings

- **PUT** `/api/users/:userId/settings/ui`
  - Update UI preferences

### DELETE

- **DELETE** `/api/users/:userId/settings/account-deletion`
  - Cancel account deletion request

---

## COURSES - share

**Base Path:** `/api/courses`

### GET

- **GET** `/api/courses/:courseId/share/link`
  - Get shareable link

- **GET** `/api/courses/:courseId/share/stats`
  - Get course share statistics

### POST

- **POST** `/api/courses/:courseId/share`

---

## SUBSCRIPTIONS - subscription

**Base Path:** `/api/subscriptions`

### GET

- **GET** `/api/subscriptions/status`
  - Get current subscription status

- **GET** `/api/subscriptions/fee`
  - Get subscription fee

### POST

- **POST** `/api/subscriptions/cancel`
  - Cancel subscription

---

## COURSES - tags-platform

**Base Path:** `/api/tags`

### GET

- **GET** `/api/tags/`
  - Get all tags

- **GET** `/api/tags/:tag/courses`

---

## COURSES - tags

**Base Path:** `/api/courses`

### GET

- **GET** `/api/courses/:courseId/tags`
  - Get tags for a course

### POST

- **POST** `/api/courses/:courseId/tags`

### DELETE

- **DELETE** `/api/courses/:courseId/tags`

---

## COURSES - teacher-earnings

**Base Path:** `/api`

### GET

- **GET** `/api/teachers/:teacherId/earnings/summary`

- **GET** `/api/teachers/:teacherId/earnings/available`
  - ', error);

- **GET** `/api/teachers/:teacherId/earnings/monthly`
  - Get monthly earnings breakdown

- **GET** `/api/teachers/:teacherId/earnings/payouts`
  - Get payout history

### POST

- **POST** `/api/teachers/:teacherId/earnings/calculate`
  - Calculate monthly earnings for a course

- **POST** `/api/teachers/:teacherId/earnings/payout`
  - Request a payout (cashout)

---

## USERS - users

**Base Path:** `/api/users`

### GET

- **GET** `/api/users/search`

### POST

- **POST** `/api/users/auth/login`

- **POST** `/api/users/auth/register`

- **POST** `/api/users/auth/refresh-token`

- **POST** `/api/users/auth/forgot-password`

- **POST** `/api/users/auth/reset-password`

---

## COURSES - video-features

**Base Path:** `/api`

### GET

- **GET** `/api/videos/:videoId/chapters`
  - Get video chapters

- **GET** `/api/videos/:videoId/notes`
  - Get user's video notes

- **GET** `/api/videos/:videoId/bookmarks`
  - Get user's video bookmarks

- **GET** `/api/videos/:videoId/transcript`
  - Get video transcript

- **GET** `/api/videos/:videoId/analytics`
  - Get video analytics (aggregated)

### POST

- **POST** `/api/videos/:videoId/chapters`
  - Create video chapter (Teacher only)

- **POST** `/api/videos/:videoId/notes`
  - Create video note

- **POST** `/api/videos/:videoId/bookmarks`
  - Create video bookmark

- **POST** `/api/videos/:videoId/transcript`
  - Create/update video transcript (Teacher only)

### PUT

- **PUT** `/api/videos/:videoId/analytics`
  - Update video analytics

---

## COURSES - video

**Base Path:** `/api`

### GET

- **GET** `/api/users/:userId/video/recent-contacts`
  - Get recent video contacts

### POST

- **POST** `/api/video/conferences/:conferenceId/breakout-rooms`
  - Create breakout rooms

- **POST** `/api/video/conferences/:conferenceId/breakout-rooms/:roomId/assign`
  - Assign participants to breakout room

- **POST** `/api/video/conferences/:conferenceId/breakout-rooms/:roomId/close`
  - Close a breakout room

---

## USERS - webhooks

**Base Path:** `/api`

### GET

- **GET** `/api/webhooks`
  - Get all webhooks (Admin only)

- **GET** `/api/webhooks/:id`
  - Get webhook by ID (Admin only)

- **GET** `/api/webhooks/:id/deliveries`
  - Get webhook deliveries (Admin only)

### POST

- **POST** `/api/webhooks`
  - Create a webhook (Admin only)

- **POST** `/api/webhooks/retry-failed`
  - Retry failed webhook deliveries (Admin only)

### PUT

- **PUT** `/api/webhooks/:id`
  - Update webhook (Admin only)

- **PUT** `/api/webhooks/:id/toggle`
  - Toggle webhook active status (Admin only)

### DELETE

- **DELETE** `/api/webhooks/:id`
  - Delete webhook (Admin only)

---

## COURSES - whiteboard

**Base Path:** `/api/whiteboards`

### GET

- **GET** `/api/whiteboards/:whiteboardId`
  - Get whiteboard by ID

- **GET** `/api/whiteboards/courses/:courseId`
  - Get whiteboards for a course

- **GET** `/api/whiteboards/streams/:liveStreamId`
  - Get whiteboards for a live stream

- **GET** `/api/whiteboards/:whiteboardId/actions`
  - Get whiteboard actions

### POST

- **POST** `/api/whiteboards/`
  - Create a new whiteboard

- **POST** `/api/whiteboards/:whiteboardId/actions`
  - Add action to whiteboard

- **POST** `/api/whiteboards/:whiteboardId/clear`
  - Clear whiteboard (delete all actions)

### PUT

- **PUT** `/api/whiteboards/:whiteboardId`
  - Update whiteboard

### DELETE

- **DELETE** `/api/whiteboards/:whiteboardId`
  - Delete whiteboard

---

## COURSES - whiteboards

**Base Path:** `/api/whiteboards`

### GET

- **GET** `/api/whiteboards/:whiteboardId`
  - Get whiteboard by ID

- **GET** `/api/whiteboards/courses/:courseId`
  - Get whiteboards for a course

- **GET** `/api/whiteboards/streams/:liveStreamId`
  - Get whiteboards for a live stream

- **GET** `/api/whiteboards/:whiteboardId/actions`
  - Get whiteboard actions

### POST

- **POST** `/api/whiteboards/`
  - Create a new whiteboard

- **POST** `/api/whiteboards/:whiteboardId/actions`
  - Add action to whiteboard

- **POST** `/api/whiteboards/:whiteboardId/clear`
  - Clear whiteboard (delete all actions)

### PUT

- **PUT** `/api/whiteboards/:whiteboardId`
  - Update whiteboard

### DELETE

- **DELETE** `/api/whiteboards/:whiteboardId`
  - Delete whiteboard

---

## COURSES - wishlist

**Base Path:** `/api/courses/wishlist`

### GET

- **GET** `/api/courses/wishlist/`

- **GET** `/api/courses/wishlist/:courseId/check`

- **GET** `/api/courses/wishlist/count`
  - Get wishlist count

### POST

- **POST** `/api/courses/wishlist/:courseId`

### DELETE

- **DELETE** `/api/courses/wishlist/:courseId`
  - Remove course from wishlist

---

---

**Last Updated:** 2025-12-30

# SkillStream Platform API Documentation

Complete API documentation for the SkillStream e-learning platform showing all endpoints, request formats, and response formats.

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Courses](#courses)
4. [Enrollments](#enrollments)
5. [Lessons](#lessons)
6. [Quizzes](#quizzes)
7. [Progress](#progress)
8. [Subscriptions](#subscriptions)
9. [Reviews](#reviews)
10. [Forums](#forums)
11. [Certificates](#certificates)
12. [Dashboard](#dashboard)
13. [Bundles](#bundles)
14. [Coupons](#coupons)
15. [Learning Paths](#learning-paths)
16. [Tags](#tags)
17. [Instructor Q&A](#instructor-qa)
18. [Referrals](#referrals)
19. [Wishlist](#wishlist)
20. [Prerequisites](#prerequisites)
21. [Categories](#categories)
22. [Teacher Earnings](#teacher-earnings)
23. [Calendar](#calendar)
24. [Messaging](#messaging)
25. [Bookings](#bookings)
26. [Announcements](#announcements)
27. [Polls](#polls)
28. [Whiteboards](#whiteboards)
29. [Video Features](#video-features)
30. [Other Endpoints](#other-endpoints)

---

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://api.skillstream.com`

## Authentication

Most endpoints require authentication using Bearer tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Authentication

### POST /api/users/auth/login

Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_123",
  "user": {
    "id": "user_123",
    "username": "johndoe",
    "email": "user@example.com",
    "role": "STUDENT",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid email or password"
}
```

---

### POST /api/users/auth/register

Register a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "role": "STUDENT",
  "firstName": "John",
  "lastName": "Doe",
  "referralCode": "REF123"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_123",
  "user": {
    "id": "user_123",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "STUDENT"
  }
}
```

**Error Response (400):**
```json
{
  "error": "User already exists"
}
```

---

### POST /api/users/auth/refresh-token

Get a new access token using a refresh token.

**Request Body:**
```json
{
  "token": "refresh_token_123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_456",
  "user": { ... }
}
```

---

### POST /api/users/auth/forgot-password

Request password reset email.

**Request Body:**
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

---

### POST /api/users/auth/reset-password

Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset_token_123",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

---

## Courses

### GET /api/courses

Get all courses with filtering, searching, and pagination.

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20) - Items per page
- `search` (string) - Search term for title/description
- `minPrice` (number) - Minimum price filter
- `maxPrice` (number) - Maximum price filter
- `instructorId` (string) - Filter by instructor ID
- `categoryId` (string) - Filter by category ID
- `difficulty` (string: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT) - Filter by difficulty
- `minRating` (number) - Minimum rating filter
- `maxRating` (number) - Maximum rating filter
- `minDuration` (integer) - Minimum duration in seconds
- `maxDuration` (integer) - Maximum duration in seconds
- `language` (string) - Filter by language code
- `tags` (string) - Comma-separated list of tags
- `sortBy` (string, default: createdAt) - Field to sort by
- `sortOrder` (string: asc, desc, default: desc) - Sort order

**Response (200):**
```json
{
  "courses": [
    {
      "id": "course_123",
      "title": "Introduction to JavaScript",
      "description": "Learn the fundamentals of JavaScript programming",
      "price": 49.99,
      "thumbnailUrl": "https://example.com/thumb.jpg",
      "categoryId": "cat_123",
      "difficulty": "BEGINNER",
      "duration": 3600,
      "language": "en",
      "learningObjectives": ["Understand variables", "Learn functions"],
      "requirements": ["Basic computer skills"],
      "instructorId": "user_123",
      "instructor": {
        "id": "user_123",
        "username": "teacher1",
        "email": "teacher@example.com"
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### GET /api/courses/{id}

Get detailed information about a specific course. Requires authentication and active subscription.

**Response (200):**
```json
{
  "id": "course_123",
  "title": "Introduction to JavaScript",
  "description": "Learn the fundamentals...",
  "price": 49.99,
  "thumbnailUrl": "https://example.com/thumb.jpg",
  "categoryId": "cat_123",
  "difficulty": "BEGINNER",
  "duration": 3600,
  "language": "en",
  "learningObjectives": ["Understand variables"],
  "requirements": ["Basic computer skills"],
  "instructorId": "user_123",
  "instructor": { ... },
  "modules": [ ... ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### GET /api/courses/{id}/preview

Get preview content (lessons and videos) for a course. Public endpoint.

**Response (200):**
```json
{
  "course": {
    "id": "course_123",
    "title": "Introduction to JavaScript",
    "description": "Learn the fundamentals...",
    "thumbnailUrl": "https://example.com/thumb.jpg",
    "difficulty": "BEGINNER",
    "instructor": { ... }
  },
  "previewContent": {
    "lessons": [
      {
        "id": "lesson_123",
        "title": "Lesson 1: Getting Started",
        "order": 1,
        "duration": 1800,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "videos": [
      {
        "id": "video_123",
        "title": "Introduction Video",
        "description": "Welcome to the course",
        "thumbnailUrl": "https://example.com/video-thumb.jpg",
        "duration": 600,
        "playbackUrl": "https://example.com/video.mp4",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/courses/course

Create a new course. Teacher only.

**Request Body:**
```json
{
  "title": "Introduction to JavaScript",
  "description": "Learn the fundamentals of JavaScript programming",
  "price": 49.99,
  "order": 1,
  "createdBy": "user_123",
  "instructorId": "user_123",
  "thumbnailUrl": "https://example.com/thumb.jpg",
  "categoryId": "cat_123",
  "difficulty": "BEGINNER",
  "duration": 3600,
  "language": "en",
  "learningObjectives": ["Understand variables", "Learn functions"],
  "requirements": ["Basic computer skills"]
}
```

**Response (200):**
```json
{
  "id": "course_123",
  "title": "Introduction to JavaScript",
  ...
}
```

---

### PUT /api/courses/{id}

Update course information. Teacher only.

**Request Body:**
```json
{
  "title": "Updated Course Title",
  "description": "Updated description",
  "price": 59.99,
  "thumbnailUrl": "https://example.com/new-thumb.jpg",
  "difficulty": "INTERMEDIATE",
  "duration": 7200,
  "language": "en",
  "learningObjectives": ["Updated objectives"],
  "requirements": ["Updated requirements"]
}
```

**Response (200):**
```json
{
  "id": "course_123",
  "title": "Updated Course Title",
  ...
}
```

---

### DELETE /api/courses/{id}

Delete a course. Teacher only.

**Response (200):**
```json
{
  "success": true
}
```

---

### POST /api/courses/{id}/modules

Add a module to a course. Teacher only.

**Request Body:**
```json
{
  "title": "Module 1: Introduction",
  "description": "Introduction to the course",
  "order": 1,
  "createdBy": "user_123"
}
```

**Response (200):**
```json
{
  "id": "module_123",
  "courseId": "course_123",
  "title": "Module 1: Introduction",
  "description": "Introduction to the course",
  "order": 1,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### POST /api/courses/{id}/modules/{moduleId}/lessons

Add a lesson to a module. Teacher only.

**Request Body:**
```json
{
  "title": "Lesson 1: Getting Started",
  "description": "Introduction to the lesson",
  "order": 1,
  "duration": 1800,
  "isPreview": false
}
```

**Response (200):**
```json
{
  "id": "lesson_123",
  "moduleId": "module_123",
  "courseId": "course_123",
  "title": "Lesson 1: Getting Started",
  "description": "Introduction to the lesson",
  "order": 1,
  "duration": 1800,
  "isPreview": false,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### POST /api/courses/{id}/lessons/{lessonId}/quiz

Add a quiz to a lesson. Teacher only.

**Request Body:**
```json
{
  "title": "Quiz 1",
  "description": "Test your knowledge",
  "instructions": "Answer all questions",
  "timeLimit": 3600,
  "maxAttempts": 3,
  "passingScore": 70,
  "dueDate": "2024-12-31T23:59:59Z",
  "createdBy": "user_123"
}
```

**Response (200):**
```json
{
  "id": "quiz_123",
  "courseId": "course_123",
  "lessonId": "lesson_123",
  "title": "Quiz 1",
  "description": "Test your knowledge",
  "instructions": "Answer all questions",
  "timeLimit": 3600,
  "maxAttempts": 3,
  "passingScore": 70,
  "dueDate": "2024-12-31T23:59:59Z",
  "isPublished": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### GET /api/courses/{id}/active-users

Get active users in a course. Teacher only.

**Query Parameters:**
- `days` (integer, default: 7) - Number of days to look back
- `page` (integer, default: 1)
- `limit` (integer, default: 20)

**Response (200):**
```json
{
  "users": [
    {
      "id": "user_123",
      "username": "student1",
      "email": "student@example.com",
      "lastActivity": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": { ... },
  "summary": {
    "totalActive": 50,
    "totalEnrolled": 100
  }
}
```

---

### GET /api/courses/{id}/enrollments

Get all enrollments for a course. Teacher only.

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20)

**Response (200):**
```json
{
  "enrollments": [
    {
      "id": "enrollment_123",
      "courseId": "course_123",
      "studentId": "user_123",
      "paymentId": "payment_123",
      "createdAt": "2024-01-01T00:00:00Z",
      "course": { ... },
      "student": { ... },
      "payment": {
        "id": "payment_123",
        "amount": 49.99,
        "currency": "USD",
        "status": "completed",
        "provider": "stripe",
        "transactionId": "txn_123"
      }
    }
  ],
  "pagination": { ... }
}
```

---

## Subscriptions

### GET /api/subscriptions/status

Get current subscription status.

**Response (200):**
```json
{
  "id": "sub_123",
  "userId": "user_123",
  "status": "active",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-02-01T00:00:00Z",
  "provider": "stripe",
  "transactionId": "txn_123",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### GET /api/subscriptions/fee

Get subscription fee information.

**Response (200):**
```json
{
  "fee": 6.00,
  "currency": "USD",
  "duration": "30 days"
}
```

---

### POST /api/subscriptions

Create a new subscription payment.

**Request Body:**
```json
{
  "provider": "stripe",
  "transactionId": "txn_123"
}
```

**Response (201):**
```json
{
  "id": "sub_123",
  "userId": "user_123",
  "status": "pending",
  "provider": "stripe",
  "transactionId": "txn_123",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### POST /api/subscriptions/activate

Activate subscription after payment confirmation.

**Request Body:**
```json
{
  "transactionId": "txn_123",
  "provider": "stripe"
}
```

**Response (200):**
```json
{
  "id": "sub_123",
  "status": "active",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-02-01T00:00:00Z",
  ...
}
```

---

### POST /api/subscriptions/cancel

Cancel subscription.

**Response (200):**
```json
{
  "id": "sub_123",
  "status": "cancelled",
  ...
}
```

---

## Lessons

### POST /api/lessons/quick

Create a quick lesson. Teacher only.

**Request Body:**
```json
{
  "title": "Quick Lesson",
  "description": "A quick lesson",
  "teacherId": "user_123",
  "scheduledAt": "2024-01-15T10:00:00Z",
  "subject": "Mathematics",
  "duration": 3600
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "quick_lesson_123",
    "title": "Quick Lesson",
    "description": "A quick lesson",
    "teacherId": "user_123",
    "scheduledAt": "2024-01-15T10:00:00Z",
    "subject": "Mathematics",
    "duration": 3600,
    "joinLink": "https://meet.skillstream.com/123456",
    "meetingId": "meeting-123456",
    "status": "scheduled",
    "teacher": { ... }
  }
}
```

---

### GET /api/lessons

Get lessons (for teacher or student).

**Query Parameters:**
- `role` (string: TEACHER, STUDENT)
- `status` (string: upcoming, past, scheduled, completed, cancelled)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "quickLessons": [ ... ],
    "regularLessons": [ ... ]
  }
}
```

---

## Progress

Progress tracking endpoints are available at `/api/progress/*`. These endpoints allow students to track their learning progress through courses, modules, lessons, quizzes, and assignments.

---

## Reviews

Review endpoints are available at `/api/reviews/*`. These endpoints allow students to leave reviews and ratings for courses.

---

## Forums

Forum endpoints are available at `/api/forums/*`. These endpoints provide discussion forum functionality for courses.

---

## Certificates

Certificate endpoints are available at `/api/certificates/*`. These endpoints handle course completion certificates.

---

## Dashboard

Dashboard endpoints are available at `/api/dashboard/*`. These endpoints provide student dashboard data including progress, deadlines, and recommendations.

---

## Bundles

Bundle endpoints are available at `/api/bundles/*`. These endpoints handle course bundles and packages.

---

## Coupons

Coupon endpoints are available at `/api/coupons/*`. These endpoints handle discount coupons and codes.

---

## Learning Paths

Learning path endpoints are available at `/api/learning-paths/*`. These endpoints handle structured learning paths.

---

## Tags

Tag endpoints are available at:
- `/api/courses/{id}/tags/*` - Course-specific tags
- `/api/tags/*` - Platform-wide tags

---

## Instructor Q&A

Instructor Q&A endpoints are available at `/api/courses/{id}/qa/*`. These endpoints handle direct Q&A between students and instructors.

---

## Referrals

Referral endpoints are available at `/api/referrals/*`. These endpoints handle the affiliate/referral program.

---

## Wishlist

Wishlist endpoints are available at `/api/courses/wishlist/*`. These endpoints handle course wishlist/favorites.

---

## Prerequisites

Prerequisite endpoints are available at `/api/courses/{id}/prerequisites/*`. These endpoints handle course prerequisites.

---

## Categories

Category endpoints are available at `/api/categories/*`. These endpoints handle course categories.

---

## Teacher Earnings

Teacher earnings endpoints are available at `/api/teacher-earnings/*`. These endpoints handle teacher earnings and payouts.

---

## Calendar

Calendar endpoints are available at `/api/calendar/*`. These endpoints handle calendar events and scheduling.

---

## Messaging

Messaging endpoints are available at `/api/messaging/*`. These endpoints handle real-time messaging between users.

---

## Bookings

Booking endpoints are available at `/api/bookings/*` and `/api/teachers/{teacherId}/availability`. These endpoints handle lesson bookings and teacher availability.

---

## Announcements

Announcement endpoints are available at `/api/announcements/*`. These endpoints handle course announcements.

---

## Polls

Poll endpoints are available at `/api/polls/*`. These endpoints handle course polls and surveys.

---

## Whiteboards

Whiteboard endpoints are available at `/api/whiteboards/*`. These endpoints handle collaborative whiteboards.

---

## Video Features

Video feature endpoints are available at `/api/video-features/*`. These endpoints handle video-related features.

---

## Other Endpoints

Additional endpoints are available for:
- OAuth (`/api/oauth/*`)
- Admin operations (`/api/admin/*`)
- Settings (`/api/settings/*`)
- Notifications (`/api/notifications/*`)
- Analytics (`/api/analytics/*`)
- Webhooks (`/api/webhooks/*`)
- API Keys (`/api/api-keys/*`)
- Bulk Operations (`/api/bulk-operations/*`)
- Activity Logs (`/api/activity-logs/*`)
- Gamification (`/api/gamification/*`)
- Data Export (`/api/data-export/*`)
- Earnings (`/api/earnings/*`)
- Attendance (`/api/attendance/*`)
- Resources (`/api/resources/*`)
- Video (`/api/video/*`)
- Marketing (`/api/marketing/*`)
- Recommendations (`/api/recommendations/*`)
- Content Versioning (`/api/content-versioning/*`)
- Content Moderation (`/api/content-moderation/*`)
- Collaboration (`/api/collaboration/*`)
- Share (`/api/courses/{id}/share/*`)
- Comparison (`/api/courses/{id}/comparison/*`)

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Error message description"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Login: 20 attempts per 5 minutes
- Registration: 5 attempts per 15 minutes
- Password Reset: 3 attempts per hour
- General: 100 requests per 15 minutes

---

## Interactive API Documentation

For interactive API documentation with the ability to test endpoints, visit:
- **Swagger UI**: `http://localhost:3000/api-docs` (development)
- **Swagger JSON**: `http://localhost:3000/api-docs.json`

---

## GraphQL Endpoints

The API also provides GraphQL endpoints:
- `/graphql/users` - User operations
- `/graphql/courses` - Course operations
- `/graphql/enrollments` - Enrollment operations
- `/graphql/media` - Media operations
- `/graphql/recommendations` - Recommendation operations
- `/graphql/calendar` - Calendar operations

All GraphQL endpoints support GraphiQL interface for interactive querying.

---

*Last Updated: 2024*

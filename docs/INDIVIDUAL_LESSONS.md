# Individual Lessons with Payment Feature

This document describes the implementation of individual lessons for selected students with payment requirements.

## Overview

Teachers can now create lessons for individually selected students. These lessons require payment 24 hours before the scheduled lesson time. If payment is not received by the deadline, the lesson is automatically cancelled.

## Features

### 1. Teacher Creates Lesson for Selected Students

**Endpoint**: `POST /api/lessons/quick`

**Request Body**:
```json
{
  "title": "Advanced JavaScript",
  "description": "One-on-one JavaScript tutoring",
  "scheduledAt": "2024-12-25T14:00:00Z",
  "subject": "Programming",
  "duration": 60,
  "price": 50.00,
  "invitedStudents": ["john_doe", "jane@example.com", "student_username"],
  "maxStudents": 2
}
```

**Note**: `invitedStudents` accepts an array of usernames or email addresses (not IDs). The system will automatically resolve them to student IDs.

**Features**:
- Teacher can invite specific students by username or email address
- Set price per student
- Set maximum number of students
- Lesson must be scheduled at least 24 hours in advance if price is set
- Invitation emails are automatically sent to students
- System automatically resolves usernames/emails to student IDs

### 2. Payment Requirement

**24-Hour Rule**:
- Payment must be completed at least 24 hours before the lesson
- Payment deadline is automatically calculated (lesson time - 24 hours)
- If payment is not received by deadline, lesson is cancelled

**Payment Endpoints**:
- `POST /api/lessons/:lessonId/payment` - Create payment for a lesson
- `POST /api/bookings/:bookingId/payment` - Create payment for a booking
- `POST /api/payments/:paymentId/confirm` - Confirm payment (mark as completed)
- `GET /api/lessons/:lessonId/payment/status` - Check payment status
- `GET /api/bookings/:bookingId/payment/status` - Check booking payment status

### 3. Automatic Cancellation

**Scheduled Job**:
- Runs every hour
- Checks for lessons with passed payment deadlines
- Automatically cancels unpaid lessons
- Sends cancellation emails to students
- Frees up booking slots

### 4. Booking System Integration

**Enhanced Booking Flow**:
- When creating a booking with a price, status is set to `pending_payment`
- Payment deadline is automatically set (24 hours before lesson)
- Booking is confirmed only after payment is completed
- If payment deadline passes, booking is cancelled and slot is freed

## Database Schema Changes

### Payment Model
- Added `bookingId` and `lessonId` fields (optional)
- Added `dueAt` field for payment deadline
- Added `paidAt` field for payment completion time
- Supports both course payments and lesson/booking payments

### QuickLesson Model
- Added `price` field (optional)
- Added `invitedStudentIds` array (list of student IDs - resolved from usernames/emails)
- Added `maxStudents` field (optional)

**Note**: The API accepts `invitedStudents` (usernames/emails) which are automatically converted to `invitedStudentIds` (IDs) for storage.

### Booking Model
- Added `price` field (optional)
- Added `paymentDueAt` field (payment deadline)
- Status values: `pending_payment`, `confirmed`, `cancelled`, `completed`, `payment_failed`

## API Endpoints

### Create Lesson with Students
```http
POST /api/lessons/quick
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Lesson Title",
  "description": "Lesson description",
  "scheduledAt": "2024-12-25T14:00:00Z",
  "subject": "Math",
  "duration": 60,
  "price": 50.00,
  "invitedStudents": ["john_doe", "jane@example.com", "student_username"],
  "maxStudents": 2
}
```

**Note**: `invitedStudents` accepts usernames or email addresses. You can mix both in the same array.

### Create Payment for Lesson
```http
POST /api/lessons/{lessonId}/payment
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 50.00,
  "currency": "USD",
  "provider": "stripe",
  "transactionId": "txn_123456"
}
```

### Confirm Payment
```http
POST /api/payments/{paymentId}/confirm
Authorization: Bearer {token}
Content-Type: application/json

{
  "transactionId": "txn_123456" // Optional
}
```

### Check Payment Status
```http
GET /api/lessons/{lessonId}/payment/status
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "required": true,
    "paid": false,
    "deadline": "2024-12-24T14:00:00Z",
    "isOverdue": false
  }
}
```

## Payment Flow

1. **Teacher creates lesson** with selected students and price
2. **Students receive invitation** via email
3. **Student creates payment** (status: PENDING)
4. **Payment gateway processes** payment
5. **Payment is confirmed** (status: COMPLETED)
6. **Lesson is confirmed** for that student
7. **If payment deadline passes** without payment:
   - Lesson is automatically cancelled
   - Student receives cancellation email
   - Slot is freed (for bookings)

## Scheduled Tasks

The system includes automated scheduled tasks:

1. **Check Unpaid Lessons** (Every hour)
   - Finds lessons with passed payment deadlines
   - Cancels unpaid lessons
   - Sends cancellation emails

2. **Check Expired Subscriptions** (Daily at midnight)
   - Updates expired subscriptions
   - Marks users as inactive

3. **Calculate Teacher Earnings** (Monthly on 1st at 2 AM)
   - Calculates monthly earnings for all teachers
   - Updates earnings summaries

## Validation Rules

1. **Lesson Scheduling**:
   - Lessons with payment must be scheduled at least 24 hours in advance
   - Payment deadline = lesson time - 24 hours

2. **Payment Amount**:
   - Must match lesson/booking price exactly
   - Minimum amount: $0.01

3. **Student Invitation**:
   - Only invited students can pay for a lesson
   - Students can be invited by username or email address
   - All invited students must have STUDENT role
   - System automatically resolves usernames/emails to student IDs

4. **Payment Deadline**:
   - Cannot create payment after deadline has passed
   - Deadline is enforced server-side

## Email Notifications

### Invitation Email
Sent to students when:
- Teacher creates a lesson with price and invites them
- Includes lesson details and payment deadline

### Payment Confirmation Email
Sent to students when:
- Payment is successfully confirmed
- Includes lesson details and confirmation

### Cancellation Email
Sent to students when:
- Payment deadline passes without payment
- Lesson is automatically cancelled
- Includes cancellation reason

## Error Handling

Common errors:
- `Lesson not found` - Invalid lesson ID
- `One or more students not found: [list]` - Invalid usernames/emails provided
- `Student is not invited to this lesson` - Student not in invited list
- `Payment deadline has passed` - Too late to pay
- `Payment amount does not match lesson price` - Amount mismatch
- `Payment already completed` - Duplicate payment attempt

## Testing

### Test Scenarios

1. **Create lesson with students and price**
   ```bash
   POST /api/lessons/quick
   # Should create lesson, send invitations
   ```

2. **Create payment before deadline**
   ```bash
   POST /api/lessons/{lessonId}/payment
   # Should create payment with PENDING status
   ```

3. **Confirm payment**
   ```bash
   POST /api/payments/{paymentId}/confirm
   # Should mark payment as COMPLETED
   ```

4. **Check payment status**
   ```bash
   GET /api/lessons/{lessonId}/payment/status
   # Should return payment status and deadline
   ```

5. **Wait for deadline to pass** (test scheduled job)
   - Payment deadline passes
   - Scheduled job runs
   - Lesson is cancelled
   - Cancellation email sent

## Security

- All endpoints require authentication
- Teachers can only create lessons for themselves
- Students can only pay for lessons they're invited to
- Payment amounts are validated server-side
- Payment deadlines are enforced server-side

## Future Enhancements

- Payment reminders (7 days, 3 days, 1 day before deadline)
- Partial refunds for cancellations
- Payment retry mechanism
- Multiple payment methods
- Payment history for students
- Teacher earnings from individual lessons

---

**Last Updated**: Implementation complete
**Status**: Ready for use


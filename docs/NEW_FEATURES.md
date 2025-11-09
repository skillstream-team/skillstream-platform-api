# New Features: Recommendation Engine & Calendar Scheduling

This document describes the two new features added to the SkillStream Platform API.

## 1. Recommendation Engine

The Recommendation Engine provides personalized course recommendations to users based on their enrollment history, course popularity, and user interactions.

### Features

- **Multiple Recommendation Algorithms**:
  - Collaborative Filtering: Recommends courses based on similar users' preferences
  - Content-Based Filtering: Recommends courses from instructors of previously enrolled courses
  - Popularity-Based: Recommends trending courses with high enrollment counts

- **User Interaction Tracking**: Tracks user interactions (view, enroll, complete, rate, search) to improve recommendations
- **Recommendation Statistics**: Provides analytics on recommendation performance
- **Configurable Filters**: Filter recommendations by algorithm, score, and viewed status

### REST API Endpoints

```
POST   /api/recommendations/generate/{userId}     - Generate new recommendations
GET    /api/recommendations/{userId}              - Get user's recommendations
POST   /api/recommendations/refresh/{userId}      - Refresh recommendations
POST   /api/recommendations/interaction           - Record user interaction
GET    /api/recommendations/stats/{userId}        - Get recommendation statistics
```

### GraphQL Queries & Mutations

#### Queries
- `recommendations(filters: RecommendationFiltersInput!)`: Get filtered recommendations
- `recommendationStats(userId: Int!)`: Get recommendation statistics

#### Mutations
- `generateRecommendations(userId: Int!, limit: Int)`: Generate new recommendations
- `refreshRecommendations(userId: Int!)`: Refresh existing recommendations
- `recordInteraction(interaction: UserInteractionInput!)`: Record user interaction

## 2. Calendar & Scheduling

The Calendar & Scheduling system allows instructors to create events and provides students with a personalized calendar view of all their course-related activities.

### Features

- **Event Management**: Create, update, and delete calendar events
- **Multiple Event Types**: Live classes, deadlines, assignment due dates, quiz due dates, custom events
- **Attendee Management**: Add/remove attendees and track their response status
- **Recurring Events**: Support for recurring events with RRULE format
- **Automatic Deadline Events**: Automatically create events for assignment and quiz due dates
- **Personal Calendar**: Students get a unified view of all events from enrolled courses
- **Reminder System**: Configurable reminders with email/push/SMS support

### REST API Endpoints

```
POST   /api/calendar/events                       - Create new event
PUT    /api/calendar/events/{eventId}             - Update event
DELETE /api/calendar/events/{eventId}             - Delete event
GET    /api/calendar/events                       - Get events with filters
GET    /api/calendar/personal                     - Get personal calendar
POST   /api/calendar/events/{eventId}/attendees   - Add attendees
DELETE /api/calendar/events/{eventId}/attendees   - Remove attendees
PUT    /api/calendar/events/{eventId}/attendees/{userId}/status - Update attendee status
```

### GraphQL Queries & Mutations

#### Queries
- `calendarEvents(filters: CalendarFiltersInput)`: Get filtered calendar events
- `personalCalendar(userId: Int!, startDate: String, endDate: String)`: Get personal calendar
- `pendingReminders`: Get pending reminders

#### Mutations
- `createCalendarEvent(createdBy: Int!, eventData: CreateCalendarEventInput!)`: Create event
- `updateCalendarEvent(eventId: Int!, userId: Int!, eventData: UpdateCalendarEventInput!)`: Update event
- `deleteCalendarEvent(eventId: Int!, userId: Int!)`: Delete event

## Setup Instructions

### 1. Database Migration

Run the Prisma migration to create the new database tables:

```bash
npx prisma migrate dev --name add-recommendations-and-calendar
npx prisma generate
```

### 2. Environment Variables

Add to your `.env` file:

```env
JWT_SECRET=your-jwt-secret-key
```

### 3. Add Routes to Express App

```typescript
import recommendationRoutes from './modules/courses/routes/rest/recommendations.routes';
import calendarRoutes from './modules/courses/routes/rest/calendar.routes';

app.use('/api/recommendations', recommendationRoutes);
app.use('/api/calendar', calendarRoutes);
```

## Usage Examples

### Generate Recommendations (REST)
```bash
curl -X POST "http://localhost:3000/api/recommendations/generate/123?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Calendar Event (REST)
```bash
curl -X POST "http://localhost:3000/api/calendar/events" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Advanced JavaScript Live Class",
    "type": "live_class",
    "startTime": "2024-01-15T10:00:00Z",
    "endTime": "2024-01-15T11:30:00Z",
    "courseId": 1,
    "attendeeIds": [2, 3, 4]
  }'
```

### Get Personal Calendar (GraphQL)
```graphql
query GetPersonalCalendar($userId: Int!) {
  personalCalendar(userId: $userId) {
    events {
      id
      title
      type
      startTime
      course { title }
    }
    upcomingDeadlines {
      assignments { title dueDate courseTitle }
      quizzes { title dueDate courseTitle }
    }
  }
}
```

## Database Models Added

- **CourseRecommendation**: Stores generated recommendations with scores and algorithms
- **UserInteraction**: Tracks user interactions with courses
- **CalendarEvent**: Main event model with timing and attendee support
- **EventAttendee**: Manages event attendees and their response status
- **EventReminder**: Handles scheduled reminders for events

## Security & Performance

- All endpoints require JWT authentication
- Role-based access control for admin endpoints
- Database indexes for optimal query performance
- Input validation on all endpoints
- Recommendation generation should be run asynchronously for better performance

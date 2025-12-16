export interface CreateCalendarEventDto {
  title: string;
  description?: string;
  type: 'live_class' | 'deadline' | 'assignment_due' | 'quiz_due' | 'custom';
  startTime: Date;
  endTime?: Date;
  isAllDay?: boolean;
  location?: string;
  courseId?: string;
  assignmentId?: string;
  quizId?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  recurrenceEnd?: Date;
  timezone?: string;
  maxAttendees?: number;
  waitlistEnabled?: boolean;
  reminderMinutes?: number[];
  attendeeIds?: string[];
  metadata?: any;
}

export interface UpdateCalendarEventDto {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  isAllDay?: boolean;
  location?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  recurrenceEnd?: Date;
  timezone?: string;
  maxAttendees?: number;
  waitlistEnabled?: boolean;
  reminderMinutes?: number[];
  metadata?: any;
}

export interface CalendarEventResponseDto {
  id: string;
  title: string;
  description?: string;
  type: string;
  startTime: Date;
  endTime?: Date;
  isAllDay: boolean;
  location?: string;
  courseId?: string;
  assignmentId?: string;
  quizId?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  recurrenceEnd?: Date;
  timezone: string;
  maxAttendees?: number;
  waitlistEnabled: boolean;
  reminderMinutes: number[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: string;
    username: string;
  };
  course?: {
    id: string;
    title: string;
  };
  assignment?: {
    id: string;
    title: string;
  };
  quiz?: {
    id: string;
    title: string;
  };
  attendees: EventAttendeeDto[];
}

export interface EventAttendeeDto {
  id: string;
  userId: string;
  status: 'invited' | 'accepted' | 'declined' | 'maybe';
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export interface UpdateAttendeeStatusDto {
  eventId: string;
  userId: string;
  status: 'accepted' | 'declined' | 'maybe';
}

export interface CalendarFiltersDto {
  userId?: string;
  courseId?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  includeAllDay?: boolean;
}

export interface PersonalCalendarDto {
  events: CalendarEventResponseDto[];
  upcomingDeadlines: {
    assignments: Array<{
      id: string;
      title: string;
      dueDate: Date;
      courseTitle: string;
    }>;
    quizzes: Array<{
      id: string;
      title: string;
      dueDate: Date;
      courseTitle: string;
    }>;
  };
}

export interface EventReminderDto {
  id: string;
  eventId: string;
  userId: string;
  reminderAt: Date;
  type: 'email' | 'push' | 'sms';
  isSent: boolean;
}

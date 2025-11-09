export interface CreateCalendarEventDto {
  title: string;
  description?: string;
  type: 'live_class' | 'deadline' | 'assignment_due' | 'quiz_due' | 'custom';
  startTime: Date;
  endTime?: Date;
  isAllDay?: boolean;
  location?: string;
  courseId?: number;
  assignmentId?: number;
  quizId?: number;
  isRecurring?: boolean;
  recurrenceRule?: string;
  reminderMinutes?: number[];
  attendeeIds?: number[];
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
  reminderMinutes?: number[];
  metadata?: any;
}

export interface CalendarEventResponseDto {
  id: number;
  title: string;
  description?: string;
  type: string;
  startTime: Date;
  endTime?: Date;
  isAllDay: boolean;
  location?: string;
  courseId?: number;
  assignmentId?: number;
  quizId?: number;
  isRecurring: boolean;
  recurrenceRule?: string;
  reminderMinutes: number[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: number;
    username: string;
  };
  course?: {
    id: number;
    title: string;
  };
  assignment?: {
    id: number;
    title: string;
  };
  quiz?: {
    id: number;
    title: string;
  };
  attendees: EventAttendeeDto[];
}

export interface EventAttendeeDto {
  id: number;
  userId: number;
  status: 'invited' | 'accepted' | 'declined' | 'maybe';
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export interface UpdateAttendeeStatusDto {
  eventId: number;
  userId: number;
  status: 'accepted' | 'declined' | 'maybe';
}

export interface CalendarFiltersDto {
  userId?: number;
  courseId?: number;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  includeAllDay?: boolean;
}

export interface PersonalCalendarDto {
  events: CalendarEventResponseDto[];
  upcomingDeadlines: {
    assignments: Array<{
      id: number;
      title: string;
      dueDate: Date;
      courseTitle: string;
    }>;
    quizzes: Array<{
      id: number;
      title: string;
      dueDate: Date;
      courseTitle: string;
    }>;
  };
}

export interface EventReminderDto {
  id: number;
  eventId: number;
  userId: number;
  reminderAt: Date;
  type: 'email' | 'push' | 'sms';
  isSent: boolean;
}

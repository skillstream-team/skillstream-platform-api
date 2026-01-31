import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  CalendarEventResponseDto,
  UpdateAttendeeStatusDto,
  CalendarFiltersDto,
  PersonalCalendarDto,
  EventReminderDto
} from '../dtos/calendar.dto';
import { prisma } from '../../../utils/prisma';

export class CalendarService {

  /**
   * Create a new calendar event
   */
  async createEvent(createdBy: string, eventData: CreateCalendarEventDto): Promise<CalendarEventResponseDto> {
    const event = await prisma.calendarEvent.create({
      data: {
        title: eventData.title,
        description: eventData.description,
        type: eventData.type,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        isAllDay: eventData.isAllDay || false,
        location: eventData.location,
        programId: eventData.courseId, // Note: DTO still uses courseId, but we map to programId
        assignmentId: eventData.assignmentId,
        quizId: eventData.quizId,
        isRecurring: eventData.isRecurring || false,
        recurrenceRule: eventData.recurrenceRule,
        recurrenceEnd: eventData.recurrenceEnd,
        timezone: eventData.timezone || 'UTC',
        maxAttendees: eventData.maxAttendees,
        waitlistEnabled: eventData.waitlistEnabled || false,
        reminderMinutes: eventData.reminderMinutes || [15],
        metadata: eventData.metadata,
        createdBy
      },
      include: {
        creator: { select: { id: true, username: true } },
        program: { select: { id: true, title: true } },
        assignment: { select: { id: true, title: true } },
        quiz: { select: { id: true, title: true } },
        attendees: {
          include: {
            user: { select: { id: true, username: true, email: true } }
          }
        }
      }
    });

    // Add attendees if specified
    if (eventData.attendeeIds && eventData.attendeeIds.length > 0) {
      await this.addAttendees(event.id, eventData.attendeeIds);
    }

    // Schedule reminders
    await this.scheduleReminders(event.id, eventData.attendeeIds || [], eventData.reminderMinutes || [15]);

    return this.mapToResponseDto(event);
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(eventId: string, userId: string, eventData: UpdateCalendarEventDto): Promise<CalendarEventResponseDto> {
    // Check if user has permission to update this event
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: { id: eventId, createdBy: userId }
    });

    if (!existingEvent) {
      throw new Error('Event not found or you do not have permission to update it');
    }

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        ...(eventData.title && { title: eventData.title }),
        ...(eventData.description !== undefined && { description: eventData.description }),
        ...(eventData.startTime && { startTime: eventData.startTime }),
        ...(eventData.endTime !== undefined && { endTime: eventData.endTime }),
        ...(eventData.isAllDay !== undefined && { isAllDay: eventData.isAllDay }),
        ...(eventData.location !== undefined && { location: eventData.location }),
        ...(eventData.isRecurring !== undefined && { isRecurring: eventData.isRecurring }),
        ...(eventData.recurrenceRule !== undefined && { recurrenceRule: eventData.recurrenceRule }),
        ...(eventData.recurrenceEnd !== undefined && { recurrenceEnd: eventData.recurrenceEnd }),
        ...(eventData.timezone !== undefined && { timezone: eventData.timezone }),
        ...(eventData.maxAttendees !== undefined && { maxAttendees: eventData.maxAttendees }),
        ...(eventData.waitlistEnabled !== undefined && { waitlistEnabled: eventData.waitlistEnabled }),
        ...(eventData.reminderMinutes && { reminderMinutes: eventData.reminderMinutes }),
        ...(eventData.metadata !== undefined && { metadata: eventData.metadata })
      },
      include: {
        creator: { select: { id: true, username: true } },
        program: { select: { id: true, title: true } },
        assignment: { select: { id: true, title: true } },
        quiz: { select: { id: true, title: true } },
        attendees: {
          include: {
            user: { select: { id: true, username: true, email: true } }
          }
        }
      }
    });

    return this.mapToResponseDto(updatedEvent);
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string, userId: string): Promise<void> {
    const event = await prisma.calendarEvent.findFirst({
      where: { id: eventId, createdBy: userId }
    });

    if (!event) {
      throw new Error('Event not found or you do not have permission to delete it');
    }

    await prisma.calendarEvent.delete({
      where: { id: eventId }
    });
  }

  /**
   * Get events based on filters (with pagination)
   */
  async getEvents(filters: CalendarFiltersDto & { page?: number; limit?: number }): Promise<{
    data: CalendarEventResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      ...(filters.courseId && { programId: filters.courseId }),
      ...(filters.type && { type: filters.type }),
      ...(filters.startDate && filters.endDate && {
        OR: [
          {
            startTime: {
              gte: filters.startDate,
              lte: filters.endDate
            }
          },
          {
            endTime: {
              gte: filters.startDate,
              lte: filters.endDate
            }
          }
        ]
      }),
      ...(filters.includeAllDay !== undefined && { isAllDay: filters.includeAllDay }),
      ...(filters.userId && {
        OR: [
          { createdBy: filters.userId },
          { attendees: { some: { userId: filters.userId } } }
        ]
      })
    };

    const [events, total] = await Promise.all([
      prisma.calendarEvent.findMany({
        where,
        skip,
        take: limit,
        include: {
          creator: { select: { id: true, username: true } },
          program: { select: { id: true, title: true } },
          assignment: { select: { id: true, title: true } },
          quiz: { select: { id: true, title: true } },
          attendees: {
            include: {
              user: { select: { id: true, username: true, email: true } }
            }
          }
        },
        orderBy: { startTime: 'asc' }
      }),
      prisma.calendarEvent.count({ where }),
    ]);

    return {
      data: events.map(this.mapToResponseDto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get personal calendar for a student (all events for enrolled courses)
   */
  async getPersonalCalendar(userId: string, startDate?: Date, endDate?: Date): Promise<PersonalCalendarDto> {
    // Get user's enrolled collections
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: userId },
      select: { programId: true }
    });

    const programIds = enrollments.map((e: any) => e.programId);

    // Get events for enrolled courses and events where user is an attendee
    const eventsResult = await this.getEvents({
      userId,
      startDate,
      endDate
    });
    const events = eventsResult.data;

    // Get upcoming assignment deadlines
    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        programId: { in: programIds },
        dueDate: { gte: new Date() },
        isPublished: true
      },
      include: {
        program: { select: { title: true } }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    });

    // Get upcoming quiz deadlines
    const upcomingQuizzes = await prisma.quiz.findMany({
      where: {
        programId: { in: programIds },
        dueDate: { gte: new Date() },
        isPublished: true
      },
      include: {
        program: { select: { title: true } }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    });

    return {
      events,
      upcomingDeadlines: {
        assignments: upcomingAssignments.map((assignment: any) => ({
          id: assignment.id,
          title: assignment.title,
          dueDate: assignment.dueDate!,
          courseTitle: assignment.collection.title
        })),
        quizzes: upcomingQuizzes.map((quiz: any) => ({
          id: quiz.id,
          title: quiz.title,
          dueDate: quiz.dueDate!,
          courseTitle: quiz.collection.title
        }))
      }
    };
  }

  /**
   * Add attendees to an event
   */
  async addAttendees(eventId: string, userIds: string[]): Promise<void> {
    const attendeeData = userIds.map(userId => ({
      eventId,
      userId,
      status: 'invited' as const
    }));

    await prisma.eventAttendee.createMany({
      data: attendeeData
    });
  }

  /**
   * Remove attendees from an event
   */
  async removeAttendees(eventId: string, userIds: string[]): Promise<void> {
    await prisma.eventAttendee.deleteMany({
      where: {
        eventId,
        userId: { in: userIds }
      }
    });
  }

  /**
   * Update attendee status
   */
  async updateAttendeeStatus(data: UpdateAttendeeStatusDto): Promise<void> {
    await prisma.eventAttendee.update({
      where: {
        eventId_userId: {
          eventId: data.eventId,
          userId: data.userId
        }
      },
      data: { status: data.status }
    });
  }

  /**
   * Schedule reminders for an event
   */
  private async scheduleReminders(eventId: string, attendeeIds: string[], reminderMinutes: number[]): Promise<void> {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      select: { startTime: true }
    });

    if (!event) return;

    const reminderData: any[] = [];

    for (const userId of attendeeIds) {
      for (const minutes of reminderMinutes) {
        const reminderAt = new Date(event.startTime.getTime() - (minutes * 60 * 1000));
        
        reminderData.push({
          eventId,
          userId,
          reminderAt,
          type: 'email'
        });
      }
    }

    if (reminderData.length > 0) {
      await prisma.eventReminder.createMany({
        data: reminderData
      });
    }
  }

  /**
   * Get pending reminders that need to be sent
   */
  async getPendingReminders(): Promise<EventReminderDto[]> {
    const reminders = await prisma.eventReminder.findMany({
      where: {
        isSent: false,
        reminderAt: { lte: new Date() }
      },
      include: {
        event: { select: { title: true, startTime: true } },
        user: { select: { email: true, username: true } }
      },
      take: 100
    });

    return reminders.map(reminder => ({
      id: reminder.id,
      eventId: reminder.eventId,
      userId: reminder.userId,
      reminderAt: reminder.reminderAt,
      type: reminder.type as 'email' | 'push' | 'sms',
      isSent: reminder.isSent
    }));
  }

  /**
   * Mark reminder as sent
   */
  async markReminderAsSent(reminderId: string): Promise<void> {
    await prisma.eventReminder.update({
      where: { id: reminderId },
      data: { isSent: true }
    });
  }

  /**
   * Create events automatically for assignment and quiz due dates
   */
  async createAutomaticDeadlineEvents(): Promise<void> {
    // Create events for assignments with due dates that don't have events yet
    const assignmentsWithoutEvents = await prisma.assignment.findMany({
      where: {
        dueDate: { not: null },
        isPublished: true,
        events: { none: {} }
      },
      include: { program: true }
    });

    for (const assignment of assignmentsWithoutEvents) {
      await this.createEvent(assignment.createdBy, {
        title: `Assignment Due: ${assignment.title}`,
        description: assignment.description || undefined,
        type: 'assignment_due',
        startTime: assignment.dueDate!,
        isAllDay: true,
        courseId: assignment.programId, // Note: DTO uses courseId but we pass programId
        assignmentId: assignment.id
      });
    }

    // Create events for quizzes with due dates that don't have events yet
    const quizzesWithoutEvents = await prisma.quiz.findMany({
      where: {
        dueDate: { not: null },
        isPublished: true,
        events: { none: {} }
      },
      include: { program: true }
    });

    for (const quiz of quizzesWithoutEvents) {
      await this.createEvent(quiz.createdBy, {
        title: `Quiz Due: ${quiz.title}`,
        description: quiz.description || undefined,
        type: 'quiz_due',
        startTime: quiz.dueDate!,
        isAllDay: true,
        courseId: quiz.programId, // Note: DTO uses courseId but we pass programId
        quizId: quiz.id
      });
    }
  }

  /**
   * Map database model to response DTO
   */
  private mapToResponseDto(event: any): CalendarEventResponseDto {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      startTime: event.startTime,
      endTime: event.endTime,
      isAllDay: event.isAllDay,
      location: event.location,
      courseId: event.programId, // Note: DTO uses courseId but we map from programId
      assignmentId: event.assignmentId,
      quizId: event.quizId,
      isRecurring: event.isRecurring,
      recurrenceRule: event.recurrenceRule,
      recurrenceEnd: event.recurrenceEnd,
      timezone: event.timezone,
      maxAttendees: event.maxAttendees,
      waitlistEnabled: event.waitlistEnabled,
      reminderMinutes: event.reminderMinutes,
      metadata: event.metadata,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      creator: event.creator,
      course: event.collection, // Note: DTO uses course but we map from collection
      assignment: event.assignment,
      quiz: event.quiz,
      attendees: event.attendees?.map((attendee: any) => ({
        id: attendee.id,
        userId: attendee.userId,
        status: attendee.status,
        user: attendee.user
      })) || []
    };
  }
}

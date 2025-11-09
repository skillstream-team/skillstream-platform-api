import { 
  GraphQLObjectType, 
  GraphQLSchema, 
  GraphQLString, 
  GraphQLInt, 
  GraphQLList, 
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLInputObjectType
} from 'graphql';
import { CalendarService } from '../../services/calendar.service';

const calendarService = new CalendarService();

// User Type
const CalendarUserType = new GraphQLObjectType({
  name: 'CalendarUser',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    username: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: GraphQLString },
  }),
});

// Course Type
const CalendarCourseType = new GraphQLObjectType({
  name: 'CalendarCourse',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    title: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

// Assignment Type
const CalendarAssignmentType = new GraphQLObjectType({
  name: 'CalendarAssignment',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    title: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

// Quiz Type
const CalendarQuizType = new GraphQLObjectType({
  name: 'CalendarQuiz',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    title: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

// Event Attendee Type
const EventAttendeeType = new GraphQLObjectType({
  name: 'EventAttendee',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    userId: { type: new GraphQLNonNull(GraphQLInt) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    user: { type: CalendarUserType },
  }),
});

// Calendar Event Type
const CalendarEventType = new GraphQLObjectType({
  name: 'CalendarEvent',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    type: { type: new GraphQLNonNull(GraphQLString) },
    startTime: { type: new GraphQLNonNull(GraphQLString) },
    endTime: { type: GraphQLString },
    isAllDay: { type: new GraphQLNonNull(GraphQLBoolean) },
    location: { type: GraphQLString },
    courseId: { type: GraphQLInt },
    assignmentId: { type: GraphQLInt },
    quizId: { type: GraphQLInt },
    isRecurring: { type: new GraphQLNonNull(GraphQLBoolean) },
    recurrenceRule: { type: GraphQLString },
    reminderMinutes: { type: new GraphQLList(GraphQLInt) },
    metadata: { type: GraphQLString }, // JSON as string
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
    creator: { type: CalendarUserType },
    course: { type: CalendarCourseType },
    assignment: { type: CalendarAssignmentType },
    quiz: { type: CalendarQuizType },
    attendees: { type: new GraphQLList(EventAttendeeType) },
  }),
});

// Upcoming Deadline Types
const UpcomingAssignmentType = new GraphQLObjectType({
  name: 'UpcomingAssignment',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    dueDate: { type: new GraphQLNonNull(GraphQLString) },
    courseTitle: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const UpcomingQuizType = new GraphQLObjectType({
  name: 'UpcomingQuiz',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    dueDate: { type: new GraphQLNonNull(GraphQLString) },
    courseTitle: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const UpcomingDeadlinesType = new GraphQLObjectType({
  name: 'UpcomingDeadlines',
  fields: () => ({
    assignments: { type: new GraphQLList(UpcomingAssignmentType) },
    quizzes: { type: new GraphQLList(UpcomingQuizType) },
  }),
});

// Personal Calendar Type
const PersonalCalendarType = new GraphQLObjectType({
  name: 'PersonalCalendar',
  fields: () => ({
    events: { type: new GraphQLList(CalendarEventType) },
    upcomingDeadlines: { type: UpcomingDeadlinesType },
  }),
});

// Event Reminder Type
const EventReminderType = new GraphQLObjectType({
  name: 'EventReminder',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    eventId: { type: new GraphQLNonNull(GraphQLInt) },
    userId: { type: new GraphQLNonNull(GraphQLInt) },
    reminderAt: { type: new GraphQLNonNull(GraphQLString) },
    type: { type: new GraphQLNonNull(GraphQLString) },
    isSent: { type: new GraphQLNonNull(GraphQLBoolean) },
  }),
});

// Input Types
const CreateCalendarEventInput = new GraphQLInputObjectType({
  name: 'CreateCalendarEventInput',
  fields: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    type: { type: new GraphQLNonNull(GraphQLString) },
    startTime: { type: new GraphQLNonNull(GraphQLString) },
    endTime: { type: GraphQLString },
    isAllDay: { type: GraphQLBoolean },
    location: { type: GraphQLString },
    courseId: { type: GraphQLInt },
    assignmentId: { type: GraphQLInt },
    quizId: { type: GraphQLInt },
    isRecurring: { type: GraphQLBoolean },
    recurrenceRule: { type: GraphQLString },
    reminderMinutes: { type: new GraphQLList(GraphQLInt) },
    attendeeIds: { type: new GraphQLList(GraphQLInt) },
    metadata: { type: GraphQLString }, // JSON as string
  },
});

const UpdateCalendarEventInput = new GraphQLInputObjectType({
  name: 'UpdateCalendarEventInput',
  fields: {
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    startTime: { type: GraphQLString },
    endTime: { type: GraphQLString },
    isAllDay: { type: GraphQLBoolean },
    location: { type: GraphQLString },
    isRecurring: { type: GraphQLBoolean },
    recurrenceRule: { type: GraphQLString },
    reminderMinutes: { type: new GraphQLList(GraphQLInt) },
    metadata: { type: GraphQLString }, // JSON as string
  },
});

const CalendarFiltersInput = new GraphQLInputObjectType({
  name: 'CalendarFiltersInput',
  fields: {
    userId: { type: GraphQLInt },
    courseId: { type: GraphQLInt },
    type: { type: GraphQLString },
    startDate: { type: GraphQLString },
    endDate: { type: GraphQLString },
    includeAllDay: { type: GraphQLBoolean },
  },
});

// Helper function to map event to GraphQL response
const mapEventToGraphQL = (event: any) => ({
  ...event,
  startTime: event.startTime.toISOString(),
  endTime: event.endTime ? event.endTime.toISOString() : null,
  createdAt: event.createdAt.toISOString(),
  updatedAt: event.updatedAt.toISOString(),
  metadata: event.metadata ? JSON.stringify(event.metadata) : null,
  upcomingDeadlines: event.upcomingDeadlines ? {
    assignments: event.upcomingDeadlines.assignments?.map((assignment: any) => ({
      ...assignment,
      dueDate: assignment.dueDate.toISOString(),
    })) || [],
    quizzes: event.upcomingDeadlines.quizzes?.map((quiz: any) => ({
      ...quiz,
      dueDate: quiz.dueDate.toISOString(),
    })) || [],
  } : undefined,
});

// Queries
const calendarQueries = {
  calendarEvents: {
    type: new GraphQLList(CalendarEventType),
    args: {
      filters: { type: CalendarFiltersInput }
    },
    resolve: async (_: any, args: any, context: any) => {
      try {
        const filters = args.filters || {};
        
        // Parse date strings if provided
        if (filters.startDate) {
          filters.startDate = new Date(filters.startDate);
        }
        if (filters.endDate) {
          filters.endDate = new Date(filters.endDate);
        }

        const events = await calendarService.getEvents(filters);
        return events.map(mapEventToGraphQL);
      } catch (error) {
        throw new Error(`Failed to fetch calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  personalCalendar: {
    type: PersonalCalendarType,
    args: {
      userId: { type: new GraphQLNonNull(GraphQLInt) },
      startDate: { type: GraphQLString },
      endDate: { type: GraphQLString }
    },
    resolve: async (_: any, args: any) => {
      try {
        const startDate = args.startDate ? new Date(args.startDate) : undefined;
        const endDate = args.endDate ? new Date(args.endDate) : undefined;

        const calendar = await calendarService.getPersonalCalendar(args.userId, startDate, endDate);
        
        return {
          events: calendar.events.map(mapEventToGraphQL),
          upcomingDeadlines: {
            assignments: calendar.upcomingDeadlines.assignments.map(assignment => ({
              ...assignment,
              dueDate: assignment.dueDate.toISOString(),
            })),
            quizzes: calendar.upcomingDeadlines.quizzes.map(quiz => ({
              ...quiz,
              dueDate: quiz.dueDate.toISOString(),
            })),
          },
        };
      } catch (error) {
        throw new Error(`Failed to fetch personal calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  pendingReminders: {
    type: new GraphQLList(EventReminderType),
    resolve: async (_: any, args: any) => {
      try {
        const reminders = await calendarService.getPendingReminders();
        return reminders.map(reminder => ({
          ...reminder,
          reminderAt: reminder.reminderAt.toISOString(),
        }));
      } catch (error) {
        throw new Error(`Failed to fetch pending reminders: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },
};

// Mutations
const calendarMutations = {
  createCalendarEvent: {
    type: CalendarEventType,
    args: {
      createdBy: { type: new GraphQLNonNull(GraphQLInt) },
      eventData: { type: new GraphQLNonNull(CreateCalendarEventInput) }
    },
    resolve: async (_: any, args: any) => {
      try {
        const eventData = {
          ...args.eventData,
          startTime: new Date(args.eventData.startTime),
          endTime: args.eventData.endTime ? new Date(args.eventData.endTime) : undefined,
          metadata: args.eventData.metadata ? JSON.parse(args.eventData.metadata) : undefined,
        };

        const event = await calendarService.createEvent(args.createdBy, eventData);
        return mapEventToGraphQL(event);
      } catch (error) {
        throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  updateCalendarEvent: {
    type: CalendarEventType,
    args: {
      eventId: { type: new GraphQLNonNull(GraphQLInt) },
      userId: { type: new GraphQLNonNull(GraphQLInt) },
      eventData: { type: new GraphQLNonNull(UpdateCalendarEventInput) }
    },
    resolve: async (_: any, args: any) => {
      try {
        const eventData = {
          ...args.eventData,
          ...(args.eventData.startTime && { startTime: new Date(args.eventData.startTime) }),
          ...(args.eventData.endTime && { endTime: new Date(args.eventData.endTime) }),
          ...(args.eventData.metadata && { metadata: JSON.parse(args.eventData.metadata) }),
        };

        const event = await calendarService.updateEvent(args.eventId, args.userId, eventData);
        return mapEventToGraphQL(event);
      } catch (error) {
        throw new Error(`Failed to update calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  deleteCalendarEvent: {
    type: GraphQLString,
    args: {
      eventId: { type: new GraphQLNonNull(GraphQLInt) },
      userId: { type: new GraphQLNonNull(GraphQLInt) }
    },
    resolve: async (_: any, args: any) => {
      try {
        await calendarService.deleteEvent(args.eventId, args.userId);
        return 'Calendar event deleted successfully';
      } catch (error) {
        throw new Error(`Failed to delete calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  addEventAttendees: {
    type: GraphQLString,
    args: {
      eventId: { type: new GraphQLNonNull(GraphQLInt) },
      userIds: { type: new GraphQLNonNull(new GraphQLList(GraphQLInt)) }
    },
    resolve: async (_: any, args: any) => {
      try {
        await calendarService.addAttendees(args.eventId, args.userIds);
        return 'Attendees added successfully';
      } catch (error) {
        throw new Error(`Failed to add attendees: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  removeEventAttendees: {
    type: GraphQLString,
    args: {
      eventId: { type: new GraphQLNonNull(GraphQLInt) },
      userIds: { type: new GraphQLNonNull(new GraphQLList(GraphQLInt)) }
    },
    resolve: async (_: any, args: any) => {
      try {
        await calendarService.removeAttendees(args.eventId, args.userIds);
        return 'Attendees removed successfully';
      } catch (error) {
        throw new Error(`Failed to remove attendees: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  updateAttendeeStatus: {
    type: GraphQLString,
    args: {
      eventId: { type: new GraphQLNonNull(GraphQLInt) },
      userId: { type: new GraphQLNonNull(GraphQLInt) },
      status: { type: new GraphQLNonNull(GraphQLString) }
    },
    resolve: async (_: any, args: any) => {
      try {
        await calendarService.updateAttendeeStatus({
          eventId: args.eventId,
          userId: args.userId,
          status: args.status
        });
        return 'Attendee status updated successfully';
      } catch (error) {
        throw new Error(`Failed to update attendee status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  markReminderAsSent: {
    type: GraphQLString,
    args: {
      reminderId: { type: new GraphQLNonNull(GraphQLInt) }
    },
    resolve: async (_: any, args: any) => {
      try {
        await calendarService.markReminderAsSent(args.reminderId);
        return 'Reminder marked as sent successfully';
      } catch (error) {
        throw new Error(`Failed to mark reminder as sent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  createAutomaticDeadlineEvents: {
    type: GraphQLString,
    resolve: async (_: any, args: any) => {
      try {
        await calendarService.createAutomaticDeadlineEvents();
        return 'Automatic deadline events created successfully';
      } catch (error) {
        throw new Error(`Failed to create automatic deadline events: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },
};

export const calendarSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'CalendarQuery',
    fields: calendarQueries,
  }),
  mutation: new GraphQLObjectType({
    name: 'CalendarMutation',
    fields: calendarMutations,
  }),
});

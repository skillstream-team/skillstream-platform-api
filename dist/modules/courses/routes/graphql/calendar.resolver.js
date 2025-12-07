"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarSchema = void 0;
const graphql_1 = require("graphql");
const calendar_service_1 = require("../../services/calendar.service");
const calendarService = new calendar_service_1.CalendarService();
// User Type
const CalendarUserType = new graphql_1.GraphQLObjectType({
    name: 'CalendarUser',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        username: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        email: { type: graphql_1.GraphQLString },
    }),
});
// Course Type
const CalendarCourseType = new graphql_1.GraphQLObjectType({
    name: 'CalendarCourse',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
// Assignment Type
const CalendarAssignmentType = new graphql_1.GraphQLObjectType({
    name: 'CalendarAssignment',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
// Quiz Type
const CalendarQuizType = new graphql_1.GraphQLObjectType({
    name: 'CalendarQuiz',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
// Event Attendee Type
const EventAttendeeType = new graphql_1.GraphQLObjectType({
    name: 'EventAttendee',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        status: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        user: { type: CalendarUserType },
    }),
});
// Calendar Event Type
const CalendarEventType = new graphql_1.GraphQLObjectType({
    name: 'CalendarEvent',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        description: { type: graphql_1.GraphQLString },
        type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        startTime: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        endTime: { type: graphql_1.GraphQLString },
        isAllDay: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean) },
        location: { type: graphql_1.GraphQLString },
        courseId: { type: graphql_1.GraphQLInt },
        assignmentId: { type: graphql_1.GraphQLInt },
        quizId: { type: graphql_1.GraphQLInt },
        isRecurring: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean) },
        recurrenceRule: { type: graphql_1.GraphQLString },
        reminderMinutes: { type: new graphql_1.GraphQLList(graphql_1.GraphQLInt) },
        metadata: { type: graphql_1.GraphQLString }, // JSON as string
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        updatedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        creator: { type: CalendarUserType },
        course: { type: CalendarCourseType },
        assignment: { type: CalendarAssignmentType },
        quiz: { type: CalendarQuizType },
        attendees: { type: new graphql_1.GraphQLList(EventAttendeeType) },
    }),
});
// Upcoming Deadline Types
const UpcomingAssignmentType = new graphql_1.GraphQLObjectType({
    name: 'UpcomingAssignment',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        dueDate: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        courseTitle: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
const UpcomingQuizType = new graphql_1.GraphQLObjectType({
    name: 'UpcomingQuiz',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        dueDate: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        courseTitle: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
const UpcomingDeadlinesType = new graphql_1.GraphQLObjectType({
    name: 'UpcomingDeadlines',
    fields: () => ({
        assignments: { type: new graphql_1.GraphQLList(UpcomingAssignmentType) },
        quizzes: { type: new graphql_1.GraphQLList(UpcomingQuizType) },
    }),
});
// Personal Calendar Type
const PersonalCalendarType = new graphql_1.GraphQLObjectType({
    name: 'PersonalCalendar',
    fields: () => ({
        events: { type: new graphql_1.GraphQLList(CalendarEventType) },
        upcomingDeadlines: { type: UpcomingDeadlinesType },
    }),
});
// Event Reminder Type
const EventReminderType = new graphql_1.GraphQLObjectType({
    name: 'EventReminder',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        eventId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        reminderAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        isSent: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean) },
    }),
});
// Input Types
const CreateCalendarEventInput = new graphql_1.GraphQLInputObjectType({
    name: 'CreateCalendarEventInput',
    fields: {
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        description: { type: graphql_1.GraphQLString },
        type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        startTime: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        endTime: { type: graphql_1.GraphQLString },
        isAllDay: { type: graphql_1.GraphQLBoolean },
        location: { type: graphql_1.GraphQLString },
        courseId: { type: graphql_1.GraphQLInt },
        assignmentId: { type: graphql_1.GraphQLInt },
        quizId: { type: graphql_1.GraphQLInt },
        isRecurring: { type: graphql_1.GraphQLBoolean },
        recurrenceRule: { type: graphql_1.GraphQLString },
        reminderMinutes: { type: new graphql_1.GraphQLList(graphql_1.GraphQLInt) },
        attendeeIds: { type: new graphql_1.GraphQLList(graphql_1.GraphQLInt) },
        metadata: { type: graphql_1.GraphQLString }, // JSON as string
    },
});
const UpdateCalendarEventInput = new graphql_1.GraphQLInputObjectType({
    name: 'UpdateCalendarEventInput',
    fields: {
        title: { type: graphql_1.GraphQLString },
        description: { type: graphql_1.GraphQLString },
        startTime: { type: graphql_1.GraphQLString },
        endTime: { type: graphql_1.GraphQLString },
        isAllDay: { type: graphql_1.GraphQLBoolean },
        location: { type: graphql_1.GraphQLString },
        isRecurring: { type: graphql_1.GraphQLBoolean },
        recurrenceRule: { type: graphql_1.GraphQLString },
        reminderMinutes: { type: new graphql_1.GraphQLList(graphql_1.GraphQLInt) },
        metadata: { type: graphql_1.GraphQLString }, // JSON as string
    },
});
const CalendarFiltersInput = new graphql_1.GraphQLInputObjectType({
    name: 'CalendarFiltersInput',
    fields: {
        userId: { type: graphql_1.GraphQLInt },
        courseId: { type: graphql_1.GraphQLInt },
        type: { type: graphql_1.GraphQLString },
        startDate: { type: graphql_1.GraphQLString },
        endDate: { type: graphql_1.GraphQLString },
        includeAllDay: { type: graphql_1.GraphQLBoolean },
    },
});
// Helper function to map event to GraphQL response
const mapEventToGraphQL = (event) => ({
    ...event,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime ? event.endTime.toISOString() : null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    upcomingDeadlines: event.upcomingDeadlines ? {
        assignments: event.upcomingDeadlines.assignments?.map((assignment) => ({
            ...assignment,
            dueDate: assignment.dueDate.toISOString(),
        })) || [],
        quizzes: event.upcomingDeadlines.quizzes?.map((quiz) => ({
            ...quiz,
            dueDate: quiz.dueDate.toISOString(),
        })) || [],
    } : undefined,
});
// Queries
const calendarQueries = {
    calendarEvents: {
        type: new graphql_1.GraphQLList(CalendarEventType),
        args: {
            filters: { type: CalendarFiltersInput }
        },
        resolve: async (_, args, context) => {
            try {
                const filters = args.filters || {};
                // Parse date strings if provided
                if (filters.startDate) {
                    filters.startDate = new Date(filters.startDate);
                }
                if (filters.endDate) {
                    filters.endDate = new Date(filters.endDate);
                }
                const eventsResult = await calendarService.getEvents(filters);
                return eventsResult.data.map(mapEventToGraphQL);
            }
            catch (error) {
                throw new Error(`Failed to fetch calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    personalCalendar: {
        type: PersonalCalendarType,
        args: {
            userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            startDate: { type: graphql_1.GraphQLString },
            endDate: { type: graphql_1.GraphQLString }
        },
        resolve: async (_, args) => {
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
            }
            catch (error) {
                throw new Error(`Failed to fetch personal calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    pendingReminders: {
        type: new graphql_1.GraphQLList(EventReminderType),
        resolve: async (_, args) => {
            try {
                const reminders = await calendarService.getPendingReminders();
                return reminders.map(reminder => ({
                    ...reminder,
                    reminderAt: reminder.reminderAt.toISOString(),
                }));
            }
            catch (error) {
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
            createdBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            eventData: { type: new graphql_1.GraphQLNonNull(CreateCalendarEventInput) }
        },
        resolve: async (_, args) => {
            try {
                const eventData = {
                    ...args.eventData,
                    startTime: new Date(args.eventData.startTime),
                    endTime: args.eventData.endTime ? new Date(args.eventData.endTime) : undefined,
                    metadata: args.eventData.metadata ? JSON.parse(args.eventData.metadata) : undefined,
                };
                const event = await calendarService.createEvent(args.createdBy, eventData);
                return mapEventToGraphQL(event);
            }
            catch (error) {
                throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    updateCalendarEvent: {
        type: CalendarEventType,
        args: {
            eventId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            eventData: { type: new graphql_1.GraphQLNonNull(UpdateCalendarEventInput) }
        },
        resolve: async (_, args) => {
            try {
                const eventData = {
                    ...args.eventData,
                    ...(args.eventData.startTime && { startTime: new Date(args.eventData.startTime) }),
                    ...(args.eventData.endTime && { endTime: new Date(args.eventData.endTime) }),
                    ...(args.eventData.metadata && { metadata: JSON.parse(args.eventData.metadata) }),
                };
                const event = await calendarService.updateEvent(args.eventId, args.userId, eventData);
                return mapEventToGraphQL(event);
            }
            catch (error) {
                throw new Error(`Failed to update calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    deleteCalendarEvent: {
        type: graphql_1.GraphQLString,
        args: {
            eventId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) }
        },
        resolve: async (_, args) => {
            try {
                await calendarService.deleteEvent(args.eventId, args.userId);
                return 'Calendar event deleted successfully';
            }
            catch (error) {
                throw new Error(`Failed to delete calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    addEventAttendees: {
        type: graphql_1.GraphQLString,
        args: {
            eventId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            userIds: { type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(graphql_1.GraphQLInt)) }
        },
        resolve: async (_, args) => {
            try {
                await calendarService.addAttendees(args.eventId, args.userIds);
                return 'Attendees added successfully';
            }
            catch (error) {
                throw new Error(`Failed to add attendees: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    removeEventAttendees: {
        type: graphql_1.GraphQLString,
        args: {
            eventId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            userIds: { type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(graphql_1.GraphQLInt)) }
        },
        resolve: async (_, args) => {
            try {
                await calendarService.removeAttendees(args.eventId, args.userIds);
                return 'Attendees removed successfully';
            }
            catch (error) {
                throw new Error(`Failed to remove attendees: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    updateAttendeeStatus: {
        type: graphql_1.GraphQLString,
        args: {
            eventId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            status: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) }
        },
        resolve: async (_, args) => {
            try {
                await calendarService.updateAttendeeStatus({
                    eventId: args.eventId,
                    userId: args.userId,
                    status: args.status
                });
                return 'Attendee status updated successfully';
            }
            catch (error) {
                throw new Error(`Failed to update attendee status: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    markReminderAsSent: {
        type: graphql_1.GraphQLString,
        args: {
            reminderId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) }
        },
        resolve: async (_, args) => {
            try {
                await calendarService.markReminderAsSent(args.reminderId);
                return 'Reminder marked as sent successfully';
            }
            catch (error) {
                throw new Error(`Failed to mark reminder as sent: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    createAutomaticDeadlineEvents: {
        type: graphql_1.GraphQLString,
        resolve: async (_, args) => {
            try {
                await calendarService.createAutomaticDeadlineEvents();
                return 'Automatic deadline events created successfully';
            }
            catch (error) {
                throw new Error(`Failed to create automatic deadline events: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
};
exports.calendarSchema = new graphql_1.GraphQLSchema({
    query: new graphql_1.GraphQLObjectType({
        name: 'CalendarQuery',
        fields: calendarQueries,
    }),
    mutation: new graphql_1.GraphQLObjectType({
        name: 'CalendarMutation',
        fields: calendarMutations,
    }),
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const calendar_service_1 = require("../../services/calendar.service");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const router = (0, express_1.Router)();
const calendarService = new calendar_service_1.CalendarService();
/**
 * @swagger
 * /api/calendar/events:
 *   post:
 *     summary: Create a new calendar event
 *     tags: [Calendar]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *               - startTime
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [live_class, deadline, assignment_due, quiz_due, custom]
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               isAllDay:
 *                 type: boolean
 *               location:
 *                 type: string
 *               courseId:
 *                 type: integer
 *               assignmentId:
 *                 type: integer
 *               quizId:
 *                 type: integer
 *               isRecurring:
 *                 type: boolean
 *               recurrenceRule:
 *                 type: string
 *               reminderMinutes:
 *                 type: array
 *                 items:
 *                   type: integer
 *               attendeeIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/events', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const eventData = {
            ...req.body,
            startTime: new Date(req.body.startTime),
            endTime: req.body.endTime ? new Date(req.body.endTime) : undefined
        };
        const event = await calendarService.createEvent(userId, eventData);
        res.status(201).json({
            success: true,
            data: event
        });
    }
    catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});
/**
 * @swagger
 * /api/calendar/events/{eventId}:
 *   put:
 *     summary: Update a calendar event
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               isAllDay:
 *                 type: boolean
 *               location:
 *                 type: string
 *               isRecurring:
 *                 type: boolean
 *               recurrenceRule:
 *                 type: string
 *               reminderMinutes:
 *                 type: array
 *                 items:
 *                   type: integer
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.put('/events/:eventId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!eventId) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }
        const eventData = {
            ...req.body,
            ...(req.body.startTime && { startTime: new Date(req.body.startTime) }),
            ...(req.body.endTime && { endTime: new Date(req.body.endTime) })
        };
        const event = await calendarService.updateEvent(eventId, userId, eventData);
        res.json({
            success: true,
            data: event
        });
    }
    catch (error) {
        console.error('Error updating event:', error);
        if (error instanceof Error && error.message.includes('permission')) {
            res.status(403).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to update event' });
        }
    }
});
/**
 * @swagger
 * /api/calendar/events/{eventId}:
 *   delete:
 *     summary: Delete a calendar event
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.delete('/events/:eventId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!eventId) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }
        await calendarService.deleteEvent(eventId, userId);
        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting event:', error);
        if (error instanceof Error && error.message.includes('permission')) {
            res.status(403).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to delete event' });
        }
    }
});
/**
 * @swagger
 * /api/calendar/events:
 *   get:
 *     summary: Get calendar events with filters
 *     tags: [Calendar]
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *         description: Filter by course ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by event type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for date range filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for date range filter
 *       - in: query
 *         name: includeAllDay
 *         schema:
 *           type: boolean
 *         description: Include all-day events
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/events', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const filters = {
            userId,
            courseId: req.query.courseId ? req.query.courseId : undefined,
            type: req.query.type,
            startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
            endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            includeAllDay: req.query.includeAllDay ? req.query.includeAllDay === 'true' : undefined
        };
        const events = await calendarService.getEvents(filters);
        res.json({
            success: true,
            data: events,
            count: events.length
        });
    }
    catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});
/**
 * @swagger
 * /api/calendar/personal:
 *   get:
 *     summary: Get personal calendar for a student
 *     tags: [Calendar]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for date range filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for date range filter
 *     responses:
 *       200:
 *         description: Personal calendar retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/personal', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const calendar = await calendarService.getPersonalCalendar(userId, startDate, endDate);
        res.json({
            success: true,
            data: calendar
        });
    }
    catch (error) {
        console.error('Error fetching personal calendar:', error);
        res.status(500).json({ error: 'Failed to fetch personal calendar' });
    }
});
/**
 * @swagger
 * /api/calendar/events/{eventId}/attendees:
 *   post:
 *     summary: Add attendees to an event
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Attendees added successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/events/:eventId/attendees', auth_1.requireAuth, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const { userIds } = req.body;
        if (!eventId) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'userIds must be a non-empty array' });
        }
        await calendarService.addAttendees(eventId, userIds);
        res.json({
            success: true,
            message: 'Attendees added successfully'
        });
    }
    catch (error) {
        console.error('Error adding attendees:', error);
        res.status(500).json({ error: 'Failed to add attendees' });
    }
});
/**
 * @swagger
 * /api/calendar/events/{eventId}/attendees:
 *   delete:
 *     summary: Remove attendees from an event
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Attendees removed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.delete('/events/:eventId/attendees', auth_1.requireAuth, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const { userIds } = req.body;
        if (!eventId) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'userIds must be a non-empty array' });
        }
        await calendarService.removeAttendees(eventId, userIds);
        res.json({
            success: true,
            message: 'Attendees removed successfully'
        });
    }
    catch (error) {
        console.error('Error removing attendees:', error);
        res.status(500).json({ error: 'Failed to remove attendees' });
    }
});
/**
 * @swagger
 * /api/calendar/events/{eventId}/attendees/{userId}/status:
 *   put:
 *     summary: Update attendee status for an event
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, declined, maybe]
 *     responses:
 *       200:
 *         description: Attendee status updated successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.put('/events/:eventId/attendees/:userId/status', auth_1.requireAuth, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const userId = req.params.userId;
        const { status } = req.body;
        if (!eventId || !userId) {
            return res.status(400).json({ error: 'Invalid event ID or user ID' });
        }
        if (!['accepted', 'declined', 'maybe'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        await calendarService.updateAttendeeStatus({ eventId, userId, status });
        res.json({
            success: true,
            message: 'Attendee status updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating attendee status:', error);
        res.status(500).json({ error: 'Failed to update attendee status' });
    }
});
/**
 * @swagger
 * /api/calendar/reminders/pending:
 *   get:
 *     summary: Get pending reminders (admin only)
 *     tags: [Calendar]
 *     responses:
 *       200:
 *         description: Pending reminders retrieved successfully
 *       403:
 *         description: Permission denied
 *       500:
 *         description: Server error
 */
router.get('/reminders/pending', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const reminders = await calendarService.getPendingReminders();
        res.json({
            success: true,
            data: reminders,
            count: reminders.length
        });
    }
    catch (error) {
        console.error('Error fetching pending reminders:', error);
        res.status(500).json({ error: 'Failed to fetch pending reminders' });
    }
});
/**
 * @swagger
 * /api/calendar/reminders/{reminderId}/sent:
 *   put:
 *     summary: Mark reminder as sent (admin only)
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: reminderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Reminder ID
 *     responses:
 *       200:
 *         description: Reminder marked as sent successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Permission denied
 *       500:
 *         description: Server error
 */
router.put('/reminders/:reminderId/sent', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const reminderId = req.params.reminderId;
        if (!reminderId) {
            return res.status(400).json({ error: 'Invalid reminder ID' });
        }
        await calendarService.markReminderAsSent(reminderId);
        res.json({
            success: true,
            message: 'Reminder marked as sent successfully'
        });
    }
    catch (error) {
        console.error('Error marking reminder as sent:', error);
        res.status(500).json({ error: 'Failed to mark reminder as sent' });
    }
});
/**
 * @swagger
 * /api/calendar/sync-deadlines:
 *   post:
 *     summary: Create automatic deadline events (admin only)
 *     tags: [Calendar]
 *     responses:
 *       200:
 *         description: Deadline events created successfully
 *       403:
 *         description: Permission denied
 *       500:
 *         description: Server error
 */
router.post('/sync-deadlines', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        await calendarService.createAutomaticDeadlineEvents();
        res.json({
            success: true,
            message: 'Automatic deadline events created successfully'
        });
    }
    catch (error) {
        console.error('Error creating automatic deadline events:', error);
        res.status(500).json({ error: 'Failed to create automatic deadline events' });
    }
});
exports.default = router;

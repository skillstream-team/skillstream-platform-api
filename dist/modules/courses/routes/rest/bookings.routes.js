"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const prisma_1 = require("../../../../utils/prisma");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/teachers/{teacherId}/availability:
 *   get:
 *     summary: Get teacher availability
 *     tags: [Bookings]
 */
router.get('/teachers/:teacherId/availability', auth_1.requireAuth, async (req, res) => {
    try {
        const { teacherId } = req.params;
        const availability = await prisma_1.prisma.teacherAvailability.findMany({
            where: {
                teacherId,
                isActive: true
            },
            include: {
                slots: {
                    where: { isAvailable: true },
                    orderBy: { startTime: 'asc' }
                }
            },
            orderBy: { startTime: 'asc' }
        });
        res.json({
            success: true,
            data: availability
        });
    }
    catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});
/**
 * @swagger
 * /api/teachers/{teacherId}/availability:
 *   post:
 *     summary: Create or update teacher availability
 *     tags: [Bookings]
 */
router.post('/teachers/:teacherId/availability', auth_1.requireAuth, (0, roles_1.requireRole)('Teacher'), async (req, res) => {
    try {
        const { teacherId } = req.params;
        const userId = req.user?.id;
        if (userId !== teacherId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const availability = await prisma_1.prisma.teacherAvailability.create({
            data: {
                teacherId,
                ...req.body,
                startTime: new Date(req.body.startTime),
                endTime: new Date(req.body.endTime)
            }
        });
        res.status(201).json({
            success: true,
            data: availability
        });
    }
    catch (error) {
        console.error('Error creating availability:', error);
        res.status(500).json({ error: 'Failed to create availability' });
    }
});
/**
 * @swagger
 * /api/teachers/{teacherId}/availability/{availabilityId}:
 *   delete:
 *     summary: Delete availability block
 *     tags: [Bookings]
 */
router.delete('/teachers/:teacherId/availability/:availabilityId', auth_1.requireAuth, (0, roles_1.requireRole)('Teacher'), async (req, res) => {
    try {
        const { teacherId, availabilityId } = req.params;
        const userId = req.user?.id;
        if (userId !== teacherId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        await prisma_1.prisma.teacherAvailability.delete({
            where: { id: availabilityId }
        });
        res.json({
            success: true,
            message: 'Availability deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting availability:', error);
        res.status(500).json({ error: 'Failed to delete availability' });
    }
});
/**
 * @swagger
 * /api/lesson-slots:
 *   get:
 *     summary: Get available lesson slots
 *     tags: [Bookings]
 */
router.get('/lesson-slots', auth_1.requireAuth, async (req, res) => {
    try {
        const { date, subject, teacherId } = req.query;
        const where = {
            isAvailable: true,
            isBooked: false
        };
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
            where.startTime = {
                gte: startDate,
                lt: endDate
            };
        }
        if (subject) {
            where.subject = subject;
        }
        if (teacherId) {
            where.teacherId = teacherId;
        }
        const slots = await prisma_1.prisma.lessonSlot.findMany({
            where,
            include: {
                teacher: {
                    select: { id: true, username: true, email: true }
                },
                availability: true
            },
            orderBy: { startTime: 'asc' }
        });
        res.json({
            success: true,
            data: slots
        });
    }
    catch (error) {
        console.error('Error fetching slots:', error);
        res.status(500).json({ error: 'Failed to fetch slots' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/bookings:
 *   get:
 *     summary: Get user's bookings
 *     tags: [Bookings]
 */
router.get('/users/:userId/bookings', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const bookings = await prisma_1.prisma.booking.findMany({
            where: { studentId: userId },
            include: {
                slot: {
                    include: {
                        teacher: {
                            select: { id: true, username: true, email: true }
                        }
                    }
                },
                teacher: {
                    select: { id: true, username: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            data: bookings
        });
    }
    catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});
/**
 * @swagger
 * /api/lesson-slots/{slotId}/bookings:
 *   post:
 *     summary: Book a lesson slot
 *     tags: [Bookings]
 */
router.post('/lesson-slots/:slotId/bookings', auth_1.requireAuth, async (req, res) => {
    try {
        const { slotId } = req.params;
        const userId = req.user?.id;
        // Check if slot is available
        const slot = await prisma_1.prisma.lessonSlot.findUnique({
            where: { id: slotId },
            include: { booking: true }
        });
        if (!slot || !slot.isAvailable || slot.isBooked) {
            return res.status(400).json({ error: 'Slot is not available' });
        }
        // Create booking
        const booking = await prisma_1.prisma.booking.create({
            data: {
                slotId,
                studentId: userId,
                teacherId: slot.teacherId,
                subject: req.body.subject || slot.subject,
                notes: req.body.notes,
                joinLink: req.body.joinLink,
                meetingId: req.body.meetingId
            },
            include: {
                slot: true,
                teacher: {
                    select: { id: true, username: true, email: true }
                }
            }
        });
        // Update slot as booked
        await prisma_1.prisma.lessonSlot.update({
            where: { id: slotId },
            data: { isBooked: true }
        });
        res.status(201).json({
            success: true,
            data: booking
        });
    }
    catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});
/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   delete:
 *     summary: Cancel a booking
 *     tags: [Bookings]
 */
router.delete('/bookings/:bookingId', auth_1.requireAuth, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.id;
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { slot: true }
        });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        if (booking.studentId !== userId && booking.teacherId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        // Update booking status
        await prisma_1.prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: 'cancelled',
                cancelledAt: new Date()
            }
        });
        // Make slot available again
        await prisma_1.prisma.lessonSlot.update({
            where: { id: booking.slotId },
            data: { isBooked: false }
        });
        res.json({
            success: true,
            message: 'Booking cancelled successfully'
        });
    }
    catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});
exports.default = router;

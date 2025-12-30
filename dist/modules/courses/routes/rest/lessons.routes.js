"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const subscription_1 = require("../../../../middleware/subscription");
const prisma_1 = require("../../../../utils/prisma");
const email_service_1 = require("../../../users/services/email.service");
const service_1 = require("../../services/service");
const router = (0, express_1.Router)();
const service = new service_1.CoursesService();
/**
 * @swagger
 * /api/lessons/quick:
 *   post:
 *     summary: Create a quick lesson
 *     tags: [Lessons]
 */
router.post('/lessons/quick', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const { title, description, teacherId, scheduledAt, subject, duration, price, invitedStudents, // Can be array of usernames or emails
        maxStudents } = req.body;
        // Validate scheduledAt is at least 24 hours in the future if price is set
        if (price && price > 0) {
            const lessonTime = new Date(scheduledAt);
            const now = new Date();
            const minTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
            if (lessonTime <= minTime) {
                return res.status(400).json({
                    error: 'Lessons with payment must be scheduled at least 24 hours in advance'
                });
            }
        }
        // Resolve student usernames/emails to IDs
        let invitedStudentIds = [];
        if (invitedStudents && Array.isArray(invitedStudents) && invitedStudents.length > 0) {
            // Find students by username or email
            const students = await prisma_1.prisma.user.findMany({
                where: {
                    OR: [
                        { username: { in: invitedStudents } },
                        { email: { in: invitedStudents } },
                    ],
                    role: 'STUDENT',
                },
                select: { id: true, username: true, email: true },
            });
            if (students.length !== invitedStudents.length) {
                const foundIdentifiers = new Set([
                    ...students.map(s => s.username),
                    ...students.map(s => s.email),
                ]);
                const missing = invitedStudents.filter((identifier) => !foundIdentifiers.has(identifier));
                return res.status(400).json({
                    error: `One or more students not found: ${missing.join(', ')}. Please use username or email address.`
                });
            }
            invitedStudentIds = students.map(s => s.id);
        }
        // Generate join link and meeting ID (you can integrate with video service here)
        const joinLink = `https://meet.skillstream.com/${Date.now()}`;
        const meetingId = `meeting-${Date.now()}`;
        const quickLesson = await prisma_1.prisma.quickLesson.create({
            data: {
                title,
                description,
                teacherId: teacherId || userId,
                scheduledAt: new Date(scheduledAt),
                subject,
                duration,
                price: price || 0,
                invitedStudentIds: invitedStudentIds || [],
                maxStudents: maxStudents || undefined,
                joinLink,
                meetingId,
                status: 'scheduled'
            },
            include: {
                teacher: {
                    select: { id: true, username: true, email: true }
                }
            }
        });
        // Get teacher info for email
        const teacher = await prisma_1.prisma.user.findUnique({
            where: { id: quickLesson.teacherId },
            select: { id: true, username: true, email: true }
        });
        // Send invitation emails to students if price is set
        if (price && price > 0 && invitedStudentIds && invitedStudentIds.length > 0) {
            try {
                const students = await prisma_1.prisma.user.findMany({
                    where: { id: { in: invitedStudentIds } },
                    select: { id: true, email: true, username: true },
                });
                const paymentDeadline = new Date(new Date(scheduledAt).getTime() - 24 * 60 * 60 * 1000);
                for (const student of students) {
                    await email_service_1.emailService.sendEmail(student.email, `Invitation to Lesson: ${title}`, `
              <h2>You've been invited to a lesson!</h2>
              <p>${teacher?.username || 'A teacher'} has invited you to attend a lesson.</p>
              <h3>Lesson Details:</h3>
              <ul>
                <li><strong>Title:</strong> ${title}</li>
                <li><strong>Subject:</strong> ${subject || 'N/A'}</li>
                <li><strong>Scheduled:</strong> ${new Date(scheduledAt).toLocaleString()}</li>
                <li><strong>Duration:</strong> ${duration || 'N/A'} minutes</li>
                <li><strong>Price:</strong> $${price}</li>
                <li><strong>Payment Deadline:</strong> ${paymentDeadline.toLocaleString()}</li>
              </ul>
              <p><strong>Important:</strong> Payment must be completed at least 24 hours before the lesson time.</p>
              <p>Please complete your payment to confirm your attendance.</p>
            `);
                }
            }
            catch (error) {
                console.error('Error sending invitation emails:', error);
                // Don't fail the request if email fails
            }
        }
        res.status(201).json({
            success: true,
            data: quickLesson
        });
    }
    catch (error) {
        console.error('Error creating quick lesson:', error);
        res.status(500).json({ error: 'Failed to create quick lesson' });
    }
});
/**
 * @swagger
 * /api/lessons/{id}:
 *   get:
 *     summary: Get a single lesson by ID
 *     tags: [Lessons]
 */
router.get('/lessons/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('GET /api/lessons/:id called with id:', id);
        const lesson = await prisma_1.prisma.lesson.findUnique({
            where: { id },
            select: {
                id: true,
                courseId: true,
                title: true,
                content: true,
                order: true,
                scheduledAt: true,
                teacherId: true,
                duration: true,
                joinLink: true,
                meetingId: true,
                status: true,
                isPreview: true,
                createdAt: true,
                updatedAt: true,
                quizzes: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                    },
                },
            },
        });
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        // Extract description and moduleId from content if they exist
        const content = lesson.content;
        const description = content?.description || '';
        const moduleId = content?.moduleId || '';
        res.json({
            ...lesson,
            description,
            moduleId,
        });
    }
    catch (error) {
        console.error('Error fetching lesson:', error);
        res.status(500).json({ error: 'Failed to fetch lesson' });
    }
});
/**
 * @swagger
 * /api/lessons:
 *   get:
 *     summary: Get lessons (for teacher or student)
 *     tags: [Lessons]
 */
router.get('/lessons', auth_1.requireAuth, subscription_1.requireSubscription, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { role, status } = req.query;
        const whereQuick = {};
        const whereRegular = {};
        if (role === 'TEACHER') {
            whereQuick.teacherId = userId;
            whereRegular.teacherId = userId;
        }
        else if (role === 'STUDENT') {
            // For students, get lessons they're invited to
            whereQuick.invitedStudentIds = { has: userId };
            // For students, get lessons from bookings
            const bookings = await prisma_1.prisma.booking.findMany({
                where: {
                    studentId: userId,
                    status: { not: 'cancelled' }
                },
                include: {
                    slot: true
                }
            });
            // Can filter by booking slots if needed
        }
        // Apply status filters
        if (status === 'upcoming') {
            whereQuick.scheduledAt = { gte: new Date() };
            whereQuick.status = 'scheduled';
            whereRegular.scheduledAt = { gte: new Date() };
            whereRegular.status = 'scheduled';
        }
        else if (status === 'past') {
            whereQuick.scheduledAt = { lt: new Date() };
            whereQuick.status = { in: ['completed', 'cancelled'] };
            whereRegular.scheduledAt = { lt: new Date() };
            whereRegular.status = { in: ['completed', 'cancelled'] };
        }
        else if (status) {
            whereQuick.status = status;
            whereRegular.status = status;
        }
        // Get quick lessons
        const quickLessons = await prisma_1.prisma.quickLesson.findMany({
            where: whereQuick,
            include: {
                teacher: {
                    select: { id: true, username: true, email: true }
                }
            },
            orderBy: { scheduledAt: 'asc' }
        });
        // Get regular lessons (from courses) - only if scheduledAt exists
        const regularLessonsQuery = {
            where: whereRegular,
            include: {
                course: {
                    select: { id: true, title: true }
                }
            }
        };
        // Only add orderBy if scheduledAt field exists
        try {
            regularLessonsQuery.orderBy = { scheduledAt: 'asc' };
        }
        catch (e) {
            // Field doesn't exist, skip ordering
        }
        const regularLessons = await prisma_1.prisma.lesson.findMany(regularLessonsQuery).catch(() => []);
        res.json({
            success: true,
            data: {
                quickLessons,
                regularLessons
            }
        });
    }
    catch (error) {
        console.error('Error fetching lessons:', error);
        res.status(500).json({ error: 'Failed to fetch lessons' });
    }
});
/**
 * @swagger
 * /api/lessons/{id}:
 *   put:
 *     summary: Update a lesson
 *     tags: [Lessons]
 */
router.put('/lessons/:id', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, order, duration, isPreview, moduleId } = req.body;
        // Get lesson to find courseId for cache invalidation
        const existingLesson = await prisma_1.prisma.lesson.findUnique({
            where: { id },
            select: { courseId: true, content: true },
        });
        if (!existingLesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        // Build update data
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (order !== undefined)
            updateData.order = order;
        if (duration !== undefined)
            updateData.duration = duration;
        if (isPreview !== undefined)
            updateData.isPreview = isPreview;
        // Handle content JSON (description and moduleId)
        const existingContent = existingLesson.content || {};
        const contentUpdate = { ...existingContent };
        if (description !== undefined)
            contentUpdate.description = description;
        if (moduleId !== undefined)
            contentUpdate.moduleId = moduleId;
        updateData.content = contentUpdate;
        // Update lesson using service
        const updatedLesson = await service.updateLesson(id, updateData);
        // Invalidate cache
        const { deleteCache, cacheKeys } = await Promise.resolve().then(() => __importStar(require('../../../../utils/cache')));
        await deleteCache(cacheKeys.course(existingLesson.courseId));
        // Extract description and moduleId from content for response
        const content = updatedLesson.content;
        res.json({
            ...updatedLesson,
            description: content?.description || '',
            moduleId: content?.moduleId || '',
        });
    }
    catch (error) {
        console.error('Error updating lesson:', error);
        res.status(500).json({ error: 'Failed to update lesson' });
    }
});
/**
 * @swagger
 * /api/lessons/{id}:
 *   delete:
 *     summary: Delete a lesson
 *     tags: [Lessons]
 */
router.delete('/lessons/:id', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const { id } = req.params;
        // Get lesson to find courseId for cache invalidation
        const lesson = await prisma_1.prisma.lesson.findUnique({
            where: { id },
            select: { courseId: true },
        });
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        await prisma_1.prisma.lesson.delete({ where: { id } });
        // Invalidate cache
        const { deleteCache } = await Promise.resolve().then(() => __importStar(require('../../../../utils/cache')));
        const { cacheKeys } = await Promise.resolve().then(() => __importStar(require('../../../../utils/cache')));
        await deleteCache(cacheKeys.course(lesson.courseId));
        res.json({ success: true, message: 'Lesson deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting lesson:', error);
        res.status(500).json({ error: 'Failed to delete lesson' });
    }
});
exports.default = router;

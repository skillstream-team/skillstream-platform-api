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
const prisma_1 = require("../../../../utils/prisma");
const logger_1 = require("../../../../utils/logger");
const email_service_1 = require("../../../users/services/email.service");
const service_1 = require("../../services/service");
const monetization_service_1 = require("../../services/monetization.service");
const router = (0, express_1.Router)();
const service = new service_1.ProgramsService();
/**
 * @swagger
 * /api/modules/quick:
 *   post:
 *     summary: Create a quick module
 *     tags: [Modules]
 */
router.post('/modules/quick', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
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
                    error: 'Modules with payment must be scheduled at least 24 hours in advance'
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
        const quickModule = await prisma_1.prisma.quickModule.create({
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
            where: { id: quickModule.teacherId },
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
                    await email_service_1.emailService.sendEmail(student.email, `Invitation to Module: ${title}`, `
              <h2>You've been invited to a module!</h2>
              <p>${teacher?.username || 'A teacher'} has invited you to attend a module.</p>
              <h3>Module Details:</h3>
              <ul>
                <li><strong>Title:</strong> ${title}</li>
                <li><strong>Subject:</strong> ${subject || 'N/A'}</li>
                <li><strong>Scheduled:</strong> ${new Date(scheduledAt).toLocaleString()}</li>
                <li><strong>Duration:</strong> ${duration || 'N/A'} minutes</li>
                <li><strong>Price:</strong> $${price}</li>
                <li><strong>Payment Deadline:</strong> ${paymentDeadline.toLocaleString()}</li>
              </ul>
              <p><strong>Important:</strong> Payment must be completed at least 24 hours before the module time.</p>
              <p>Please complete your payment to confirm your attendance.</p>
            `);
                }
            }
            catch (error) {
                logger_1.logger.error('Error sending invitation emails', error);
                // Don't fail the request if email fails
            }
        }
        res.status(201).json({
            success: true,
            data: quickModule
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating quick module', error);
        res.status(500).json({ error: 'Failed to create quick module' });
    }
});
/**
 * @swagger
 * /api/modules:
 *   post:
 *     summary: Create a standalone module
 *     tags: [Modules]
 */
router.post('/modules', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const { title, description, duration, price, isPreview, content } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }
        if (price === undefined || price === null) {
            return res.status(400).json({ error: 'Price is required' });
        }
        if (typeof price !== 'number' || price < 0) {
            return res.status(400).json({ error: 'Price must be a non-negative number' });
        }
        // Build content JSON
        const moduleContent = content || {};
        if (description) {
            moduleContent.description = description;
        }
        // Create standalone module
        const module = await prisma_1.prisma.module.create({
            data: {
                title: title.trim(),
                content: moduleContent,
                duration: duration || null,
                price: price || 0,
                isPreview: isPreview || false,
                teacherId: userId,
                order: 0,
                status: 'scheduled', // Default status for content lessons
            },
        });
        // Extract description from content for response
        const responseContent = module.content;
        res.status(201).json({
            ...module,
            description: responseContent?.description || '',
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating module', error);
        res.status(500).json({ error: 'Failed to create module' });
    }
});
/**
 * @swagger
 * /api/modules/{id}:
 *   get:
 *     summary: Get a single module by ID
 *     tags: [Modules]
 */
router.get('/modules/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        logger_1.logger.info(`GET /api/modules/:id called with id: ${id}`);
        const module = await prisma_1.prisma.module.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                content: true,
                order: true,
                scheduledAt: true,
                teacherId: true,
                duration: true,
                price: true,
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
        if (!module) {
            return res.status(404).json({ error: 'Module not found' });
        }
        // Extract description and sectionId from content if they exist
        const content = module.content;
        const description = content?.description || '';
        const sectionId = content?.sectionId || '';
        res.json({
            ...module,
            description,
            sectionId,
            studentPrice: (0, monetization_service_1.getStudentPrice)(module.price ?? 0),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching module', error);
        res.status(500).json({ error: 'Failed to fetch module' });
    }
});
/**
 * @swagger
 * /api/modules:
 *   get:
 *     summary: Get modules (for teacher or student)
 *     tags: [Modules]
 */
router.get('/modules', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { role, status } = req.query;
        // Use role from query param if provided, otherwise use authenticated user's role
        const effectiveRole = role || userRole;
        const whereQuick = {};
        const whereRegular = {};
        if (effectiveRole === 'TEACHER') {
            whereQuick.teacherId = userId;
            whereRegular.teacherId = userId;
        }
        else if (effectiveRole === 'STUDENT' || !effectiveRole) {
            // If role is STUDENT or not specified, treat as student browsing
            // For students, get lessons they're invited to
            whereQuick.invitedStudentIds = { has: userId };
            // For students, get lessons from bookings
            const bookings = await prisma_1.prisma.booking.findMany({
                where: {
                    studentId: userId
                    // Note: Booking model may not have a status field - adjust based on schema
                },
                include: {
                    slot: true
                }
            });
            // Also get modules from programs the student is enrolled in
            // Note: Enrollment model doesn't have a status field, so we get all enrollments
            const enrollments = await prisma_1.prisma.enrollment.findMany({
                where: {
                    studentId: userId
                },
                select: { programId: true }
            });
            const enrolledProgramIds = enrollments.map(e => e.programId);
            // Get modules from enrolled programs
            if (enrolledProgramIds.length > 0) {
                const programModules = await prisma_1.prisma.programModule.findMany({
                    where: {
                        programId: { in: enrolledProgramIds }
                    },
                    select: { moduleId: true }
                });
                const moduleIds = programModules.map(pm => pm.moduleId);
                if (moduleIds.length > 0) {
                    // Store module IDs for later use in query
                    whereRegular.enrolledModuleIds = moduleIds;
                }
            }
            // If no enrolled modules, show all modules for browsing
            // Students should be able to see all modules to browse and see costs
            if (!whereRegular.enrolledModuleIds) {
                // Don't set any filters - show all modules
                // whereRegular remains empty {} which will return all modules
            }
        }
        else {
            // No role specified or other role - show all lessons for browsing
            // whereRegular remains empty {} which will return all lessons
        }
        // Apply status filters
        if (status === 'upcoming') {
            whereQuick.scheduledAt = { gte: new Date() };
            whereQuick.status = 'scheduled';
            // For regular modules, include both scheduled modules with future dates AND standalone modules (no scheduledAt)
            const statusConditions = [
                { scheduledAt: { gte: new Date() }, status: 'scheduled' },
                { scheduledAt: null, status: 'scheduled' } // Standalone content modules
            ];
            // If student has enrolled modules, add them separately to whereRegular
            // Note: enrolledModuleIds are for regular Module model, not QuickModule
            // Regular Module doesn't have scheduledAt or status fields like QuickModule
            // So we handle enrolled modules separately - they should be shown regardless of status
            if (whereRegular.enrolledModuleIds) {
                const enrolledModuleIds = whereRegular.enrolledModuleIds;
                delete whereRegular.enrolledModuleIds;
                // For enrolled modules, we want to show them regardless of status
                // So we add them as a simple id filter
                whereRegular.id = { in: enrolledModuleIds };
                // Don't apply status conditions to enrolled modules since they're regular Module type
            }
            else {
                // No enrolled modules, apply status conditions for QuickModule compatibility
                // But regular Module doesn't have these fields, so we don't apply them
                // whereRegular remains empty {} to show all modules
            }
        }
        else if (status === 'past') {
            whereQuick.scheduledAt = { lt: new Date() };
            whereQuick.status = { in: ['completed', 'cancelled'] };
            // Regular Module doesn't have scheduledAt or status fields
            // If student has enrolled modules, show them by ID only
            if (whereRegular.enrolledModuleIds) {
                const enrolledModuleIds = whereRegular.enrolledModuleIds;
                delete whereRegular.enrolledModuleIds;
                whereRegular.id = { in: enrolledModuleIds };
            }
            // Don't apply status conditions to whereRegular since Module model doesn't have these fields
        }
        else if (status) {
            whereQuick.status = status;
            // Regular Module doesn't have status field
            // If student has enrolled modules, show them by ID only
            if (whereRegular.enrolledModuleIds) {
                const enrolledModuleIds = whereRegular.enrolledModuleIds;
                delete whereRegular.enrolledModuleIds;
                whereRegular.id = { in: enrolledModuleIds };
            }
            // Don't apply status conditions to whereRegular since Module model doesn't have status field
        }
        else {
            // No status filter
            if (whereRegular.enrolledModuleIds) {
                // Student has enrolled modules - show only those
                const enrolledModuleIds = whereRegular.enrolledModuleIds;
                delete whereRegular.enrolledModuleIds;
                // For enrolled modules, filter by ID only (regular Module doesn't have status/scheduledAt)
                whereRegular.id = { in: enrolledModuleIds };
            }
            else {
                // No enrolled modules or not a student - show all modules for browsing
                // Clear whereRegular to return all modules
                Object.keys(whereRegular).forEach(key => delete whereRegular[key]);
            }
        }
        // Get quick modules
        const quickModules = await prisma_1.prisma.quickModule.findMany({
            where: whereQuick,
            include: {
                teacher: {
                    select: { id: true, username: true, email: true }
                }
            },
            orderBy: { scheduledAt: 'asc' }
        });
        // Get regular modules (standalone or from programs)
        // If whereRegular is empty, it means show all modules (for browsing)
        // Prisma requires undefined (not empty object) to return all records
        const hasFilters = Object.keys(whereRegular).length > 0;
        const regularModulesQuery = {
            where: hasFilters ? whereRegular : undefined,
            orderBy: { createdAt: 'desc' }, // Sort by creation date (newest first)
            include: {
            // Include teacher information if teacherId exists
            // Note: Module model has teacherId but no relation, so we'll fetch it separately
            },
        };
        logger_1.logger.info(`Modules query - role: ${role || 'not specified'}, effectiveRole: ${effectiveRole}, hasFilters: ${hasFilters}, whereRegular keys: ${Object.keys(whereRegular).join(', ')}`);
        const regularModulesRaw = await prisma_1.prisma.module.findMany(regularModulesQuery).catch((err) => {
            logger_1.logger.error('Error fetching regular modules', err);
            return [];
        });
        // Fetch teacher information for modules that have teacherId
        const regularModules = await Promise.all(regularModulesRaw.map(async (module) => {
            if (module.teacherId) {
                try {
                    const teacher = await prisma_1.prisma.user.findUnique({
                        where: { id: module.teacherId },
                        select: { id: true, username: true, email: true, firstName: true, lastName: true },
                    });
                    return {
                        ...module,
                        teacher: teacher || null,
                    };
                }
                catch (error) {
                    logger_1.logger.error(`Error fetching teacher for module ${module.id}`, error);
                    return { ...module, teacher: null };
                }
            }
            return { ...module, teacher: null };
        }));
        logger_1.logger.info(`Found ${regularModules.length} regular modules`);
        const regularModulesWithStudentPrice = regularModules.map((m) => ({
            ...m,
            studentPrice: (0, monetization_service_1.getStudentPrice)(m.price ?? 0),
        }));
        const quickModulesWithStudentPrice = quickModules.map((m) => ({
            ...m,
            studentPrice: (0, monetization_service_1.getStudentPrice)(m.price ?? 0),
        }));
        res.json({
            success: true,
            data: {
                quickModules: quickModulesWithStudentPrice,
                regularModules: regularModulesWithStudentPrice,
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching modules', error);
        res.status(500).json({ error: 'Failed to fetch modules' });
    }
});
/**
 * @swagger
 * /api/lessons/{id}:
 *   put:
 *     summary: Update a lesson
 *     tags: [Lessons]
 */
router.put('/modules/:id', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, order, duration, price, isPreview, moduleId } = req.body;
        // Get module to check if it exists
        const existingModule = await prisma_1.prisma.module.findUnique({
            where: { id },
            select: { content: true },
        });
        if (!existingModule) {
            return res.status(404).json({ error: 'Module not found' });
        }
        // Build update data
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (order !== undefined)
            updateData.order = order;
        if (duration !== undefined)
            updateData.duration = duration;
        if (price !== undefined) {
            if (typeof price !== 'number' || price < 0) {
                return res.status(400).json({ error: 'Price must be a non-negative number' });
            }
            updateData.price = price;
        }
        if (isPreview !== undefined)
            updateData.isPreview = isPreview;
        // Handle content JSON (description and sectionId)
        const existingContent = existingModule.content || {};
        const contentUpdate = { ...existingContent };
        if (description !== undefined)
            contentUpdate.description = description;
        if (moduleId !== undefined)
            contentUpdate.sectionId = moduleId;
        updateData.content = contentUpdate;
        // Update module using service (this will handle cache invalidation for programs)
        const updatedModule = await service.updateModule(id, updateData);
        // Extract description and sectionId from content for response
        const content = updatedModule.content;
        res.json({
            ...updatedModule,
            description: content?.description || '',
            sectionId: content?.sectionId || '',
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating module', error);
        res.status(500).json({ error: 'Failed to update module' });
    }
});
/**
 * @swagger
 * /api/modules/{id}:
 *   delete:
 *     summary: Delete a module
 *     tags: [Modules]
 */
router.delete('/modules/:id', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const { id } = req.params;
        // Check if module exists and get programs it belongs to for cache invalidation
        const programModules = await prisma_1.prisma.programModule.findMany({
            where: { moduleId: id },
            select: { programId: true },
        });
        const module = await prisma_1.prisma.module.findUnique({
            where: { id },
        });
        if (!module) {
            return res.status(404).json({ error: 'Module not found' });
        }
        await prisma_1.prisma.module.delete({ where: { id } });
        // Invalidate cache for all programs this module belonged to
        const { deleteCache, cacheKeys } = await Promise.resolve().then(() => __importStar(require('../../../../utils/cache')));
        await Promise.all(programModules.map(pm => deleteCache(cacheKeys.program(pm.programId))));
        res.json({ success: true, message: 'Module deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error deleting module', error);
        res.status(500).json({ error: 'Failed to delete module' });
    }
});
exports.default = router;

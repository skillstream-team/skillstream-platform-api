"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const enrollment_service_1 = require("../../services/enrollment.service");
const auth_1 = require("../../../../middleware/auth");
const subscription_1 = require("../../../../middleware/subscription");
const prisma_1 = require("../../../../utils/prisma");
const cache_1 = require("../../../../utils/cache");
const router = (0, express_1.Router)();
const enrollmentService = new enrollment_service_1.EnrollmentService();
/**
 * @swagger
 * /api/enrollments:
 *   get:
 *     summary: Get current user's enrollments
 *     description: Returns a paginated list of courses the authenticated student is enrolled in
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: collectionId
 *         schema:
 *           type: string
 *         description: Filter by course ID
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *         description: Filter by student ID (admin/teacher only)
 *     responses:
 *       200:
 *         description: List of enrollments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enrollments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Enrollment'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const programIdFilter = (req.query.programId ?? req.query.collectionId);
        const studentIdParam = req.query.studentId;
        let studentId = user.id;
        if (studentIdParam && (user.role === 'ADMIN' || user.role === 'TEACHER')) {
            studentId = studentIdParam;
        }
        const where = { studentId };
        if (programIdFilter) {
            where.programId = programIdFilter;
        }
        const skip = (page - 1) * limit;
        const take = limit;
        const include = {
            program: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    price: true,
                    thumbnailUrl: true,
                    duration: true,
                    difficulty: true,
                    categoryId: true,
                    language: true,
                    instructorId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
            student: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                },
            },
            payment: {
                select: {
                    id: true,
                    amount: true,
                    currency: true,
                    status: true,
                    provider: true,
                    transactionId: true,
                },
            },
        };
        const [enrollments, total] = await Promise.all([
            prisma_1.prisma.enrollment.findMany({
                where,
                skip,
                take,
                include,
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.enrollment.count({ where }),
        ]);
        const formattedEnrollments = enrollments.map((enrollment) => ({
            id: enrollment.id,
            programId: enrollment.programId,
            studentId: enrollment.studentId,
            paymentId: enrollment.paymentId,
            createdAt: enrollment.createdAt.toISOString(),
            program: enrollment.program,
            student: enrollment.student,
            payment: enrollment.payment,
        }));
        res.json({
            enrollments: formattedEnrollments,
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
        });
    }
    catch (err) {
        const error = err;
        res.status(500).json({ error: error.message || 'Failed to fetch enrollments' });
    }
});
/**
 * @swagger
 * /api/enrollments/{id}:
 *   get:
 *     summary: Get a specific enrollment
 *     description: Returns details of a specific enrollment by ID
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Enrollment ID
 *     responses:
 *       200:
 *         description: Enrollment details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only view your own enrollments
 *       404:
 *         description: Enrollment not found
 */
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
        const enrollmentId = req.params.id;
        const include = {
            program: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    price: true,
                    thumbnailUrl: true,
                    duration: true,
                    difficulty: true,
                    categoryId: true,
                    language: true,
                    instructorId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
            student: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                },
            },
            payment: {
                select: {
                    id: true,
                    amount: true,
                    currency: true,
                    status: true,
                    provider: true,
                    transactionId: true,
                },
            },
        };
        const enrollment = await prisma_1.prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include,
        });
        if (!enrollment) {
            return res.status(404).json({ error: 'Enrollment not found' });
        }
        // Students can only view their own enrollments unless they're admin/teacher
        if (enrollment.studentId !== user.id && user.role !== 'ADMIN' && user.role !== 'TEACHER') {
            return res.status(403).json({ error: 'Forbidden - You can only view your own enrollments' });
        }
        const formattedEnrollment = {
            id: enrollment.id,
            programId: enrollment.programId,
            studentId: enrollment.studentId,
            paymentId: enrollment.paymentId,
            createdAt: enrollment.createdAt.toISOString(),
            program: enrollment.program,
            student: enrollment.student,
            payment: enrollment.payment,
        };
        res.json(formattedEnrollment);
    }
    catch (err) {
        const error = err;
        res.status(500).json({ error: error.message || 'Failed to fetch enrollment' });
    }
});
/**
 * @swagger
 * /api/enrollments:
 *   post:
 *     summary: Enroll in a course
 *     description: Creates a new enrollment for the authenticated student
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - collectionId
 *             properties:
 *               collectionId:
 *                 type: string
 *               paymentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Successfully enrolled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Enrollment'
 *       400:
 *         description: Bad request - validation error or already enrolled
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth_1.requireAuth, subscription_1.requireSubscription, async (req, res) => {
    try {
        const user = req.user;
        const programId = req.body.programId ?? req.body.collectionId;
        const paymentId = req.body.paymentId;
        if (!programId) {
            return res.status(400).json({ error: 'programId or collectionId is required' });
        }
        const program = await prisma_1.prisma.program.findUnique({
            where: { id: programId },
            select: { id: true, title: true, price: true },
        });
        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }
        // Check if already enrolled
        const existingEnrollment = await prisma_1.prisma.enrollment.findFirst({
            where: {
                programId,
                studentId: user.id,
            },
        });
        if (existingEnrollment) {
            return res.status(400).json({ error: 'You are already enrolled in this program' });
        }
        const enrollmentData = {
            programId,
            studentId: user.id,
            amount: program.price || 0,
            currency: 'USD',
            provider: 'internal',
            transactionId: paymentId,
        };
        const enrollment = await enrollmentService.enrollStudent(enrollmentData);
        // Format response
        const formattedEnrollment = {
            id: enrollment.id,
            programId: enrollment.programId,
            studentId: enrollment.studentId,
            paymentId: enrollment.paymentId,
            createdAt: enrollment.createdAt.toISOString(),
            program: enrollment.program,
            student: enrollment.student,
            payment: enrollment.payment,
        };
        res.status(201).json(formattedEnrollment);
    }
    catch (err) {
        const error = err;
        const statusCode = error.message.includes('already enrolled') ||
            error.message.includes('prerequisite') ||
            error.message.includes('subscription')
            ? 400 : 500;
        res.status(statusCode).json({ error: error.message || 'Failed to enroll in collection' });
    }
});
/**
 * @swagger
 * /api/enrollments/{id}:
 *   delete:
 *     summary: Unenroll from a course
 *     description: Deletes an enrollment. Students can only unenroll themselves.
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Enrollment ID
 *     responses:
 *       200:
 *         description: Successfully unenrolled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only delete your own enrollments
 *       404:
 *         description: Enrollment not found
 */
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
        const enrollmentId = req.params.id;
        const enrollment = await prisma_1.prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            select: { id: true, studentId: true, programId: true },
        });
        if (!enrollment) {
            return res.status(404).json({ error: 'Enrollment not found' });
        }
        // Students can only delete their own enrollments unless they're admin/teacher
        if (enrollment.studentId !== user.id && user.role !== 'ADMIN' && user.role !== 'TEACHER') {
            return res.status(403).json({ error: 'Forbidden - You can only delete your own enrollments' });
        }
        // Delete enrollment
        await prisma_1.prisma.enrollment.delete({
            where: { id: enrollmentId },
        });
        // Invalidate caches
        await (0, cache_1.deleteCachePattern)(`enrollments:*`);
        await (0, cache_1.deleteCachePattern)(`dashboard:${enrollment.studentId}`);
        res.json({
            success: true,
            message: 'Successfully unenrolled from course',
        });
    }
    catch (err) {
        const error = err;
        res.status(500).json({ error: error.message || 'Failed to unenroll from course' });
    }
});
exports.default = router;

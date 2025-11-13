"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentService = void 0;
const prisma_1 = require("../../../utils/prisma");
class EnrollmentService {
    /**
     * @swagger
     * /enrollments:
     *   post:
     *     summary: Enroll a student in a course
     *     description: Creates an enrollment record for a student, including a linked payment record.
     *     tags: [Enrollments]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateEnrollmentDto'
     *     responses:
     *       201:
     *         description: Successfully enrolled the student
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/EnrollmentResponseDto'
     *       400:
     *         description: Student already enrolled or invalid data
     */
    async enrollStudent(data) {
        const existingEnrollment = await prisma_1.prisma.enrollment.findFirst({
            where: { courseId: data.courseId, studentId: data.studentId },
        });
        if (existingEnrollment)
            throw new Error('Student is already enrolled in this course');
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: {
                    studentId: data.studentId,
                    courseId: data.courseId,
                    amount: data.amount,
                    currency: data.currency || 'USD',
                    status: 'PENDING',
                    provider: data.provider,
                    transactionId: data.transactionId,
                },
            });
            const enrollment = await tx.enrollment.create({
                data: {
                    courseId: data.courseId,
                    studentId: data.studentId,
                    paymentId: payment.id,
                },
                include: {
                    course: { select: { id: true, title: true, price: true } },
                    student: { select: { id: true, username: true, email: true } },
                    payment: true,
                },
            });
            return enrollment;
        });
        return result;
    }
    /**
     * @swagger
     * /enrollments/course/{courseId}:
     *   get:
     *     summary: Get all enrollments for a specific course
     *     description: Returns a list of all students enrolled in a specific course.
     *     tags: [Enrollments]
     *     parameters:
     *       - in: path
     *         name: courseId
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID of the course
     *     responses:
     *       200:
     *         description: List of enrolled students
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/CourseEnrollmentDto'
     */
    async getCourseEnrollments(courseId) {
        const enrollments = await prisma_1.prisma.enrollment.findMany({
            where: { courseId },
            include: { student: { select: { id: true, username: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return enrollments.map((enrollment) => ({
            id: enrollment.student.id,
            username: enrollment.student.username,
            email: enrollment.student.email,
            enrollmentDate: enrollment.createdAt,
        }));
    }
    /**
     * @swagger
     * /enrollments/course/{courseId}/stats:
     *   get:
     *     summary: Get course enrollment statistics
     *     description: Retrieves total enrollment count and revenue for a specific course.
     *     tags: [Enrollments]
     *     parameters:
     *       - in: path
     *         name: courseId
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Course statistics
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/CourseStatsDto'
     */
    async getCourseStats(courseId) {
        const [enrolledCount, totalRevenue] = await Promise.all([
            prisma_1.prisma.enrollment.count({ where: { courseId } }),
            prisma_1.prisma.payment.aggregate({
                where: { courseId, status: 'COMPLETED' },
                _sum: { amount: true },
            }),
        ]);
        return {
            enrolledCount,
            totalRevenue: totalRevenue._sum.amount || 0,
        };
    }
    /**
     * @swagger
     * /enrollments/student/{studentId}:
     *   get:
     *     summary: Get all courses a student is enrolled in
     *     description: Returns detailed enrollment and payment information for a student.
     *     tags: [Enrollments]
     *     parameters:
     *       - in: path
     *         name: studentId
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: List of student enrollments
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/EnrollmentResponseDto'
     */
    async getStudentEnrollments(studentId) {
        const enrollments = await prisma_1.prisma.enrollment.findMany({
            where: { studentId },
            include: {
                course: { select: { id: true, title: true, price: true } },
                student: { select: { id: true, username: true, email: true } },
                payment: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return enrollments;
    }
    /**
     * @swagger
     * /enrollments/check:
     *   get:
     *     summary: Check if a student is enrolled in a course
     *     description: Verifies if a student is enrolled in a given course.
     *     tags: [Enrollments]
     *     parameters:
     *       - in: query
     *         name: courseId
     *         required: true
     *         schema:
     *           type: integer
     *       - in: query
     *         name: studentId
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Enrollment status
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 enrolled:
     *                   type: boolean
     *                   example: true
     */
    async isStudentEnrolled(courseId, studentId) {
        const enrollment = await prisma_1.prisma.enrollment.findFirst({
            where: { courseId, studentId },
        });
        return !!enrollment;
    }
}
exports.EnrollmentService = EnrollmentService;

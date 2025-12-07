import { CreateEnrollmentDto, EnrollmentResponseDto, CourseEnrollmentDto, CourseStatsDto } from '../dtos/enrollment.dto';
import { CreatePaymentDto } from '../dtos/payment.dto';
import { prisma } from '../../../utils/prisma';
import { deleteCachePattern } from '../../../utils/cache';

export class EnrollmentService {

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
    async enrollStudent(data: CreateEnrollmentDto): Promise<EnrollmentResponseDto> {
        // Use transaction with unique constraint to prevent race conditions
        // The unique constraint will throw if duplicate enrollment attempted
        const result = await prisma.$transaction(async (tx) => {
            // Check inside transaction to minimize race condition window
            // Using findFirst since composite unique constraints in MongoDB need this approach
            const existingEnrollment = await tx.enrollment.findFirst({
                where: { 
                    courseId: data.courseId,
                    studentId: data.studentId
                },
            });

            if (existingEnrollment) {
                throw new Error('Student is already enrolled in this course');
            }
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

        // Invalidate enrollment caches
        await deleteCachePattern(`enrollments:*`);

        return result as EnrollmentResponseDto;
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
    async getCourseEnrollments(courseId: string, page: number = 1, limit: number = 20): Promise<{
        data: CourseEnrollmentDto[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }> {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);

        const [enrollments, total] = await Promise.all([
            prisma.enrollment.findMany({
                where: { courseId },
                skip,
                take,
                include: { student: { select: { id: true, username: true, email: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.enrollment.count({ where: { courseId } }),
        ]);

        return {
            data: enrollments.map((enrollment) => ({
                id: enrollment.student.id,
                username: enrollment.student.username,
                email: enrollment.student.email,
                enrollmentDate: enrollment.createdAt,
            })),
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
        };
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
    async getCourseStats(courseId: string): Promise<CourseStatsDto> {
        const [enrolledCount, totalRevenue] = await Promise.all([
            prisma.enrollment.count({ where: { courseId } }),
            prisma.payment.aggregate({
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
    async getStudentEnrollments(studentId: string, page: number = 1, limit: number = 20): Promise<{
        data: EnrollmentResponseDto[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }> {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);

        const [enrollments, total] = await Promise.all([
            prisma.enrollment.findMany({
                where: { studentId },
                skip,
                take,
                include: {
                    course: { select: { id: true, title: true, price: true } },
                    student: { select: { id: true, username: true, email: true } },
                    payment: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.enrollment.count({ where: { studentId } }),
        ]);

        return {
            data: enrollments as EnrollmentResponseDto[],
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
        };
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
    async isStudentEnrolled(courseId: string, studentId: string): Promise<boolean> {
        const enrollment = await prisma.enrollment.findFirst({
            where: { courseId, studentId },
        });

        return !!enrollment;
    }
}
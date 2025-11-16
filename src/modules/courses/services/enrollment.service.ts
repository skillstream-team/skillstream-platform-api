import { CreateEnrollmentDto, EnrollmentResponseDto, CourseEnrollmentDto, CourseStatsDto } from '../dtos/enrollment.dto';
import { CreatePaymentDto } from '../dtos/payment.dto';
import { prisma } from '../../../utils/prisma';

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
        const existingEnrollment = await prisma.enrollment.findFirst({
            where: { courseId: data.courseId, studentId: data.studentId },
        });

        if (existingEnrollment) throw new Error('Student is already enrolled in this course');

        const result = await prisma.$transaction(async (tx) => {
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
    async getCourseEnrollments(courseId: string): Promise<CourseEnrollmentDto[]> {
        const enrollments = await prisma.enrollment.findMany({
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
    async getStudentEnrollments(studentId: string): Promise<EnrollmentResponseDto[]> {
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId },
            include: {
                course: { select: { id: true, title: true, price: true } },
                student: { select: { id: true, username: true, email: true } },
                payment: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return enrollments as EnrollmentResponseDto[];
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
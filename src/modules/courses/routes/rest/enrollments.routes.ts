import { Router } from 'express';
import { EnrollmentService } from '../../services/enrollment.service';
import { requireAuth } from '../../../../middleware/auth';
import { requireSubscription } from '../../../../middleware/subscription';
import { requireRole } from '../../../../middleware/roles';
import { validate } from '../../../../middleware/validation';
import { prisma } from '../../../../utils/prisma';
import { deleteCachePattern } from '../../../../utils/cache';

const router = Router();
const enrollmentService = new EnrollmentService();

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
 *         name: courseId
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
router.get('/', requireAuth, requireSubscription, async (req, res) => {
  try {
    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const courseId = req.query.courseId as string | undefined;
    const studentIdParam = req.query.studentId as string | undefined;

    // Students can only see their own enrollments unless they're admin/teacher
    let studentId = user.id;
    if (studentIdParam && (user.role === 'ADMIN' || user.role === 'TEACHER')) {
      studentId = studentIdParam;
    }

    // Build where clause
    const where: any = { studentId };
    if (courseId) {
      where.courseId = courseId;
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const include = {
      course: {
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
    } as const;

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip,
        take,
        include,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.enrollment.count({ where }),
    ]);

    // Transform to match frontend expected format
    const formattedEnrollments = enrollments.map((enrollment) => ({
      id: enrollment.id,
      courseId: enrollment.courseId,
      studentId: enrollment.studentId,
      paymentId: enrollment.paymentId,
      createdAt: enrollment.createdAt.toISOString(),
      course: enrollment.course,
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
  } catch (err) {
    const error = err as Error;
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
router.get('/:id', requireAuth, requireSubscription, async (req, res) => {
  try {
    const user = (req as any).user;
    const enrollmentId = req.params.id;

    const include = {
      course: {
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
    } as const;

    const enrollment = await prisma.enrollment.findUnique({
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
      courseId: enrollment.courseId,
      studentId: enrollment.studentId,
      paymentId: enrollment.paymentId,
      createdAt: enrollment.createdAt.toISOString(),
      course: enrollment.course,
      student: enrollment.student,
      payment: enrollment.payment,
    };

    res.json(formattedEnrollment);
  } catch (err) {
    const error = err as Error;
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
 *               - courseId
 *             properties:
 *               courseId:
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
router.post('/', requireAuth, requireSubscription, async (req, res) => {
  try {
    const user = (req as any).user;
    const { courseId, paymentId } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }

    // Get course to get price
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, price: true },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        courseId,
        studentId: user.id,
      },
    });

    if (existingEnrollment) {
      return res.status(400).json({ error: 'You are already enrolled in this course' });
    }

    // Create enrollment using the service
    const enrollmentData = {
      courseId,
      studentId: user.id,
      amount: course.price || 0,
      currency: 'USD',
      provider: 'internal',
      transactionId: paymentId,
    };

    const enrollment = await enrollmentService.enrollStudent(enrollmentData);

    // Format response
    const formattedEnrollment = {
      id: enrollment.id,
      courseId: enrollment.courseId,
      studentId: enrollment.studentId,
      paymentId: enrollment.paymentId,
      createdAt: enrollment.createdAt.toISOString(),
      course: enrollment.course,
      student: enrollment.student,
      payment: enrollment.payment,
    };

    res.status(201).json(formattedEnrollment);
  } catch (err) {
    const error = err as Error;
    const statusCode = error.message.includes('already enrolled') || 
                      error.message.includes('prerequisite') ||
                      error.message.includes('subscription')
                      ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to enroll in course' });
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
router.delete('/:id', requireAuth, requireSubscription, async (req, res) => {
  try {
    const user = (req as any).user;
    const enrollmentId = req.params.id;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { id: true, studentId: true, courseId: true },
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Students can only delete their own enrollments unless they're admin/teacher
    if (enrollment.studentId !== user.id && user.role !== 'ADMIN' && user.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Forbidden - You can only delete your own enrollments' });
    }

    // Delete enrollment
    await prisma.enrollment.delete({
      where: { id: enrollmentId },
    });

    // Invalidate caches
    await deleteCachePattern(`enrollments:*`);
    await deleteCachePattern(`dashboard:${enrollment.studentId}`);

    res.json({
      success: true,
      message: 'Successfully unenrolled from course',
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message || 'Failed to unenroll from course' });
  }
});

export default router;

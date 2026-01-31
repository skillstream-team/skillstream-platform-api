import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { prisma } from '../../../../utils/prisma';
import { logger } from '../../../../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/teachers/students:
 *   get:
 *     summary: Get all students enrolled in teacher's courses
 *     description: Returns a paginated list of all students enrolled in courses created by the authenticated teacher
 *     tags: [Teachers]
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
 *           default: 12
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username or email
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, username, email]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: List of students
 *       403:
 *         description: Forbidden - Teacher role required
 */
router.get('/teachers/students', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const teacherId = (req as any).user?.id;
    if (!teacherId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 12, 100);
    const search = req.query.search as string | undefined;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const skip = (page - 1) * limit;

    // Get all programs created by this teacher
    const teacherCollections = await prisma.program.findMany({
      where: { instructorId: teacherId },
      select: { id: true },
    });

    const collectionIds = teacherCollections.map(c => c.id);

    if (collectionIds.length === 0) {
      return res.json({
        students: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });
    }

    // Build where clause for enrollments
    const where: any = {
      programId: { in: collectionIds },
    };

    // Get unique students enrolled in teacher's courses
    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            createdAt: true,
          },
        },
        program: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      distinct: ['studentId'],
    });

    // Get unique students
    const uniqueStudentsMap = new Map<string, any>();
    enrollments.forEach((enrollment: any) => {
      if (!uniqueStudentsMap.has(enrollment.studentId) && enrollment.student) {
        uniqueStudentsMap.set(enrollment.studentId, enrollment.student);
      }
    });

    let students = Array.from(uniqueStudentsMap.values());

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      students = students.filter(
        (student: any) =>
          student.username?.toLowerCase().includes(searchLower) ||
          student.email?.toLowerCase().includes(searchLower) ||
          student.firstName?.toLowerCase().includes(searchLower) ||
          student.lastName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    students.sort((a: any, b: any) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case 'username':
          aVal = a.username || '';
          bVal = b.username || '';
          break;
        case 'email':
          aVal = a.email || '';
          bVal = b.email || '';
          break;
        case 'createdAt':
        default:
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    const total = students.length;
    const paginatedStudents = students.slice(skip, skip + limit);

    res.json({
      students: paginatedStudents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    logger.error('Error fetching teacher students', error, {
      userId: (req as any).user?.id,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch students',
    });
  }
});

/**
 * @swagger
 * /api/teachers/students/stats:
 *   get:
 *     summary: Get student statistics for teacher
 *     description: Returns statistics about students enrolled in teacher's courses
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student statistics
 *       403:
 *         description: Forbidden - Teacher role required
 */
router.get('/teachers/students/stats', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const teacherId = (req as any).user?.id;
    if (!teacherId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get all programs created by this teacher
    const teacherCollections = await prisma.program.findMany({
      where: { instructorId: teacherId },
      select: { id: true },
    });

    const collectionIds = teacherCollections.map(c => c.id);

    if (collectionIds.length === 0) {
      return res.json({
        totalStudents: 0,
        totalEnrollments: 0,
        totalRevenue: 0,
        avgCoursesPerStudent: 0,
      });
    }

    // Get all enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { programId: { in: collectionIds } },
      select: { studentId: true },
    });

    // Get unique students
    const uniqueStudents = new Set(enrollments.map(e => e.studentId));
    const totalStudents = uniqueStudents.size;
    const totalEnrollments = enrollments.length;

    // Get total revenue from completed payments
    const revenueResult = await prisma.payment.aggregate({
      where: {
        programId: { in: collectionIds },
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    const totalRevenue = revenueResult._sum.amount || 0;
    const avgCoursesPerStudent = totalStudents > 0 ? totalEnrollments / totalStudents : 0;

    res.json({
      totalStudents,
      totalEnrollments,
      totalRevenue,
      avgCoursesPerStudent: Math.round(avgCoursesPerStudent * 100) / 100,
    });
  } catch (error) {
    logger.error('Error fetching teacher student stats', error, {
      userId: (req as any).user?.id,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch student stats',
    });
  }
});

/**
 * @swagger
 * /api/teachers/students/{studentId}:
 *   get:
 *     summary: Get a specific student enrolled in teacher's courses
 *     description: Returns details about a specific student enrolled in teacher's courses
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student details
 *       403:
 *         description: Forbidden - Teacher role required
 *       404:
 *         description: Student not found
 */
router.get('/teachers/students/:studentId', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const teacherId = (req as any).user?.id;
    const studentId = req.params.studentId;

    if (!teacherId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get all programs created by this teacher
    const teacherCollections = await prisma.program.findMany({
      where: { instructorId: teacherId },
      select: { id: true },
    });

    const collectionIds = teacherCollections.map(c => c.id);

    if (collectionIds.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if student is enrolled in any of teacher's courses
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        programId: { in: collectionIds },
      },
      include: {
        student: true,
      },
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(enrollment.student);
  } catch (error) {
    logger.error('Error fetching teacher student', error, {
      userId: (req as any).user?.id,
      studentId: req.params.studentId,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch student',
    });
  }
});

export default router;

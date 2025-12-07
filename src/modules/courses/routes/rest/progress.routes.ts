import { Router } from 'express';
import { LearningService } from '../../services/learning.service';
import { EnrollmentService } from '../../services/enrollment.service';
import { requireAuth } from '../../../../middleware/auth';
import { prisma } from '../../../../utils/prisma';

const router = Router();
const learningService = new LearningService();
const enrollmentService = new EnrollmentService();

/**
 * @swagger
 * /api/users/{userId}/progress:
 *   get:
 *     summary: Get all course progress for a user
 *     tags: [Progress]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Progress retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/users/:userId/progress', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    // Get all enrollments for the user
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: userId },
      select: { courseId: true, course: { select: { id: true, title: true } } }
    });
    
    // Get progress for each enrollment (with pagination per course)
    const progressData = await Promise.all(
      enrollments.map(async (enrollment: any) => {
        const [progress, total] = await Promise.all([
          prisma.progress.findMany({
          where: {
            studentId: userId,
            courseId: enrollment.courseId
          },
            skip,
            take: limit,
            select: {
              id: true,
              status: true,
              progress: true,
              score: true,
              timeSpent: true,
              lastAccessed: true,
              completedAt: true,
              course: { select: { id: true, title: true } },
              module: { select: { id: true, title: true } }
            },
            orderBy: { lastAccessed: 'desc' }
          }),
          prisma.progress.count({
            where: {
              studentId: userId,
              courseId: enrollment.courseId
          }
          })
        ]);
        return {
          courseId: enrollment.courseId,
          course: enrollment.course,
          progress: progress || [],
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          }
        };
      })
    );

    // Filter by status if provided
    let filteredProgress = progressData;
    if (status === 'in_progress' || status === 'completed') {
      filteredProgress = progressData.filter((item: any) => {
        const completedItems = item.progress.filter((p: any) => p.status === 'completed').length;
        const totalItems = item.progress.length;
        const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
        
        if (status === 'completed') {
          return completionRate === 100;
        } else {
          return completionRate < 100 && completionRate > 0;
        }
      });
    }

    res.json({
      success: true,
      data: filteredProgress,
      pagination: {
        page,
        limit,
        total: filteredProgress.reduce((sum: number, item: any) => sum + item.pagination.total, 0),
        totalPages: Math.ceil(filteredProgress.reduce((sum: number, item: any) => sum + item.pagination.total, 0) / limit),
        hasNext: page * limit < filteredProgress.reduce((sum: number, item: any) => sum + item.pagination.total, 0),
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Failed to fetch user progress' });
  }
});

/**
 * @swagger
 * /api/users/{userId}/progress/courses:
 *   get:
 *     summary: Get course progress filtered by status
 *     tags: [Progress]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in_progress, completed]
 */
router.get('/users/:userId/progress/courses', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: userId },
      select: { courseId: true, course: { select: { id: true, title: true } } }
    });
    
    const coursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment: any) => {
        const progress = await prisma.progress.findMany({
          where: {
            studentId: userId,
            courseId: enrollment.courseId
          },
          select: { status: true }
        });
        const completedItems = progress?.filter((p: any) => p.status === 'completed').length || 0;
        const totalItems = progress?.length || 0;
        const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
        
        let courseStatus = 'not_started';
        if (completionRate === 100) {
          courseStatus = 'completed';
        } else if (completionRate > 0) {
          courseStatus = 'in_progress';
        }

        return {
          courseId: enrollment.courseId,
          course: enrollment.course,
          status: courseStatus,
          completionRate,
          completedItems,
          totalItems
        };
      })
    );

    // Filter by status if provided
    let filtered = coursesWithProgress;
    if (status === 'in_progress' || status === 'completed') {
      filtered = coursesWithProgress.filter((item: any) => item.status === status);
    }

    res.json({
      success: true,
      data: filtered,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
        hasNext: page * limit < filtered.length,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
});

/**
 * @swagger
 * /api/courses/{courseId}/progress:
 *   get:
 *     summary: Get progress for current user in a specific course
 *     tags: [Progress]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progress retrieved successfully
 */
router.get('/courses/:courseId/progress', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [progress, total] = await Promise.all([
      prisma.progress.findMany({
      where: {
        studentId: userId,
        courseId: courseId
      },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          progress: true,
          score: true,
          timeSpent: true,
          lastAccessed: true,
          completedAt: true,
          course: { select: { id: true, title: true } },
          module: { select: { id: true, title: true } }
        },
        orderBy: { lastAccessed: 'desc' }
      }),
      prisma.progress.count({
        where: {
          studentId: userId,
          courseId: courseId
      }
      })
    ]);
    
    res.json({
      success: true,
      data: progress || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
});

export default router;


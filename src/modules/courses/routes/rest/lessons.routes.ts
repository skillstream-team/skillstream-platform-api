import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { requireSubscription } from '../../../../middleware/subscription';
import { prisma } from '../../../../utils/prisma';

const router = Router();

/**
 * @swagger
 * /api/lessons/quick:
 *   post:
 *     summary: Create a quick lesson
 *     tags: [Lessons]
 */
router.post('/lessons/quick', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { title, description, teacherId, scheduledAt, subject, duration } = req.body;

    // Generate join link and meeting ID (you can integrate with video service here)
    const joinLink = `https://meet.skillstream.com/${Date.now()}`;
    const meetingId = `meeting-${Date.now()}`;

    const quickLesson = await prisma.quickLesson.create({
      data: {
        title,
        description,
        teacherId: teacherId || userId,
        scheduledAt: new Date(scheduledAt),
        subject,
        duration,
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

    res.status(201).json({
      success: true,
      data: quickLesson
    });
  } catch (error) {
    console.error('Error creating quick lesson:', error);
    res.status(500).json({ error: 'Failed to create quick lesson' });
  }
});

/**
 * @swagger
 * /api/lessons:
 *   get:
 *     summary: Get lessons (for teacher or student)
 *     tags: [Lessons]
 */
router.get('/lessons', requireAuth, requireSubscription, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { role, status } = req.query;

    const whereQuick: any = {};
    const whereRegular: any = {};

    if (role === 'TEACHER') {
      whereQuick.teacherId = userId;
      whereRegular.teacherId = userId;
    } else if (role === 'STUDENT') {
      // For students, get lessons from bookings
      const bookings = await prisma.booking.findMany({
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
    } else if (status === 'past') {
      whereQuick.scheduledAt = { lt: new Date() };
      whereQuick.status = { in: ['completed', 'cancelled'] };
      whereRegular.scheduledAt = { lt: new Date() };
      whereRegular.status = { in: ['completed', 'cancelled'] };
    } else if (status) {
      whereQuick.status = status;
      whereRegular.status = status;
    }

    // Get quick lessons
    const quickLessons = await prisma.quickLesson.findMany({
      where: whereQuick,
      include: {
        teacher: {
          select: { id: true, username: true, email: true }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    // Get regular lessons (from courses) - only if scheduledAt exists
    const regularLessonsQuery: any = {
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
    } catch (e) {
      // Field doesn't exist, skip ordering
    }

    const regularLessons = await prisma.lesson.findMany(regularLessonsQuery).catch(() => []);

    res.json({
      success: true,
      data: {
        quickLessons,
        regularLessons
      }
    });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

export default router;


import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { prisma } from '../../../../utils/prisma';

const router = Router();

/**
 * @swagger
 * /api/lessons/{lessonId}/attendance:
 *   get:
 *     summary: Get attendance records for a lesson
 *     tags: [Attendance]
 */
router.get('/lessons/:lessonId/attendance', requireAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;

    const attendance = await prisma.attendance.findMany({
      where: { lessonId },
      include: {
        student: {
          select: { id: true, username: true, email: true }
        },
        lesson: {
          select: { id: true, title: true, scheduledAt: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

/**
 * @swagger
 * /api/lessons/{lessonId}/attendance:
 *   post:
 *     summary: Create or update attendance record
 *     tags: [Attendance]
 */
router.post('/lessons/:lessonId/attendance', requireAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { studentId, status, joinedAt, duration } = req.body;

    const attendance = await prisma.attendance.upsert({
      where: {
        lessonId_studentId: {
          lessonId,
          studentId
        }
      },
      update: {
        status,
        joinedAt: joinedAt ? new Date(joinedAt) : undefined,
        duration,
        leftAt: duration ? new Date(new Date(joinedAt || Date.now()).getTime() + duration * 1000) : undefined
      },
      create: {
        lessonId,
        studentId,
        status,
        joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
        duration,
        leftAt: duration ? new Date(new Date(joinedAt || Date.now()).getTime() + duration * 1000) : undefined
      },
      include: {
        student: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error creating attendance:', error);
    res.status(500).json({ error: 'Failed to create attendance' });
  }
});

/**
 * @swagger
 * /api/lessons/{lessonId}/attendance/{studentId}/mark:
 *   post:
 *     summary: Mark attendance for a student
 *     tags: [Attendance]
 */
router.post('/lessons/:lessonId/attendance/:studentId/mark', requireAuth, async (req, res) => {
  try {
    const { lessonId, studentId } = req.params;
    const { status = 'present' } = req.body;

    if (!['present', 'absent', 'late'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        lessonId_studentId: {
          lessonId,
          studentId
        }
      },
      update: {
        status,
        joinedAt: status === 'present' || status === 'late' ? new Date() : undefined
      },
      create: {
        lessonId,
        studentId,
        status,
        joinedAt: status === 'present' || status === 'late' ? new Date() : undefined
      },
      include: {
        student: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

export default router;


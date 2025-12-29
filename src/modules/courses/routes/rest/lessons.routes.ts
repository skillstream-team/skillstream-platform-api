import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { requireSubscription } from '../../../../middleware/subscription';
import { prisma } from '../../../../utils/prisma';
import { emailService } from '../../../users/services/email.service';

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
    const { 
      title, 
      description, 
      teacherId, 
      scheduledAt, 
      subject, 
      duration,
      price,
      invitedStudents, // Can be array of usernames or emails
      maxStudents
    } = req.body;

    // Validate scheduledAt is at least 24 hours in the future if price is set
    if (price && price > 0) {
      const lessonTime = new Date(scheduledAt);
      const now = new Date();
      const minTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      if (lessonTime <= minTime) {
        return res.status(400).json({ 
          error: 'Lessons with payment must be scheduled at least 24 hours in advance' 
        });
      }
    }

    // Resolve student usernames/emails to IDs
    let invitedStudentIds: string[] = [];
    if (invitedStudents && Array.isArray(invitedStudents) && invitedStudents.length > 0) {
      // Find students by username or email
      const students = await prisma.user.findMany({
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
        const missing = invitedStudents.filter(
          (identifier: string) => !foundIdentifiers.has(identifier)
        );
        return res.status(400).json({ 
          error: `One or more students not found: ${missing.join(', ')}. Please use username or email address.` 
        });
      }

      invitedStudentIds = students.map(s => s.id);
    }

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

    // Send invitation emails to students if price is set
    if (price && price > 0 && invitedStudentIds && invitedStudentIds.length > 0) {
      try {
        const students = await prisma.user.findMany({
          where: { id: { in: invitedStudentIds } },
          select: { id: true, email: true, username: true },
        });

        const paymentDeadline = new Date(new Date(scheduledAt).getTime() - 24 * 60 * 60 * 1000);

        for (const student of students) {
          await emailService.sendEmail(
            student.email,
            `Invitation to Lesson: ${title}`,
            `
              <h2>You've been invited to a lesson!</h2>
              <p>${quickLesson.teacher.username} has invited you to attend a lesson.</p>
              <h3>Lesson Details:</h3>
              <ul>
                <li><strong>Title:</strong> ${title}</li>
                <li><strong>Subject:</strong> ${subject || 'N/A'}</li>
                <li><strong>Scheduled:</strong> ${new Date(scheduledAt).toLocaleString()}</li>
                <li><strong>Duration:</strong> ${duration || 'N/A'} minutes</li>
                <li><strong>Price:</strong> $${price}</li>
                <li><strong>Payment Deadline:</strong> ${paymentDeadline.toLocaleString()}</li>
              </ul>
              <p><strong>Important:</strong> Payment must be completed at least 24 hours before the lesson time.</p>
              <p>Please complete your payment to confirm your attendance.</p>
            `
          );
        }
      } catch (error) {
        console.error('Error sending invitation emails:', error);
        // Don't fail the request if email fails
      }
    }

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
      // For students, get lessons they're invited to
      whereQuick.invitedStudentIds = { has: userId };
      
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


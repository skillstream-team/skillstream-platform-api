import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { requireSubscription } from '../../../../middleware/subscription';
import { prisma } from '../../../../utils/prisma';
import { logger } from '../../../../utils/logger';
import { emailService } from '../../../users/services/email.service';
import { CollectionsService } from '../../services/service';

const router = Router();
const service = new CollectionsService();

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

    // Get teacher info for email
    const teacher = await prisma.user.findUnique({
      where: { id: quickLesson.teacherId },
      select: { id: true, username: true, email: true }
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
              <p>${teacher?.username || 'A teacher'} has invited you to attend a lesson.</p>
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
        logger.error('Error sending invitation emails', error);
        // Don't fail the request if email fails
      }
    }

    res.status(201).json({
      success: true,
      data: quickLesson
    });
  } catch (error) {
    logger.error('Error creating quick lesson', error);
    res.status(500).json({ error: 'Failed to create quick lesson' });
  }
});

/**
 * @swagger
 * /api/lessons:
 *   post:
 *     summary: Create a standalone lesson
 *     tags: [Lessons]
 */
router.post('/lessons', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { 
      title, 
      description, 
      duration,
      price,
      isPreview,
      content
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (price === undefined || price === null) {
      return res.status(400).json({ error: 'Price is required' });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: 'Price must be a non-negative number' });
    }

    // Build content JSON
    const lessonContent: any = content || {};
    if (description) {
      lessonContent.description = description;
    }

    // Create standalone lesson
    const lesson = await prisma.lesson.create({
      data: {
        title: title.trim(),
        content: lessonContent,
        duration: duration || null,
        price: price || 0,
        isPreview: isPreview || false,
        teacherId: userId,
        order: 0,
        status: 'scheduled', // Default status for content lessons
      },
    });

    // Extract description from content for response
    const responseContent = lesson.content as any;
    res.status(201).json({
      ...lesson,
      description: responseContent?.description || '',
    });
  } catch (error) {
    logger.error('Error creating lesson', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

/**
 * @swagger
 * /api/lessons/{id}:
 *   get:
 *     summary: Get a single lesson by ID
 *     tags: [Lessons]
 */
router.get('/lessons/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`GET /api/lessons/:id called with id: ${id}`);
    
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        order: true,
        scheduledAt: true,
        teacherId: true,
        duration: true,
        price: true,
        joinLink: true,
        meetingId: true,
        status: true,
        isPreview: true,
        createdAt: true,
        updatedAt: true,
        quizzes: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Extract description and moduleId from content if they exist
    const content = lesson.content as any;
    const description = content?.description || '';
    const moduleId = content?.moduleId || '';

    res.json({
      ...lesson,
      description,
      moduleId,
    });
  } catch (error) {
    logger.error('Error fetching lesson', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

/**
 * @swagger
 * /api/lessons:
 *   get:
 *     summary: Get lessons (for teacher or student)
 *     tags: [Lessons]
 */
router.get('/lessons', requireAuth, async (req, res) => {
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
      
      // Also get lessons from collections the student is enrolled in
      // Note: Enrollment model doesn't have a status field, so we get all enrollments
      const enrollments = await prisma.enrollment.findMany({
        where: { 
          studentId: userId
        },
        select: { collectionId: true }
      });
      
      const enrolledCollectionIds = enrollments.map(e => e.collectionId);
      
      // Get lessons from enrolled collections
      if (enrolledCollectionIds.length > 0) {
        const collectionLessons = await prisma.collectionLesson.findMany({
          where: {
            collectionId: { in: enrolledCollectionIds }
          },
          select: { lessonId: true }
        });
        
        const lessonIds = collectionLessons.map(cl => cl.lessonId);
        if (lessonIds.length > 0) {
          // Store lesson IDs for later use in query
          (whereRegular as any).enrolledLessonIds = lessonIds;
        }
      }
      
      // If no enrolled lessons and no status filter, show all lessons for browsing
      // Students should be able to see all lessons to browse and see costs
      if (!(whereRegular as any).enrolledLessonIds && !status) {
        // Don't set any filters - show all lessons
        // whereRegular remains empty {} which will return all lessons
      }
    } else {
      // No role specified or other role - show all lessons for browsing
      // whereRegular remains empty {} which will return all lessons
    }

    // Apply status filters
    if (status === 'upcoming') {
      whereQuick.scheduledAt = { gte: new Date() };
      whereQuick.status = 'scheduled';
      // For regular lessons, include both scheduled lessons with future dates AND standalone lessons (no scheduledAt)
      const statusConditions: any[] = [
        { scheduledAt: { gte: new Date() }, status: 'scheduled' },
        { scheduledAt: null, status: 'scheduled' } // Standalone content lessons
      ];
      
      // If student has enrolled lessons, add them to OR conditions
      if ((whereRegular as any).enrolledLessonIds) {
        statusConditions.push({ id: { in: (whereRegular as any).enrolledLessonIds } });
        delete (whereRegular as any).enrolledLessonIds;
      }
      
      whereRegular.OR = statusConditions;
    } else if (status === 'past') {
      whereQuick.scheduledAt = { lt: new Date() };
      whereQuick.status = { in: ['completed', 'cancelled'] };
      const statusConditions: any[] = [
        { scheduledAt: { lt: new Date() }, status: { in: ['completed', 'cancelled'] } }
      ];
      
      // If student has enrolled lessons, add them to OR conditions
      if ((whereRegular as any).enrolledLessonIds) {
        statusConditions.push({ id: { in: (whereRegular as any).enrolledLessonIds } });
        delete (whereRegular as any).enrolledLessonIds;
      }
      
      if (statusConditions.length > 1) {
        whereRegular.OR = statusConditions;
      } else {
        whereRegular.scheduledAt = { lt: new Date() };
        whereRegular.status = { in: ['completed', 'cancelled'] };
      }
    } else if (status) {
      whereQuick.status = status;
      const statusConditions: any[] = [{ status }];
      
      // If student has enrolled lessons, add them to OR conditions
      if ((whereRegular as any).enrolledLessonIds) {
        statusConditions.push({ id: { in: (whereRegular as any).enrolledLessonIds } });
        delete (whereRegular as any).enrolledLessonIds;
      }
      
      if (statusConditions.length > 1) {
        whereRegular.OR = statusConditions;
      } else {
        whereRegular.status = status;
      }
    } else {
      // No status filter
      if ((whereRegular as any).enrolledLessonIds) {
        // Student has enrolled lessons - show only those
        whereRegular.OR = [
          { id: { in: (whereRegular as any).enrolledLessonIds } }
        ];
        delete (whereRegular as any).enrolledLessonIds;
      } else if (role === 'STUDENT') {
        // Student with no enrolled lessons - show all lessons for browsing
        // Clear whereRegular to return all lessons
        Object.keys(whereRegular).forEach(key => delete whereRegular[key]);
      }
      // If role is not STUDENT or TEACHER, whereRegular stays empty to show all lessons
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

    // Get regular lessons (standalone or from collections)
    // If whereRegular is empty, it means show all lessons (for browsing)
    // Prisma requires undefined (not empty object) to return all records
    const hasFilters = Object.keys(whereRegular).length > 0;
    const regularLessonsQuery: any = {
      where: hasFilters ? whereRegular : undefined,
      orderBy: { createdAt: 'desc' }, // Sort by creation date (newest first)
    };

    const regularLessons = await prisma.lesson.findMany(regularLessonsQuery).catch((err) => {
      logger.error('Error fetching regular lessons', err);
      return [];
    });

    res.json({
      success: true,
      data: {
        quickLessons,
        regularLessons
      }
    });
  } catch (error) {
    logger.error('Error fetching lessons', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

/**
 * @swagger
 * /api/lessons/{id}:
 *   put:
 *     summary: Update a lesson
 *     tags: [Lessons]
 */
router.put('/lessons/:id', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order, duration, price, isPreview, moduleId } = req.body;
    
    // Get lesson to check if it exists
    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
      select: { content: true },
    });

    if (!existingLesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (order !== undefined) updateData.order = order;
    if (duration !== undefined) updateData.duration = duration;
    if (price !== undefined) {
      if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ error: 'Price must be a non-negative number' });
      }
      updateData.price = price;
    }
    if (isPreview !== undefined) updateData.isPreview = isPreview;

    // Handle content JSON (description and moduleId)
    const existingContent = (existingLesson.content as any) || {};
    const contentUpdate: any = { ...existingContent };
    if (description !== undefined) contentUpdate.description = description;
    if (moduleId !== undefined) contentUpdate.moduleId = moduleId;
    updateData.content = contentUpdate;

    // Update lesson using service (this will handle cache invalidation for collections)
    const updatedLesson = await service.updateLesson(id, updateData);

    // Extract description and moduleId from content for response
    const content = updatedLesson.content as any;
    res.json({
      ...updatedLesson,
      description: content?.description || '',
      moduleId: content?.moduleId || '',
    });
  } catch (error) {
    logger.error('Error updating lesson', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

/**
 * @swagger
 * /api/lessons/{id}:
 *   delete:
 *     summary: Delete a lesson
 *     tags: [Lessons]
 */
router.delete('/lessons/:id', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if lesson exists and get collections it belongs to for cache invalidation
    const collectionLessons = await prisma.collectionLesson.findMany({
      where: { lessonId: id },
      select: { collectionId: true },
    });

    const lesson = await prisma.lesson.findUnique({
      where: { id },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    await prisma.lesson.delete({ where: { id } });
    
    // Invalidate cache for all collections this lesson belonged to
    const { deleteCache, cacheKeys } = await import('../../../../utils/cache');
    await Promise.all(
      collectionLessons.map(cl => 
        deleteCache(cacheKeys.collection(cl.collectionId))
      )
    );
    
    res.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error) {
    logger.error('Error deleting lesson', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

export default router;


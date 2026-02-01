import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { requireSubscription } from '../../../../middleware/subscription';
import { prisma } from '../../../../utils/prisma';
import { logger } from '../../../../utils/logger';
import { emailService } from '../../../users/services/email.service';
import { ProgramsService } from '../../services/service';
import { getStudentPrice } from '../../services/monetization.service';

const router = Router();
const service = new ProgramsService();

/**
 * @swagger
 * /api/modules/quick:
 *   post:
 *     summary: Create a quick module
 *     tags: [Modules]
 */
router.post('/modules/quick', requireAuth, requireRole('TEACHER'), async (req, res) => {
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
          error: 'Modules with payment must be scheduled at least 24 hours in advance' 
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

    const quickModule = await prisma.quickModule.create({
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
      where: { id: quickModule.teacherId },
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
            `Invitation to Module: ${title}`,
            `
              <h2>You've been invited to a module!</h2>
              <p>${teacher?.username || 'A teacher'} has invited you to attend a module.</p>
              <h3>Module Details:</h3>
              <ul>
                <li><strong>Title:</strong> ${title}</li>
                <li><strong>Subject:</strong> ${subject || 'N/A'}</li>
                <li><strong>Scheduled:</strong> ${new Date(scheduledAt).toLocaleString()}</li>
                <li><strong>Duration:</strong> ${duration || 'N/A'} minutes</li>
                <li><strong>Price:</strong> $${price}</li>
                <li><strong>Payment Deadline:</strong> ${paymentDeadline.toLocaleString()}</li>
              </ul>
              <p><strong>Important:</strong> Payment must be completed at least 24 hours before the module time.</p>
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
      data: quickModule
    });
  } catch (error) {
    logger.error('Error creating quick module', error);
    res.status(500).json({ error: 'Failed to create quick module' });
  }
});

/**
 * @swagger
 * /api/modules:
 *   post:
 *     summary: Create a standalone module
 *     tags: [Modules]
 */
router.post('/modules', requireAuth, requireRole('TEACHER'), async (req, res) => {
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
    const moduleContent: any = content || {};
    if (description) {
      moduleContent.description = description;
    }

    // Create standalone module
    const module = await prisma.module.create({
      data: {
        title: title.trim(),
        content: moduleContent,
        duration: duration || null,
        price: price || 0,
        isPreview: isPreview || false,
        teacherId: userId,
        order: 0,
        status: 'scheduled', // Default status for content lessons
      },
    });

    // Extract description from content for response
    const responseContent = module.content as any;
    res.status(201).json({
      ...module,
      description: responseContent?.description || '',
    });
  } catch (error) {
    logger.error('Error creating module', error);
    res.status(500).json({ error: 'Failed to create module' });
  }
});

/**
 * @swagger
 * /api/modules/{id}:
 *   get:
 *     summary: Get a single module by ID
 *     tags: [Modules]
 */
router.get('/modules/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`GET /api/modules/:id called with id: ${id}`);

    const select = {
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
    };

    let module = await prisma.module.findUnique({
      where: { id },
      select,
    });

    // If id is a ProgramModule id (e.g. from program section list), resolve to the linked Module
    if (!module) {
      const programModule = await prisma.programModule.findUnique({
        where: { id },
        include: { module: { select } },
      });
      if (programModule?.module) {
        module = programModule.module;
      }
    }

    // If id is a QuickModule id (scheduled lesson), return a module-shaped response so links work
    if (!module) {
      const quickModule = await prisma.quickModule.findUnique({
        where: { id },
        include: { teacher: { select: { id: true, username: true, email: true, firstName: true, lastName: true } } },
      });
      if (quickModule) {
        const description = quickModule.description ?? '';
        res.json({
          id: quickModule.id,
          title: quickModule.title,
          content: { description },
          order: 0,
          scheduledAt: quickModule.scheduledAt,
          teacherId: quickModule.teacherId,
          duration: quickModule.duration,
          price: quickModule.price ?? 0,
          joinLink: quickModule.joinLink,
          meetingId: quickModule.meetingId,
          status: quickModule.status,
          isPreview: false,
          createdAt: quickModule.createdAt,
          updatedAt: quickModule.updatedAt,
          quizzes: [],
          description,
          sectionId: '',
          studentPrice: getStudentPrice(quickModule.price ?? 0),
          teacher: quickModule.teacher,
        });
        return;
      }
    }

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Extract description and sectionId from content if they exist
    const content = module.content as any;
    const description = content?.description || '';
    const sectionId = content?.sectionId || '';

    res.json({
      ...module,
      description,
      sectionId,
      studentPrice: getStudentPrice(module.price ?? 0),
    });
  } catch (error) {
    logger.error('Error fetching module', error);
    res.status(500).json({ error: 'Failed to fetch module' });
  }
});

/**
 * @swagger
 * /api/modules:
 *   get:
 *     summary: Get modules (for teacher or student)
 *     tags: [Modules]
 */
router.get('/modules', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const { role, status } = req.query;

    // Use role from query param if provided, otherwise use authenticated user's role
    const effectiveRole = role || userRole;

    const whereQuick: any = {};
    const whereRegular: any = {};

    if (effectiveRole === 'TEACHER') {
      whereQuick.teacherId = userId;
      whereRegular.teacherId = userId;
    } else if (effectiveRole === 'STUDENT' || !effectiveRole) {
      // If role is STUDENT or not specified, treat as student browsing
      // For students, get lessons they're invited to
      whereQuick.invitedStudentIds = { has: userId };
      
      // For students, get lessons from bookings
      const bookings = await prisma.booking.findMany({
        where: { 
          studentId: userId
          // Note: Booking model may not have a status field - adjust based on schema
        },
        include: {
          slot: true
        }
      });
      
      // Also get modules from programs the student is enrolled in
      // Note: Enrollment model doesn't have a status field, so we get all enrollments
      const enrollments = await prisma.enrollment.findMany({
        where: { 
          studentId: userId
        },
        select: { programId: true }
      });
      
      const enrolledProgramIds = enrollments.map(e => e.programId);
      
      // Get modules from enrolled programs
      if (enrolledProgramIds.length > 0) {
        const programModules = await prisma.programModule.findMany({
          where: {
            programId: { in: enrolledProgramIds }
          },
          select: { moduleId: true }
        });
        
        const moduleIds = programModules.map(pm => pm.moduleId);
        if (moduleIds.length > 0) {
          // Store module IDs for later use in query
          (whereRegular as any).enrolledModuleIds = moduleIds;
        }
      }
      
      // If no enrolled modules, show all modules for browsing
      // Students should be able to see all modules to browse and see costs
      if (!(whereRegular as any).enrolledModuleIds) {
        // Don't set any filters - show all modules
        // whereRegular remains empty {} which will return all modules
      }
    } else {
      // No role specified or other role - show all lessons for browsing
      // whereRegular remains empty {} which will return all lessons
    }

    // Apply status filters
    if (status === 'upcoming') {
      whereQuick.scheduledAt = { gte: new Date() };
      whereQuick.status = 'scheduled';
      // For regular modules, include both scheduled modules with future dates AND standalone modules (no scheduledAt)
      const statusConditions: any[] = [
        { scheduledAt: { gte: new Date() }, status: 'scheduled' },
        { scheduledAt: null, status: 'scheduled' } // Standalone content modules
      ];
      
      // If student has enrolled modules, add them separately to whereRegular
      // Note: enrolledModuleIds are for regular Module model, not QuickModule
      // Regular Module doesn't have scheduledAt or status fields like QuickModule
      // So we handle enrolled modules separately - they should be shown regardless of status
      if ((whereRegular as any).enrolledModuleIds) {
        const enrolledModuleIds = (whereRegular as any).enrolledModuleIds;
        delete (whereRegular as any).enrolledModuleIds;
        // For enrolled modules, we want to show them regardless of status
        // So we add them as a simple id filter
        whereRegular.id = { in: enrolledModuleIds };
        // Don't apply status conditions to enrolled modules since they're regular Module type
      } else {
        // No enrolled modules, apply status conditions for QuickModule compatibility
        // But regular Module doesn't have these fields, so we don't apply them
        // whereRegular remains empty {} to show all modules
      }
    } else if (status === 'past') {
      whereQuick.scheduledAt = { lt: new Date() };
      whereQuick.status = { in: ['completed', 'cancelled'] };
      
      // Regular Module doesn't have scheduledAt or status fields
      // If student has enrolled modules, show them by ID only
      if ((whereRegular as any).enrolledModuleIds) {
        const enrolledModuleIds = (whereRegular as any).enrolledModuleIds;
        delete (whereRegular as any).enrolledModuleIds;
        whereRegular.id = { in: enrolledModuleIds };
      }
      // Don't apply status conditions to whereRegular since Module model doesn't have these fields
    } else if (status) {
      whereQuick.status = status;
      
      // Regular Module doesn't have status field
      // If student has enrolled modules, show them by ID only
      if ((whereRegular as any).enrolledModuleIds) {
        const enrolledModuleIds = (whereRegular as any).enrolledModuleIds;
        delete (whereRegular as any).enrolledModuleIds;
        whereRegular.id = { in: enrolledModuleIds };
      }
      // Don't apply status conditions to whereRegular since Module model doesn't have status field
    } else {
      // No status filter
      if ((whereRegular as any).enrolledModuleIds) {
        // Student has enrolled modules - show only those
        const enrolledModuleIds = (whereRegular as any).enrolledModuleIds;
        delete (whereRegular as any).enrolledModuleIds;
        // For enrolled modules, filter by ID only (regular Module doesn't have status/scheduledAt)
        whereRegular.id = { in: enrolledModuleIds };
      } else {
        // No enrolled modules or not a student - show all modules for browsing
        // Clear whereRegular to return all modules
        Object.keys(whereRegular).forEach(key => delete whereRegular[key]);
      }
    }

    // Get quick modules
    const quickModules = await prisma.quickModule.findMany({
      where: whereQuick,
      include: {
        teacher: {
          select: { id: true, username: true, email: true }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    // Get regular modules (standalone or from programs)
    // If whereRegular is empty, it means show all modules (for browsing)
    // Prisma requires undefined (not empty object) to return all records
    const hasFilters = Object.keys(whereRegular).length > 0;
    const regularModulesQuery: any = {
      where: hasFilters ? whereRegular : undefined,
      orderBy: { createdAt: 'desc' }, // Sort by creation date (newest first)
      include: {
        // Include teacher information if teacherId exists
        // Note: Module model has teacherId but no relation, so we'll fetch it separately
      },
    };

    logger.info(`Modules query - role: ${role || 'not specified'}, effectiveRole: ${effectiveRole}, hasFilters: ${hasFilters}, whereRegular keys: ${Object.keys(whereRegular).join(', ')}`);
    
    const regularModulesRaw = await prisma.module.findMany(regularModulesQuery).catch((err) => {
      logger.error('Error fetching regular modules', err);
      return [];
    });
    
    // Fetch teacher information for modules that have teacherId
    const regularModules = await Promise.all(
      regularModulesRaw.map(async (module) => {
        if (module.teacherId) {
          try {
            const teacher = await prisma.user.findUnique({
              where: { id: module.teacherId },
              select: { id: true, username: true, email: true, firstName: true, lastName: true },
            });
            return {
              ...module,
              teacher: teacher || null,
            };
          } catch (error) {
            logger.error(`Error fetching teacher for module ${module.id}`, error);
            return { ...module, teacher: null };
          }
        }
        return { ...module, teacher: null };
      })
    );
    
    if (regularModules.length > 0) {
      logger.info(`Found ${regularModules.length} regular modules`);
    } else {
      logger.debug('Found 0 regular modules');
    }

    const regularModulesWithStudentPrice = regularModules.map((m: any) => ({
      ...m,
      studentPrice: getStudentPrice(m.price ?? 0),
    }));
    const quickModulesWithStudentPrice = quickModules.map((m: any) => ({
      ...m,
      studentPrice: getStudentPrice(m.price ?? 0),
    }));

    res.json({
      success: true,
      data: {
        quickModules: quickModulesWithStudentPrice,
        regularModules: regularModulesWithStudentPrice,
      }
    });
  } catch (error) {
    logger.error('Error fetching modules', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

/**
 * @swagger
 * /api/lessons/{id}:
 *   put:
 *     summary: Update a lesson
 *     tags: [Lessons]
 */
router.put('/modules/:id', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order, duration, price, isPreview, moduleId } = req.body;
    
    // Get module to check if it exists
    const existingModule = await prisma.module.findUnique({
      where: { id },
      select: { content: true },
    });

    if (!existingModule) {
      return res.status(404).json({ error: 'Module not found' });
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

    // Handle content JSON (description and sectionId)
    const existingContent = (existingModule.content as any) || {};
    const contentUpdate: any = { ...existingContent };
    if (description !== undefined) contentUpdate.description = description;
    if (moduleId !== undefined) contentUpdate.sectionId = moduleId;
    updateData.content = contentUpdate;

    // Update module using service (this will handle cache invalidation for programs)
    const updatedModule = await service.updateModule(id, updateData);

    // Extract description and sectionId from content for response
    const content = updatedModule.content as any;
    res.json({
      ...updatedModule,
      description: content?.description || '',
      sectionId: content?.sectionId || '',
    });
  } catch (error) {
    logger.error('Error updating module', error);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

/**
 * @swagger
 * /api/modules/{id}:
 *   delete:
 *     summary: Delete a module
 *     tags: [Modules]
 */
router.delete('/modules/:id', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if module exists and get programs it belongs to for cache invalidation
    const programModules = await prisma.programModule.findMany({
      where: { moduleId: id },
      select: { programId: true },
    });

    const module = await prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    await prisma.module.delete({ where: { id } });
    
    // Invalidate cache for all programs this module belonged to
    const { deleteCache, cacheKeys } = await import('../../../../utils/cache');
    await Promise.all(
      programModules.map(pm => 
        deleteCache(cacheKeys.program(pm.programId))
      )
    );
    
    res.json({ success: true, message: 'Module deleted successfully' });
  } catch (error) {
    logger.error('Error deleting module', error);
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

export default router;


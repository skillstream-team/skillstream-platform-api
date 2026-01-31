import { Router } from 'express';
import { ProgramsService } from '../../services/service';
import { EnrollmentService } from '../../services/enrollment.service';
import { requireRole } from '../../../../middleware/roles';
import { requireAuth } from '../../../../middleware/auth';
import { requireSubscription } from '../../../../middleware/subscription';
import { validate } from '../../../../middleware/validation';
import { createCourseSchema, updateCourseSchema, courseIdParamSchema, createModuleSchema, createSectionSchema } from '../../../../utils/validation-schemas';
import { prisma } from '../../../../utils/prisma';

const router = Router();
const service = new ProgramsService();
const enrollmentService = new EnrollmentService();

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course
 *     description: Create a new course. Only teachers can create courses.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCourseRequest'
 *           example:
 *             title: Introduction to JavaScript
 *             description: Learn the fundamentals of JavaScript programming
 *             price: 49.99
 *             order: 1
 *             createdBy: user_123
 *             instructorId: user_123
 *             thumbnailUrl: https://example.com/thumb.jpg
 *             categoryId: cat_123
 *             difficulty: BEGINNER
 *             duration: 3600
 *             language: en
 *             learningObjectives: ["Understand variables", "Learn functions"]
 *             requirements: ["Basic computer skills"]
 *     responses:
 *       200:
 *         description: Course created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher role required
 */
router.post('/', 
  requireAuth,
  requireRole('TEACHER'),
  validate({ body: createCourseSchema }),
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const payload = {
        ...req.body,
        // Auto-set createdBy from authenticated user (handle null/undefined)
        createdBy: req.body.createdBy ?? userId,
        // Auto-set instructorId from authenticated user if not provided
        instructorId: req.body.instructorId || userId,
      };
      
      // Auto-generate order if not provided (get max order + 1 for this instructor)
      if (payload.order == null) {
        const maxOrderProgram = await prisma.program.findFirst({
          where: { instructorId: payload.instructorId },
          orderBy: { order: 'desc' },
          select: { order: true },
        });
        payload.order = (maxOrderProgram?.order ?? -1) + 1;
      }
      
      const program = await service.createProgram(payload);
      res.json(program);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/courses/{id}/modules:
 *   post:
 *     summary: Add module to course
 *     description: Add a new module to a course. Only teachers can add modules.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - order
 *               - createdBy
 *             properties:
 *               title:
 *                 type: string
 *                 example: Module 1: Introduction
 *               description:
 *                 type: string
 *                 example: Introduction to the course
 *               order:
 *                 type: integer
 *                 example: 1
 *               createdBy:
 *                 type: string
 *                 example: user_123
 *     responses:
 *       200:
 *         description: Module added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Module'
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Teacher role required
 */
/**
 * @swagger
 * /api/courses/{id}/modules:
 *   get:
 *     summary: Get all modules with lessons for a course
 *     description: Get all modules and their associated lessons for a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Modules with lessons retrieved successfully
 *       404:
 *         description: Course not found
 */
router.get('/:id/modules',
    requireAuth,
    validate({ params: courseIdParamSchema }),
    async (req, res) => {
        try {
            const sections = await service.getProgramSectionsWithModules(req.params.id);
            res.json(sections);
        } catch (err) {
            res.status(400).json({ error: (err as Error).message });
        }
    }
);

router.post('/:id/sections', 
    requireAuth,
    requireRole('TEACHER'),
    validate({ params: courseIdParamSchema, body: createSectionSchema }),
    async (req, res) => {
        try{
            const programSection = await service.addSectionToProgram(req.params.id, req.body)
            res.json(programSection);
        }catch(err){
            res.status(400).json({ error: (err as Error).message });
        }
    }
)

/**
 * @swagger
 * /api/courses/{id}/modules/{moduleId}:
 *   put:
 *     summary: Update a module
 *     description: Update module details. Only teachers can update.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Module updated successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Teacher role required
 *       404:
 *         description: Module not found
 */
router.put('/:id/modules/:moduleId',
    requireAuth,
    requireRole('TEACHER'),
    validate({ params: courseIdParamSchema }),
    async (req, res) => {
        try {
            const section = await service.updateSectionInProgram(req.params.id, req.params.moduleId, req.body);
            res.json(section);
        } catch (err) {
            res.status(400).json({ error: (err as Error).message });
        }
    }
);

/**
 * @swagger
 * /api/courses/{id}/sections/{sectionId}:
 *   delete:
 *     summary: Delete a section
 *     description: Delete a section from a program. Only teachers can delete sections.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id/sections/:sectionId',
    requireAuth,
    requireRole('TEACHER'),
    validate({ params: courseIdParamSchema }),
    async (req, res) => {
        try {
            await service.deleteSection(req.params.sectionId);
            const { deleteCache } = await import('../../../../utils/cache');
            const { cacheKeys } = await import('../../../../utils/cache');
            await deleteCache(cacheKeys.program(req.params.id));
            res.json({ success: true, message: 'Section deleted successfully' });
        } catch (err) {
            res.status(400).json({ error: (err as Error).message });
        }
    }
);

/**
 * @swagger
 * /api/courses/{id}/modules/{moduleId}/lessons:
 *   post:
 *     summary: Add lesson to module
 *     description: Add a new lesson to a course module. Only teachers can add lessons.
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Lesson 1: Getting Started
 *               description:
 *                 type: string
 *                 example: Introduction to the lesson
 *               order:
 *                 type: integer
 *                 example: 1
 *               duration:
 *                 type: integer
 *                 example: 1800
 *               isPreview:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Lesson added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Teacher role required
 */
router.post('/:id/modules/:moduleId/lessons', 
  requireAuth,
  requireRole('TEACHER'), 
  async (req,res) => {
    try{
        // Add programId from route params to the request body
        const moduleData = {
            ...req.body,
            programId: req.params.id,
        };
        const module = await service.addModuleToSection(req.params.moduleId, moduleData);
        res.json(module);
    }catch(err){
        res.status(400).json({ error: (err as Error).message });
    }
})

/**
 * @swagger
 * /api/courses/{id}/lessons/{lessonId}/quiz:
 *   post:
 *     summary: Add quiz to lesson
 *     description: Add a quiz to a lesson. Only teachers can add quizzes.
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - createdBy
 *             properties:
 *               title:
 *                 type: string
 *                 example: Quiz 1
 *               description:
 *                 type: string
 *                 example: Test your knowledge
 *               instructions:
 *                 type: string
 *                 example: Answer all questions
 *               timeLimit:
 *                 type: integer
 *                 example: 3600
 *               maxAttempts:
 *                 type: integer
 *                 example: 3
 *               passingScore:
 *                 type: number
 *                 example: 70
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               createdBy:
 *                 type: string
 *                 example: user_123
 *     responses:
 *       200:
 *         description: Quiz added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz'
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Teacher role required
 */
router.post('/:id/modules/:moduleId/quiz', 
  requireAuth,
  requireRole('TEACHER'), 
  async (req,res) => {
    try{
        const quiz = await service.addQuizToModule(req.params.moduleId, req.body);
        res.json(quiz);
    }catch(err){
        res.status(400).json({ error: (err as Error).message });
    }
})

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all courses
 *     description: Get a paginated list of courses with filtering, searching, and sorting options. Public endpoint.
 *     tags: [Courses]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title/description
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: instructorId
 *         schema:
 *           type: string
 *         description: Filter by instructor ID
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [BEGINNER, INTERMEDIATE, ADVANCED, EXPERT]
 *         description: Filter by difficulty level
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *         description: Minimum rating filter
 *       - in: query
 *         name: maxRating
 *         schema:
 *           type: number
 *         description: Maximum rating filter
 *       - in: query
 *         name: minDuration
 *         schema:
 *           type: integer
 *         description: Minimum duration in seconds
 *       - in: query
 *         name: maxDuration
 *         schema:
 *           type: integer
 *         description: Maximum duration in seconds
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by language code
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of courses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseListResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string | undefined;
        const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
        const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
        const instructorId = req.query.instructorId as string | undefined;
        const categoryId = req.query.categoryId as string | undefined;
        const difficulty = req.query.difficulty as string | undefined;
        const minRating = req.query.minRating ? parseFloat(req.query.minRating as string) : undefined;
        const maxRating = req.query.maxRating ? parseFloat(req.query.maxRating as string) : undefined;
        const minDuration = req.query.minDuration ? parseInt(req.query.minDuration as string) : undefined;
        const maxDuration = req.query.maxDuration ? parseInt(req.query.maxDuration as string) : undefined;
        const language = req.query.language as string | undefined;
        const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
        
        const result = await service.getAllCollections(
            page,
            limit,
            search,
            minPrice,
            maxPrice,
            instructorId,
            categoryId,
            difficulty,
            minRating,
            maxRating,
            minDuration,
            maxDuration,
            language,
            tags,
            sortBy,
            sortOrder
        );
        
        // Add cache-control headers to prevent stale data
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

/**
 * @swagger
 * /api/courses/{id}/preview:
 *   get:
 *     summary: Get course preview content
 *     description: Get preview content (lessons and videos) for a course. Public endpoint - no authentication required.
 *     tags: [Courses]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course preview content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 course:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     thumbnailUrl:
 *                       type: string
 *                     difficulty:
 *                       type: string
 *                     instructor:
 *                       $ref: '#/components/schemas/User'
 *                 previewContent:
 *                   type: object
 *                   properties:
 *                     lessons:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           order:
 *                             type: integer
 *                           duration:
 *                             type: integer
 *                     videos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           thumbnailUrl:
 *                             type: string
 *                           duration:
 *                             type: integer
 *                           playbackUrl:
 *                             type: string
 *       404:
 *         description: Course not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
router.get('/:id/preview', async (req, res) => {
    try {
        const programId = req.params.id;
        const program = await service.getProgramById(programId);
        
        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }

        // Get preview content
        // First get ProgramModule records, then get the modules
        const programModules = await prisma.programModule.findMany({
            where: { programId },
            include: {
                module: {
                    select: {
                        id: true,
                        title: true,
                        order: true,
                        duration: true,
                        createdAt: true,
                        isPreview: true,
                    },
                },
            },
            orderBy: { order: 'asc' },
        });
        
        const previewModulesData = programModules
            .filter((pm: any) => pm.module && pm.module.isPreview)
            .map((pm: any) => pm.module!);
        
        const previewVideos = await prisma.video.findMany({
            where: {
                programId,
                isPreview: true,
            },
            select: {
                id: true,
                title: true,
                description: true,
                thumbnailUrl: true,
                duration: true,
                playbackUrl: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        res.json({
            program: {
                id: program.id,
                title: program.title,
                description: program.description,
                thumbnailUrl: program.thumbnailUrl,
                difficulty: program.difficulty,
                instructor: program.instructor,
            },
            previewContent: {
                modules: previewModulesData,
                videos: previewVideos,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch course preview' });
    }
});

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     description: Get detailed information about a specific course. Requires authentication and active subscription.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       404:
 *         description: Course not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Subscription required
 *       500:
 *         description: Server error
 */
router.get('/:id', 
  requireAuth,
  requireSubscription,
  validate({ params: courseIdParamSchema }),
  async (req, res) => {
    try{
        const program = await service.getProgramById(req.params.id);
        if (!program) return res.status(404).json({ error: 'Not found' });
        res.json(program);
    }catch(err){
        res.status(500).json({ error: 'Failed to fetch course' });
    }
  }
);

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update course
 *     description: Update course information. Only the course instructor can update.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated Course Title
 *               description:
 *                 type: string
 *                 example: Updated description
 *               price:
 *                 type: number
 *                 example: 59.99
 *               thumbnailUrl:
 *                 type: string
 *                 format: uri
 *               difficulty:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED, EXPERT]
 *               duration:
 *                 type: integer
 *               language:
 *                 type: string
 *               learningObjectives:
 *                 type: array
 *                 items:
 *                   type: string
 *               requirements:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Course updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Teacher role required
 *       404:
 *         description: Course not found
 */
router.put('/:id', 
  requireAuth,
  requireRole('TEACHER'),
  validate({ params: courseIdParamSchema, body: updateCourseSchema }),
  async (req, res) => {
    try {
      const program = await service.updateProgram(req.params.id, req.body);
      res.json(program);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Delete course
 *     description: Delete a course. Only the course instructor can delete.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Teacher role required
 *       404:
 *         description: Course not found
 */
router.delete('/:id', 
  requireAuth,
  requireRole('TEACHER'),
  validate({ params: courseIdParamSchema }),
  async (req, res) => {
    try {
      await service.deleteProgram(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

/**
 * @swagger
 * /api/courses/{id}/active-users:
 *   get:
 *     summary: Get active users in a course
 *     description: Returns a list of users who have been active in the course within a specified time period. Teacher only.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to look back for activity (default: 7)
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
 *     responses:
 *       200:
 *         description: List of active users with summary statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalActive:
 *                       type: integer
 *                     totalEnrolled:
 *                       type: integer
 *       403:
 *         description: Forbidden - Teacher role required
 *       500:
 *         description: Server error
 */
router.get('/:id/active-users',
  requireAuth,
  requireRole('TEACHER'),
  validate({ params: courseIdParamSchema }),
  async (req, res) => {
    try {
      const programId = req.params.id;
      const days = parseInt(req.query.days as string) || 7;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await enrollmentService.getActiveUsersInProgram(programId, days, page, limit);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || 'Failed to fetch active users' });
    }
  }
);

/**
 * @swagger
 * /api/courses/{id}/enrollments:
 *   get:
 *     summary: Get all enrollments for a course
 *     description: Returns a paginated list of all students enrolled in the course. Teacher only.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
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
 *     responses:
 *       200:
 *         description: List of enrolled students
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
 *       403:
 *         description: Forbidden - Teacher role required
 *       500:
 *         description: Server error
 */
router.get('/:id/enrollments',
  requireAuth,
  requireRole('TEACHER'),
  validate({ params: courseIdParamSchema }),
  async (req, res) => {
    try {
      const programId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await enrollmentService.getProgramEnrollments(programId, page, limit);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || 'Failed to fetch enrollments' });
    }
  }
);

export default router;
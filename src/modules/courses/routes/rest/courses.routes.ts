import { Router } from 'express';
import { CoursesService } from '../../services/service';
import { EnrollmentService } from '../../services/enrollment.service';
import { requireRole } from '../../../../middleware/roles';
import { requireAuth } from '../../../../middleware/auth';
import { requireSubscription } from '../../../../middleware/subscription';
import { validate } from '../../../../middleware/validation';
import { createCourseSchema, updateCourseSchema, courseIdParamSchema, createModuleSchema } from '../../../../utils/validation-schemas';
import { prisma } from '../../../../utils/prisma';

const router = Router();
const service = new CoursesService();
const enrollmentService = new EnrollmentService();

// Create course (teacher only)
router.post('/course', 
  requireRole('TEACHER'),
  validate({ body: createCourseSchema }),
  async (req, res) => {
    try {
      const course = await service.createCourse(req.body);
      res.json(course);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

router.post('/:id/modules', 
    requireRole('TEACHER'),
    validate({ params: courseIdParamSchema, body: createModuleSchema }),
    async (req, res) => {
        try{
            const courseModule = await service.addModuleToCourse(req.params.id, req.body)
            res.json(courseModule);
        }catch(err){
            res.status(400).json({ error: (err as Error).message });
        }
    }
)

//POST /api/v1/courses/{courseId}/modules/{moduleId}/lessons
router.post('/:id/modules/:moduleId/lessons', requireRole('TEACHER'), async (req,res) => {
    try{
        const lesson = await service.addLessonToModule(req.params.moduleId, req.body);
        res.json(lesson);
    }catch(err){
        res.status(400).json({ error: (err as Error).message });
    }
})

// /api/v1/courses/{courseId}/lessons/{lessonId}/quiz

router.post('/:id/lessons/:lessonId/quiz', requireRole('TEACHER'), async (req,res) => {
    try{
        const quiz = await service.addQuizToLesson(req.params.lessonId, req.body);
        res.json(quiz);
    }catch(err){
        res.status(400).json({ error: (err as Error).message });
    }
})

// Get all courses (paginated, searchable, filterable)
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
        
        const result = await service.getAllCourses(
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
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// Get course preview content (public access)
router.get('/:id/preview', async (req, res) => {
    try {
        const courseId = req.params.id;
        const course = await service.getCourseById(courseId);
        
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Get preview content
        const [previewLessons, previewVideos] = await Promise.all([
            prisma.lesson.findMany({
                where: {
                    courseId,
                    isPreview: true,
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    order: true,
                    duration: true,
                    createdAt: true,
                },
                orderBy: { order: 'asc' },
            }),
            prisma.video.findMany({
                where: {
                    courseId,
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
            }),
        ]);

        res.json({
            course: {
                id: course.id,
                title: course.title,
                description: course.description,
                thumbnailUrl: course.thumbnailUrl,
                difficulty: course.difficulty,
                instructor: course.instructor,
            },
            previewContent: {
                lessons: previewLessons,
                videos: previewVideos,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch course preview' });
    }
});

// Get single course (requires subscription for students)
router.get('/:id', 
  requireAuth,
  requireSubscription,
  validate({ params: courseIdParamSchema }),
  async (req, res) => {
    try{
        const course = await service.getCourseById(req.params.id);
        if (!course) return res.status(404).json({ error: 'Not found' });
        res.json(course);
    }catch(err){
        res.status(500).json({ error: 'Failed to fetch course' });
    }
  }
);

// Update course
router.put('/:id', 
  requireRole('TEACHER'),
  validate({ params: courseIdParamSchema, body: updateCourseSchema }),
  async (req, res) => {
    try {
      const course = await service.updateCourse(req.params.id, req.body);
      res.json(course);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

// Delete course
router.delete('/:id', 
  requireRole('TEACHER'),
  validate({ params: courseIdParamSchema }),
  async (req, res) => {
    try {
      await service.deleteCourse(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

/**
 * @swagger
 * /api/courses/{courseId}/active-users:
 *   get:
 *     summary: Get active users in a course
 *     description: Returns a list of users who have been active in the course within a specified time period
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
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
 */
router.get('/:id/active-users',
  requireAuth,
  requireRole('TEACHER'),
  validate({ params: courseIdParamSchema }),
  async (req, res) => {
    try {
      const courseId = req.params.id;
      const days = parseInt(req.query.days as string) || 7;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await enrollmentService.getActiveUsersInCourse(courseId, days, page, limit);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || 'Failed to fetch active users' });
    }
  }
);

/**
 * @swagger
 * /api/courses/{courseId}/enrollments:
 *   get:
 *     summary: Get all enrollments for a course
 *     description: Returns a paginated list of all students enrolled in the course
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
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
 */
router.get('/:id/enrollments',
  requireAuth,
  requireRole('TEACHER'),
  validate({ params: courseIdParamSchema }),
  async (req, res) => {
    try {
      const courseId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await enrollmentService.getCourseEnrollments(courseId, page, limit);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || 'Failed to fetch enrollments' });
    }
  }
);

export default router;
import { Router } from 'express';
import { CoursesService } from '../../services/service';
import { requireRole } from '../../../../middleware/roles';
import { validate } from '../../../../middleware/validation';
import { createCourseSchema, updateCourseSchema, courseIdParamSchema, createModuleSchema } from '../../../../utils/validation-schemas';

const router = Router();
const service = new CoursesService();

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
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
        
        const result = await service.getAllCourses(
            page,
            limit,
            search,
            minPrice,
            maxPrice,
            instructorId,
            sortBy,
            sortOrder
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// Get single course
router.get('/:id', 
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

export default router;
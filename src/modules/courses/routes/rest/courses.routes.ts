import { Router } from 'express';
import { CoursesService } from '../../services/service';
import { requireRole } from '../../../../middleware/roles';
import { validate } from '../../../../middleware/validation';
import { createCourseSchema, updateCourseSchema, courseIdParamSchema, createModuleSchema } from '../../../../utils/validation-schemas';

const router = Router();
const service = new CoursesService();

// Create course (teacher only)
router.post('/course', 
  requireRole('Teacher'),
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
    requireRole('Teacher'),
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
router.post('/:id/modules/:moduleId/lessons', requireRole('Teacher'), async (req,res) => {
    try{
        const lesson = await service.addLessonToModule(req.params.moduleId, req.body);
        res.json(lesson);
    }catch(err){
        res.status(400).json({ error: (err as Error).message });
    }
})

// /api/v1/courses/{courseId}/lessons/{lessonId}/quiz

router.post('/:id/lessons/:lessonId/quiz', requireRole('Teacher'), async (req,res) => {
    try{
        const quiz = await service.addQuizToLesson(req.params.lessonId, req.body);
        res.json(quiz);
    }catch(err){
        res.status(400).json({ error: (err as Error).message });
    }
})

// Get all courses (paginated)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await service.getAllCourses(page, limit);
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
  requireRole('Teacher'),
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
  requireRole('Teacher'),
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
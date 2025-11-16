import { Router } from 'express';
import { CoursesService } from '../../services/service';
import { requireRole } from '../../../../middleware/roles';

const router = Router();
const service = new CoursesService();

// Create course (tutor only)
router.post('/course', requireRole('TUTOR'), async (req, res) => {
  try {
    const course = await service.createCourse(req.body);
    res.json(course);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/:id/modules', requireRole('TUTOR'), async (req, res) => {
    try{
        const courseModule = await service.addModuleToCourse(req.params.id, req.body)
        res.json(courseModule);
    }catch(err){
        res.status(400).json({ error: (err as Error).message });
    }
})

//POST /api/v1/courses/{courseId}/modules/{moduleId}/lessons
router.post('/:id/modules/:moduleId/lessons', requireRole('TUTOR'), async (req,res) => {
    try{
        const lesson = await service.addLessonToModule(req.params.moduleId, req.body);
        res.json(lesson);
    }catch(err){
        res.status(400).json({ error: (err as Error).message });
    }
})

// /api/v1/courses/{courseId}/lessons/{lessonId}/quiz

router.post('/:id/lessons/:lessonId/quiz', requireRole('TUTOR'), async (req,res) => {
    try{
        const quiz = await service.addQuizToLesson(req.params.lessonId, req.body);
        res.json(quiz);
    }catch(err){
        res.status(400).json({ error: (err as Error).message });
    }
})

// Get all courses
router.get('/', async (req, res) => {
    try {
        const courses = await service.getAllCourses();
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// Get single course
router.get('/:id', async (req, res) => {
    try{
        const course = await service.getCourseById(req.params.id);
        if (!course) return res.status(404).json({ error: 'Not found' });
        res.json(course);
    }catch(err){
        res.status(500).json({ error: 'Failed to fetch course' });
    }
});

// Update course
router.put('/:id', requireRole('TUTOR'), async (req, res) => {
  try {
    const course = await service.updateCourse(req.params.id, req.body);
    res.json(course);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Delete course
router.delete('/:id', requireRole('TUTOR'), async (req, res) => {
  try {
    await service.deleteCourse(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
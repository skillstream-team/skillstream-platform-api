"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_1 = require("../../services/service");
const roles_1 = require("../../../../middleware/roles");
const validation_1 = require("../../../../middleware/validation");
const validation_schemas_1 = require("../../../../utils/validation-schemas");
const router = (0, express_1.Router)();
const service = new service_1.CoursesService();
// Create course (teacher only)
router.post('/course', (0, roles_1.requireRole)('Teacher'), (0, validation_1.validate)({ body: validation_schemas_1.createCourseSchema }), async (req, res) => {
    try {
        const course = await service.createCourse(req.body);
        res.json(course);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/:id/modules', (0, roles_1.requireRole)('Teacher'), (0, validation_1.validate)({ params: validation_schemas_1.courseIdParamSchema, body: validation_schemas_1.createModuleSchema }), async (req, res) => {
    try {
        const courseModule = await service.addModuleToCourse(req.params.id, req.body);
        res.json(courseModule);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
//POST /api/v1/courses/{courseId}/modules/{moduleId}/lessons
router.post('/:id/modules/:moduleId/lessons', (0, roles_1.requireRole)('Teacher'), async (req, res) => {
    try {
        const lesson = await service.addLessonToModule(req.params.moduleId, req.body);
        res.json(lesson);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// /api/v1/courses/{courseId}/lessons/{lessonId}/quiz
router.post('/:id/lessons/:lessonId/quiz', (0, roles_1.requireRole)('Teacher'), async (req, res) => {
    try {
        const quiz = await service.addQuizToLesson(req.params.lessonId, req.body);
        res.json(quiz);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Get all courses (paginated)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await service.getAllCourses(page, limit);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});
// Get single course
router.get('/:id', (0, validation_1.validate)({ params: validation_schemas_1.courseIdParamSchema }), async (req, res) => {
    try {
        const course = await service.getCourseById(req.params.id);
        if (!course)
            return res.status(404).json({ error: 'Not found' });
        res.json(course);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch course' });
    }
});
// Update course
router.put('/:id', (0, roles_1.requireRole)('Teacher'), (0, validation_1.validate)({ params: validation_schemas_1.courseIdParamSchema, body: validation_schemas_1.updateCourseSchema }), async (req, res) => {
    try {
        const course = await service.updateCourse(req.params.id, req.body);
        res.json(course);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Delete course
router.delete('/:id', (0, roles_1.requireRole)('Teacher'), (0, validation_1.validate)({ params: validation_schemas_1.courseIdParamSchema }), async (req, res) => {
    try {
        await service.deleteCourse(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;

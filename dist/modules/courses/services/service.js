"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursesService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
class CoursesService {
    // ============================================================
    // COURSE CRUD
    // ============================================================
    /**
     * @swagger
     * /courses:
     *   post:
     *     summary: Create a new course
     *     tags: [Courses]
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
     *               price:
     *                 type: number
     *               order:
     *                 type: number
     *               createdBy:
     *                 type: number
     *               instructorId:
     *                 type: number
     *     responses:
     *       201:
     *         description: Course created successfully
     */
    async createCourse(data) {
        // Validate instructor exists
        const instructor = await prisma_1.prisma.user.findUnique({
            where: { id: data.instructorId },
        });
        if (!instructor) {
            throw new Error('Instructor not found');
        }
        const course = await prisma_1.prisma.course.create({ data });
        // Invalidate course list cache
        await (0, cache_1.deleteCachePattern)('courses:list:*');
        return course;
    }
    /**
     * @swagger
     * /courses:
     *   get:
     *     summary: Get all courses (paginated)
     *     tags: [Courses]
     *     parameters:
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
     *           maximum: 100
     *     responses:
     *       200:
     *         description: Paginated list of courses
     */
    async getAllCourses(page = 1, limit = 20) {
        const cacheKey = cache_1.cacheKeys.courseList(page, limit);
        // Try cache first
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            return cached;
        }
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100); // Max 100 per page
        const [courses, total] = await Promise.all([
            prisma_1.prisma.course.findMany({
                skip,
                take,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    price: true,
                    order: true,
                    createdAt: true,
                    updatedAt: true,
                    createdBy: true,
                    instructorId: true,
                    instructor: {
                        select: { id: true, username: true, email: true }
                    },
                    _count: {
                        select: {
                            enrollments: true,
                            lessons: true,
                            quizzes: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.course.count(),
        ]);
        const result = {
            data: courses,
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
        };
        // Cache result
        await (0, cache_1.setCache)(cacheKey, result, cache_1.CACHE_TTL.SHORT);
        return result;
    }
    /**
     * @swagger
     * /courses/{id}:
     *   get:
     *     summary: Get a specific course by ID
     *     tags: [Courses]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Course details
     *       404:
     *         description: Course not found
     */
    async getCourseById(id) {
        const cacheKey = cache_1.cacheKeys.course(id);
        // Try cache first
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            return cached;
        }
        const course = await prisma_1.prisma.course.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                description: true,
                price: true,
                order: true,
                createdAt: true,
                updatedAt: true,
                createdBy: true,
                instructorId: true,
                instructor: {
                    select: { id: true, username: true, email: true }
                },
                modules: {
                    select: { id: true, title: true, order: true }
                },
                lessons: {
                    select: { id: true, title: true, order: true }
                },
                quizzes: {
                    select: { id: true, title: true }
                },
                _count: {
                    select: {
                        enrollments: true,
                        payments: true,
                    }
                }
            },
        });
        if (course) {
            // Cache result
            await (0, cache_1.setCache)(cacheKey, course, cache_1.CACHE_TTL.MEDIUM);
        }
        return course;
    }
    /**
     * @swagger
     * /courses/{id}:
     *   patch:
     *     summary: Update course information
     *     tags: [Courses]
     */
    async updateCourse(id, data) {
        const course = await prisma_1.prisma.course.update({
            where: { id },
            data,
            select: {
                id: true,
                title: true,
                description: true,
                price: true,
                order: true,
                createdAt: true,
                updatedAt: true,
                createdBy: true,
                instructorId: true,
                instructor: {
                    select: { id: true, username: true, email: true }
                },
                modules: {
                    select: { id: true, title: true, order: true }
                },
                lessons: {
                    select: { id: true, title: true, order: true }
                },
                quizzes: {
                    select: { id: true, title: true }
                }
            },
        });
        // Invalidate caches
        await (0, cache_1.deleteCache)(cache_1.cacheKeys.course(id));
        await (0, cache_1.deleteCachePattern)('courses:list:*');
        return course;
    }
    /**
     * @swagger
     * /courses/{id}:
     *   delete:
     *     summary: Delete a course by ID
     *     tags: [Courses]
     */
    async deleteCourse(id) {
        await prisma_1.prisma.course.delete({ where: { id } });
        // Invalidate caches
        await (0, cache_1.deleteCache)(cache_1.cacheKeys.course(id));
        await (0, cache_1.deleteCachePattern)('courses:list:*');
    }
    // ============================================================
    // MODULE CRUD
    // ============================================================
    /**
     * @swagger
     * /courses/{courseId}/modules:
     *   post:
     *     summary: Add a module to a course
     *     tags: [Modules]
     */
    async addModuleToCourse(courseId, data) {
        return prisma_1.prisma.courseModule.create({
            data: { ...data, courseId, content: data.content ?? {}, description: data.description ?? '' },
        });
    }
    /**
     * @swagger
     * /modules/{moduleId}:
     *   get:
     *     summary: Get a module by ID
     *     tags: [Modules]
     */
    async getModuleById(moduleId) {
        return prisma_1.prisma.courseModule.findUnique({
            where: { id: moduleId },
            include: {
                quizzes: true,
                assignments: true,
                progress: true,
                course: { include: { lessons: true } },
            },
        });
    }
    /**
     * @swagger
     * /modules/{moduleId}:
     *   patch:
     *     summary: Update a module
     *     tags: [Modules]
     */
    async updateModule(moduleId, data) {
        return prisma_1.prisma.courseModule.update({ where: { id: moduleId }, data });
    }
    /**
     * @swagger
     * /modules/{moduleId}:
     *   delete:
     *     summary: Delete a module
     *     tags: [Modules]
     */
    async deleteModule(moduleId) {
        return prisma_1.prisma.courseModule.delete({ where: { id: moduleId } });
    }
    // ============================================================
    // LESSON CRUD
    // ============================================================
    /**
     * @swagger
     * /modules/{moduleId}/lessons:
     *   post:
     *     summary: Add a lesson to a module
     *     tags: [Lessons]
     */
    async addLessonToModule(moduleId, data) {
        return prisma_1.prisma.lesson.create({ data });
    }
    /**
     * @swagger
     * /lessons/{lessonId}:
     *   patch:
     *     summary: Update lesson details
     *     tags: [Lessons]
     */
    async updateLesson(lessonId, data) {
        return prisma_1.prisma.lesson.update({ where: { id: lessonId }, data });
    }
    /**
     * @swagger
     * /lessons/{lessonId}:
     *   delete:
     *     summary: Delete a lesson
     *     tags: [Lessons]
     */
    async deleteLesson(lessonId) {
        return prisma_1.prisma.lesson.delete({ where: { id: lessonId } });
    }
    // ============================================================
    // QUIZZES
    // ============================================================
    /**
     * @swagger
     * /lessons/{lessonId}/quizzes:
     *   post:
     *     summary: Add a quiz to a lesson
     *     tags: [Quizzes]
     */
    async addQuizToLesson(lessonId, data) {
        return prisma_1.prisma.quiz.create({
            data: {
                title: data.title,
                course: { connect: { id: data.courseId } },
                Lesson: { connect: { id: lessonId } },
                creator: { connect: { id: data.createdBy } },
                description: data.description,
                instructions: data.instructions,
                timeLimit: data.timeLimit,
                maxAttempts: data.maxAttempts,
                passingScore: data.passingScore,
                dueDate: data.dueDate,
                isPublished: data.isPublished ?? false,
                questions: {
                    create: data.questions.map(q => ({
                        question: q.question,
                        type: q.type,
                        options: q.options ?? null,
                        correctAnswer: q.correctAnswer ?? null,
                        points: q.points ?? 1,
                        order: q.order,
                        explanation: q.explanation ?? null,
                    })),
                },
            },
            include: { questions: true },
        });
    }
    /**
     * @swagger
     * /quizzes/{quizId}:
     *   patch:
     *     summary: Update quiz details
     *     tags: [Quizzes]
     */
    async updateQuiz(quizId, data) {
        return prisma_1.prisma.quiz.update({ where: { id: quizId }, data });
    }
    /**
     * @swagger
     * /quizzes/{quizId}:
     *   delete:
     *     summary: Delete a quiz
     *     tags: [Quizzes]
     */
    async deleteQuiz(quizId) {
        return prisma_1.prisma.quiz.delete({ where: { id: quizId } });
    }
    // ============================================================
    // ASSIGNMENTS, MATERIALS, ENROLLMENTS, ETC.
    // ============================================================
    /**
     * @swagger
     * /modules/{moduleId}/assignments:
     *   post:
     *     summary: Add an assignment to a module
     *     tags: [Assignments]
     */
    async addAssignmentToModule(moduleId, data) {
        return prisma_1.prisma.assignment.create({ data: { ...data, moduleId } });
    }
}
exports.CoursesService = CoursesService;

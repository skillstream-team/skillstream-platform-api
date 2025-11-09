import { Prisma } from '@prisma/client';
import { CreateQuizQuestionDto } from '../dtos/learning.dto';
import { prisma } from '../../../utils/prisma';

export class CoursesService {
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
    async createCourse(data: {
        title: string;
        description?: string;
        price: number;
        order: number;
        createdBy: number;
        instructorId: number;
    }) {
        return prisma.course.create({ data });
    }

    /**
     * @swagger
     * /courses:
     *   get:
     *     summary: Get all courses
     *     tags: [Courses]
     *     responses:
     *       200:
     *         description: List of all courses
     */
    async getAllCourses() {
        return prisma.course.findMany({
            include: {
                instructor: true,
                modules: true,
                lessons: true,
                quizzes: true,
                enrollments: { include: { student: true } },
                payments: true,
            },
        });
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
    async getCourseById(id: number) {
        return prisma.course.findUnique({
            where: { id },
            include: {
                instructor: true,
                modules: true,
                lessons: true,
                quizzes: true,
                enrollments: { include: { student: true } },
                payments: true,
            },
        });
    }

    /**
     * @swagger
     * /courses/{id}:
     *   patch:
     *     summary: Update course information
     *     tags: [Courses]
     */
    async updateCourse(id: number, data: Prisma.CourseUpdateInput) {
        return prisma.course.update({
            where: { id },
            data,
            include: { modules: true, lessons: true, quizzes: true },
        });
    }

    /**
     * @swagger
     * /courses/{id}:
     *   delete:
     *     summary: Delete a course by ID
     *     tags: [Courses]
     */
    async deleteCourse(id: number) {
        return prisma.course.delete({ where: { id } });
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
    async addModuleToCourse(courseId: number, data: {
        title: string;
        content?: Prisma.InputJsonValue;
        description?: string;
        order: number;
        isPublished?: boolean;
        createdBy: number;
    }) {
        return prisma.courseModule.create({
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
    async getModuleById(moduleId: number) {
        return prisma.courseModule.findUnique({
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
    async updateModule(moduleId: number, data: Prisma.CourseModuleUpdateInput) {
        return prisma.courseModule.update({ where: { id: moduleId }, data });
    }

    /**
     * @swagger
     * /modules/{moduleId}:
     *   delete:
     *     summary: Delete a module
     *     tags: [Modules]
     */
    async deleteModule(moduleId: number) {
        return prisma.courseModule.delete({ where: { id: moduleId } });
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
    async addLessonToModule(moduleId: number, data: {
        title: string;
        content?: Prisma.InputJsonValue;
        order: number;
        courseId: number;
    }) {
        return prisma.lesson.create({ data });
    }

    /**
     * @swagger
     * /lessons/{lessonId}:
     *   patch:
     *     summary: Update lesson details
     *     tags: [Lessons]
     */
    async updateLesson(lessonId: number, data: Partial<{ title: string; content: Prisma.InputJsonValue; order: number }>) {
        return prisma.lesson.update({ where: { id: lessonId }, data });
    }

    /**
     * @swagger
     * /lessons/{lessonId}:
     *   delete:
     *     summary: Delete a lesson
     *     tags: [Lessons]
     */
    async deleteLesson(lessonId: number) {
        return prisma.lesson.delete({ where: { id: lessonId } });
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
    async addQuizToLesson(lessonId: number, data: {
        title: string;
        courseId: number;
        description?: string;
        instructions?: string;
        timeLimit?: number;
        maxAttempts?: number;
        passingScore?: number;
        dueDate?: Date;
        isPublished?: boolean;
        questions: CreateQuizQuestionDto[];
        createdBy: number;
    }) {
        return prisma.quiz.create({
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
    async updateQuiz(quizId: number, data: Partial<{ title: string; description: string; instructions: string; timeLimit: number; maxAttempts: number; passingScore: number; dueDate: Date; isPublished: boolean }>) {
        return prisma.quiz.update({ where: { id: quizId }, data });
    }

    /**
     * @swagger
     * /quizzes/{quizId}:
     *   delete:
     *     summary: Delete a quiz
     *     tags: [Quizzes]
     */
    async deleteQuiz(quizId: number) {
        return prisma.quiz.delete({ where: { id: quizId } });
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
    async addAssignmentToModule(moduleId: number, data: {
        title: string;
        description?: string;
        instructions?: string;
        type: string;
        maxScore?: number;
        dueDate?: Date;
        isPublished?: boolean;
        createdBy: number;
        courseId: number;
    }) {
        return prisma.assignment.create({ data: { ...data, moduleId } });
    }

    // (Continue in same style for updateAssignment, deleteAssignment, materials, enrollments, progress, achievements, etc.)
}
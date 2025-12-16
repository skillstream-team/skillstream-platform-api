"use strict";
/**
 * @fileoverview Learning Management Service
 * @description Comprehensive learning management system with modules, quizzes, assignments, progress tracking, and gamification
 * @version 1.0.0
 * @author SkillStream Platform
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningService = void 0;
const prisma_1 = require("../../../utils/prisma");
/**
 * @class LearningService
 * @description Advanced learning management service with comprehensive features
 *
 * @swagger
 * @tags Learning Management
 * @description Provides advanced learning features including course modules, quizzes, assignments, progress tracking, and gamification
 */
class LearningService {
    // ===========================================
    // COURSE MODULE MANAGEMENT
    // ===========================================
    /**
     * @swagger
     * /api/learning/modules:
     *   post:
     *     summary: Create a new course module
     *     description: Creates a structured module within a course to organize content
     *     tags: [Learning Management]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [courseId, title, order, createdBy]
     *             properties:
     *               courseId:
     *                 type: integer
     *                 description: ID of the course this module belongs to
     *                 example: 1
     *               title:
     *                 type: string
     *                 description: Module title
     *                 example: "Introduction to React"
     *               description:
     *                 type: string
     *                 description: Module description
     *                 example: "Learn the fundamentals of React development"
     *               order:
     *                 type: integer
     *                 description: Module order within the course
     *                 example: 1
     *               createdBy:
     *                 type: integer
     *                 description: ID of the user creating the module
     *                 example: 1
     *     responses:
     *       201:
     *         description: Module created successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/CourseModuleResponse'
     *       400:
     *         description: Invalid input data
     *       404:
     *         description: Course not found
     *       500:
     *         description: Internal server error
     */
    async createCourseModule(data) {
        try {
            // Validate course exists
            const course = await prisma_1.prisma.courseModule.findUnique({
                where: { id: data.courseId },
            });
            if (!course) {
                throw new Error('Course not found');
            }
            // Validate user exists and has permission
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: data.createdBy },
            });
            if (!user) {
                throw new Error('User not found');
            }
            // Create module
            const module = await prisma_1.prisma.courseModule.create({
                data: {
                    title: data.title,
                    courseId: data.courseId,
                    description: data.description,
                    order: data.order,
                    createdBy: data.createdBy,
                },
                include: {
                    creator: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    quizzes: {
                        include: {
                            creator: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true,
                                },
                            },
                            questions: true,
                            attempts: {
                                include: {
                                    student: {
                                        select: {
                                            id: true,
                                            username: true,
                                            email: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    assignments: true,
                    progress: true,
                },
            });
            return { ...module, lessons: [] };
        }
        catch (error) {
            throw new Error(`Failed to create course module: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * @swagger
     * /api/learning/modules/{id}:
     *   get:
     *     summary: Get course module by ID
     *     description: Retrieves detailed information about a specific course module
     *     tags: [Learning Management]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: Module ID
     *         example: 1
     *     responses:
     *       200:
     *         description: Module retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/CourseModuleResponse'
     *       404:
     *         description: Module not found
     *       500:
     *         description: Internal server error
     */
    async getCourseModule(moduleId) {
        try {
            const module = await prisma_1.prisma.courseModule.findUnique({
                where: { id: moduleId },
                include: {
                    creator: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    quizzes: {
                        include: {
                            questions: true,
                            attempts: true,
                        },
                    },
                    assignments: true,
                    progress: true,
                },
            });
            return module;
        }
        catch (error) {
            throw new Error(`Failed to get course module: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * @swagger
     * /api/learning/courses/{courseId}/modules:
     *   get:
     *     summary: Get all modules for a course
     *     description: Retrieves all modules belonging to a specific course
     *     tags: [Learning Management]
     *     parameters:
     *       - in: path
     *         name: courseId
     *         required: true
     *         schema:
     *           type: integer
     *         description: Course ID
     *         example: 1
     *     responses:
     *       200:
     *         description: Modules retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/CourseModuleResponse'
     *       404:
     *         description: Course not found
     *       500:
     *         description: Internal server error
     */
    async getCourseModules(courseId) {
        try {
            const modules = await prisma_1.prisma.courseModule.findMany({
                where: { courseId },
                include: {
                    creator: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    quizzes: {
                        include: {
                            creator: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true,
                                },
                            },
                            questions: true,
                            attempts: {
                                include: {
                                    student: {
                                        select: {
                                            id: true,
                                            username: true,
                                            email: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    assignments: true,
                    progress: true,
                },
                orderBy: { order: 'asc' },
            });
            return modules.map(module => ({ ...module, lessons: [] }));
        }
        catch (error) {
            throw new Error(`Failed to get course modules: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // ===========================================
    // QUIZ MANAGEMENT
    // ===========================================
    /**
     * @swagger
     * /api/learning/quizzes:
     *   post:
     *     summary: Create a new quiz
     *     description: Creates an assessment quiz with configurable settings
     *     tags: [Learning Management]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [courseId, title, createdBy]
     *             properties:
     *               courseId:
     *                 type: integer
     *                 description: ID of the course
     *                 example: 1
     *               moduleId:
     *                 type: integer
     *                 description: ID of the module (optional)
     *                 example: 1
     *               title:
     *                 type: string
     *                 description: Quiz title
     *                 example: "React Fundamentals Quiz"
     *               description:
     *                 type: string
     *                 description: Quiz description
     *                 example: "Test your knowledge of React basics"
     *               instructions:
     *                 type: string
     *                 description: Quiz instructions
     *                 example: "Answer all questions carefully"
     *               timeLimit:
     *                 type: integer
     *                 description: Time limit in minutes
     *                 example: 30
     *               maxAttempts:
     *                 type: integer
     *                 description: Maximum number of attempts
     *                 example: 3
     *               passingScore:
     *                 type: number
     *                 description: Minimum score to pass (percentage)
     *                 example: 70
     *               dueDate:
     *                 type: string
     *                 format: date-time
     *                 description: Quiz due date
     *                 example: "2024-12-31T23:59:59Z"
     *               createdBy:
     *                 type: integer
     *                 description: ID of the user creating the quiz
     *                 example: 1
     *     responses:
     *       201:
     *         description: Quiz created successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/QuizResponse'
     *       400:
     *         description: Invalid input data
     *       404:
     *         description: Course or module not found
     *       500:
     *         description: Internal server error
     */
    async createQuiz(data) {
        try {
            // Validate course exists
            const course = await prisma_1.prisma.course.findUnique({
                where: { id: data.courseId },
            });
            if (!course) {
                throw new Error('Course not found');
            }
            // Validate module exists if provided
            if (data.moduleId) {
                const module = await prisma_1.prisma.courseModule.findUnique({
                    where: { id: data.moduleId },
                });
                if (!module) {
                    throw new Error('Module not found');
                }
            }
            // Create quiz
            const quiz = await prisma_1.prisma.quiz.create({
                data: {
                    courseId: data.courseId,
                    moduleId: data.moduleId,
                    title: data.title,
                    description: data.description,
                    instructions: data.instructions,
                    timeLimit: data.timeLimit,
                    maxAttempts: data.maxAttempts,
                    passingScore: data.passingScore,
                    dueDate: data.dueDate,
                    createdBy: data.createdBy,
                },
                include: {
                    creator: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    questions: true,
                    attempts: {
                        include: {
                            student: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            });
            return quiz;
        }
        catch (error) {
            throw new Error(`Failed to create quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * @swagger
     * /api/learning/quizzes/{quizId}/questions:
     *   post:
     *     summary: Add a question to a quiz
     *     description: Adds a new question to an existing quiz
     *     tags: [Learning Management]
     *     parameters:
     *       - in: path
     *         name: quizId
     *         required: true
     *         schema:
     *           type: integer
     *         description: Quiz ID
     *         example: 1
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [question, type, order]
     *             properties:
     *               question:
     *                 type: string
     *                 description: Question text
     *                 example: "What is React?"
     *               type:
     *                 type: string
     *                 enum: [multiple_choice, true_false, fill_blank, essay]
     *                 description: Question type
     *                 example: "multiple_choice"
     *               options:
     *                 type: array
     *                 items:
     *                   type: string
     *                 description: Answer options (for multiple choice)
     *                 example: ["A JavaScript library", "A database", "A server"]
     *               correctAnswer:
     *                 type: string
     *                 description: Correct answer
     *                 example: "A JavaScript library"
     *               points:
     *                 type: integer
     *                 description: Points for this question
     *                 example: 5
     *               order:
     *                 type: integer
     *                 description: Question order
     *                 example: 1
     *               explanation:
     *                 type: string
     *                 description: Explanation for the correct answer
     *                 example: "React is a JavaScript library for building user interfaces"
     *     responses:
     *       201:
     *         description: Question added successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/QuizQuestionResponse'
     *       400:
     *         description: Invalid input data
     *       404:
     *         description: Quiz not found
     *       500:
     *         description: Internal server error
     */
    async addQuizQuestion(data) {
        try {
            // Validate quiz exists
            const quiz = await prisma_1.prisma.quiz.findUnique({
                where: { id: data.quizId },
            });
            if (!quiz) {
                throw new Error('Quiz not found');
            }
            // Create question
            const question = await prisma_1.prisma.quizQuestion.create({
                data: {
                    quizId: data.quizId,
                    question: data.question,
                    type: data.type,
                    options: data.options,
                    correctAnswer: data.correctAnswer,
                    points: data.points || 1,
                    order: data.order,
                    explanation: data.explanation,
                },
            });
            return question;
        }
        catch (error) {
            throw new Error(`Failed to add quiz question: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * @swagger
     * /api/learning/quizzes/{quizId}/attempts:
     *   post:
     *     summary: Start a quiz attempt
     *     description: Starts a new quiz attempt for a student
     *     tags: [Learning Management]
     *     parameters:
     *       - in: path
     *         name: quizId
     *         required: true
     *         schema:
     *           type: integer
     *         description: Quiz ID
     *         example: 1
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [studentId]
     *             properties:
     *               studentId:
     *                 type: integer
     *                 description: ID of the student taking the quiz
     *                 example: 1
     *     responses:
     *       201:
     *         description: Quiz attempt started successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/QuizAttemptResponse'
     *       400:
     *         description: Invalid input data or attempt limit reached
     *       404:
     *         description: Quiz or student not found
     *       500:
     *         description: Internal server error
     */
    async startQuizAttempt(data) {
        try {
            // Validate quiz exists
            const quiz = await prisma_1.prisma.quiz.findUnique({
                where: { id: data.quizId },
                include: { questions: true },
            });
            if (!quiz) {
                throw new Error('Quiz not found');
            }
            // Check if student has reached max attempts
            if (quiz.maxAttempts) {
                const attemptCount = await prisma_1.prisma.quizAttempt.count({
                    where: {
                        quizId: data.quizId,
                        studentId: data.studentId,
                    },
                });
                if (attemptCount >= quiz.maxAttempts) {
                    throw new Error('Maximum attempts reached');
                }
            }
            // Calculate max score
            const maxScore = quiz.questions.reduce((sum, question) => sum + question.points, 0);
            // Create attempt
            const attempt = await prisma_1.prisma.quizAttempt.create({
                data: {
                    quizId: data.quizId,
                    studentId: data.studentId,
                    maxScore,
                },
                include: {
                    student: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
            });
            return attempt;
        }
        catch (error) {
            throw new Error(`Failed to start quiz attempt: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // ===========================================
    // PROGRESS TRACKING
    // ===========================================
    /**
     * @swagger
     * /api/learning/progress:
     *   post:
     *     summary: Update student progress
     *     description: Updates or creates progress tracking for a student's course activity
     *     tags: [Learning Management]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [studentId, courseId, type, itemId, status]
     *             properties:
     *               studentId:
     *                 type: integer
     *                 description: ID of the student
     *                 example: 1
     *               courseId:
     *                 type: integer
     *                 description: ID of the course
     *                 example: 1
     *               moduleId:
     *                 type: integer
     *                 description: ID of the module (optional)
     *                 example: 1
     *               type:
     *                 type: string
     *                 enum: [module, quiz, assignment, video, material]
     *                 description: Type of activity
     *                 example: "quiz"
     *               itemId:
     *                 type: integer
     *                 description: ID of the specific item
     *                 example: 1
     *               status:
     *                 type: string
     *                 enum: [not_started, in_progress, completed, passed, failed]
     *                 description: Current status
     *                 example: "completed"
     *               progress:
     *                 type: number
     *                 minimum: 0
     *                 maximum: 100
     *                 description: Progress percentage
     *                 example: 100
     *               score:
     *                 type: number
     *                 description: Score achieved
     *                 example: 85
     *               timeSpent:
     *                 type: integer
     *                 description: Time spent in seconds
     *                 example: 1800
     *     responses:
     *       201:
     *         description: Progress updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ProgressResponse'
     *       400:
     *         description: Invalid input data
     *       404:
     *         description: Student, course, or item not found
     *       500:
     *         description: Internal server error
     */
    async updateProgress(data) {
        try {
            // Validate student exists
            const student = await prisma_1.prisma.user.findUnique({
                where: { id: data.studentId },
            });
            if (!student) {
                throw new Error('Student not found');
            }
            // Validate course exists
            const course = await prisma_1.prisma.course.findUnique({
                where: { id: data.courseId },
            });
            if (!course) {
                throw new Error('Course not found');
            }
            // Upsert progress record
            const progress = await prisma_1.prisma.progress.upsert({
                where: {
                    studentId_courseId_type_itemId: {
                        studentId: data.studentId,
                        courseId: data.courseId,
                        type: data.type,
                        itemId: data.itemId,
                    },
                },
                update: {
                    status: data.status,
                    progress: data.progress || 0,
                    score: data.score,
                    timeSpent: data.timeSpent,
                    lastAccessed: new Date(),
                    completedAt: data.status === 'completed' ? new Date() : undefined,
                },
                create: {
                    studentId: data.studentId,
                    courseId: data.courseId,
                    moduleId: data.moduleId,
                    type: data.type,
                    itemId: data.itemId,
                    status: data.status,
                    progress: data.progress || 0,
                    score: data.score,
                    timeSpent: data.timeSpent,
                    lastAccessed: new Date(),
                    completedAt: data.status === 'completed' ? new Date() : undefined,
                },
                include: {
                    student: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    course: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    module: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            });
            // Check if course is completed and auto-issue certificate if needed
            // Only check if this progress update marks something as completed
            if (data.status === 'completed' || data.status === 'passed') {
                try {
                    // Import certificate service dynamically to avoid circular dependency
                    const { certificateService } = await Promise.resolve().then(() => __importStar(require('./certificate.service')));
                    await certificateService.autoIssueCertificate(data.studentId, data.courseId);
                }
                catch (certError) {
                    // Log but don't fail progress update if certificate issuance fails
                    console.warn('Certificate auto-issuance failed:', certError);
                }
            }
            return progress;
        }
        catch (error) {
            throw new Error(`Failed to update progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get quiz attempts with pagination
     */
    async getQuizAttempts(quizId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const [attempts, total] = await Promise.all([
            prisma_1.prisma.quizAttempt.findMany({
                where: { quizId },
                skip,
                take,
                include: {
                    student: {
                        select: { id: true, username: true, email: true }
                    },
                    grader: {
                        select: { id: true, username: true, email: true }
                    }
                },
                orderBy: { startedAt: 'desc' },
            }),
            prisma_1.prisma.quizAttempt.count({ where: { quizId } }),
        ]);
        return {
            data: attempts,
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * Get student quiz attempts with pagination
     */
    async getStudentQuizAttempts(studentId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const [attempts, total] = await Promise.all([
            prisma_1.prisma.quizAttempt.findMany({
                where: { studentId },
                skip,
                take,
                include: {
                    student: {
                        select: { id: true, username: true, email: true }
                    },
                    quiz: {
                        select: { id: true, title: true, courseId: true }
                    },
                    grader: {
                        select: { id: true, username: true, email: true }
                    }
                },
                orderBy: { startedAt: 'desc' },
            }),
            prisma_1.prisma.quizAttempt.count({ where: { studentId } }),
        ]);
        return {
            data: attempts,
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * Get assignment submissions with pagination
     */
    async getAssignmentSubmissions(assignmentId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const [submissions, total] = await Promise.all([
            prisma_1.prisma.submission.findMany({
                where: { assignmentId },
                skip,
                take,
                include: {
                    student: {
                        select: { id: true, username: true, email: true }
                    }
                },
                orderBy: { submittedAt: 'desc' },
            }),
            prisma_1.prisma.submission.count({ where: { assignmentId } }),
        ]);
        return {
            data: submissions,
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
        };
    }
    // ===========================================
    // ANALYTICS & INSIGHTS
    // ===========================================
    /**
     * @swagger
     * /api/learning/analytics/courses/{courseId}:
     *   get:
     *     summary: Get learning analytics for a course
     *     description: Retrieves comprehensive analytics and insights for a course
     *     tags: [Learning Management]
     *     parameters:
     *       - in: path
     *         name: courseId
     *         required: true
     *         schema:
     *           type: integer
     *         description: Course ID
     *         example: 1
     *     responses:
     *       200:
     *         description: Analytics retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/LearningAnalytics'
     *       404:
     *         description: Course not found
     *       500:
     *         description: Internal server error
     */
    async getLearningAnalytics(courseId) {
        try {
            // Validate course exists
            const course = await prisma_1.prisma.course.findUnique({
                where: { id: courseId },
            });
            if (!course) {
                throw new Error('Course not found');
            }
            // Get basic course statistics
            const [totalStudents, completedStudents, averageScore, averageTimeSpent, moduleProgress, quizPerformance, assignmentPerformance, engagementMetrics,] = await Promise.all([
                // Total students enrolled
                prisma_1.prisma.enrollment.count({
                    where: { courseId },
                }),
                // Students who completed the course
                prisma_1.prisma.progress.count({
                    where: {
                        courseId,
                        status: 'completed',
                        type: 'module',
                    },
                }),
                // Average score across all activities
                prisma_1.prisma.progress.aggregate({
                    where: { courseId },
                    _avg: { score: true },
                }),
                // Average time spent
                prisma_1.prisma.progress.aggregate({
                    where: { courseId },
                    _avg: { timeSpent: true },
                }),
                // Module progress analytics
                this.getModuleProgressAnalytics(courseId),
                // Quiz performance analytics
                this.getQuizPerformanceAnalytics(courseId),
                // Assignment performance analytics
                this.getAssignmentPerformanceAnalytics(courseId),
                // Engagement metrics
                this.getEngagementMetrics(courseId),
            ]);
            const completionRate = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0;
            return {
                courseId,
                totalStudents,
                completionRate,
                averageScore: averageScore._avg.score || 0,
                averageTimeSpent: averageTimeSpent._avg.timeSpent || 0,
                moduleProgress,
                quizPerformance,
                assignmentPerformance,
                engagementMetrics,
            };
        }
        catch (error) {
            throw new Error(`Failed to get learning analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // ===========================================
    // PRIVATE HELPER METHODS
    // ===========================================
    async getModuleProgressAnalytics(courseId) {
        const modules = await prisma_1.prisma.courseModule.findMany({
            where: { courseId },
            include: {
                progress: true,
            },
        });
        return modules.map(module => {
            const totalStudents = module.progress.length;
            const completedStudents = module.progress.filter(p => p.status === 'completed').length;
            const completionRate = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0;
            const averageTimeSpent = module.progress.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / totalStudents || 0;
            return {
                moduleId: module.id,
                title: module.title,
                completionRate,
                averageTimeSpent,
                studentCount: totalStudents,
            };
        });
    }
    async getQuizPerformanceAnalytics(courseId) {
        const quizzes = await prisma_1.prisma.quiz.findMany({
            where: { courseId },
            include: {
                attempts: true,
            },
        });
        return quizzes.map(quiz => {
            const attempts = quiz.attempts;
            const averageScore = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / attempts.length || 0;
            const passedAttempts = attempts.filter(attempt => attempt.isPassed).length;
            const passRate = attempts.length > 0 ? (passedAttempts / attempts.length) * 100 : 0;
            const averageTimeSpent = attempts.reduce((sum, attempt) => sum + (attempt.timeSpent || 0), 0) / attempts.length || 0;
            return {
                quizId: quiz.id,
                title: quiz.title,
                averageScore,
                passRate,
                attemptCount: attempts.length,
                averageTimeSpent,
            };
        });
    }
    async getAssignmentPerformanceAnalytics(courseId) {
        const assignments = await prisma_1.prisma.assignment.findMany({
            where: { courseId },
            include: {
                submissions: true,
            },
        });
        return assignments.map(assignment => {
            const submissions = assignment.submissions;
            const submissionRate = submissions.length > 0 ? (submissions.length / submissions.length) * 100 : 0;
            const averageScore = submissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / submissions.length || 0;
            const onTimeSubmissions = submissions.filter(sub => assignment.dueDate ? sub.submittedAt <= assignment.dueDate : true).length;
            const onTimeSubmissionRate = submissions.length > 0 ? (onTimeSubmissions / submissions.length) * 100 : 0;
            return {
                assignmentId: assignment.id,
                title: assignment.title,
                submissionRate,
                averageScore,
                onTimeSubmissionRate,
            };
        });
    }
    async getEngagementMetrics(courseId) {
        // This would typically involve more complex queries
        // For now, returning basic metrics
        return {
            videoViews: 0,
            materialDownloads: 0,
            forumPosts: 0,
            questionAsks: 0,
            averageSessionTime: 0,
            returnRate: 0,
        };
    }
}
exports.LearningService = LearningService;
async function updateProgress(studentId, courseId, type, itemId, status, score, timeSpent) {
    const existing = await prisma_1.prisma.progress.findUnique({
        where: { studentId_courseId_type_itemId: { studentId, courseId, type, itemId } }
    });
    if (existing) {
        return prisma_1.prisma.progress.update({
            where: { id: existing.id },
            data: {
                status,
                score,
                timeSpent: (existing.timeSpent ?? 0) + (timeSpent ?? 0),
                progress: score ? Math.min(score, 100) : existing.progress,
                lastAccessed: new Date(),
                completedAt: status === 'completed' ? new Date() : existing.completedAt,
            }
        });
    }
    else {
        return prisma_1.prisma.progress.create({
            data: {
                studentId,
                courseId,
                type,
                itemId,
                status,
                score,
                timeSpent,
                progress: score ?? 0,
                lastAccessed: new Date(),
                completedAt: status === 'completed' ? new Date() : null
            }
        });
    }
}
async function getCourseProgress(studentId, courseId) {
    // get all items for course
    const progress = await prisma_1.prisma.progress.findMany({
        where: { studentId, courseId }
    });
    // group by type or module
    const moduleIds = [...new Set(progress.map(p => p.moduleId).filter(Boolean))];
    let totalProgress = 0;
    let modulesCounted = 0;
    for (const moduleId of moduleIds) {
        const moduleProgress = progress.filter(p => p.moduleId === moduleId);
        if (moduleProgress.length) {
            const avg = moduleProgress.reduce((sum, p) => sum + (p.progress ?? 0), 0) / moduleProgress.length;
            totalProgress += avg;
            modulesCounted++;
        }
    }
    const courseCompletion = modulesCounted ? totalProgress / modulesCounted : 0;
    return courseCompletion; // 0-100%
}

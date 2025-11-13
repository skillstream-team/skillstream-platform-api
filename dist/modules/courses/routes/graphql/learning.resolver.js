"use strict";
/**
 * @fileoverview Learning Management GraphQL Resolver
 * @description Comprehensive GraphQL API for advanced learning features
 * @version 1.0.0
 * @author SkillStream Platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.learningSchema = void 0;
const graphql_1 = require("graphql");
const learning_service_1 = require("../../services/learning.service");
const learningService = new learning_service_1.LearningService();
// ===========================================
// GRAPHQL TYPES
// ===========================================
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: User ID
 *         username:
 *           type: string
 *           description: Username
 *         email:
 *           type: string
 *           description: Email address
 */
const UserType = new graphql_1.GraphQLObjectType({
    name: 'User',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        username: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        email: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Course ID
 *         title:
 *           type: string
 *           description: Course title
 */
const CourseType = new graphql_1.GraphQLObjectType({
    name: 'Course',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
/**
 * @swagger
 * components:
 *   schemas:
 *     CourseModuleResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Module ID
 *         courseId:
 *           type: integer
 *           description: Course ID
 *         title:
 *           type: string
 *           description: Module title
 *         description:
 *           type: string
 *           description: Module description
 *         order:
 *           type: integer
 *           description: Module order
 *         isPublished:
 *           type: boolean
 *           description: Whether module is published
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           description: Publication date
 *         createdBy:
 *           type: integer
 *           description: Creator user ID
 *         creator:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
const CourseModuleType = new graphql_1.GraphQLObjectType({
    name: 'CourseModule',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        description: { type: graphql_1.GraphQLString },
        order: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        isPublished: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean) },
        publishedAt: { type: graphql_1.GraphQLString },
        createdBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        creator: { type: UserType },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        updatedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        lessons: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) }, // Simplified for now
        quizzes: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
        assignments: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
        progress: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
    }),
});
/**
 * @swagger
 * components:
 *   schemas:
 *     QuizResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Quiz ID
 *         courseId:
 *           type: integer
 *           description: Course ID
 *         moduleId:
 *           type: integer
 *           description: Module ID (optional)
 *         title:
 *           type: string
 *           description: Quiz title
 *         description:
 *           type: string
 *           description: Quiz description
 *         instructions:
 *           type: string
 *           description: Quiz instructions
 *         timeLimit:
 *           type: integer
 *           description: Time limit in minutes
 *         maxAttempts:
 *           type: integer
 *           description: Maximum attempts allowed
 *         passingScore:
 *           type: number
 *           description: Passing score percentage
 *         isPublished:
 *           type: boolean
 *           description: Whether quiz is published
 *         dueDate:
 *           type: string
 *           format: date-time
 *           description: Quiz due date
 *         createdBy:
 *           type: integer
 *           description: Creator user ID
 *         creator:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
const QuizType = new graphql_1.GraphQLObjectType({
    name: 'Quiz',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        moduleId: { type: graphql_1.GraphQLInt },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        description: { type: graphql_1.GraphQLString },
        instructions: { type: graphql_1.GraphQLString },
        timeLimit: { type: graphql_1.GraphQLInt },
        maxAttempts: { type: graphql_1.GraphQLInt },
        passingScore: { type: graphql_1.GraphQLFloat },
        isPublished: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean) },
        publishedAt: { type: graphql_1.GraphQLString },
        dueDate: { type: graphql_1.GraphQLString },
        createdBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        creator: { type: UserType },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        updatedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
/**
 * @swagger
 * components:
 *   schemas:
 *     QuizQuestionResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Question ID
 *         quizId:
 *           type: integer
 *           description: Quiz ID
 *         question:
 *           type: string
 *           description: Question text
 *         type:
 *           type: string
 *           enum: [multiple_choice, true_false, fill_blank, essay]
 *           description: Question type
 *         options:
 *           type: array
 *           items:
 *             type: string
 *           description: Answer options
 *         correctAnswer:
 *           type: string
 *           description: Correct answer
 *         points:
 *           type: integer
 *           description: Points for this question
 *         order:
 *           type: integer
 *           description: Question order
 *         explanation:
 *           type: string
 *           description: Explanation for correct answer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
const QuizQuestionType = new graphql_1.GraphQLObjectType({
    name: 'QuizQuestion',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        quizId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        question: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        options: { type: graphql_1.GraphQLString }, // JSON string
        correctAnswer: { type: graphql_1.GraphQLString }, // JSON string
        points: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        order: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        explanation: { type: graphql_1.GraphQLString },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        updatedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
/**
 * @swagger
 * components:
 *   schemas:
 *     QuizAttemptResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Attempt ID
 *         quizId:
 *           type: integer
 *           description: Quiz ID
 *         studentId:
 *           type: integer
 *           description: Student ID
 *         student:
 *           $ref: '#/components/schemas/User'
 *         score:
 *           type: number
 *           description: Score achieved
 *         maxScore:
 *           type: number
 *           description: Maximum possible score
 *         percentage:
 *           type: number
 *           description: Score percentage
 *         isPassed:
 *           type: boolean
 *           description: Whether attempt passed
 *         timeSpent:
 *           type: integer
 *           description: Time spent in seconds
 *         startedAt:
 *           type: string
 *           format: date-time
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         gradedAt:
 *           type: string
 *           format: date-time
 *         gradedBy:
 *           type: integer
 *           description: Grader user ID
 *         grader:
 *           $ref: '#/components/schemas/User'
 *         answers:
 *           type: string
 *           description: Student answers (JSON)
 *         feedback:
 *           type: string
 *           description: Instructor feedback
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
const QuizAttemptType = new graphql_1.GraphQLObjectType({
    name: 'QuizAttempt',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        quizId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        studentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        student: { type: UserType },
        score: { type: graphql_1.GraphQLFloat },
        maxScore: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat) },
        percentage: { type: graphql_1.GraphQLFloat },
        isPassed: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean) },
        timeSpent: { type: graphql_1.GraphQLInt },
        startedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        submittedAt: { type: graphql_1.GraphQLString },
        gradedAt: { type: graphql_1.GraphQLString },
        gradedBy: { type: graphql_1.GraphQLInt },
        grader: { type: UserType },
        answers: { type: graphql_1.GraphQLString }, // JSON string
        feedback: { type: graphql_1.GraphQLString },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        updatedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
/**
 * @swagger
 * components:
 *   schemas:
 *     ProgressResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Progress ID
 *         studentId:
 *           type: integer
 *           description: Student ID
 *         student:
 *           $ref: '#/components/schemas/User'
 *         courseId:
 *           type: integer
 *           description: Course ID
 *         course:
 *           $ref: '#/components/schemas/Course'
 *         moduleId:
 *           type: integer
 *           description: Module ID (optional)
 *         module:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             title:
 *               type: string
 *         type:
 *           type: string
 *           enum: [module, quiz, assignment, video, material]
 *           description: Activity type
 *         itemId:
 *           type: integer
 *           description: Item ID
 *         status:
 *           type: string
 *           enum: [not_started, in_progress, completed, passed, failed]
 *           description: Current status
 *         progress:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Progress percentage
 *         score:
 *           type: number
 *           description: Score achieved
 *         timeSpent:
 *           type: integer
 *           description: Time spent in seconds
 *         lastAccessed:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
const ProgressType = new graphql_1.GraphQLObjectType({
    name: 'Progress',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        studentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        student: { type: UserType },
        courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        course: { type: CourseType },
        moduleId: { type: graphql_1.GraphQLInt },
        module: { type: graphql_1.GraphQLString }, // Simplified
        type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        itemId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        status: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        progress: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat) },
        score: { type: graphql_1.GraphQLFloat },
        timeSpent: { type: graphql_1.GraphQLInt },
        lastAccessed: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        completedAt: { type: graphql_1.GraphQLString },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        updatedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
/**
 * @swagger
 * components:
 *   schemas:
 *     LearningAnalytics:
 *       type: object
 *       properties:
 *         courseId:
 *           type: integer
 *           description: Course ID
 *         totalStudents:
 *           type: integer
 *           description: Total enrolled students
 *         completionRate:
 *           type: number
 *           description: Course completion rate percentage
 *         averageScore:
 *           type: number
 *           description: Average score across all activities
 *         averageTimeSpent:
 *           type: number
 *           description: Average time spent in seconds
 *         moduleProgress:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               moduleId:
 *                 type: integer
 *               title:
 *                 type: string
 *               completionRate:
 *                 type: number
 *               averageTimeSpent:
 *                 type: number
 *               studentCount:
 *                 type: integer
 *         quizPerformance:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               quizId:
 *                 type: integer
 *               title:
 *                 type: string
 *               averageScore:
 *                 type: number
 *               passRate:
 *                 type: number
 *               attemptCount:
 *                 type: integer
 *               averageTimeSpent:
 *                 type: number
 *         assignmentPerformance:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               assignmentId:
 *                 type: integer
 *               title:
 *                 type: string
 *               submissionRate:
 *                 type: number
 *               averageScore:
 *                 type: number
 *               onTimeSubmissionRate:
 *                 type: number
 *         engagementMetrics:
 *           type: object
 *           properties:
 *             videoViews:
 *               type: integer
 *             materialDownloads:
 *               type: integer
 *             forumPosts:
 *               type: integer
 *             questionAsks:
 *               type: integer
 *             averageSessionTime:
 *               type: number
 *             returnRate:
 *               type: number
 */
const LearningAnalyticsType = new graphql_1.GraphQLObjectType({
    name: 'LearningAnalytics',
    fields: () => ({
        courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        totalStudents: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        completionRate: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat) },
        averageScore: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat) },
        averageTimeSpent: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat) },
        moduleProgress: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) }, // Simplified
        quizPerformance: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) }, // Simplified
        assignmentPerformance: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) }, // Simplified
        engagementMetrics: { type: graphql_1.GraphQLString }, // JSON string
    }),
});
// ===========================================
// GRAPHQL QUERIES
// ===========================================
/**
 * @swagger
 * /api/graphql:
 *   post:
 *     summary: GraphQL Learning Management Queries
 *     description: Comprehensive GraphQL API for learning management features
 *     tags: [Learning Management, GraphQL]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: GraphQL query string
 *                 example: |
 *                   query {
 *                     courseModules(courseId: 1) {
 *                       id
 *                       title
 *                       description
 *                       order
 *                       isPublished
 *                       creator {
 *                         username
 *                       }
 *                     }
 *                   }
 *     responses:
 *       200:
 *         description: GraphQL query executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid GraphQL query
 *       500:
 *         description: Internal server error
 */
const learningQueries = {
    /**
     * @swagger
     * /api/graphql:
     *   post:
     *     summary: Get course modules
     *     description: Retrieves all modules for a specific course
     *     tags: [Learning Management, GraphQL]
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *                 example: |
     *                   query {
     *                     courseModules(courseId: 1) {
     *                       id
     *                       title
     *                       description
     *                       order
     *                       isPublished
     *                       creator {
     *                         username
     *                         email
     *                       }
     *                     }
     *                   }
     */
    courseModules: {
        type: new graphql_1.GraphQLList(CourseModuleType),
        args: { courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            try {
                return await learningService.getCourseModules(args.courseId);
            }
            catch (error) {
                throw new Error(`Failed to get course modules: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    /**
     * @swagger
     * /api/graphql:
     *   post:
     *     summary: Get course module by ID
     *     description: Retrieves detailed information about a specific course module
     *     tags: [Learning Management, GraphQL]
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *                 example: |
     *                   query {
     *                     courseModule(id: 1) {
     *                       id
     *                       title
     *                       description
     *                       order
     *                       isPublished
     *                       creator {
     *                         username
     *                         email
     *                       }
     *                       lessons {
     *                         id
     *                         title
     *                       }
     *                     }
     *                   }
     */
    courseModule: {
        type: CourseModuleType,
        args: { id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            try {
                const module = await learningService.getCourseModule(args.id);
                if (!module) {
                    throw new Error('Module not found');
                }
                return module;
            }
            catch (error) {
                throw new Error(`Failed to get course module: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    /**
     * @swagger
     * /api/graphql:
     *   post:
     *     summary: Get learning analytics
     *     description: Retrieves comprehensive analytics for a course
     *     tags: [Learning Management, GraphQL]
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *                 example: |
     *                   query {
     *                     learningAnalytics(courseId: 1) {
     *                       courseId
     *                       totalStudents
     *                       completionRate
     *                       averageScore
     *                       averageTimeSpent
     *                       moduleProgress
     *                       quizPerformance
     *                       assignmentPerformance
     *                       engagementMetrics
     *                     }
     *                   }
     */
    learningAnalytics: {
        type: LearningAnalyticsType,
        args: { courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            try {
                return await learningService.getLearningAnalytics(args.courseId);
            }
            catch (error) {
                throw new Error(`Failed to get learning analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
};
// ===========================================
// GRAPHQL MUTATIONS
// ===========================================
/**
 * @swagger
 * /api/graphql:
 *   post:
 *     summary: GraphQL Learning Management Mutations
 *     description: Create, update, and manage learning content
 *     tags: [Learning Management, GraphQL]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: GraphQL mutation string
 *                 example: |
 *                   mutation {
 *                     createCourseModule(
 *                       courseId: 1,
 *                       title: "Introduction to React",
 *                       description: "Learn React fundamentals",
 *                       order: 1,
 *                       createdBy: 1
 *                     ) {
 *                       id
 *                       title
 *                       description
 *                       order
 *                       creator {
 *                         username
 *                       }
 *                     }
 *                   }
 *     responses:
 *       200:
 *         description: GraphQL mutation executed successfully
 *       400:
 *         description: Invalid GraphQL mutation
 *       500:
 *         description: Internal server error
 */
const learningMutations = {
    /**
     * @swagger
     * /api/graphql:
     *   post:
     *     summary: Create course module
     *     description: Creates a new course module with structured content
     *     tags: [Learning Management, GraphQL]
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *                 example: |
     *                   mutation {
     *                     createCourseModule(
     *                       courseId: 1,
     *                       title: "Introduction to React",
     *                       description: "Learn React fundamentals",
     *                       order: 1,
     *                       createdBy: 1
     *                     ) {
     *                       id
     *                       title
     *                       description
     *                       order
     *                       isPublished
     *                       creator {
     *                         username
     *                         email
     *                       }
     *                       createdAt
     *                     }
     *                   }
     */
    createCourseModule: {
        type: CourseModuleType,
        args: {
            courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            description: { type: graphql_1.GraphQLString },
            order: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            createdBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        },
        resolve: async (_, args) => {
            try {
                return await learningService.createCourseModule({
                    courseId: args.courseId,
                    title: args.title,
                    description: args.description,
                    order: args.order,
                    createdBy: args.createdBy,
                });
            }
            catch (error) {
                throw new Error(`Failed to create course module: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    /**
     * @swagger
     * /api/graphql:
     *   post:
     *     summary: Create quiz
     *     description: Creates a new assessment quiz with configurable settings
     *     tags: [Learning Management, GraphQL]
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *                 example: |
     *                   mutation {
     *                     createQuiz(
     *                       courseId: 1,
     *                       moduleId: 1,
     *                       title: "React Fundamentals Quiz",
     *                       description: "Test your React knowledge",
     *                       instructions: "Answer all questions carefully",
     *                       timeLimit: 30,
     *                       maxAttempts: 3,
     *                       passingScore: 70,
     *                       createdBy: 1
     *                     ) {
     *                       id
     *                       title
     *                       description
     *                       timeLimit
     *                       maxAttempts
     *                       passingScore
     *                       creator {
     *                         username
     *                       }
     *                       createdAt
     *                     }
     *                   }
     */
    createQuiz: {
        type: QuizType,
        args: {
            courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            moduleId: { type: graphql_1.GraphQLInt },
            title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            description: { type: graphql_1.GraphQLString },
            instructions: { type: graphql_1.GraphQLString },
            timeLimit: { type: graphql_1.GraphQLInt },
            maxAttempts: { type: graphql_1.GraphQLInt },
            passingScore: { type: graphql_1.GraphQLFloat },
            dueDate: { type: graphql_1.GraphQLString },
            createdBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        },
        resolve: async (_, args) => {
            try {
                return await learningService.createQuiz({
                    courseId: args.courseId,
                    moduleId: args.moduleId,
                    title: args.title,
                    description: args.description,
                    instructions: args.instructions,
                    timeLimit: args.timeLimit,
                    maxAttempts: args.maxAttempts,
                    passingScore: args.passingScore,
                    dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
                    createdBy: args.createdBy,
                });
            }
            catch (error) {
                throw new Error(`Failed to create quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    /**
     * @swagger
     * /api/graphql:
     *   post:
     *     summary: Add quiz question
     *     description: Adds a new question to an existing quiz
     *     tags: [Learning Management, GraphQL]
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *                 example: |
     *                   mutation {
     *                     addQuizQuestion(
     *                       quizId: 1,
     *                       question: "What is React?",
     *                       type: "multiple_choice",
     *                       options: ["A JavaScript library", "A database", "A server"],
     *                       correctAnswer: "A JavaScript library",
     *                       points: 5,
     *                       order: 1,
     *                       explanation: "React is a JavaScript library for building user interfaces"
     *                     ) {
     *                       id
     *                       question
     *                       type
     *                       points
     *                       order
     *                       explanation
     *                     }
     *                   }
     */
    addQuizQuestion: {
        type: QuizQuestionType,
        args: {
            quizId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            question: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            options: { type: graphql_1.GraphQLString }, // JSON string
            correctAnswer: { type: graphql_1.GraphQLString }, // JSON string
            points: { type: graphql_1.GraphQLInt },
            order: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            explanation: { type: graphql_1.GraphQLString },
        },
        resolve: async (_, args) => {
            try {
                return await learningService.addQuizQuestion({
                    quizId: args.quizId,
                    question: args.question,
                    type: args.type,
                    options: args.options ? JSON.parse(args.options) : undefined,
                    correctAnswer: args.correctAnswer ? JSON.parse(args.correctAnswer) : undefined,
                    points: args.points,
                    order: args.order,
                    explanation: args.explanation,
                });
            }
            catch (error) {
                throw new Error(`Failed to add quiz question: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    /**
     * @swagger
     * /api/graphql:
     *   post:
     *     summary: Start quiz attempt
     *     description: Starts a new quiz attempt for a student
     *     tags: [Learning Management, GraphQL]
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *                 example: |
     *                   mutation {
     *                     startQuizAttempt(
     *                       quizId: 1,
     *                       studentId: 1
     *                     ) {
     *                       id
     *                       quizId
     *                       studentId
     *                       maxScore
     *                       startedAt
     *                       student {
     *                         username
     *                         email
     *                       }
     *                     }
     *                   }
     */
    startQuizAttempt: {
        type: QuizAttemptType,
        args: {
            quizId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            studentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        },
        resolve: async (_, args) => {
            try {
                return await learningService.startQuizAttempt({
                    quizId: args.quizId,
                    studentId: args.studentId,
                });
            }
            catch (error) {
                throw new Error(`Failed to start quiz attempt: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    /**
     * @swagger
     * /api/graphql:
     *   post:
     *     summary: Update student progress
     *     description: Updates or creates progress tracking for a student's course activity
     *     tags: [Learning Management, GraphQL]
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *                 example: |
     *                   mutation {
     *                     updateProgress(
     *                       studentId: 1,
     *                       courseId: 1,
     *                       moduleId: 1,
     *                       type: "quiz",
     *                       itemId: 1,
     *                       status: "completed",
     *                       progress: 100,
     *                       score: 85,
     *                       timeSpent: 1800
     *                     ) {
     *                       id
     *                       studentId
     *                       courseId
     *                       type
     *                       itemId
     *                       status
     *                       progress
     *                       score
     *                       timeSpent
     *                       completedAt
     *                     }
     *                   }
     */
    updateProgress: {
        type: ProgressType,
        args: {
            studentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            moduleId: { type: graphql_1.GraphQLInt },
            type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            itemId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            status: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            progress: { type: graphql_1.GraphQLFloat },
            score: { type: graphql_1.GraphQLFloat },
            timeSpent: { type: graphql_1.GraphQLInt },
        },
        resolve: async (_, args) => {
            try {
                return await learningService.updateProgress({
                    studentId: args.studentId,
                    courseId: args.courseId,
                    moduleId: args.moduleId,
                    type: args.type,
                    itemId: args.itemId,
                    status: args.status,
                    progress: args.progress,
                    score: args.score,
                    timeSpent: args.timeSpent,
                });
            }
            catch (error) {
                throw new Error(`Failed to update progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
};
/**
 * @swagger
 * components:
 *   schemas:
 *     LearningManagementSchema:
 *       type: object
 *       description: Complete GraphQL schema for learning management
 *       properties:
 *         queries:
 *           type: object
 *           properties:
 *             courseModules:
 *               type: object
 *               description: Get all modules for a course
 *             courseModule:
 *               type: object
 *               description: Get specific course module
 *             learningAnalytics:
 *               type: object
 *               description: Get learning analytics for a course
 *         mutations:
 *           type: object
 *           properties:
 *             createCourseModule:
 *               type: object
 *               description: Create a new course module
 *             createQuiz:
 *               type: object
 *               description: Create a new quiz
 *             addQuizQuestion:
 *               type: object
 *               description: Add question to quiz
 *             startQuizAttempt:
 *               type: object
 *               description: Start quiz attempt
 *             updateProgress:
 *               type: object
 *               description: Update student progress
 */
exports.learningSchema = new graphql_1.GraphQLSchema({
    query: new graphql_1.GraphQLObjectType({
        name: 'Query',
        fields: learningQueries,
    }),
    mutation: new graphql_1.GraphQLObjectType({
        name: 'Mutation',
        fields: learningMutations,
    }),
});

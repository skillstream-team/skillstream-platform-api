"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
// Use environment-aware file extensions
const fileExt = process.env.NODE_ENV === 'production' ? 'js' : 'ts';
const baseDir = process.env.NODE_ENV === 'production' ? './dist' : './src';
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SkillStream Platform API',
            version: '1.0.0',
            description: `
# SkillStream E-Learning Platform API Documentation

Complete API documentation for the SkillStream e-learning platform. This API provides all functionality needed to build a comprehensive e-learning frontend application.

## Features

### Core Features
- **User Management**: Authentication, registration, profiles, roles (Student, Teacher, Admin)
- **Course Management**: Create, update, browse, and manage courses
- **Enrollment System**: Student enrollment with subscription requirements
- **Learning Management**: Lessons, modules, quizzes, assignments, progress tracking
- **Certificates**: Automatic certificate generation upon course completion
- **Reviews & Ratings**: Course reviews and rating system
- **Forums**: Discussion forums for courses

### Advanced Features
- **Student Dashboard**: Comprehensive dashboard with progress, deadlines, recommendations
- **Course Bundles**: Package multiple courses together with discounts
- **Discounts & Coupons**: Coupon code system for discounts
- **Learning Paths**: Structured course sequences with progress tracking
- **Course Tags**: Tag-based organization and filtering
- **Instructor Q&A**: Direct Q&A between students and instructors
- **Referral System**: Affiliate/referral program with commission tracking
- **Social Sharing**: Share courses on social media platforms
- **Course Comparison**: Side-by-side comparison of multiple courses
- **Wishlist**: Save favorite courses for later
- **Prerequisites**: Course prerequisite system
- **Preview Content**: Free preview lessons and videos

### Subscription & Payments
- **Subscription System**: $6/month subscription for unlimited course access
- **Payment Processing**: Payment records and transaction management
- **Teacher Earnings**: Automatic calculation of teacher payouts ($0.02 per active user)

### Communication
- **Real-time Messaging**: Socket.IO based messaging system
- **Email Notifications**: Automated emails for enrollments, deadlines, certificates
- **Announcements**: Course announcements and notifications

### Analytics & Reporting
- **Progress Tracking**: Detailed progress tracking for students
- **Analytics**: Learning analytics and performance metrics
- **Activity Logging**: Comprehensive activity logging

## Authentication

Most endpoints require authentication using Bearer tokens. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Login: 20 attempts per 5 minutes
- Registration: 5 attempts per 15 minutes
- Password Reset: 3 attempts per hour
- General: 100 requests per 15 minutes

## Error Responses

All errors follow a consistent format:
\`\`\`json
{
  "error": "Error message description"
}
\`\`\`

## Status Codes

- \`200\` - Success
- \`201\` - Created
- \`400\` - Bad Request
- \`401\` - Unauthorized
- \`403\` - Forbidden
- \`404\` - Not Found
- \`500\` - Internal Server Error
      `,
            contact: {
                name: 'SkillStream API Support',
                email: 'support@skillstream.com',
            },
            license: {
                name: 'MIT',
            },
        },
        servers: [
            {
                url: process.env.SERVER_URL || 'http://localhost:3000',
                description: 'Development Server',
            },
            {
                url: 'https://api.skillstream.com',
                description: 'Production Server',
            },
        ],
        tags: [
            { name: 'Authentication', description: 'User authentication and authorization' },
            { name: 'Users', description: 'User management and profiles' },
            { name: 'Courses', description: 'Course management and browsing' },
            { name: 'Enrollments', description: 'Student enrollment in courses' },
            { name: 'Lessons', description: 'Course lessons and content' },
            { name: 'Quizzes', description: 'Quizzes and assessments' },
            { name: 'Assignments', description: 'Course assignments' },
            { name: 'Progress', description: 'Learning progress tracking' },
            { name: 'Certificates', description: 'Course completion certificates' },
            { name: 'Reviews', description: 'Course reviews and ratings' },
            { name: 'Forums', description: 'Course discussion forums' },
            { name: 'Dashboard', description: 'Student dashboard and statistics' },
            { name: 'Bundles', description: 'Course bundles and packages' },
            { name: 'Coupons', description: 'Discount coupons and codes' },
            { name: 'Learning Paths', description: 'Structured learning paths' },
            { name: 'Tags', description: 'Course tags and categorization' },
            { name: 'Instructor Q&A', description: 'Instructor-student Q&A' },
            { name: 'Referrals', description: 'Referral and affiliate system' },
            { name: 'Sharing', description: 'Social sharing functionality' },
            { name: 'Wishlist', description: 'Course wishlist/favorites' },
            { name: 'Prerequisites', description: 'Course prerequisites' },
            { name: 'Categories', description: 'Course categories' },
            { name: 'Subscriptions', description: 'Subscription management' },
            { name: 'Payments', description: 'Payment processing' },
            { name: 'Teacher Earnings', description: 'Teacher earnings and payouts' },
            { name: 'Announcements', description: 'Course announcements' },
            { name: 'Calendar', description: 'Calendar and scheduling' },
            { name: 'Messaging', description: 'Real-time messaging' },
            { name: 'Analytics', description: 'Analytics and reporting' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter JWT token obtained from /api/users/auth/login',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message',
                        },
                    },
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        page: {
                            type: 'integer',
                            description: 'Current page number',
                        },
                        limit: {
                            type: 'integer',
                            description: 'Items per page',
                        },
                        total: {
                            type: 'integer',
                            description: 'Total number of items',
                        },
                        totalPages: {
                            type: 'integer',
                            description: 'Total number of pages',
                        },
                        hasNext: {
                            type: 'boolean',
                            description: 'Whether there is a next page',
                        },
                        hasPrev: {
                            type: 'boolean',
                            description: 'Whether there is a previous page',
                        },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'user_123' },
                        username: { type: 'string', example: 'johndoe' },
                        email: { type: 'string', format: 'email', example: 'john@example.com' },
                        firstName: { type: 'string', example: 'John' },
                        lastName: { type: 'string', example: 'Doe' },
                        role: { type: 'string', enum: ['STUDENT', 'TEACHER', 'ADMIN'], example: 'STUDENT' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        password: { type: 'string', format: 'password', example: 'password123' },
                    },
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        refreshToken: { type: 'string', example: 'refresh_token_123' },
                        user: { $ref: '#/components/schemas/User' },
                    },
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['username', 'email', 'password', 'role'],
                    properties: {
                        username: { type: 'string', minLength: 3, maxLength: 50, example: 'johndoe' },
                        email: { type: 'string', format: 'email', example: 'john@example.com' },
                        password: { type: 'string', minLength: 6, format: 'password', example: 'password123' },
                        role: { type: 'string', enum: ['STUDENT', 'TEACHER', 'ADMIN'], example: 'STUDENT' },
                        firstName: { type: 'string', example: 'John' },
                        lastName: { type: 'string', example: 'Doe' },
                        referralCode: { type: 'string', example: 'REF123' },
                    },
                },
                Course: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'course_123' },
                        title: { type: 'string', example: 'Introduction to JavaScript' },
                        description: { type: 'string', example: 'Learn the fundamentals of JavaScript programming' },
                        price: { type: 'number', example: 49.99 },
                        thumbnailUrl: { type: 'string', format: 'uri', example: 'https://example.com/thumb.jpg' },
                        categoryId: { type: 'string', example: 'cat_123' },
                        difficulty: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'], example: 'BEGINNER' },
                        duration: { type: 'integer', example: 3600, description: 'Duration in seconds' },
                        language: { type: 'string', example: 'en' },
                        learningObjectives: { type: 'array', items: { type: 'string' } },
                        requirements: { type: 'array', items: { type: 'string' } },
                        instructorId: { type: 'string', example: 'user_123' },
                        instructor: { $ref: '#/components/schemas/User' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                CreateCourseRequest: {
                    type: 'object',
                    required: ['title', 'price', 'order', 'createdBy', 'instructorId'],
                    properties: {
                        title: { type: 'string', minLength: 1, maxLength: 200, example: 'Introduction to JavaScript' },
                        description: { type: 'string', maxLength: 5000, example: 'Learn the fundamentals...' },
                        price: { type: 'number', minimum: 0, example: 49.99 },
                        order: { type: 'integer', minimum: 0, example: 1 },
                        createdBy: { type: 'string', example: 'user_123' },
                        instructorId: { type: 'string', example: 'user_123' },
                        thumbnailUrl: { type: 'string', format: 'uri', example: 'https://example.com/thumb.jpg' },
                        categoryId: { type: 'string', example: 'cat_123' },
                        difficulty: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] },
                        duration: { type: 'integer', minimum: 0, example: 3600 },
                        language: { type: 'string', example: 'en' },
                        learningObjectives: { type: 'array', items: { type: 'string' } },
                        requirements: { type: 'array', items: { type: 'string' } },
                    },
                },
                Enrollment: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'enrollment_123' },
                        courseId: { type: 'string', example: 'course_123' },
                        studentId: { type: 'string', example: 'user_123' },
                        paymentId: { type: 'string', nullable: true, example: 'payment_123' },
                        createdAt: { type: 'string', format: 'date-time' },
                        course: { $ref: '#/components/schemas/Course' },
                        student: { $ref: '#/components/schemas/User' },
                        payment: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                amount: { type: 'number' },
                                currency: { type: 'string' },
                                status: { type: 'string' },
                                provider: { type: 'string' },
                                transactionId: { type: 'string' },
                            },
                        },
                    },
                },
                CreateEnrollmentRequest: {
                    type: 'object',
                    required: ['courseId', 'studentId', 'amount', 'provider'],
                    properties: {
                        courseId: { type: 'string', example: 'course_123' },
                        studentId: { type: 'string', example: 'user_123' },
                        amount: { type: 'number', minimum: 0, example: 49.99 },
                        currency: { type: 'string', length: 3, default: 'USD', example: 'USD' },
                        provider: { type: 'string', example: 'stripe' },
                        transactionId: { type: 'string', example: 'txn_123' },
                    },
                },
                Module: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'module_123' },
                        courseId: { type: 'string', example: 'course_123' },
                        title: { type: 'string', example: 'Module 1: Basics' },
                        description: { type: 'string', example: 'Introduction to the basics' },
                        order: { type: 'integer', example: 1 },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Lesson: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'lesson_123' },
                        moduleId: { type: 'string', example: 'module_123' },
                        courseId: { type: 'string', example: 'course_123' },
                        title: { type: 'string', example: 'Lesson 1: Introduction' },
                        description: { type: 'string', example: 'First lesson content' },
                        order: { type: 'integer', example: 1 },
                        duration: { type: 'integer', example: 1800 },
                        isPreview: { type: 'boolean', example: false },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Quiz: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'quiz_123' },
                        courseId: { type: 'string', example: 'course_123' },
                        moduleId: { type: 'string', nullable: true, example: 'module_123' },
                        lessonId: { type: 'string', nullable: true, example: 'lesson_123' },
                        title: { type: 'string', example: 'Quiz 1' },
                        description: { type: 'string', example: 'Test your knowledge' },
                        instructions: { type: 'string', example: 'Answer all questions' },
                        timeLimit: { type: 'integer', example: 3600, description: 'Time limit in seconds' },
                        maxAttempts: { type: 'integer', example: 3 },
                        passingScore: { type: 'number', example: 70, description: 'Passing score percentage' },
                        dueDate: { type: 'string', format: 'date-time', nullable: true },
                        isPublished: { type: 'boolean', example: true },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Subscription: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'sub_123' },
                        userId: { type: 'string', example: 'user_123' },
                        status: { type: 'string', enum: ['active', 'inactive', 'cancelled', 'expired'], example: 'active' },
                        startDate: { type: 'string', format: 'date-time' },
                        endDate: { type: 'string', format: 'date-time' },
                        provider: { type: 'string', example: 'stripe' },
                        transactionId: { type: 'string', example: 'txn_123' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                CreateSubscriptionRequest: {
                    type: 'object',
                    required: ['provider'],
                    properties: {
                        provider: { type: 'string', example: 'stripe' },
                        transactionId: { type: 'string', example: 'txn_123' },
                    },
                },
                Progress: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'progress_123' },
                        studentId: { type: 'string', example: 'user_123' },
                        courseId: { type: 'string', example: 'course_123' },
                        moduleId: { type: 'string', nullable: true, example: 'module_123' },
                        type: { type: 'string', enum: ['module', 'quiz', 'assignment', 'video', 'material'], example: 'module' },
                        itemId: { type: 'string', example: 'item_123' },
                        status: { type: 'string', enum: ['not_started', 'in_progress', 'completed', 'passed', 'failed'], example: 'in_progress' },
                        progress: { type: 'number', minimum: 0, maximum: 100, example: 50 },
                        score: { type: 'number', minimum: 0, example: 85 },
                        timeSpent: { type: 'integer', minimum: 0, example: 3600 },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Review: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'review_123' },
                        courseId: { type: 'string', example: 'course_123' },
                        studentId: { type: 'string', example: 'user_123' },
                        rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                        comment: { type: 'string', example: 'Great course!' },
                        createdAt: { type: 'string', format: 'date-time' },
                        student: { $ref: '#/components/schemas/User' },
                    },
                },
                Certificate: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'cert_123' },
                        courseId: { type: 'string', example: 'course_123' },
                        studentId: { type: 'string', example: 'user_123' },
                        certificateUrl: { type: 'string', format: 'uri', example: 'https://example.com/cert.pdf' },
                        issuedAt: { type: 'string', format: 'date-time' },
                        course: { $ref: '#/components/schemas/Course' },
                        student: { $ref: '#/components/schemas/User' },
                    },
                },
                Message: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'msg_123' },
                        conversationId: { type: 'string', example: 'conv_123' },
                        senderId: { type: 'string', example: 'user_123' },
                        receiverId: { type: 'string', nullable: true, example: 'user_456' },
                        content: { type: 'string', example: 'Hello!' },
                        type: { type: 'string', enum: ['text', 'image', 'file', 'system'], example: 'text' },
                        replyToId: { type: 'string', nullable: true, example: 'msg_122' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                CourseListResponse: {
                    type: 'object',
                    properties: {
                        courses: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Course' },
                        },
                        pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: [
        `${baseDir}/modules/**/routes/**/*.${fileExt}`,
        `${baseDir}/modules/**/services/*.${fileExt}`,
        `${baseDir}/middleware/**/*.${fileExt}`,
    ],
};
let specs;
try {
    // Generate specs with error handling
    specs = (0, swagger_jsdoc_1.default)(options);
    // Validate and enhance the specs
    if (!specs) {
        throw new Error('Swagger specs generation returned null');
    }
    // Ensure paths object exists
    if (!specs.paths) {
        specs.paths = {};
    }
    // Enhance the specs with additional metadata
    if (specs.paths && typeof specs.paths === 'object') {
        // Add default security to all endpoints that don't have it
        Object.keys(specs.paths).forEach((path) => {
            const pathObj = specs.paths[path];
            if (pathObj && typeof pathObj === 'object') {
                Object.keys(pathObj).forEach((method) => {
                    const endpoint = pathObj[method];
                    if (endpoint && typeof endpoint === 'object' && !endpoint.security && endpoint.tags && Array.isArray(endpoint.tags) && endpoint.tags.length > 0) {
                        // Only add security if it's not a public endpoint
                        const publicTags = ['Authentication', 'Courses', 'Tags', 'Categories'];
                        const isPublic = endpoint.tags.some((tag) => publicTags.includes(tag));
                        if (!isPublic) {
                            endpoint.security = [{ bearerAuth: [] }];
                        }
                    }
                });
            }
        });
    }
    console.log(`✅ Swagger documentation generated successfully with ${Object.keys(specs.paths || {}).length} paths`);
}
catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.warn('⚠️  Swagger documentation generation failed:', errorMessage);
    if (errorStack && process.env.NODE_ENV === 'development') {
        console.warn('Stack trace:', errorStack);
    }
    // Fallback to empty spec to prevent app crash
    specs = {
        ...options.definition,
        paths: {},
    };
}
const setupSwagger = (app) => {
    // Custom Swagger UI options
    const swaggerUiOptions = {
        customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 50px 0; }
      .swagger-ui .info .title { font-size: 36px; }
      .swagger-ui .scheme-container { margin: 20px 0; padding: 20px; background: #fafafa; border-radius: 4px; }
    `,
        customSiteTitle: 'SkillStream API Documentation',
        customfavIcon: '/favicon.ico',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
            showExtensions: true,
            showCommonExtensions: true,
            docExpansion: 'list',
            defaultModelsExpandDepth: 2,
            defaultModelExpandDepth: 2,
        },
    };
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs, swaggerUiOptions));
    // Also provide JSON endpoint for programmatic access
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });
};
exports.setupSwagger = setupSwagger;

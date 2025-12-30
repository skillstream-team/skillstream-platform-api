"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCalendarEventSchema = exports.createCalendarEventSchema = exports.resendVerificationSchema = exports.verifyEmailSchema = exports.refreshTokenSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.updateProgressSchema = exports.updateAssignmentSchema = exports.updateQuizSchema = exports.submitQuizAttemptSchema = exports.startQuizAttemptSchema = exports.createQuizQuestionSchema = exports.courseIdParamSchema = exports.idParamSchema = exports.createConversationSchema = exports.createMessageSchema = exports.createProgressSchema = exports.createAssignmentSchema = exports.activateSubscriptionSchema = exports.createSubscriptionSchema = exports.createQuizSchema = exports.createModuleSchema = exports.createEnrollmentSchema = exports.changePasswordSchema = exports.updateUserSchema = exports.loginSchema = exports.createUserSchema = exports.updateCourseSchema = exports.createCourseSchema = exports.paginationSchema = void 0;
const zod_1 = require("zod");
/**
 * Common validation schemas
 */
// Pagination schema
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20).optional(),
});
// Course schemas
exports.createCourseSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(5000).optional(),
    price: zod_1.z.number().min(0),
    order: zod_1.z.number().int().min(0).nullish(), // Auto-generated if not provided
    createdBy: zod_1.z.string().min(1).nullish(), // Auto-set from authenticated user
    instructorId: zod_1.z.string().min(1),
    thumbnailUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    categoryId: zod_1.z.string().optional(),
    difficulty: zod_1.z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
    duration: zod_1.z.number().int().min(0).optional(),
    language: zod_1.z.string().optional(),
    learningObjectives: zod_1.z.array(zod_1.z.string()).optional(),
    requirements: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.updateCourseSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(5000).optional(),
    price: zod_1.z.number().min(0).optional(),
    order: zod_1.z.number().int().min(0).optional(),
    thumbnailUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    categoryId: zod_1.z.string().optional(),
    difficulty: zod_1.z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
    duration: zod_1.z.number().int().min(0).optional(),
    language: zod_1.z.string().optional(),
    learningObjectives: zod_1.z.array(zod_1.z.string()).optional(),
    requirements: zod_1.z.array(zod_1.z.string()).optional(),
});
// User schemas
exports.createUserSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(3)
        .max(50)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6).max(100),
    role: zod_1.z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
    firstName: zod_1.z.string().max(100).optional(),
    lastName: zod_1.z.string().max(100).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.updateUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
    email: zod_1.z.string().email().optional(),
    firstName: zod_1.z.string().max(100).optional(),
    lastName: zod_1.z.string().max(100).optional(),
});
exports.changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(6).max(100),
});
// Enrollment schemas
exports.createEnrollmentSchema = zod_1.z.object({
    courseId: zod_1.z.string().min(1),
    studentId: zod_1.z.string().min(1),
    amount: zod_1.z.number().min(0),
    currency: zod_1.z.string().length(3).default('USD').optional(),
    provider: zod_1.z.string().min(1),
    transactionId: zod_1.z.string().optional(),
});
// Module schemas
exports.createModuleSchema = zod_1.z.object({
    courseId: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(5000).optional(),
    order: zod_1.z.number().int().min(0),
    createdBy: zod_1.z.string().min(1),
});
// Quiz schemas
exports.createQuizSchema = zod_1.z.object({
    courseId: zod_1.z.string().min(1),
    moduleId: zod_1.z.string().optional(),
    lessonId: zod_1.z.string().optional(),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(5000).optional(),
    instructions: zod_1.z.string().max(5000).optional(),
    timeLimit: zod_1.z.number().int().min(0).optional(),
    maxAttempts: zod_1.z.number().int().min(1).optional(),
    passingScore: zod_1.z.number().min(0).max(100).optional(),
    dueDate: zod_1.z.string().datetime().optional(),
    createdBy: zod_1.z.string().min(1),
});
// Subscription schemas
exports.createSubscriptionSchema = zod_1.z.object({
    provider: zod_1.z.string().min(1),
    transactionId: zod_1.z.string().optional(),
});
exports.activateSubscriptionSchema = zod_1.z.object({
    transactionId: zod_1.z.string().min(1),
    provider: zod_1.z.string().min(1),
});
// Assignment schemas
exports.createAssignmentSchema = zod_1.z.object({
    courseId: zod_1.z.string().min(1),
    moduleId: zod_1.z.string().optional(),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(5000).optional(),
    instructions: zod_1.z.string().max(5000).optional(),
    type: zod_1.z.string().min(1),
    maxScore: zod_1.z.number().min(0).optional(),
    dueDate: zod_1.z.string().datetime().optional(),
    createdBy: zod_1.z.string().min(1),
});
// Progress schemas
exports.createProgressSchema = zod_1.z.object({
    studentId: zod_1.z.string().min(1),
    courseId: zod_1.z.string().min(1),
    moduleId: zod_1.z.string().optional(),
    type: zod_1.z.enum(['module', 'quiz', 'assignment', 'video', 'material']),
    itemId: zod_1.z.string().min(1),
    status: zod_1.z.enum(['not_started', 'in_progress', 'completed', 'passed', 'failed']),
    progress: zod_1.z.number().min(0).max(100).optional(),
    score: zod_1.z.number().min(0).optional(),
    timeSpent: zod_1.z.number().int().min(0).optional(),
});
// Message schemas
exports.createMessageSchema = zod_1.z.object({
    conversationId: zod_1.z.string().min(1).optional(),
    receiverId: zod_1.z.string().min(1).optional(),
    content: zod_1.z.string().min(1).max(10000),
    type: zod_1.z.enum(['text', 'image', 'file', 'system']).default('text').optional(),
    replyToId: zod_1.z.string().optional(),
    attachments: zod_1.z.array(zod_1.z.object({
        filename: zod_1.z.string(),
        url: zod_1.z.string(),
        size: zod_1.z.number().optional(),
        mimeType: zod_1.z.string().optional(),
    })).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
}).refine((data) => data.conversationId || data.receiverId, {
    message: "Either conversationId or receiverId must be provided",
    path: ["conversationId"], // This will show the error on conversationId field
});
exports.createConversationSchema = zod_1.z.object({
    type: zod_1.z.enum(['direct', 'group']),
    name: zod_1.z.string().max(100).optional(),
    description: zod_1.z.string().max(500).optional(),
    participantIds: zod_1.z.array(zod_1.z.string().min(1)).min(2),
});
// ID parameter schema
exports.idParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
// Course ID param schema
exports.courseIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
// Quiz question schema
exports.createQuizQuestionSchema = zod_1.z.object({
    quizId: zod_1.z.string().min(1),
    question: zod_1.z.string().min(1).max(1000),
    type: zod_1.z.enum(['multiple_choice', 'true_false', 'fill_blank', 'essay']),
    options: zod_1.z.array(zod_1.z.string()).optional(),
    correctAnswer: zod_1.z.any(), // Can be string or object
    points: zod_1.z.number().int().min(1).default(1).optional(),
    order: zod_1.z.number().int().min(0),
    explanation: zod_1.z.string().max(1000).optional(),
});
// Start quiz attempt schema
exports.startQuizAttemptSchema = zod_1.z.object({
    quizId: zod_1.z.string().min(1),
    studentId: zod_1.z.string().min(1),
});
// Submit quiz attempt schema
exports.submitQuizAttemptSchema = zod_1.z.object({
    attemptId: zod_1.z.string().min(1),
    answers: zod_1.z.record(zod_1.z.any()), // Object with question IDs as keys
    timeSpent: zod_1.z.number().int().min(0).optional(),
});
// Update quiz schema
exports.updateQuizSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(5000).optional(),
    instructions: zod_1.z.string().max(5000).optional(),
    timeLimit: zod_1.z.number().int().min(0).optional(),
    maxAttempts: zod_1.z.number().int().min(1).optional(),
    passingScore: zod_1.z.number().min(0).max(100).optional(),
    dueDate: zod_1.z.string().datetime().optional(),
    isPublished: zod_1.z.boolean().optional(),
});
// Update assignment schema
exports.updateAssignmentSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(5000).optional(),
    instructions: zod_1.z.string().max(5000).optional(),
    maxScore: zod_1.z.number().min(0).optional(),
    dueDate: zod_1.z.string().datetime().optional(),
    isPublished: zod_1.z.boolean().optional(),
});
// Update progress schema
exports.updateProgressSchema = zod_1.z.object({
    status: zod_1.z.enum(['not_started', 'in_progress', 'completed', 'passed', 'failed']).optional(),
    progress: zod_1.z.number().min(0).max(100).optional(),
    score: zod_1.z.number().min(0).optional(),
    timeSpent: zod_1.z.number().int().min(0).optional(),
});
// Forgot password schema
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
// Reset password schema
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(6).max(100),
});
// Refresh token schema
exports.refreshTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
});
// Email verification schema
exports.verifyEmailSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
});
// Resend verification email schema
exports.resendVerificationSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
// Calendar event schemas
exports.createCalendarEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(5000).optional(),
    type: zod_1.z.enum(['live_class', 'deadline', 'assignment_due', 'quiz_due', 'custom']),
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime().optional(),
    isAllDay: zod_1.z.boolean().default(false).optional(),
    location: zod_1.z.string().max(200).optional(),
    courseId: zod_1.z.string().optional(),
    assignmentId: zod_1.z.string().optional(),
    quizId: zod_1.z.string().optional(),
    isRecurring: zod_1.z.boolean().default(false).optional(),
    recurrenceRule: zod_1.z.string().optional(),
    reminderMinutes: zod_1.z.array(zod_1.z.number().int().min(0)).optional(),
    attendeeIds: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    metadata: zod_1.z.any().optional(),
});
exports.updateCalendarEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(5000).optional(),
    startTime: zod_1.z.string().datetime().optional(),
    endTime: zod_1.z.string().datetime().optional(),
    isAllDay: zod_1.z.boolean().optional(),
    location: zod_1.z.string().max(200).optional(),
    isRecurring: zod_1.z.boolean().optional(),
    recurrenceRule: zod_1.z.string().optional(),
    reminderMinutes: zod_1.z.array(zod_1.z.number().int().min(0)).optional(),
    metadata: zod_1.z.any().optional(),
});

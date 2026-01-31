import { z } from 'zod';

/**
 * Common validation schemas
 */

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

// Course schemas
export const createCourseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  price: z.number().min(0),
  order: z.number().int().min(0).nullish(), // Auto-generated if not provided
  createdBy: z.string().min(1).nullish(), // Auto-set from authenticated user
  instructorId: z.string().min(1),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  categoryId: z.string().optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  duration: z.number().int().min(0).optional(),
  language: z.string().optional(),
  learningObjectives: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
});

export const updateCourseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  price: z.number().min(0).optional(),
  order: z.number().int().min(0).optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  categoryId: z.string().optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  duration: z.number().int().min(0).optional(),
  language: z.string().optional(),
  learningObjectives: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
});

// User schemas
export const createUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  email: z.string().email().optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

// Enrollment schemas
export const createEnrollmentSchema = z.object({
  courseId: z.string().min(1),
  studentId: z.string().min(1),
  amount: z.number().min(0),
  currency: z.string().length(3).default('USD').optional(),
  provider: z.string().min(1),
  transactionId: z.string().optional(),
});

// Module schemas — price is required (teachers must set individual price per module)
export const createModuleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  order: z.number().int().min(0),
  price: z.number().min(0),
  createdBy: z.string().min(1),
  // courseId comes from URL params, not body
});

export const updateModuleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  order: z.number().int().min(0).optional(),
  price: z.number().min(0).optional(),
});

// Section schema (no price — sections are containers; modules have price)
export const createSectionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  order: z.number().int().min(0),
  createdBy: z.string().min(1),
});

// Quiz schemas
export const createQuizSchema = z.object({
  courseId: z.string().min(1),
  moduleId: z.string().optional(),
  lessonId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  instructions: z.string().max(5000).optional(),
  timeLimit: z.number().int().min(0).optional(),
  maxAttempts: z.number().int().min(1).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  dueDate: z.string().datetime().optional(),
  createdBy: z.string().min(1),
});

// Subscription schemas
export const createSubscriptionSchema = z.object({
  provider: z.string().min(1),
  transactionId: z.string().optional(),
});

export const activateSubscriptionSchema = z.object({
  transactionId: z.string().min(1),
  provider: z.string().min(1),
});

// Assignment schemas
export const createAssignmentSchema = z.object({
  courseId: z.string().min(1),
  moduleId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  instructions: z.string().max(5000).optional(),
  type: z.string().min(1),
  maxScore: z.number().min(0).optional(),
  dueDate: z.string().datetime().optional(),
  createdBy: z.string().min(1),
});

// Progress schemas
export const createProgressSchema = z.object({
  studentId: z.string().min(1),
  courseId: z.string().min(1),
  moduleId: z.string().optional(),
  type: z.enum(['module', 'quiz', 'assignment', 'video', 'material']),
  itemId: z.string().min(1),
  status: z.enum(['not_started', 'in_progress', 'completed', 'passed', 'failed']),
  progress: z.number().min(0).max(100).optional(),
  score: z.number().min(0).optional(),
  timeSpent: z.number().int().min(0).optional(),
});

// Message schemas
export const createMessageSchema = z.object({
  conversationId: z.string().min(1).optional(),
  receiverId: z.string().min(1).optional(),
  content: z.string().min(1).max(10000),
  type: z.enum(['text', 'image', 'file', 'system']).default('text').optional(),
  replyToId: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string(),
    size: z.number().optional(),
    mimeType: z.string().optional(),
  })).optional(),
  metadata: z.record(z.any()).optional(),
}).refine(
  (data) => data.conversationId || data.receiverId,
  {
    message: "Either conversationId or receiverId must be provided",
    path: ["conversationId"], // This will show the error on conversationId field
  }
);

export const createConversationSchema = z.object({
  type: z.enum(['direct', 'group']),
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  participantIds: z.array(z.string().min(1)).min(2),
});

// ID parameter schema
export const idParamSchema = z.object({
  id: z.string().min(1),
});

// Course ID param schema
export const courseIdParamSchema = z.object({
  id: z.string().min(1),
});

// Quiz question schema
export const createQuizQuestionSchema = z.object({
  quizId: z.string().min(1),
  question: z.string().min(1).max(1000),
  type: z.enum(['multiple_choice', 'true_false', 'fill_blank', 'essay']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.any(), // Can be string or object
  points: z.number().int().min(1).default(1).optional(),
  order: z.number().int().min(0),
  explanation: z.string().max(1000).optional(),
});

// Start quiz attempt schema
export const startQuizAttemptSchema = z.object({
  quizId: z.string().min(1),
  studentId: z.string().min(1),
});

// Submit quiz attempt schema
export const submitQuizAttemptSchema = z.object({
  attemptId: z.string().min(1),
  answers: z.record(z.any()), // Object with question IDs as keys
  timeSpent: z.number().int().min(0).optional(),
});

// Update quiz schema
export const updateQuizSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  instructions: z.string().max(5000).optional(),
  timeLimit: z.number().int().min(0).optional(),
  maxAttempts: z.number().int().min(1).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  dueDate: z.string().datetime().optional(),
  isPublished: z.boolean().optional(),
});

// Update assignment schema
export const updateAssignmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  instructions: z.string().max(5000).optional(),
  maxScore: z.number().min(0).optional(),
  dueDate: z.string().datetime().optional(),
  isPublished: z.boolean().optional(),
});

// Update progress schema
export const updateProgressSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed', 'passed', 'failed']).optional(),
  progress: z.number().min(0).max(100).optional(),
  score: z.number().min(0).optional(),
  timeSpent: z.number().int().min(0).optional(),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  token: z.string().min(1),
});

// Email verification schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

// Resend verification email schema
export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

// Calendar event schemas
export const createCalendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(['live_class', 'deadline', 'assignment_due', 'quiz_due', 'custom']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  isAllDay: z.boolean().default(false).optional(),
  location: z.string().max(200).optional(),
  courseId: z.string().optional(),
  assignmentId: z.string().optional(),
  quizId: z.string().optional(),
  isRecurring: z.boolean().default(false).optional(),
  recurrenceRule: z.string().optional(),
  reminderMinutes: z.array(z.number().int().min(0)).optional(),
  attendeeIds: z.array(z.string().min(1)).optional(),
  metadata: z.any().optional(),
});

export const updateCalendarEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isAllDay: z.boolean().optional(),
  location: z.string().max(200).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
  reminderMinutes: z.array(z.number().int().min(0)).optional(),
  metadata: z.any().optional(),
});

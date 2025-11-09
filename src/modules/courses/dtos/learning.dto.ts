/**
 * Learning Management System DTOs
 * Comprehensive data transfer objects for advanced learning features
 */

/**
 * Course Module DTOs
 * Handles structured course content organization
 */
import { Prisma } from '@prisma/client';
export interface CreateCourseModuleDto {
  courseId: number;
  title: string;
  description?: string;
  content?: Prisma.InputJsonValue;
  order: number;
  isPublished?: boolean;
  publishedAt?: Date;
  createdBy: number;
  creator?: { id: number; username: string; email: string };
  lessons?: any[];
  quizzes?: any[];
  assignments?: any[];
  progress?: any[];
}

export interface UpdateCourseModuleDto {
  title?: string;
  description?: string;
  order?: number;
  isPublished?: boolean;
}

export interface CourseModuleResponseDto {
  id: number;
  courseId: number;
  title: string;
  description?: string;
  order: number;
  isPublished: boolean;
  publishedAt?: Date;
  createdBy: number;
  creator: {
    id: number;
    username: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lessons: LessonResponseDto[];
  quizzes: QuizResponseDto[];
  assignments: AssignmentResponseDto[];
  progress: ProgressResponseDto[];
}

/**
 * Quiz System DTOs
 * Advanced assessment and testing capabilities
 */
export interface CreateQuizDto {
  courseId: number;
  moduleId?: number;
  title: string;
  description?: string;
  instructions?: string;
  timeLimit?: number; // in minutes
  maxAttempts?: number;
  passingScore?: number; // percentage
  dueDate?: Date;
  createdBy: number;
}

export interface UpdateQuizDto {
  title?: string;
  description?: string;
  instructions?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  dueDate?: Date;
  isPublished?: boolean;
}

export interface QuizResponseDto {
  id: number;
  courseId: number;
  moduleId?: number;
  title: string;
  description?: string;
  instructions?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  isPublished: boolean;
  publishedAt?: Date;
  dueDate?: Date;
  createdBy: number;
  creator: {
    id: number;
    username: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  questions: QuizQuestionResponseDto[];
  attempts: QuizAttemptResponseDto[];
}

export interface CreateQuizQuestionDto {
  quizId: number;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay';
  options?: any; // For multiple choice
  correctAnswer?: any; // Flexible for different question types
  points?: number;
  order: number;
  explanation?: string;
}

export interface QuizQuestionResponseDto {
  id: number;
  quizId: number;
  question: string;
  type: string;
  options?: any;
  correctAnswer?: any;
  points: number;
  order: number;
  explanation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StartQuizAttemptDto {
  quizId: number;
  studentId: number;
}

export interface SubmitQuizAttemptDto {
  attemptId: number;
  answers: any; // Student answers
  timeSpent?: number; // in seconds
}

export interface QuizAttemptResponseDto {
  id: number;
  quizId: number;
  studentId: number;
  student: {
    id: number;
    username: string;
    email: string;
  };
  score?: number;
  maxScore: number;
  percentage?: number;
  isPassed: boolean;
  timeSpent?: number;
  startedAt: Date;
  submittedAt?: Date;
  gradedAt?: Date;
  gradedBy?: number;
  grader?: {
    id: number;
    username: string;
    email: string;
  };
  answers?: any;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Assignment System DTOs
 * Various assignment types with detailed tracking
 */
export interface CreateAssignmentDto {
  courseId: number;
  moduleId?: number;
  title: string;
  description?: string;
  instructions?: string;
  type: 'essay' | 'file_upload' | 'peer_review' | 'group_project';
  maxScore?: number;
  dueDate?: Date;
  createdBy: number;
}

export interface UpdateAssignmentDto {
  title?: string;
  description?: string;
  instructions?: string;
  type?: string;
  maxScore?: number;
  dueDate?: Date;
  isPublished?: boolean;
}

export interface AssignmentResponseDto {
  id: number;
  courseId: number;
  moduleId?: number;
  title: string;
  description?: string;
  instructions?: string;
  type: string;
  maxScore?: number;
  dueDate?: Date;
  isPublished: boolean;
  publishedAt?: Date;
  createdBy: number;
  creator: {
    id: number;
    username: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  submissions: SubmissionResponseDto[];
}

/**
 * Progress Tracking DTOs
 * Comprehensive student progress monitoring
 */
export interface CreateProgressDto {
  studentId: number;
  courseId: number;
  moduleId?: number;
  type: 'module' | 'quiz' | 'assignment' | 'video' | 'material';
  itemId: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'passed' | 'failed';
  progress?: number; // 0-100
  score?: number;
  timeSpent?: number; // in seconds
}

export interface UpdateProgressDto {
  status?: string;
  progress?: number;
  score?: number;
  timeSpent?: number;
  completedAt?: Date;
}

export interface ProgressResponseDto {
  id: number;
  studentId: number;
  student: {
    id: number;
    username: string;
    email: string;
  };
  courseId: number;
  course: {
    id: number;
    title: string;
  };
  moduleId?: number;
  module?: {
    id: number;
    title: string;
  };
  type: string;
  itemId: number;
  status: string;
  progress: number;
  score?: number;
  timeSpent?: number;
  lastAccessed: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Gamification DTOs
 * Badges, achievements, and certificates
 */
export interface CreateBadgeDto {
  name: string;
  description: string;
  icon?: string;
  color?: string;
  category?: string;
  criteria?: any;
}

export interface BadgeResponseDto {
  id: number;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  category?: string;
  criteria?: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AchievementResponseDto {
  id: number;
  studentId: number;
  student: {
    id: number;
    username: string;
    email: string;
  };
  badgeId: number;
  badge: BadgeResponseDto;
  courseId?: number;
  course?: {
    id: number;
    title: string;
  };
  earnedAt: Date;
  metadata?: any;
}

export interface CreateCertificateDto {
  studentId: number;
  courseId: number;
  title: string;
  description?: string;
  template?: string;
  expiresAt?: Date;
}

export interface CertificateResponseDto {
  id: number;
  studentId: number;
  student: {
    id: number;
    username: string;
    email: string;
  };
  courseId: number;
  course: {
    id: number;
    title: string;
  };
  title: string;
  description?: string;
  template?: string;
  issuedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Analytics DTOs
 * Learning analytics and insights
 */
export interface LearningAnalyticsDto {
  courseId: number;
  totalStudents: number;
  completionRate: number;
  averageScore: number;
  averageTimeSpent: number;
  moduleProgress: ModuleProgressDto[];
  quizPerformance: QuizPerformanceDto[];
  assignmentPerformance: AssignmentPerformanceDto[];
  engagementMetrics: EngagementMetricsDto;
}

export interface ModuleProgressDto {
  moduleId: number;
  title: string;
  completionRate: number;
  averageTimeSpent: number;
  studentCount: number;
}

export interface QuizPerformanceDto {
  quizId: number;
  title: string;
  averageScore: number;
  passRate: number;
  attemptCount: number;
  averageTimeSpent: number;
}

export interface AssignmentPerformanceDto {
  assignmentId: number;
  title: string;
  submissionRate: number;
  averageScore: number;
  onTimeSubmissionRate: number;
}

export interface EngagementMetricsDto {
  videoViews: number;
  materialDownloads: number;
  forumPosts: number;
  questionAsks: number;
  averageSessionTime: number;
  returnRate: number;
}

/**
 * Lesson DTOs (if not already defined)
 */
export interface LessonResponseDto {
  id: number;
  courseId: number;
  moduleId?: number;
  title: string;
  content?: any;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Submission DTOs (if not already defined)
 */
export interface SubmissionResponseDto {
  id: number;
  assignmentId: number;
  studentId: number;
  student: {
    id: number;
    username: string;
    email: string;
  };
  content?: string;
  attachments?: any;
  submittedAt: Date;
  gradedAt?: Date;
  grade?: number;
  feedback?: string;
}

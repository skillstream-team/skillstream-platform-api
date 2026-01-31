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
  collectionId: string;
  title: string;
  description?: string;
  content?: Prisma.InputJsonValue;
  order: number;
  isPublished?: boolean;
  publishedAt?: Date;
  createdBy: string;
  creator?: { id: string; username: string; email: string };
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
  id: string;
  collectionId: string;
  title: string;
  description?: string;
  order: number;
  isPublished: boolean;
  publishedAt?: Date;
  createdBy: string;
  creator: {
    id: string;
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
  collectionId: string;
  moduleId?: string;
  title: string;
  description?: string;
  instructions?: string;
  timeLimit?: number; // in minutes
  maxAttempts?: number;
  passingScore?: number; // percentage
  dueDate?: Date;
  createdBy: string;
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
  id: string;
  collectionId: string;
  moduleId?: string;
  title: string;
  description?: string;
  instructions?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  isPublished: boolean;
  publishedAt?: Date;
  dueDate?: Date;
  createdBy: string;
  creator: {
    id: string;
    username: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  questions: QuizQuestionResponseDto[];
  attempts: QuizAttemptResponseDto[];
}

export interface CreateQuizQuestionDto {
  quizId: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay';
  options?: any; // For multiple choice
  correctAnswer?: any; // Flexible for different question types
  points?: number;
  order: number;
  explanation?: string;
}

export interface QuizQuestionResponseDto {
  id: string;
  quizId: string;
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
  quizId: string;
  studentId: string;
}

export interface SubmitQuizAttemptDto {
  attemptId: string;
  answers: any; // Student answers
  timeSpent?: number; // in seconds
}

export interface QuizAttemptResponseDto {
  id: string;
  quizId: string;
  studentId: string;
  student: {
    id: string;
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
  gradedBy?: string | null;
  grader?: {
    id: string;
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
  collectionId: string;
  moduleId?: string;
  title: string;
  description?: string;
  instructions?: string;
  type: 'essay' | 'file_upload' | 'peer_review' | 'group_project';
  maxScore?: number;
  dueDate?: Date;
  createdBy: string;
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
  id: string;
  collectionId: string;
  moduleId?: string;
  title: string;
  description?: string;
  instructions?: string;
  type: string;
  maxScore?: number;
  dueDate?: Date;
  isPublished: boolean;
  publishedAt?: Date;
  createdBy: string;
  creator: {
    id: string;
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
  studentId: string;
  collectionId?: string;
  programId?: string;
  moduleId?: string;
  type: 'module' | 'quiz' | 'assignment' | 'video' | 'material';
  itemId: string;
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
  id: string;
  studentId: string;
  student: {
    id: string;
    username: string;
    email: string;
  };
  collectionId: string;
  collection: {
    id: string;
    title: string;
  };
  moduleId?: string;
  module?: {
    id: string;
    title: string;
  };
  type: string;
  itemId: string;
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
  id: string;
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
  id: string;
  studentId: string;
  student: {
    id: string;
    username: string;
    email: string;
  };
  badgeId: string;
  badge: BadgeResponseDto;
  collectionId?: string;
  collection?: {
    id: string;
    title: string;
  };
  earnedAt: Date;
  metadata?: any;
}

export interface CreateCertificateDto {
  studentId: string;
  collectionId: string;
  title: string;
  description?: string;
  template?: string;
  expiresAt?: Date;
}

export interface CertificateResponseDto {
  id: string;
  studentId: string;
  student: {
    id: string;
    username: string;
    email: string;
  };
  collectionId: string;
  collection: {
    id: string;
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
  collectionId: string;
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
  moduleId: string;
  title: string;
  completionRate: number;
  averageTimeSpent: number;
  studentCount: number;
}

export interface QuizPerformanceDto {
  quizId: string;
  title: string;
  averageScore: number;
  passRate: number;
  attemptCount: number;
  averageTimeSpent: number;
}

export interface AssignmentPerformanceDto {
  assignmentId: string;
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
  id: string;
  collectionId: string;
  moduleId?: string;
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
  id: string;
  assignmentId: string;
  studentId: string;
  student: {
    id: string;
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

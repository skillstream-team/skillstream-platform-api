import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface CreateLearningPathDto {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  categoryId?: string;
  difficulty?: string;
  courseIds: string[];
}

export interface LearningPathResponseDto {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  difficulty?: string;
  isActive: boolean;
  courses: Array<{
    id: string;
    title: string;
    thumbnailUrl?: string;
    order: number;
    isRequired: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export class LearningPathsService {
  /**
   * Create a learning path
   */
  async createPath(data: CreateLearningPathDto): Promise<LearningPathResponseDto> {
    // Validate all courses exist
    const courses = await prisma.course.findMany({
      where: { id: { in: data.courseIds } },
    });

    if (courses.length !== data.courseIds.length) {
      throw new Error('One or more courses not found');
    }

    const path = await prisma.learningPath.create({
      data: {
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        categoryId: data.categoryId,
        difficulty: data.difficulty,
        courses: {
          create: data.courseIds.map((courseId, index) => ({
            courseId,
            order: index,
            isRequired: true,
          })),
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.mapToDto(path);
  }

  /**
   * Get all active learning paths
   */
  async getAllPaths(): Promise<LearningPathResponseDto[]> {
    const paths = await prisma.learningPath.findMany({
      where: { isActive: true },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return paths.map(this.mapToDto);
  }

  /**
   * Get learning path by ID
   */
  async getPathById(pathId: string): Promise<LearningPathResponseDto | null> {
    const path = await prisma.learningPath.findUnique({
      where: { id: pathId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return path ? this.mapToDto(path) : null;
  }

  /**
   * Enroll student in learning path
   */
  async enrollInPath(pathId: string, studentId: string): Promise<void> {
    const path = await prisma.learningPath.findUnique({
      where: { id: pathId },
    });

    if (!path) {
      throw new Error('Learning path not found');
    }

    if (!path.isActive) {
      throw new Error('Learning path is not active');
    }

    // Check if already enrolled
    const existing = await prisma.learningPathEnrollment.findUnique({
      where: {
        pathId_studentId: {
          pathId,
          studentId,
        },
      },
    });

    if (existing) {
      throw new Error('Already enrolled in this learning path');
    }

    await prisma.learningPathEnrollment.create({
      data: {
        pathId,
        studentId,
        progress: 0,
      },
    });

    // Invalidate dashboard cache
    await deleteCache(`dashboard:${studentId}`);
  }

  /**
   * Get student's learning path progress
   */
  async getStudentPathProgress(
    pathId: string,
    studentId: string
  ): Promise<{
    path: LearningPathResponseDto;
    progress: number;
    currentCourseId?: string;
    completedCourses: number;
    totalCourses: number;
    courses: Array<{
      courseId: string;
      title: string;
      progress: number;
      isCompleted: boolean;
    }>;
  }> {
    const enrollment = await prisma.learningPathEnrollment.findUnique({
      where: {
        pathId_studentId: {
          pathId,
          studentId,
        },
      },
    });

    if (!enrollment) {
      throw new Error('Not enrolled in this learning path');
    }

    const path = await this.getPathById(pathId);
    if (!path) {
      throw new Error('Learning path not found');
    }

    // Get progress for each course in the path
    const courseIds = path.courses.map((c) => c.id);
    const certificates = await prisma.certificate.findMany({
      where: {
        studentId,
        courseId: { in: courseIds },
      },
      select: {
        courseId: true,
      },
    });

    const completedCourseIds = new Set(certificates.map((c) => c.courseId));

    const coursesProgress = await Promise.all(
      path.courses.map(async (pathCourse) => {
        const progress = await prisma.progress.findMany({
          where: {
            studentId,
            courseId: pathCourse.id,
          },
        });

        const completed = progress.filter(
          (p) => p.status === 'completed' || p.status === 'passed'
        ).length;
        const total = progress.length;
        const courseProgress = total > 0 ? (completed / total) * 100 : 0;
        const isCompleted = completedCourseIds.has(pathCourse.id);

        return {
          courseId: pathCourse.id,
          title: pathCourse.title,
          progress: Math.round(courseProgress),
          isCompleted,
        };
      })
    );

    const completedCourses = coursesProgress.filter((c) => c.isCompleted).length;
    const overallProgress = path.courses.length > 0
      ? (completedCourses / path.courses.length) * 100
      : 0;

    // Update enrollment progress
    await prisma.learningPathEnrollment.update({
      where: {
        id: enrollment.id,
      },
      data: {
        progress: overallProgress,
        currentCourseId: coursesProgress.find((c) => !c.isCompleted)?.courseId || null,
      },
    });

    return {
      path,
      progress: Math.round(overallProgress),
      currentCourseId: enrollment.currentCourseId || undefined,
      completedCourses,
      totalCourses: path.courses.length,
      courses: coursesProgress,
    };
  }

  private mapToDto(path: any): LearningPathResponseDto {
    return {
      id: path.id,
      title: path.title,
      description: path.description || undefined,
      thumbnailUrl: path.thumbnailUrl || undefined,
      categoryId: path.categoryId || undefined,
      category: path.category
        ? {
            id: path.category.id,
            name: path.category.name,
            slug: path.category.slug,
          }
        : undefined,
      difficulty: path.difficulty || undefined,
      isActive: path.isActive,
      courses: path.courses.map((pc: any) => ({
        id: pc.course.id,
        title: pc.course.title,
        thumbnailUrl: pc.course.thumbnailUrl || undefined,
        order: pc.order,
        isRequired: pc.isRequired,
      })),
      createdAt: path.createdAt,
      updatedAt: path.updatedAt,
    };
  }
}

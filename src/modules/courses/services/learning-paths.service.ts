import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface CreateLearningPathDto {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  categoryId?: string;
  difficulty?: string;
  collectionIds: string[];
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
  collections: Array<{
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
    // Validate all collections exist
    const programs = await prisma.program.findMany({
      where: { id: { in: data.collectionIds } },
    });

    if (programs.length !== data.collectionIds.length) {
      throw new Error('One or more programs not found');
    }

    const path = await prisma.learningPath.create({
      data: {
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        categoryId: data.categoryId,
        difficulty: data.difficulty,
        programs: {
          create: data.collectionIds.map((programId, index) => ({
            programId,
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
        programs: {
          include: {
            program: {
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
        programs: {
          include: {
            program: {
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
        programs: {
          include: {
            program: {
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
    currentCollectionId?: string;
    completedCollections: number;
    totalCollections: number;
    collections: Array<{
      collectionId: string;
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

    // Get progress for each collection in the path
    const pathWithPrograms = path as any;
    const programIds = pathWithPrograms.programs?.map((p: any) => p.program.id) || [];
    const certificates = await prisma.certificate.findMany({
      where: {
        studentId,
        programId: { in: programIds },
      },
      select: {
        programId: true,
      },
    });

    const completedProgramIds = new Set(certificates.map((c: any) => c.programId));

    const programsProgress = await Promise.all(
      (pathWithPrograms.programs || []).map(async (pathProgram: any) => {
        const progress = await prisma.progress.findMany({
          where: {
            studentId,
            programId: pathProgram.program.id,
          },
        });

        const completed = progress.filter(
          (p: any) => p.status === 'completed' || p.status === 'passed'
        ).length;
        const total = progress.length;
        const collectionProgress = total > 0 ? (completed / total) * 100 : 0;
        const isCompleted = completedProgramIds.has(pathProgram.program.id);

        return {
          collectionId: pathProgram.program.id,
          title: pathProgram.program.title,
          progress: Math.round(collectionProgress),
          isCompleted,
        };
      })
    );

    const completedCollections = programsProgress.filter((c: any) => c.isCompleted).length;
    const totalPrograms = pathWithPrograms.programs?.length || 0;
    const overallProgress = totalPrograms > 0
      ? (completedCollections / totalPrograms) * 100
      : 0;

    // Update enrollment progress
    await prisma.learningPathEnrollment.update({
      where: {
        id: enrollment.id,
      },
      data: {
        progress: overallProgress,
        currentCollectionId: programsProgress.find((c: any) => !c.isCompleted)?.collectionId || null,
      },
    });

    return {
      path,
      progress: Math.round(overallProgress),
      currentCollectionId: enrollment.currentCollectionId || undefined,
      completedCollections,
      totalCollections: totalPrograms,
      collections: programsProgress,
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
      collections: path.collections.map((pc: any) => ({
        id: pc.collection.id,
        title: pc.collection.title,
        thumbnailUrl: pc.collection.thumbnailUrl || undefined,
        order: pc.order,
        isRequired: pc.isRequired,
      })),
      createdAt: path.createdAt,
      updatedAt: path.updatedAt,
    };
  }
}

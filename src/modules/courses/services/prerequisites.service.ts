import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface CreatePrerequisiteDto {
  courseId: string;
  prerequisiteId: string;
  isRequired?: boolean;
}

export interface PrerequisiteResponseDto {
  id: string;
  courseId: string;
  course: {
    id: string;
    title: string;
  };
  prerequisiteId: string;
  prerequisite: {
    id: string;
    title: string;
    difficulty?: string;
  };
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PrerequisitesService {
  /**
   * Add a prerequisite to a course
   */
  async addPrerequisite(data: CreatePrerequisiteDto): Promise<PrerequisiteResponseDto> {
    // Prevent self-reference
    if (data.courseId === data.prerequisiteId) {
      throw new Error('A course cannot be a prerequisite of itself');
    }

    // Check if prerequisite course exists
    const prerequisiteCourse = await prisma.course.findUnique({
      where: { id: data.prerequisiteId },
    });

    if (!prerequisiteCourse) {
      throw new Error('Prerequisite course not found');
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    // Check for circular dependencies
    const wouldCreateCycle = await this.wouldCreateCircularDependency(
      data.courseId,
      data.prerequisiteId
    );

    if (wouldCreateCycle) {
      throw new Error('Adding this prerequisite would create a circular dependency');
    }

    // Check if prerequisite already exists
    const existing = await prisma.coursePrerequisite.findUnique({
      where: {
        courseId_prerequisiteId: {
          courseId: data.courseId,
          prerequisiteId: data.prerequisiteId,
        },
      },
    });

    if (existing) {
      throw new Error('This prerequisite already exists');
    }

    const prerequisite = await prisma.coursePrerequisite.create({
      data: {
        courseId: data.courseId,
        prerequisiteId: data.prerequisiteId,
        isRequired: data.isRequired ?? true,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        prerequisite: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
      },
    });

    // Invalidate cache
    await deleteCache(`course:${data.courseId}`);
    await deleteCache(`course:${data.prerequisiteId}`);

    return this.mapToDto(prerequisite);
  }

  /**
   * Remove a prerequisite from a course
   */
  async removePrerequisite(courseId: string, prerequisiteId: string): Promise<void> {
    const prerequisite = await prisma.coursePrerequisite.findUnique({
      where: {
        courseId_prerequisiteId: {
          courseId,
          prerequisiteId,
        },
      },
    });

    if (!prerequisite) {
      throw new Error('Prerequisite not found');
    }

    await prisma.coursePrerequisite.delete({
      where: {
        id: prerequisite.id,
      },
    });

    // Invalidate cache
    await deleteCache(`course:${courseId}`);
  }

  /**
   * Get all prerequisites for a course
   */
  async getCoursePrerequisites(courseId: string): Promise<PrerequisiteResponseDto[]> {
    const prerequisites = await prisma.coursePrerequisite.findMany({
      where: { courseId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        prerequisite: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return prerequisites.map(this.mapToDto);
  }

  /**
   * Get all courses that require this course as a prerequisite
   */
  async getDependentCourses(courseId: string): Promise<PrerequisiteResponseDto[]> {
    const dependents = await prisma.coursePrerequisite.findMany({
      where: { prerequisiteId: courseId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        prerequisite: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return dependents.map(this.mapToDto);
  }

  /**
   * Check if a student has completed all required prerequisites
   */
  async checkPrerequisites(studentId: string, courseId: string): Promise<{
    canEnroll: boolean;
    missingPrerequisites: Array<{
      id: string;
      title: string;
      isRequired: boolean;
    }>;
  }> {
    const prerequisites = await prisma.coursePrerequisite.findMany({
      where: {
        courseId,
        isRequired: true,
      },
      include: {
        prerequisite: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (prerequisites.length === 0) {
      return {
        canEnroll: true,
        missingPrerequisites: [],
      };
    }

    // Check if student has completed all prerequisites
    const prerequisiteIds = prerequisites.map((p) => p.prerequisiteId);
    const completedCourses = await prisma.certificate.findMany({
      where: {
        studentId,
        courseId: { in: prerequisiteIds },
      },
      select: {
        courseId: true,
      },
    });

    const completedCourseIds = new Set(completedCourses.map((c) => c.courseId));
    const missingPrerequisites = prerequisites
      .filter((p) => !completedCourseIds.has(p.prerequisiteId))
      .map((p) => ({
        id: p.prerequisite.id,
        title: p.prerequisite.title,
        isRequired: p.isRequired,
      }));

    return {
      canEnroll: missingPrerequisites.length === 0,
      missingPrerequisites,
    };
  }

  /**
   * Check if adding a prerequisite would create a circular dependency
   */
  private async wouldCreateCircularDependency(
    courseId: string,
    prerequisiteId: string
  ): Promise<boolean> {
    // If the prerequisite course has the current course as a prerequisite (direct or indirect),
    // it would create a cycle
    const visited = new Set<string>();
    const queue = [prerequisiteId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (currentId === courseId) {
        return true; // Cycle detected
      }

      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      // Get all prerequisites of the current course
      const prereqs = await prisma.coursePrerequisite.findMany({
        where: { courseId: currentId },
        select: { prerequisiteId: true },
      });

      for (const prereq of prereqs) {
        if (!visited.has(prereq.prerequisiteId)) {
          queue.push(prereq.prerequisiteId);
        }
      }
    }

    return false;
  }

  private mapToDto(prerequisite: any): PrerequisiteResponseDto {
    return {
      id: prerequisite.id,
      courseId: prerequisite.courseId,
      course: {
        id: prerequisite.course.id,
        title: prerequisite.course.title,
      },
      prerequisiteId: prerequisite.prerequisiteId,
      prerequisite: {
        id: prerequisite.prerequisite.id,
        title: prerequisite.prerequisite.title,
        difficulty: prerequisite.prerequisite.difficulty || undefined,
      },
      isRequired: prerequisite.isRequired,
      createdAt: prerequisite.createdAt,
      updatedAt: prerequisite.updatedAt,
    };
  }
}

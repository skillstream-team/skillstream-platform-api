import { prisma } from '../../../utils/prisma';

export interface CourseComparisonDto {
  courses: Array<{
    id: string;
    title: string;
    description?: string;
    price: number;
    thumbnailUrl?: string;
    difficulty?: string;
    duration?: number;
    language?: string;
    category?: {
      id: string;
      name: string;
    };
    instructor: {
      id: string;
      username: string;
    };
    averageRating?: number;
    reviewCount: number;
    enrollmentCount: number;
    lessonCount: number;
    moduleCount: number;
    hasCertificate: boolean;
    prerequisites: Array<{
      id: string;
      title: string;
    }>;
    tags: string[];
  }>;
}

export class ComparisonService {
  /**
   * Compare multiple courses
   */
  async compareCourses(courseIds: string[]): Promise<CourseComparisonDto> {
    if (courseIds.length < 2 || courseIds.length > 5) {
      throw new Error('Can compare between 2 and 5 courses');
    }

    const courses = await prisma.collection.findMany({
      where: { id: { in: courseIds } },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        instructor: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            collectionLessons: true,
            modules: true,
            reviews: true,
            certificates: true,
          },
        },
        prerequisites: {
          include: {
            prerequisite: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        tags: {
          select: {
            name: true,
          },
        },
      },
    });

    // Calculate average ratings
    const reviews = await prisma.collectionReview.findMany({
      where: {
        collectionId: { in: courseIds },
        isPublished: true,
      },
      select: {
        collectionId: true,
        rating: true,
      },
    });

    const ratingsMap = new Map<string, number>();
    for (const courseId of courseIds) {
      const courseReviews = reviews.filter((r: any) => r.collectionId === courseId);
      const average =
        courseReviews.length > 0
          ? courseReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / courseReviews.length
          : 0;
      ratingsMap.set(courseId, Math.round(average * 10) / 10);
    }

    return {
      courses: courses.map((course: any) => ({
        id: course.id,
        title: course.title,
        description: course.description || undefined,
        price: course.price,
        thumbnailUrl: course.thumbnailUrl || undefined,
        difficulty: course.difficulty || undefined,
        duration: course.duration || undefined,
        language: course.language || undefined,
        category: course.category
          ? {
              id: course.category.id,
              name: course.category.name,
            }
          : undefined,
        instructor: {
          id: course.instructor.id,
          username: course.instructor.username,
        },
        averageRating: ratingsMap.get(course.id) || 0,
        reviewCount: course._count.reviews,
        enrollmentCount: course._count.enrollments,
        lessonCount: course._count.collectionLessons,
        moduleCount: course._count.modules,
        hasCertificate: course._count.certificates > 0,
        prerequisites: course.prerequisites.map((p: any) => ({
          id: p.prerequisite.id,
          title: p.prerequisite.title,
        })),
        tags: course.tags.map((t: any) => t.name),
      })),
    };
  }
}

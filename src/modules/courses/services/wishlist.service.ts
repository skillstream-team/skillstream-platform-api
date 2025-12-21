import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface WishlistItemDto {
  id: string;
  courseId: string;
  course: {
    id: string;
    title: string;
    description?: string;
    price: number;
    thumbnailUrl?: string;
    category?: {
      id: string;
      name: string;
      slug: string;
    };
    instructor: {
      id: string;
      username: string;
      email: string;
    };
    averageRating?: number;
    reviewCount?: number;
    enrollmentCount?: number;
  };
  createdAt: Date;
}

export interface WishlistResponseDto {
  data: WishlistItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class WishlistService {
  /**
   * Add a course to user's wishlist
   */
  async addToWishlist(userId: string, courseId: string): Promise<WishlistItemDto> {
    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    // Check if already in wishlist
    const existing = await prisma.courseWishlist.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existing) {
      throw new Error('Course is already in your wishlist');
    }

    // Add to wishlist
    const wishlistItem = await prisma.courseWishlist.create({
      data: {
        userId,
        courseId,
      },
      include: {
        course: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            instructor: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            _count: {
              select: {
                enrollments: true,
                reviews: true,
              },
            },
          },
        },
      },
    });

    // Calculate average rating
    const reviews = await prisma.courseReview.findMany({
      where: {
        courseId,
        isPublished: true,
      },
      select: {
        rating: true,
      },
    });

    const averageRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
        : 0;

    // Invalidate cache
    await deleteCache(`wishlist:${userId}`);

    return {
      id: wishlistItem.id,
      courseId: wishlistItem.courseId,
      course: {
        id: wishlistItem.course.id,
        title: wishlistItem.course.title,
        description: wishlistItem.course.description || undefined,
        price: wishlistItem.course.price,
        thumbnailUrl: wishlistItem.course.thumbnailUrl || undefined,
        category: wishlistItem.course.category
          ? {
              id: wishlistItem.course.category.id,
              name: wishlistItem.course.category.name,
              slug: wishlistItem.course.category.slug,
            }
          : undefined,
        instructor: {
          id: wishlistItem.course.instructor.id,
          username: wishlistItem.course.instructor.username,
          email: wishlistItem.course.instructor.email,
        },
        averageRating,
        reviewCount: wishlistItem.course._count.reviews,
        enrollmentCount: wishlistItem.course._count.enrollments,
      },
      createdAt: wishlistItem.createdAt,
    };
  }

  /**
   * Remove a course from user's wishlist
   */
  async removeFromWishlist(userId: string, courseId: string): Promise<void> {
    const wishlistItem = await prisma.courseWishlist.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!wishlistItem) {
      throw new Error('Course is not in your wishlist');
    }

    await prisma.courseWishlist.delete({
      where: {
        id: wishlistItem.id,
      },
    });

    // Invalidate cache
    await deleteCache(`wishlist:${userId}`);
  }

  /**
   * Get user's wishlist
   */
  async getUserWishlist(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<WishlistResponseDto> {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const [wishlistItems, total] = await Promise.all([
      prisma.courseWishlist.findMany({
        where: { userId },
        skip,
        take,
        include: {
          course: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              instructor: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
              _count: {
                select: {
                  enrollments: true,
                  reviews: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.courseWishlist.count({ where: { userId } }),
    ]);

    // Calculate average ratings for all courses
    const courseIds = wishlistItems.map((item) => item.courseId);
    const reviews = await prisma.courseReview.findMany({
      where: {
        courseId: { in: courseIds },
        isPublished: true,
      },
      select: {
        courseId: true,
        rating: true,
      },
    });

    // Calculate average rating per course
    const ratingsMap = new Map<string, number>();
    for (const courseId of courseIds) {
      const courseReviews = reviews.filter((r) => r.courseId === courseId);
      const average =
        courseReviews.length > 0
          ? courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length
          : 0;
      ratingsMap.set(courseId, Math.round(average * 10) / 10);
    }

    const data: WishlistItemDto[] = wishlistItems.map((item) => ({
      id: item.id,
      courseId: item.courseId,
      course: {
        id: item.course.id,
        title: item.course.title,
        description: item.course.description || undefined,
        price: item.course.price,
        thumbnailUrl: item.course.thumbnailUrl || undefined,
        category: item.course.category
          ? {
              id: item.course.category.id,
              name: item.course.category.name,
              slug: item.course.category.slug,
            }
          : undefined,
        instructor: {
          id: item.course.instructor.id,
          username: item.course.instructor.username,
          email: item.course.instructor.email,
        },
        averageRating: ratingsMap.get(item.courseId) || 0,
        reviewCount: item.course._count.reviews,
        enrollmentCount: item.course._count.enrollments,
      },
      createdAt: item.createdAt,
    }));

    return {
      data,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
        hasNext: page * take < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Check if a course is in user's wishlist
   */
  async isInWishlist(userId: string, courseId: string): Promise<boolean> {
    const wishlistItem = await prisma.courseWishlist.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    return !!wishlistItem;
  }

  /**
   * Get wishlist count for a user
   */
  async getWishlistCount(userId: string): Promise<number> {
    return prisma.courseWishlist.count({
      where: { userId },
    });
  }
}

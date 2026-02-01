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
    // Check if program exists
    const course = await prisma.program.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error('Program not found');
    }

    // Check if already in wishlist
    const existing = await prisma.programWishlist.findUnique({
      where: {
        userId_programId: {
          userId,
          programId: courseId,
        },
      },
    });

    if (existing) {
      throw new Error('Course is already in your wishlist');
    }

    // Add to wishlist
    const wishlistItem = await prisma.programWishlist.create({
      data: {
        userId,
        programId: courseId,
      },
      include: {
        program: {
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
    const reviews = await prisma.programReview.findMany({
      where: {
        programId: courseId,
        isPublished: true,
      },
      select: {
        rating: true,
      },
    });

    const averageRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length) * 10) / 10
        : 0;

    // Invalidate cache
    await deleteCache(`wishlist:${userId}`);

    const item = wishlistItem as any;
    return {
      id: item.id,
      courseId: item.programId,
      course: {
        id: item.program.id,
        title: item.program.title,
        description: item.program.description || undefined,
        price: item.program.price,
        thumbnailUrl: item.program.thumbnailUrl || undefined,
        category: item.program.category
          ? {
              id: item.program.category.id,
              name: item.program.category.name,
              slug: item.program.category.slug,
            }
          : undefined,
        instructor: {
          id: item.program.instructor.id,
          username: item.program.instructor.username,
          email: item.program.instructor.email,
        },
        averageRating,
        reviewCount: item.program._count.reviews,
        enrollmentCount: item.program._count.enrollments,
      },
      createdAt: item.createdAt,
    };
  }

  /**
   * Remove a course from user's wishlist
   */
  async removeFromWishlist(userId: string, courseId: string): Promise<void> {
    const wishlistItem = await prisma.programWishlist.findUnique({
      where: {
        userId_programId: {
          userId,
          programId: courseId,
        },
      },
    });

    if (!wishlistItem) {
      throw new Error('Course is not in your wishlist');
    }

    await prisma.programWishlist.delete({
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
      prisma.programWishlist.findMany({
        where: { userId },
        skip,
        take,
        include: {
          program: {
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
      prisma.programWishlist.count({ where: { userId } }),
    ]);

    // Calculate average ratings for all collections
    const courseIds = wishlistItems.map((item) => item.programId);
    const reviews = await prisma.programReview.findMany({
      where: {
        programId: { in: courseIds },
        isPublished: true,
      },
      select: {
        programId: true,
        rating: true,
      },
    });

    // Calculate average rating per collection
    const ratingsMap = new Map<string, number>();
    for (const courseId of courseIds) {
      const courseReviews = reviews.filter((r: any) => r.programId === courseId);
      const average =
        courseReviews.length > 0
          ? courseReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / courseReviews.length
          : 0;
      ratingsMap.set(courseId, Math.round(average * 10) / 10);
    }

    const data: WishlistItemDto[] = wishlistItems.map((item: any) => ({
      id: item.id,
      courseId: item.programId,
      course: {
        id: item.program.id,
        title: item.program.title,
        description: item.program.description || undefined,
        price: item.program.price,
        thumbnailUrl: item.program.thumbnailUrl || undefined,
        category: item.program.category
          ? {
              id: item.program.category.id,
              name: item.program.category.name,
              slug: item.program.category.slug,
            }
          : undefined,
        instructor: {
          id: item.program.instructor.id,
          username: item.program.instructor.username,
          email: item.program.instructor.email,
        },
        averageRating: ratingsMap.get(item.programId) || 0,
        reviewCount: item.program._count.reviews,
        enrollmentCount: item.program._count.enrollments,
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
    const wishlistItem = await prisma.programWishlist.findUnique({
      where: {
        userId_programId: {
          userId,
          programId: courseId,
        },
      },
    });

    return !!wishlistItem;
  }

  /**
   * Get wishlist count for a user
   */
  async getWishlistCount(userId: string): Promise<number> {
    return prisma.programWishlist.count({
      where: { userId },
    });
  }
}

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
    // Check if collection exists
    const course = await prisma.collection.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error('Collection not found');
    }

    // Check if already in wishlist
    const existing = await prisma.collectionWishlist.findUnique({
      where: {
        userId_collectionId: {
          userId,
          collectionId: courseId,
        },
      },
    });

    if (existing) {
      throw new Error('Course is already in your wishlist');
    }

    // Add to wishlist
    const wishlistItem = await prisma.collectionWishlist.create({
      data: {
        userId,
        collectionId: courseId,
      },
      include: {
        collection: {
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
    const reviews = await prisma.collectionReview.findMany({
      where: {
        collectionId: courseId,
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
      courseId: item.collectionId,
      course: {
        id: item.collection.id,
        title: item.collection.title,
        description: item.collection.description || undefined,
        price: item.collection.price,
        thumbnailUrl: item.collection.thumbnailUrl || undefined,
        category: item.collection.category
          ? {
              id: item.collection.category.id,
              name: item.collection.category.name,
              slug: item.collection.category.slug,
            }
          : undefined,
        instructor: {
          id: item.collection.instructor.id,
          username: item.collection.instructor.username,
          email: item.collection.instructor.email,
        },
        averageRating,
        reviewCount: item.collection._count.reviews,
        enrollmentCount: item.collection._count.enrollments,
      },
      createdAt: item.createdAt,
    };
  }

  /**
   * Remove a course from user's wishlist
   */
  async removeFromWishlist(userId: string, courseId: string): Promise<void> {
    const wishlistItem = await prisma.collectionWishlist.findUnique({
      where: {
        userId_collectionId: {
          userId,
          collectionId: courseId,
        },
      },
    });

    if (!wishlistItem) {
      throw new Error('Course is not in your wishlist');
    }

    await prisma.collectionWishlist.delete({
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
      prisma.collectionWishlist.findMany({
        where: { userId },
        skip,
        take,
        include: {
          collection: {
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
      prisma.collectionWishlist.count({ where: { userId } }),
    ]);

    // Calculate average ratings for all collections
    const courseIds = wishlistItems.map((item) => item.collectionId);
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

    // Calculate average rating per collection
    const ratingsMap = new Map<string, number>();
    for (const courseId of courseIds) {
      const courseReviews = reviews.filter((r: any) => r.collectionId === courseId);
      const average =
        courseReviews.length > 0
          ? courseReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / courseReviews.length
          : 0;
      ratingsMap.set(courseId, Math.round(average * 10) / 10);
    }

    const data: WishlistItemDto[] = wishlistItems.map((item: any) => ({
      id: item.id,
      courseId: item.collectionId,
      course: {
        id: item.collection.id,
        title: item.collection.title,
        description: item.collection.description || undefined,
        price: item.collection.price,
        thumbnailUrl: item.collection.thumbnailUrl || undefined,
        category: item.collection.category
          ? {
              id: item.collection.category.id,
              name: item.collection.category.name,
              slug: item.collection.category.slug,
            }
          : undefined,
        instructor: {
          id: item.collection.instructor.id,
          username: item.collection.instructor.username,
          email: item.collection.instructor.email,
        },
        averageRating: ratingsMap.get(item.collectionId) || 0,
        reviewCount: item.collection._count.reviews,
        enrollmentCount: item.collection._count.enrollments,
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
    const wishlistItem = await prisma.collectionWishlist.findUnique({
      where: {
        userId_collectionId: {
          userId,
          collectionId: courseId,
        },
      },
    });

    return !!wishlistItem;
  }

  /**
   * Get wishlist count for a user
   */
  async getWishlistCount(userId: string): Promise<number> {
    return prisma.collectionWishlist.count({
      where: { userId },
    });
  }
}

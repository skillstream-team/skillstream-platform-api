import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface CreateReviewDto {
  courseId: string;
  studentId: string;
  rating: number; // 1-5
  title?: string;
  content: string;
}

export interface ReviewResponseDto {
  id: string;
  courseId: string;
  course: {
    id: string;
    title: string;
  };
  studentId: string;
  student: {
    id: string;
    username: string;
    email: string;
  };
  rating: number;
  title?: string;
  content: string;
  isVerified: boolean;
  isPublished: boolean;
  helpfulCount: number;
  instructorResponse?: string;
  instructorResponseAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class ReviewsService {
  /**
   * Create a course review
   */
  async createReview(data: CreateReviewDto): Promise<ReviewResponseDto> {
    // Check if student is enrolled
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        collectionId: data.courseId,
        studentId: data.studentId,
      },
    });

    if (!enrollment) {
      throw new Error('You must be enrolled in the course to leave a review');
    }

    // Check if review already exists
    const existing = await prisma.collectionReview.findFirst({
      where: {
        collectionId: data.courseId,
        studentId: data.studentId,
      },
    });

    if (existing) {
      throw new Error('You have already reviewed this course');
    }

    // Validate rating
    if (data.rating < 1 || data.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const review = await prisma.collectionReview.create({
      data: {
        collectionId: data.courseId,
        studentId: data.studentId,
        rating: data.rating,
        title: data.title,
        content: data.content,
        isVerified: true, // Verified because they're enrolled
        isPublished: true,
      },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
          },
        },
        student: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Invalidate course cache
    await deleteCache(`collection:${data.courseId}`);

    return this.mapToDto(review);
  }

  /**
   * Get course reviews
   */
  async getCourseReviews(
    courseId: string,
    page: number = 1,
    limit: number = 20,
    minRating?: number
  ): Promise<{
    data: ReviewResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      averageRating: number;
      ratingDistribution: { rating: number; count: number }[];
    };
  }> {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const where: any = {
      courseId,
      isPublished: true,
    };

    if (minRating) {
      where.rating = { gte: minRating };
    }

    const [reviews, total, allReviews] = await Promise.all([
      prisma.collectionReview.findMany({
        where,
        skip,
        take,
        include: {
          collection: {
            select: {
              id: true,
              title: true,
            },
          },
          student: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: [
          { helpfulCount: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.collectionReview.count({ where }),
      prisma.collectionReview.findMany({
        where: { collectionId: courseId, isPublished: true },
        select: { rating: true },
      }),
    ]);

    // Calculate average rating
    const averageRating =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;

    // Rating distribution
    const distribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: allReviews.filter((r) => r.rating === rating).length,
    }));

    return {
      data: reviews.map(this.mapToDto),
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution: distribution,
      },
    };
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId: string): Promise<ReviewResponseDto> {
    const review = await prisma.collectionReview.findUnique({
      where: { id: reviewId },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
          },
        },
        student: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    return this.mapToDto(review);
  }

  /**
   * Update review
   */
  async updateReview(
    reviewId: string,
    studentId: string,
    data: Partial<CreateReviewDto>
  ): Promise<ReviewResponseDto> {
    const review = await prisma.collectionReview.findFirst({
      where: { id: reviewId, studentId },
    });

    if (!review) {
      throw new Error('Review not found or unauthorized');
    }

    const updateData: any = {};
    if (data.rating !== undefined) {
      if (data.rating < 1 || data.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }
      updateData.rating = data.rating;
    }
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;

    const updated = await prisma.collectionReview.update({
      where: { id: reviewId },
      data: updateData,
      include: {
        collection: {
          select: {
            id: true,
            title: true,
          },
        },
        student: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    await deleteCache(`collection:${updated.collectionId}`);

    return this.mapToDto(updated);
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId: string, studentId: string): Promise<void> {
    const review = await prisma.collectionReview.findFirst({
      where: { id: reviewId, studentId },
    });

    if (!review) {
      throw new Error('Review not found or unauthorized');
    }

    await prisma.collectionReview.delete({
      where: { id: reviewId },
    });

    await deleteCache(`collection:${review.collectionId}`);
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: string, userId: string): Promise<number> {
    const review = await prisma.collectionReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    // Check if already marked
    const existing = await prisma.reviewHelpful.findFirst({
      where: {
        reviewId,
        userId,
      },
    });

    if (existing) {
      // Remove helpful vote
      await prisma.reviewHelpful.delete({
        where: { id: existing.id },
      });
    } else {
      // Add helpful vote
      await prisma.reviewHelpful.create({
        data: {
          reviewId,
          userId,
          isHelpful: true,
        },
      });
    }

    // Update helpful count
    const helpfulCount = await prisma.reviewHelpful.count({
      where: { reviewId, isHelpful: true },
    });

    await prisma.collectionReview.update({
      where: { id: reviewId },
      data: { helpfulCount },
    });

    return helpfulCount;
  }

  /**
   * Add instructor response
   */
  async addInstructorResponse(
    reviewId: string,
    instructorId: string,
    response: string
  ): Promise<ReviewResponseDto> {
    const review = await prisma.collectionReview.findUnique({
      where: { id: reviewId },
      include: {
        collection: {
          select: {
            instructorId: true,
          },
        },
      },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.collection.instructorId !== instructorId) {
      throw new Error('Only the collection instructor can respond to reviews');
    }

    const updated = await prisma.collectionReview.update({
      where: { id: reviewId },
      data: {
        instructorResponse: response,
        instructorResponseAt: new Date(),
      },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
          },
        },
        student: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return this.mapToDto(updated);
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToDto(review: any): ReviewResponseDto {
    return {
      id: review.id,
      courseId: review.collectionId,
      course: review.collection,
      studentId: review.studentId,
      student: review.student,
      rating: review.rating,
      title: review.title || undefined,
      content: review.content,
      isVerified: review.isVerified,
      isPublished: review.isPublished,
      helpfulCount: review.helpfulCount,
      instructorResponse: review.instructorResponse || undefined,
      instructorResponseAt: review.instructorResponseAt || undefined,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}

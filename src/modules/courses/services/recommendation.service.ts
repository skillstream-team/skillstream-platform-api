import {
  CreateRecommendationDto,
  RecommendationResponseDto,
  UserInteractionDto,
  RecommendationFiltersDto,
  RecommendationStatsDto
} from '../dtos/recommendation.dto';
import { prisma } from '../../../utils/prisma';

export class RecommendationService {
  
  /**
   * Generate recommendations for a user based on different algorithms
   */
  async generateRecommendations(userId: string, limit: number = 10): Promise<RecommendationResponseDto[]> {
    // Clear old recommendations for this user
    await prisma.programRecommendation.deleteMany({
      where: { userId }
    });

    const recommendations: CreateRecommendationDto[] = [];

    // Get user's enrolled courses and interactions
    const userEnrollments = await prisma.enrollment.findMany({
      where: { studentId: userId },
      include: { program: true, collection: true } // Backward compatibility
    });

    const userInteractions = await prisma.userInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Algorithm 1: Collaborative Filtering
    const collaborativeRecs = await this.getCollaborativeRecommendations(userId, userEnrollments);
    recommendations.push(...collaborativeRecs);

    // Algorithm 2: Content-Based Filtering
    const contentBasedRecs = await this.getContentBasedRecommendations(userId, userEnrollments);
    recommendations.push(...contentBasedRecs);

    // Algorithm 3: Popularity-Based
    const popularityRecs = await this.getPopularityBasedRecommendations(userId, userEnrollments);
    recommendations.push(...popularityRecs);

    // Sort by score and take top recommendations
    const topRecommendations = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Save recommendations to database
    const savedRecommendations = await Promise.all(
      topRecommendations.map(rec => 
        prisma.programRecommendation.create({
          data: {
            ...rec,
            programId: rec.programId || rec.collectionId || rec.courseId,
            collectionId: rec.collectionId || rec.courseId, // Backward compatibility
          },
          include: {
            program: {
              include: {
                instructor: {
                  select: { id: true, username: true }
                }
              }
            },
            collection: { // Backward compatibility
              include: {
                instructor: {
                  select: { id: true, username: true }
                }
              }
            }
          }
        })
      )
    );

    return savedRecommendations.map(this.mapToResponseDto);
  }

  /**
   * Collaborative filtering: recommend courses based on similar users
   */
  private async getCollaborativeRecommendations(
    userId: string, 
    userEnrollments: any[]
  ): Promise<CreateRecommendationDto[]> {
    const enrolledCourseIds = userEnrollments.map(e => e.courseId);
    
    if (enrolledCourseIds.length === 0) return [];

    // Find users with similar course enrollments
    const similarUsers = await prisma.enrollment.groupBy({
      by: ['studentId'],
      where: {
        programId: { in: enrolledCourseIds },
        collectionId: { in: enrolledCourseIds }, // Backward compatibility
        studentId: { not: userId }
      },
      _count: { programId: true, collectionId: true },
      having: { 
        programId: { _count: { gte: Math.max(1, Math.floor(enrolledCourseIds.length * 0.3)) } },
        collectionId: { _count: { gte: Math.max(1, Math.floor(enrolledCourseIds.length * 0.3)) } } // Backward compatibility
      },
      orderBy: { _count: { programId: 'desc' } },
      take: 20
    });

    // Get courses enrolled by similar users that current user hasn't enrolled in
    const recommendedCourses = await prisma.enrollment.findMany({
      where: {
        studentId: { in: similarUsers.map(u => u.studentId) },
        programId: { notIn: enrolledCourseIds },
        collectionId: { notIn: enrolledCourseIds } // Backward compatibility
      },
      include: { program: true, collection: true }, // Backward compatibility
      distinct: ['programId']
    });

    return recommendedCourses.slice(0, 5).map((enrollment: any) => ({
      userId,
      courseId: enrollment.programId || enrollment.collectionId,
      collectionId: enrollment.collectionId, // Backward compatibility
      programId: enrollment.programId,
      score: Math.min(0.9, 0.6 + (Math.random() * 0.3)), // Score between 0.6-0.9
      reason: 'Students with similar interests also enrolled in this course',
      algorithm: 'collaborative',
      metadata: { similarUserCount: similarUsers.length }
    }));
  }

  /**
   * Content-based filtering: recommend courses based on user's course history
   */
  private async getContentBasedRecommendations(
    userId: string,
    userEnrollments: any[]
  ): Promise<CreateRecommendationDto[]> {
    if (userEnrollments.length === 0) return [];

    const enrolledCourseIds = userEnrollments.map(e => e.programId || e.collectionId || e.courseId);
    
    // For simplicity, recommend courses from the same instructors
    const instructorIds = [...new Set(userEnrollments.map(e => (e.program || e.collection || e.course).instructorId))];
    
    const instructorCourses = await prisma.program.findMany({
      where: {
        instructorId: { in: instructorIds },
        id: { notIn: enrolledCourseIds }
      },
      take: 5
    });

    return instructorCourses.map((course: any) => ({
      userId,
      courseId: course.id,
      collectionId: course.id, // Backward compatibility
      programId: course.id,
      score: Math.min(0.85, 0.5 + (Math.random() * 0.35)), // Score between 0.5-0.85
      reason: 'From instructors of courses you\'ve enrolled in',
      algorithm: 'content_based',
      metadata: { instructorId: course.instructorId }
    }));
  }

  /**
   * Popularity-based recommendations: recommend trending courses
   */
  private async getPopularityBasedRecommendations(
    userId: string,
    userEnrollments: any[]
  ): Promise<CreateRecommendationDto[]> {
    const enrolledCourseIds = userEnrollments.map(e => e.programId || e.collectionId);

    // Get most popular courses (by enrollment count) that user hasn't enrolled in
    const popularCourses = await prisma.program.findMany({
      where: {
        id: { notIn: enrolledCourseIds }
      },
      include: {
        _count: {
          select: { enrollments: true }
        }
      },
      orderBy: {
        enrollments: { _count: 'desc' }
      },
      take: 5
    });

    return popularCourses.map((course: any, index: number) => ({
      userId,
      courseId: course.id,
      collectionId: course.id, // Backward compatibility
      score: Math.max(0.3, 0.7 - (index * 0.1)), // Decreasing score based on popularity rank
      reason: `Popular course with ${course._count.enrollments} enrollments`,
      algorithm: 'popularity',
      metadata: { enrollmentCount: course._count.enrollments, rank: index + 1 }
    }));
  }

  /**
   * Get user's recommendations
   */
  async getUserRecommendations(filters: RecommendationFiltersDto): Promise<RecommendationResponseDto[]> {
    const recommendations = await prisma.programRecommendation.findMany({
      where: {
        userId: filters.userId,
        ...(filters.algorithm && { algorithm: filters.algorithm }),
        ...(filters.minScore && { score: { gte: filters.minScore } }),
        ...(filters.excludeViewed && { isViewed: false })
      },
      include: {
        program: {
          include: {
            instructor: {
              select: { id: true, username: true }
            }
          }
        },
        collection: { // Backward compatibility
          include: {
            instructor: {
              select: { id: true, username: true }
            }
          }
        }
      },
      orderBy: { score: 'desc' },
      take: filters.limit || 10
    });

    return recommendations.map(this.mapToResponseDto);
  }

  /**
   * Record user interaction with a course
   */
  async recordInteraction(interaction: UserInteractionDto): Promise<void> {
    await prisma.userInteraction.create({
      data: interaction
    });

    // If user viewed a recommended course, mark it as viewed
    if (interaction.type === 'view' && interaction.courseId) {
      await prisma.programRecommendation.updateMany({
        where: {
          userId: interaction.userId,
          programId: interaction.programId || interaction.collectionId || interaction.courseId
        },
        data: { isViewed: true }
      });
    }

    // If user enrolled in a recommended course, mark it as clicked
    if (interaction.type === 'enroll' && interaction.courseId) {
      await prisma.programRecommendation.updateMany({
        where: {
          userId: interaction.userId,
          programId: interaction.programId || interaction.collectionId || interaction.courseId
        },
        data: { isClicked: true }
      });
    }
  }

  /**
   * Get recommendation statistics for a user
   */
  async getRecommendationStats(userId: string): Promise<RecommendationStatsDto> {
    const stats = await prisma.programRecommendation.aggregate({
      where: { userId },
      _count: { id: true },
      _avg: { score: true }
    });

    const viewedCount = await prisma.programRecommendation.count({
      where: { userId, isViewed: true }
    });

    const clickedCount = await prisma.programRecommendation.count({
      where: { userId, isClicked: true }
    });

    const topAlgorithm = await prisma.programRecommendation.groupBy({
      by: ['algorithm'],
      where: { userId, isClicked: true },
      _count: { algorithm: true },
      orderBy: { _count: { algorithm: 'desc' } },
      take: 1
    });

    return {
      totalRecommendations: stats._count.id,
      viewedRecommendations: viewedCount,
      clickedRecommendations: clickedCount,
      averageScore: stats._avg.score || 0,
      topAlgorithm: topAlgorithm[0]?.algorithm || 'none'
    };
  }

  /**
   * Refresh recommendations for a user
   */
  async refreshRecommendations(userId: string): Promise<RecommendationResponseDto[]> {
    return this.generateRecommendations(userId);
  }

  /**
   * Map database model to response DTO
   */
  private mapToResponseDto(recommendation: any): RecommendationResponseDto {
    const program = recommendation.program || recommendation.collection; // Backward compatibility
    return {
      id: recommendation.id,
      userId: recommendation.userId,
      courseId: recommendation.programId || recommendation.courseId || recommendation.collectionId,
      score: recommendation.score,
      reason: recommendation.reason,
      algorithm: recommendation.algorithm,
      metadata: recommendation.metadata,
      isViewed: recommendation.isViewed,
      isClicked: recommendation.isClicked,
      createdAt: recommendation.createdAt,
      updatedAt: recommendation.updatedAt,
      course: {
        id: program.id,
        title: program.title,
        description: program.description,
        price: program.price,
        instructor: {
          id: program.instructor.id,
          username: program.instructor.username
        }
      }
    };
  }
}

import { prisma } from '../../../utils/prisma';
import { getCache, setCache, CACHE_TTL } from '../../../utils/cache';

export interface DashboardData {
  enrolledCourses: Array<{
    id: string;
    title: string;
    thumbnailUrl?: string;
    progress: number;
    lastAccessed?: Date;
    nextLesson?: {
      id: string;
      title: string;
    };
  }>;
  upcomingDeadlines: Array<{
    id: string;
    type: 'assignment' | 'quiz';
    title: string;
    collectionId: string;
    collectionTitle: string;
    dueDate: Date;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    collectionId: string;
    collectionTitle: string;
    timestamp: Date;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    thumbnailUrl?: string;
    difficulty?: string;
    averageRating?: number;
  }>;
  statistics: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    totalCertificates: number;
    totalPoints: number;
    currentLevel: number;
    averageScore: number;
  };
  achievements: Array<{
    id: string;
    badgeName: string;
    badge: {
      name: string;
      description?: string;
      icon?: string;
    };
    earnedAt: Date;
  }>;
}

export class DashboardService {
  /**
   * Get comprehensive dashboard data for a student
   */
  async getStudentDashboard(userId: string): Promise<DashboardData> {
    const cacheKey = `dashboard:${userId}`;
    
    // Try cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all enrollments with progress
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: userId },
      include: {
        collection: {
          include: {
            _count: {
              select: {
                collectionLessons: true,
                modules: true,
              },
            },
          },
        },
      },
    });

    // Get progress for all enrolled collections
    const collectionIds = enrollments.map((e) => e.collectionId);
    const progressRecords = await prisma.progress.findMany({
      where: {
        studentId: userId,
        collectionId: { in: collectionIds },
      },
      orderBy: { lastAccessed: 'desc' },
    });

    // Calculate progress per collection
    const enrolledCourses = await Promise.all(
      enrollments.map(async (enrollment) => {
        const collectionProgress = progressRecords.filter(
          (p) => p.collectionId === enrollment.collectionId
        );
        const completed = collectionProgress.filter(
          (p) => p.status === 'completed' || p.status === 'passed'
        ).length;
        const total = enrollment.collection._count.collectionLessons + enrollment.collection._count.modules;
        const progress = total > 0 ? (completed / total) * 100 : 0;

        // Get next lesson (from collection lessons)
        const collectionLessons = await prisma.collectionLesson.findMany({
          where: { collectionId: enrollment.collectionId },
          include: { lesson: true },
          orderBy: { order: 'asc' },
        });
        
        const completedLessonIds = collectionProgress
          .filter((p) => p.type === 'lesson' && p.status === 'completed')
          .map((p) => p.itemId);
        
        const nextLessonData = collectionLessons.find(
          (cl) => !completedLessonIds.includes(cl.lessonId)
        );

        const lastProgress = collectionProgress[0];

        return {
          id: enrollment.collection.id,
          title: enrollment.collection.title,
          thumbnailUrl: enrollment.collection.thumbnailUrl || undefined,
          progress: Math.round(progress),
          lastAccessed: lastProgress?.lastAccessed,
          nextLesson: nextLessonData ? {
            id: nextLessonData.lesson.id,
            title: nextLessonData.lesson.title,
          } : undefined,
        };
      })
    );

    // Get upcoming deadlines (assignments and quizzes)
    const now = new Date();
    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        collectionId: { in: collectionIds },
        dueDate: { gte: now },
        isPublished: true,
      },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    const upcomingDeadlines = upcomingAssignments.map((assignment) => ({
      id: assignment.id,
      type: 'assignment' as const,
      title: assignment.title,
      collectionId: assignment.collection.id,
      collectionTitle: assignment.collection.title,
      dueDate: assignment.dueDate!,
    }));

    // Get recent activity
    const recentActivity = await prisma.progress.findMany({
      where: { studentId: userId },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { lastAccessed: 'desc' },
      take: 10,
    });

    const activity = recentActivity.map((p) => ({
      id: p.id,
      type: p.type,
      title: `${p.type} activity`,
      collectionId: p.collection.id,
      collectionTitle: p.collection.title,
      timestamp: p.lastAccessed,
    }));

    // Get recommendations (using existing recommendation service logic)
    const recommendations = await prisma.collectionRecommendation.findMany({
      where: { userId },
      include: {
        collection: {
          include: {
            _count: {
              select: {
                reviews: true,
              },
            },
          },
        },
      },
      orderBy: { score: 'desc' },
      take: 5,
    });

    // Calculate average ratings for recommendations
    const recCollectionIds = recommendations.map((r: any) => r.collection.id);
    const recReviews = await prisma.collectionReview.findMany({
      where: {
        collectionId: { in: recCollectionIds },
        isPublished: true,
      },
      select: {
        collectionId: true,
        rating: true,
      },
    });

    const ratingsMap = new Map<string, number>();
    for (const collectionId of recCollectionIds) {
      const collectionReviews = recReviews.filter((r: any) => r.collectionId === collectionId);
      const average =
        collectionReviews.length > 0
          ? collectionReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / collectionReviews.length
          : 0;
      ratingsMap.set(collectionId, Math.round(average * 10) / 10);
    }

    const recs = recommendations.map((rec: any) => ({
      id: rec.collection.id,
      title: rec.collection.title,
      thumbnailUrl: rec.collection.thumbnailUrl || undefined,
      difficulty: rec.collection.difficulty || undefined,
      averageRating: ratingsMap.get(rec.collection.id) || 0,
    }));

    // Get statistics
    const certificates = await prisma.certificate.count({
      where: { studentId: userId },
    });

    const userPoints = await prisma.userPoints.findUnique({
      where: { userId },
      select: {
        totalPoints: true,
        currentLevel: true,
      },
    });

    // Calculate average score
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { studentId: userId },
      select: {
        percentage: true,
      },
    });

    const averageScore =
      quizAttempts.length > 0
        ? quizAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / quizAttempts.length
        : 0;

    const completedCourses = enrolledCourses.filter((c) => c.progress === 100).length;

    const statistics = {
      totalCourses: enrollments.length,
      completedCourses,
      inProgressCourses: enrollments.length - completedCourses,
      totalCertificates: certificates,
      totalPoints: userPoints?.totalPoints || 0,
      currentLevel: userPoints?.currentLevel || 1,
      averageScore: Math.round(averageScore * 10) / 10,
    };

    // Get recent achievements
    const achievements = await prisma.achievement.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        badgeName: true,
        badgeIcon: true,
        earnedAt: true,
      },
      orderBy: { earnedAt: 'desc' },
      take: 5,
    });

    const dashboardData: DashboardData = {
      enrolledCourses,
      upcomingDeadlines,
      recentActivity: activity,
      recommendations: recs,
      statistics,
      achievements: achievements.map((a) => ({
        id: a.id,
        badgeName: a.badgeName,
        badge: {
          name: a.badgeName,
          description: undefined,
          icon: a.badgeIcon || undefined,
        },
        earnedAt: a.earnedAt,
      })),
    };

    // Cache for 5 minutes
    await setCache(cacheKey, dashboardData, CACHE_TTL.SHORT);

    return dashboardData;
  }

  /**
   * Clear dashboard cache for a user
   */
  async clearDashboardCache(userId: string): Promise<void> {
    const cacheKey = `dashboard:${userId}`;
    // Cache clearing is handled by the cache utility
  }
}

import { prisma } from '../../../utils/prisma';

export interface LogActivityDto {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: any;
}

export interface ActivityLogDto {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  action: string;
  entity: string;
  entityId?: string;
  metadata?: any;
  createdAt: Date;
}

export class ActivityLogService {
  /**
   * Log an activity
   */
  async logActivity(data: LogActivityDto): Promise<ActivityLogDto> {
    const activity = await prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        metadata: data.metadata ? (data.metadata as any) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return this.mapToDto(activity);
  }

  /**
   * Get user activity feed
   */
  async getUserActivityFeed(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: ActivityLogDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { userId },
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.count({ where: { userId } }),
    ]);

    return {
      data: activities.map(this.mapToDto),
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
   * Get activity feed for an entity
   */
  async getEntityActivityFeed(
    entity: string,
    entityId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: ActivityLogDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { entity, entityId },
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.count({ where: { entity, entityId } }),
    ]);

    return {
      data: activities.map(this.mapToDto),
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
   * Get recent activities (global feed)
   */
  async getRecentActivities(
    page: number = 1,
    limit: number = 20,
    action?: string
  ): Promise<{
    data: ActivityLogDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const where: any = {};
    if (action) {
      where.action = action;
    }

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      data: activities.map(this.mapToDto),
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
   * Map Prisma model to DTO
   */
  private mapToDto(activity: any): ActivityLogDto {
    return {
      id: activity.id,
      userId: activity.userId,
      user: activity.user,
      action: activity.action,
      entity: activity.entity,
      entityId: activity.entityId || undefined,
      metadata: activity.metadata
        ? (typeof activity.metadata === 'string'
            ? JSON.parse(activity.metadata)
            : activity.metadata)
        : undefined,
      createdAt: activity.createdAt,
    };
  }
}

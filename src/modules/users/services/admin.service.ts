import { prisma } from '../../../utils/prisma';
import { adminMessagingService } from './admin-messaging.service';
import { PushNotificationsService } from './push-notifications.service';
import { NotificationsService } from './notifications.service';
import { ActivityLogService } from './activity-log.service';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import bcrypt from 'bcrypt';

export class AdminService {
  private pushService: PushNotificationsService;
  private notificationsService: NotificationsService;
  private activityLogService: ActivityLogService;

  constructor() {
    this.pushService = new PushNotificationsService();
    this.notificationsService = new NotificationsService();
    this.activityLogService = new ActivityLogService();
  }

  // ============================================================
  // PAYOUT MANAGEMENT
  // ============================================================

  /**
   * Get all payouts with filtering and pagination
   */
  async getPayouts(options: {
    page?: number;
    limit?: number;
    status?: string;
    teacherId?: string;
  }) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status) {
      where.status = options.status.toUpperCase();
    }
    if (options.teacherId) {
      where.teacherId = options.teacherId;
    }

    const [payouts, total] = await Promise.all([
      prisma.teacherPayout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: {
          teacher: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          earnings: {
            select: {
              id: true,
              amount: true,
              period: true,
            },
          },
        },
      }),
      prisma.teacherPayout.count({ where }),
    ]);

    return {
      payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Approve a payout request
   */
  async approvePayout(
    payoutId: string,
    adminId: string,
    transactionId?: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ) {
    const payout = await prisma.teacherPayout.findUnique({
      where: { id: payoutId },
      include: { teacher: true },
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== 'PENDING') {
      throw new Error(`Cannot approve payout with status: ${payout.status}`);
    }

    const updated = await prisma.teacherPayout.update({
      where: { id: payoutId },
      data: {
        status: 'PROCESSING',
        processedAt: new Date(),
        transactionId: transactionId || payout.transactionId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

      // Log activity
      try {
        await this.activityLogService.logActivity({
          userId: adminId,
          action: 'payout.approved',
          entity: 'payout',
          entityId: payoutId,
          metadata: { teacherId: payout.teacherId, amount: payout.amount },
          ipAddress: requestInfo?.ipAddress,
          userAgent: requestInfo?.userAgent,
        });
      } catch (error) {
        // Ignore logging errors
        console.error('Failed to log activity:', error);
      }

    return updated;
  }

  /**
   * Reject a payout request
   */
  async rejectPayout(
    payoutId: string,
    adminId: string,
    reason?: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ) {
    const payout = await prisma.teacherPayout.findUnique({
      where: { id: payoutId },
      include: { teacher: true, earnings: true },
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== 'PENDING') {
      throw new Error(`Cannot reject payout with status: ${payout.status}`);
    }

    // Revert earnings status back to AVAILABLE
    await prisma.$transaction(async (tx) => {
      // Update payout status
      await tx.teacherPayout.update({
        where: { id: payoutId },
        data: {
          status: 'FAILED',
          notes: reason || 'Rejected by admin',
        },
      });

      // Revert earnings status
      await tx.teacherEarnings.updateMany({
        where: {
          payoutId: payoutId,
        },
        data: {
          status: 'AVAILABLE',
          payoutId: null,
          paidAt: null,
        },
      });
    });

    const updated = await prisma.teacherPayout.findUnique({
      where: { id: payoutId },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    try {
      await this.activityLogService.logActivity({
        userId: adminId,
        action: 'payout.rejected',
        entity: 'payout',
        entityId: payoutId,
        metadata: { teacherId: payout.teacherId, reason },
        ipAddress: requestInfo?.ipAddress,
        userAgent: requestInfo?.userAgent,
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }

    return updated;
  }

  // ============================================================
  // BULK OPERATIONS
  // ============================================================

  /**
   * Bulk update users
   */
  async bulkUpdateUsers(
    userIds: string[],
    updates: {
      role?: string;
      isActive?: boolean;
      isVerified?: boolean;
    },
    adminId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ) {
    const results = { updated: 0, failed: 0, errors: [] as string[] };
    const ipAddress = requestInfo?.ipAddress;
    const userAgent = requestInfo?.userAgent;

    for (const userId of userIds) {
      try {
        const updateData: any = {};
        if (updates.role !== undefined) {
          updateData.role = updates.role;
        }
        if (updates.isActive !== undefined) {
          updateData.isActive = updates.isActive;
        }
        if (updates.isVerified !== undefined) {
          updateData.isVerified = updates.isVerified;
        }

        await prisma.user.update({
          where: { id: userId },
          data: updateData,
        });

        results.updated++;

        // Log activity
        try {
          await this.activityLogService.logActivity({
            userId: adminId,
            action: 'user.bulk_updated',
            entity: 'user',
            entityId: userId,
            metadata: updates,
            ipAddress: ipAddress,
            userAgent: userAgent,
          });
        } catch (error) {
          // Ignore logging errors
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Bulk update courses
   */
  async bulkUpdateCourses(
    courseIds: string[],
    status: 'APPROVED' | 'REJECTED' | 'PENDING',
    rejectionReason?: string,
    adminId?: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ) {
    const results = { updated: 0, failed: 0, errors: [] as string[] };

    const updateData: any = {
      moderationStatus: status,
    };
    
    if (status === 'APPROVED') {
      updateData.isPublished = true;
      updateData.rejectionReason = null;
    } else if (status === 'REJECTED') {
      updateData.isPublished = false;
      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
    } else if (status === 'PENDING') {
      updateData.isPublished = false;
    }

    for (const courseId of courseIds) {
      try {
        await prisma.course.update({
          where: { id: courseId },
          data: updateData,
        });

        results.updated++;

        // Log activity
        if (adminId) {
          try {
            await this.activityLogService.logActivity({
              userId: adminId,
              action: `course.bulk_${status.toLowerCase()}`,
              entity: 'course',
              entityId: courseId,
              metadata: { status, rejectionReason },
              ipAddress: requestInfo?.ipAddress,
              userAgent: requestInfo?.userAgent,
            });
          } catch (error) {
            // Ignore logging errors
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Course ${courseId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  // ============================================================
  // BROADCAST MANAGEMENT
  // ============================================================

  /**
   * Send broadcast notification
   */
  async sendBroadcast(data: {
    title: string;
    message: string;
    targetAudience?: 'all' | 'students' | 'teachers' | 'admins';
    userIds?: string[];
    sendEmail?: boolean;
    sendPush?: boolean;
  }, adminId: string) {
    let targetUserIds: string[] = [];

    // Determine target users
    if (data.userIds && data.userIds.length > 0) {
      targetUserIds = data.userIds;
    } else {
      const where: any = {};
      if (data.targetAudience === 'students') {
        where.role = 'STUDENT';
      } else if (data.targetAudience === 'teachers') {
        where.role = 'TEACHER';
      } else if (data.targetAudience === 'admins') {
        where.role = 'ADMIN';
      }

      const users = await prisma.user.findMany({
        where,
        select: { id: true },
      });
      targetUserIds = users.map((u) => u.id);
    }

    // Create broadcast record
    const broadcast = await prisma.broadcast.create({
      data: {
        createdBy: adminId,
        title: data.title,
        message: data.message,
        targetAudience: data.targetAudience || 'all',
        userIds: data.userIds || [],
        sendEmail: data.sendEmail || false,
        sendPush: data.sendPush || false,
        sentTo: 0,
      },
    });

    let sentCount = 0;

    // Send notifications
    for (const userId of targetUserIds) {
      try {
        // Create in-app notification
        await this.notificationsService.createNotification(
          {
            userId,
            type: 'system',
            title: data.title,
            message: data.message,
          },
          { sendPush: data.sendPush }
        );

        // Send push notification if requested
        if (data.sendPush) {
          try {
            await this.pushService.sendNotification(userId, {
              title: data.title,
              body: data.message,
              icon: '/vite.svg',
              tag: 'broadcast',
            });
          } catch (error) {
            // Ignore push errors
          }
        }

        sentCount++;
      } catch (error) {
        console.error(`Failed to send broadcast to user ${userId}:`, error);
      }
    }

    // Update broadcast with sent count
    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { sentTo: sentCount },
    });

    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: adminId,
          action: 'broadcast.sent',
          entity: 'broadcast',
          entityId: broadcast.id,
          metadata: { targetAudience: data.targetAudience, sentTo: sentCount },
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }

    return {
      success: true,
      sentTo: sentCount,
      broadcast,
    };
  }

  /**
   * Get broadcast history
   */
  async getBroadcasts(options: {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const [broadcasts, total] = await Promise.all([
      prisma.broadcast.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.broadcast.count({ where }),
    ]);

    return {
      broadcasts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // ============================================================
  // ACTIVITY LOGS
  // ============================================================

  /**
   * Get activity logs with filtering
   */
  async getActivityLogs(options: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.userId) {
      where.userId = options.userId;
    }
    if (options.action) {
      where.action = options.action;
    }
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        user: log.user,
        action: log.action,
        entityType: log.entity,
        entityId: log.entityId,
        details: log.metadata,
        ipAddress: (log.metadata as any)?.ipAddress,
        userAgent: (log.metadata as any)?.userAgent,
        createdAt: log.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // ============================================================
  // USER IMPORT/EXPORT
  // ============================================================

  /**
   * Import users from CSV
   */
  async importUsersFromCSV(csvContent: string, adminId: string) {
    const results = {
      imported: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      for (const [index, record] of records.entries()) {
        try {
          const recordData = record as any;
          
          // Validate required fields
          if (!recordData.email || !recordData.username) {
            results.failed++;
            results.errors.push(`Row ${index + 2}: Missing email or username`);
            continue;
          }

          // Check if user already exists
          const existing = await prisma.user.findFirst({
            where: {
              OR: [{ email: recordData.email }, { username: recordData.username }],
            },
          });

          if (existing) {
            results.failed++;
            results.errors.push(`Row ${index + 2}: User already exists (${recordData.email})`);
            continue;
          }

          // Create user
          await prisma.user.create({
            data: {
              email: recordData.email,
              username: recordData.username,
              password: recordData.password ? await this.hashPassword(recordData.password) : null,
              role: recordData.role || 'STUDENT',
              firstName: recordData.firstName,
              lastName: recordData.lastName,
            },
          });

          results.imported++;

          // Log activity
          try {
            await this.activityLogService.logActivity({
              userId: adminId,
              action: 'user.imported',
              entity: 'user',
              metadata: { email: recordData.email, source: 'csv' },
            });
          } catch (error) {
            // Ignore logging errors
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return results;
  }

  /**
   * Export users to CSV
   */
  async exportUsersToCSV(options: { role?: string; isActive?: boolean }) {
    const where: any = {};
    if (options.role) {
      where.role = options.role;
    }
    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    const csvData = stringify(users, {
      header: true,
      columns: ['id', 'username', 'email', 'firstName', 'lastName', 'role', 'createdAt'],
    });

    return csvData;
  }

  /**
   * Hash password for imported users
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // ============================================================
  // CERTIFICATE TEMPLATES
  // ============================================================

  /**
   * Get all certificate templates
   */
  async getCertificateTemplates() {
    return prisma.certificateTemplate.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Create certificate template
   */
  async createCertificateTemplate(data: {
    name: string;
    design: any;
    fields: string[];
    isDefault?: boolean;
  }) {
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.certificateTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.certificateTemplate.create({
      data: {
        name: data.name,
        design: data.design,
        fields: data.fields,
        isDefault: data.isDefault || false,
      },
    });
  }

  /**
   * Update certificate template
   */
  async updateCertificateTemplate(
    id: string,
    data: {
      name?: string;
      design?: any;
      fields?: string[];
      isDefault?: boolean;
      isActive?: boolean;
    }
  ) {
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.certificateTemplate.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return prisma.certificateTemplate.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete certificate template
   */
  async deleteCertificateTemplate(id: string) {
    const template = await prisma.certificateTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error('Certificate template not found');
    }

    if (template.isDefault) {
      throw new Error('Cannot delete default template');
    }

    await prisma.certificateTemplate.delete({
      where: { id },
    });

    return { success: true };
  }

  // ============================================================
  // BANNER MANAGEMENT
  // ============================================================

  /**
   * Get all banners
   */
  async getBanners(options: {
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const [banners, total] = await Promise.all([
      prisma.banner.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.banner.count({ where }),
    ]);

    return {
      banners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Create banner
   */
  async createBanner(data: {
    title: string;
    description?: string;
    imageUrl?: string;
    linkUrl?: string;
    startDate?: Date;
    endDate?: Date;
    isActive?: boolean;
    position?: string;
    priority?: number;
    targetAudience?: string;
  }) {
    return prisma.banner.create({
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive !== undefined ? data.isActive : true,
        position: data.position || 'top',
        priority: data.priority || 0,
        targetAudience: data.targetAudience,
      },
    });
  }

  /**
   * Update banner
   */
  async updateBanner(
    id: string,
    data: {
      title?: string;
      description?: string;
      imageUrl?: string;
      linkUrl?: string;
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
      position?: string;
      priority?: number;
      targetAudience?: string;
    }
  ) {
    return prisma.banner.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete banner
   */
  async deleteBanner(id: string) {
    await prisma.banner.delete({
      where: { id },
    });

    return { success: true };
  }
}


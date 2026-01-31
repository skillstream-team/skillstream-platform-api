import { prisma } from '../../../utils/prisma';
import { UsersService } from './users.service';
import { CollectionsService } from '../../courses/services/service';
import { EnrollmentService } from '../../courses/services/enrollment.service';
import { NotificationsService } from './notifications.service';
import { deleteCachePattern } from '../../../utils/cache';

export interface BulkUserImportDto {
  users: Array<{
    email: string;
    username: string;
    password?: string;
    role: string;
    firstName?: string;
    lastName?: string;
  }>;
}

export interface BulkCourseImportDto {
  courses: Array<{
    title: string;
    description?: string;
    price: number;
    instructorId: string;
    order: number;
  }>;
}

export interface BulkEnrollmentDto {
  enrollments: Array<{
            collectionId: string;
    studentId: string;
    amount: number;
    currency?: string;
    provider: string;
  }>;
}

export interface BulkNotificationDto {
  userIds: string[];
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}

export class BulkOperationsService {
  private usersService = new UsersService();
  private collectionsService = new CollectionsService();
  private enrollmentService = new EnrollmentService();
  private notificationsService = new NotificationsService();

  /**
   * Bulk import users
   */
  async bulkImportUsers(data: BulkUserImportDto): Promise<{
    success: number;
    failed: number;
    results: Array<{ email: string; success: boolean; error?: string }>;
  }> {
    const results = await Promise.allSettled(
      data.users.map(async (userData) => {
        try {
          const createData: any = {
            email: userData.email,
            username: userData.username,
            role: userData.role as 'STUDENT' | 'TEACHER' | 'ADMIN',
          };
          if (userData.password) {
            createData.password = userData.password;
          }
          if (userData.firstName) {
            createData.firstName = userData.firstName;
          }
          if (userData.lastName) {
            createData.lastName = userData.lastName;
          }
          await this.usersService.createUser(createData);
          return { email: userData.email, success: true };
        } catch (error) {
          return {
            email: userData.email,
            success: false,
            error: (error as Error).message,
          };
        }
      })
    );

    const success = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - success;

    // Invalidate user cache
    await deleteCachePattern('users:list:*');

    return {
      success,
      failed,
      results: results.map((r) =>
        r.status === 'fulfilled' ? r.value : { email: '', success: false, error: 'Unknown error' }
      ),
    };
  }

  /**
   * Bulk export users (CSV format)
   */
  async bulkExportUsers(role?: string): Promise<string> {
    const where = role ? { role } : {};
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    // Generate CSV
    const headers = ['ID', 'Email', 'Username', 'Role', 'First Name', 'Last Name', 'Created At'];
    const rows = users.map((u) => [
      u.id,
      u.email,
      u.username,
      u.role,
      u.firstName || '',
      u.lastName || '',
      u.createdAt.toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Bulk import courses
   */
  async bulkImportCourses(data: BulkCourseImportDto): Promise<{
    success: number;
    failed: number;
    results: Array<{ title: string; success: boolean; error?: string }>;
  }> {
    const results = await Promise.allSettled(
      data.courses.map(async (courseData) => {
        try {
          await this.collectionsService.createCollection({
            ...courseData,
            createdBy: courseData.instructorId,
          });
          return { title: courseData.title, success: true };
        } catch (error) {
          return {
            title: courseData.title,
            success: false,
            error: (error as Error).message,
          };
        }
      })
    );

    const success = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - success;

    // Invalidate course cache
    await deleteCachePattern('courses:list:*');

    return {
      success,
      failed,
      results: results.map((r) =>
        r.status === 'fulfilled' ? r.value : { title: '', success: false, error: 'Unknown error' }
      ),
    };
  }

  /**
   * Bulk export courses (CSV format)
   */
  async bulkExportCourses(): Promise<string> {
    const courses = await prisma.program.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        order: true,
        instructorId: true,
        createdAt: true,
      },
    });

    // Generate CSV
    const headers = ['ID', 'Title', 'Description', 'Price', 'Order', 'Instructor ID', 'Created At'];
    const rows = courses.map((c: any) => [
      c.id,
      c.title,
      c.description || '',
      c.price,
      c.order,
      c.instructorId,
      c.createdAt.toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Bulk enroll students
   */
  async bulkEnrollStudents(data: BulkEnrollmentDto): Promise<{
    success: number;
    failed: number;
    results: Array<{ collectionId: string; studentId: string; success: boolean; error?: string }>;
  }> {
    const results = await Promise.allSettled(
      data.enrollments.map(async (enrollmentData) => {
        try {
          await this.enrollmentService.enrollStudent({
            ...enrollmentData,
            currency: enrollmentData.currency || 'USD',
            transactionId: undefined,
          });
          return {
            collectionId: enrollmentData.collectionId,
            studentId: enrollmentData.studentId,
            success: true,
          };
        } catch (error) {
          return {
            collectionId: enrollmentData.collectionId,
            studentId: enrollmentData.studentId,
            success: false,
            error: (error as Error).message,
          };
        }
      })
    );

    const success = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - success;

    return {
      success,
      failed,
      results: results.map((r) =>
        r.status === 'fulfilled'
          ? r.value
          : { collectionId: '', studentId: '', success: false, error: 'Unknown error' }
      ),
    };
  }

  /**
   * Bulk send notifications
   */
  async bulkSendNotifications(data: BulkNotificationDto): Promise<{
    success: number;
    failed: number;
  }> {
    const notifications = data.userIds.map((userId) => ({
      userId,
      type: data.type as 'system' | 'course' | 'message' | 'assignment' | 'quiz' | 'certificate' | 'announcement',
      title: data.title,
      message: data.message,
      link: data.link,
      metadata: data.metadata,
    }));

    const results = await Promise.allSettled(
      notifications.map((n) => this.notificationsService.createNotification(n))
    );

    const success = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - success;

    return { success, failed };
  }

  /**
   * Bulk delete users
   */
  async bulkDeleteUsers(userIds: string[]): Promise<{
    success: number;
    failed: number;
  }> {
    const results = await Promise.allSettled(
      userIds.map(async (userId) => {
        try {
          await prisma.user.delete({ where: { id: userId } });
          return { success: true };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      })
    );

    const success = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - success;

    // Invalidate cache
    await deleteCachePattern('users:list:*');

    return { success, failed };
  }

  /**
   * Bulk update user roles
   */
  async bulkUpdateUserRoles(
    updates: Array<{ userId: string; role: string }>
  ): Promise<{
    success: number;
    failed: number;
  }> {
    const results = await Promise.allSettled(
      updates.map(async (update) => {
        try {
          await this.usersService.updateUserRole(update.userId, [update.role]);
          return { success: true };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      })
    );

    const success = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - success;

    return { success, failed };
  }
}

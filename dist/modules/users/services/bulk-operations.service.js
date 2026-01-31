"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkOperationsService = void 0;
const prisma_1 = require("../../../utils/prisma");
const users_service_1 = require("./users.service");
const service_1 = require("../../courses/services/service");
const enrollment_service_1 = require("../../courses/services/enrollment.service");
const notifications_service_1 = require("./notifications.service");
const cache_1 = require("../../../utils/cache");
class BulkOperationsService {
    constructor() {
        this.usersService = new users_service_1.UsersService();
        this.collectionsService = new service_1.CollectionsService();
        this.enrollmentService = new enrollment_service_1.EnrollmentService();
        this.notificationsService = new notifications_service_1.NotificationsService();
    }
    /**
     * Bulk import users
     */
    async bulkImportUsers(data) {
        const results = await Promise.allSettled(data.users.map(async (userData) => {
            try {
                const createData = {
                    email: userData.email,
                    username: userData.username,
                    role: userData.role,
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
            }
            catch (error) {
                return {
                    email: userData.email,
                    success: false,
                    error: error.message,
                };
            }
        }));
        const success = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - success;
        // Invalidate user cache
        await (0, cache_1.deleteCachePattern)('users:list:*');
        return {
            success,
            failed,
            results: results.map((r) => r.status === 'fulfilled' ? r.value : { email: '', success: false, error: 'Unknown error' }),
        };
    }
    /**
     * Bulk export users (CSV format)
     */
    async bulkExportUsers(role) {
        const where = role ? { role } : {};
        const users = await prisma_1.prisma.user.findMany({
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
    async bulkImportCourses(data) {
        const results = await Promise.allSettled(data.courses.map(async (courseData) => {
            try {
                await this.collectionsService.createCollection({
                    ...courseData,
                    createdBy: courseData.instructorId,
                });
                return { title: courseData.title, success: true };
            }
            catch (error) {
                return {
                    title: courseData.title,
                    success: false,
                    error: error.message,
                };
            }
        }));
        const success = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - success;
        // Invalidate course cache
        await (0, cache_1.deleteCachePattern)('courses:list:*');
        return {
            success,
            failed,
            results: results.map((r) => r.status === 'fulfilled' ? r.value : { title: '', success: false, error: 'Unknown error' }),
        };
    }
    /**
     * Bulk export courses (CSV format)
     */
    async bulkExportCourses() {
        const courses = await prisma_1.prisma.program.findMany({
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
        const rows = courses.map((c) => [
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
    async bulkEnrollStudents(data) {
        const results = await Promise.allSettled(data.enrollments.map(async (enrollmentData) => {
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
            }
            catch (error) {
                return {
                    collectionId: enrollmentData.collectionId,
                    studentId: enrollmentData.studentId,
                    success: false,
                    error: error.message,
                };
            }
        }));
        const success = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - success;
        return {
            success,
            failed,
            results: results.map((r) => r.status === 'fulfilled'
                ? r.value
                : { collectionId: '', studentId: '', success: false, error: 'Unknown error' }),
        };
    }
    /**
     * Bulk send notifications
     */
    async bulkSendNotifications(data) {
        const notifications = data.userIds.map((userId) => ({
            userId,
            type: data.type,
            title: data.title,
            message: data.message,
            link: data.link,
            metadata: data.metadata,
        }));
        const results = await Promise.allSettled(notifications.map((n) => this.notificationsService.createNotification(n)));
        const success = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.length - success;
        return { success, failed };
    }
    /**
     * Bulk delete users
     */
    async bulkDeleteUsers(userIds) {
        const results = await Promise.allSettled(userIds.map(async (userId) => {
            try {
                await prisma_1.prisma.user.delete({ where: { id: userId } });
                return { success: true };
            }
            catch (error) {
                return { success: false, error: error.message };
            }
        }));
        const success = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - success;
        // Invalidate cache
        await (0, cache_1.deleteCachePattern)('users:list:*');
        return { success, failed };
    }
    /**
     * Bulk update user roles
     */
    async bulkUpdateUserRoles(updates) {
        const results = await Promise.allSettled(updates.map(async (update) => {
            try {
                await this.usersService.updateUserRole(update.userId, [update.role]);
                return { success: true };
            }
            catch (error) {
                return { success: false, error: error.message };
            }
        }));
        const success = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - success;
        return { success, failed };
    }
}
exports.BulkOperationsService = BulkOperationsService;

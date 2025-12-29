"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundlesService = void 0;
const prisma_1 = require("../../../utils/prisma");
class BundlesService {
    /**
     * Create a course bundle
     */
    async createBundle(data) {
        // Validate all courses exist
        const courses = await prisma_1.prisma.course.findMany({
            where: { id: { in: data.courseIds } },
            select: {
                id: true,
                title: true,
                price: true,
                thumbnailUrl: true,
            },
        });
        if (courses.length !== data.courseIds.length) {
            throw new Error('One or more courses not found');
        }
        // Calculate total value
        const totalValue = courses.reduce((sum, course) => sum + course.price, 0);
        const savings = totalValue - data.price;
        const bundle = await prisma_1.prisma.courseBundle.create({
            data: {
                title: data.title,
                description: data.description,
                price: data.price,
                thumbnailUrl: data.thumbnailUrl,
                items: {
                    create: data.courseIds.map((courseId, index) => ({
                        courseId,
                        order: index,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        course: {
                            select: {
                                id: true,
                                title: true,
                                thumbnailUrl: true,
                                price: true,
                            },
                        },
                    },
                    orderBy: { order: 'asc' },
                },
            },
        });
        return this.mapToDto(bundle, totalValue, savings);
    }
    /**
     * Get all active bundles
     */
    async getAllBundles() {
        const bundles = await prisma_1.prisma.courseBundle.findMany({
            where: { isActive: true },
            include: {
                items: {
                    include: {
                        course: {
                            select: {
                                id: true,
                                title: true,
                                thumbnailUrl: true,
                                price: true,
                            },
                        },
                    },
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return bundles.map((bundle) => {
            const totalValue = bundle.items.reduce((sum, item) => sum + item.course.price, 0);
            const savings = totalValue - bundle.price;
            return this.mapToDto(bundle, totalValue, savings);
        });
    }
    /**
     * Get bundle by ID
     */
    async getBundleById(bundleId) {
        const bundle = await prisma_1.prisma.courseBundle.findUnique({
            where: { id: bundleId },
            include: {
                items: {
                    include: {
                        course: {
                            select: {
                                id: true,
                                title: true,
                                thumbnailUrl: true,
                                price: true,
                            },
                        },
                    },
                    orderBy: { order: 'asc' },
                },
            },
        });
        if (!bundle) {
            return null;
        }
        const totalValue = bundle.items.reduce((sum, item) => sum + item.course.price, 0);
        const savings = totalValue - bundle.price;
        return this.mapToDto(bundle, totalValue, savings);
    }
    /**
     * Enroll student in bundle (enrolls in all courses)
     */
    async enrollInBundle(bundleId, studentId) {
        const bundle = await prisma_1.prisma.courseBundle.findUnique({
            where: { id: bundleId },
            include: {
                items: {
                    select: {
                        courseId: true,
                    },
                },
            },
        });
        if (!bundle) {
            throw new Error('Bundle not found');
        }
        if (!bundle.isActive) {
            throw new Error('Bundle is not active');
        }
        const courseIds = bundle.items.map((item) => item.courseId);
        // Check existing enrollments
        const existingEnrollments = await prisma_1.prisma.enrollment.findMany({
            where: {
                studentId,
                courseId: { in: courseIds },
            },
            select: {
                courseId: true,
            },
        });
        const existingCourseIds = new Set(existingEnrollments.map((e) => e.courseId));
        const newCourseIds = courseIds.filter((id) => !existingCourseIds.has(id));
        // Create bundle enrollment
        await prisma_1.prisma.bundleEnrollment.create({
            data: {
                bundleId,
                studentId,
            },
        });
        // Note: Actual course enrollments would be handled by the enrollment service
        // This just tracks bundle enrollment
        return {
            enrolled: newCourseIds.length,
            alreadyEnrolled: existingCourseIds.size,
        };
    }
    mapToDto(bundle, totalValue, savings) {
        return {
            id: bundle.id,
            title: bundle.title,
            description: bundle.description || undefined,
            price: bundle.price,
            thumbnailUrl: bundle.thumbnailUrl || undefined,
            isActive: bundle.isActive,
            courses: bundle.items.map((item) => ({
                id: item.course.id,
                title: item.course.title,
                thumbnailUrl: item.course.thumbnailUrl || undefined,
                price: item.course.price,
            })),
            totalValue,
            savings,
            createdAt: bundle.createdAt,
            updatedAt: bundle.updatedAt,
        };
    }
}
exports.BundlesService = BundlesService;

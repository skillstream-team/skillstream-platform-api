"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundlesService = void 0;
const prisma_1 = require("../../../utils/prisma");
class BundlesService {
    /**
     * Create a collection bundle
     */
    async createBundle(data) {
        // Validate all collections exist
        const programs = await prisma_1.prisma.program.findMany({
            where: { id: { in: data.collectionIds } },
            select: {
                id: true,
                title: true,
                price: true,
                thumbnailUrl: true,
            },
        });
        if (programs.length !== data.collectionIds.length) {
            throw new Error('One or more programs not found');
        }
        // Calculate total value
        const totalValue = programs.reduce((sum, program) => sum + program.price, 0);
        const savings = totalValue - data.price;
        const bundle = await prisma_1.prisma.programBundle.create({
            data: {
                title: data.title,
                description: data.description,
                price: data.price,
                thumbnailUrl: data.thumbnailUrl,
                items: {
                    create: data.collectionIds.map((programId, index) => ({
                        programId,
                        order: index,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        program: {
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
        const bundles = await prisma_1.prisma.programBundle.findMany({
            where: { isActive: true },
            include: {
                items: {
                    include: {
                        program: {
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
            const totalValue = bundle.items.reduce((sum, item) => sum + item.collection.price, 0);
            const savings = totalValue - bundle.price;
            return this.mapToDto(bundle, totalValue, savings);
        });
    }
    /**
     * Get bundle by ID
     */
    async getBundleById(bundleId) {
        const bundle = await prisma_1.prisma.programBundle.findUnique({
            where: { id: bundleId },
            include: {
                items: {
                    include: {
                        program: {
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
        const totalValue = bundle.items.reduce((sum, item) => sum + (item.program?.price || 0), 0);
        const savings = totalValue - bundle.price;
        return this.mapToDto(bundle, totalValue, savings);
    }
    /**
     * Enroll student in bundle (enrolls in all collections)
     */
    async enrollInBundle(bundleId, studentId) {
        const bundle = await prisma_1.prisma.programBundle.findUnique({
            where: { id: bundleId },
            include: {
                items: {
                    select: {
                        programId: true,
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
        const programIds = bundle.items.map((item) => item.programId);
        // Check existing enrollments
        const existingEnrollments = await prisma_1.prisma.enrollment.findMany({
            where: {
                studentId,
                programId: { in: programIds },
            },
            select: {
                programId: true,
            },
        });
        const existingProgramIds = new Set(existingEnrollments.map((e) => e.programId));
        const newProgramIds = programIds.filter((id) => !existingProgramIds.has(id));
        // Create bundle enrollment
        await prisma_1.prisma.bundleEnrollment.create({
            data: {
                bundleId,
                studentId,
            },
        });
        // Note: Actual collection enrollments would be handled by the enrollment service
        // This just tracks bundle enrollment
        return {
            enrolled: newProgramIds.length,
            alreadyEnrolled: existingProgramIds.size,
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
            collections: bundle.items.map((item) => ({
                id: item.collection.id,
                title: item.collection.title,
                thumbnailUrl: item.collection.thumbnailUrl || undefined,
                price: item.collection.price,
            })),
            totalValue,
            savings,
            createdAt: bundle.createdAt,
            updatedAt: bundle.updatedAt,
        };
    }
}
exports.BundlesService = BundlesService;

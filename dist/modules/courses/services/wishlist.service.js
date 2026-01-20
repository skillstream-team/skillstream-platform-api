"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishlistService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
class WishlistService {
    /**
     * Add a course to user's wishlist
     */
    async addToWishlist(userId, courseId) {
        // Check if collection exists
        const course = await prisma_1.prisma.collection.findUnique({
            where: { id: courseId },
        });
        if (!course) {
            throw new Error('Collection not found');
        }
        // Check if already in wishlist
        const existing = await prisma_1.prisma.collectionWishlist.findUnique({
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
        const wishlistItem = await prisma_1.prisma.collectionWishlist.create({
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
        const reviews = await prisma_1.prisma.collectionReview.findMany({
            where: {
                collectionId: courseId,
                isPublished: true,
            },
            select: {
                rating: true,
            },
        });
        const averageRating = reviews.length > 0
            ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
            : 0;
        // Invalidate cache
        await (0, cache_1.deleteCache)(`wishlist:${userId}`);
        const item = wishlistItem;
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
    async removeFromWishlist(userId, courseId) {
        const wishlistItem = await prisma_1.prisma.collectionWishlist.findUnique({
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
        await prisma_1.prisma.collectionWishlist.delete({
            where: {
                id: wishlistItem.id,
            },
        });
        // Invalidate cache
        await (0, cache_1.deleteCache)(`wishlist:${userId}`);
    }
    /**
     * Get user's wishlist
     */
    async getUserWishlist(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const [wishlistItems, total] = await Promise.all([
            prisma_1.prisma.collectionWishlist.findMany({
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
            prisma_1.prisma.collectionWishlist.count({ where: { userId } }),
        ]);
        // Calculate average ratings for all collections
        const courseIds = wishlistItems.map((item) => item.collectionId);
        const reviews = await prisma_1.prisma.collectionReview.findMany({
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
        const ratingsMap = new Map();
        for (const courseId of courseIds) {
            const courseReviews = reviews.filter((r) => r.collectionId === courseId);
            const average = courseReviews.length > 0
                ? courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length
                : 0;
            ratingsMap.set(courseId, Math.round(average * 10) / 10);
        }
        const data = wishlistItems.map((item) => ({
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
    async isInWishlist(userId, courseId) {
        const wishlistItem = await prisma_1.prisma.collectionWishlist.findUnique({
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
    async getWishlistCount(userId) {
        return prisma_1.prisma.collectionWishlist.count({
            where: { userId },
        });
    }
}
exports.WishlistService = WishlistService;

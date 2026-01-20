"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagsService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
class TagsService {
    /**
     * Add tags to a course
     */
    async addTagsToCourse(courseId, tags) {
        // Remove duplicates and normalize
        const uniqueTags = [...new Set(tags.map((t) => t.toLowerCase().trim()))];
        await prisma_1.prisma.$transaction(uniqueTags.map((tag) => prisma_1.prisma.collectionTag.upsert({
            where: {
                collectionId_name: {
                    collectionId: courseId,
                    name: tag,
                },
            },
            update: {},
            create: {
                collectionId: courseId,
                name: tag,
            },
        })));
        // Invalidate cache
        await (0, cache_1.deleteCache)(`course:${courseId}`);
    }
    /**
     * Remove tags from a course
     */
    async removeTagsFromCourse(courseId, tags) {
        await prisma_1.prisma.collectionTag.deleteMany({
            where: {
                collectionId: courseId,
                name: { in: tags.map((t) => t.toLowerCase().trim()) },
            },
        });
        // Invalidate cache
        await (0, cache_1.deleteCache)(`course:${courseId}`);
    }
    /**
     * Get all tags for a course
     */
    async getCourseTags(courseId) {
        const tags = await prisma_1.prisma.collectionTag.findMany({
            where: { collectionId: courseId },
            select: { name: true },
            orderBy: { name: 'asc' },
        });
        return tags.map((t) => t.name);
    }
    /**
     * Get all unique tags across platform
     */
    async getAllTags() {
        const tags = await prisma_1.prisma.collectionTag.groupBy({
            by: ['name'],
            _count: {
                name: true,
            },
            orderBy: {
                _count: {
                    name: 'desc',
                },
            },
        });
        return tags.map((t) => ({
            name: t.name,
            count: t._count.name,
        }));
    }
    /**
     * Get courses by tag
     */
    async getCoursesByTag(tag, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const [courses, total] = await Promise.all([
            prisma_1.prisma.collection.findMany({
                where: {
                    tags: {
                        some: {
                            name: tag.toLowerCase(),
                        },
                    },
                },
                select: {
                    id: true,
                    title: true,
                    thumbnailUrl: true,
                },
                skip,
                take,
            }),
            prisma_1.prisma.collection.count({
                where: {
                    tags: {
                        some: {
                            name: tag.toLowerCase(),
                        },
                    },
                },
            }),
        ]);
        return {
            data: courses.map((c) => ({
                id: c.id,
                title: c.title,
                thumbnailUrl: c.thumbnailUrl || undefined,
            })),
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        };
    }
}
exports.TagsService = TagsService;

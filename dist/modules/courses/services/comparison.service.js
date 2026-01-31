"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComparisonService = void 0;
const prisma_1 = require("../../../utils/prisma");
class ComparisonService {
    /**
     * Compare multiple courses
     */
    async compareCourses(courseIds) {
        if (courseIds.length < 2 || courseIds.length > 5) {
            throw new Error('Can compare between 2 and 5 courses');
        }
        const courses = await prisma_1.prisma.program.findMany({
            where: { id: { in: courseIds } },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                instructor: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                _count: {
                    select: {
                        enrollments: true,
                        programModules: true,
                        reviews: true,
                        certificates: true,
                    },
                },
                prerequisites: {
                    include: {
                        prerequisite: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                },
                tags: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        // Calculate average ratings
        const reviews = await prisma_1.prisma.programReview.findMany({
            where: {
                programId: { in: courseIds },
                isPublished: true,
            },
            select: {
                programId: true,
                rating: true,
            },
        });
        const ratingsMap = new Map();
        for (const courseId of courseIds) {
            const courseReviews = reviews.filter((r) => r.programId === courseId);
            const average = courseReviews.length > 0
                ? courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length
                : 0;
            ratingsMap.set(courseId, Math.round(average * 10) / 10);
        }
        return {
            courses: courses.map((course) => ({
                id: course.id,
                title: course.title,
                description: course.description || undefined,
                price: course.price,
                thumbnailUrl: course.thumbnailUrl || undefined,
                difficulty: course.difficulty || undefined,
                duration: course.duration || undefined,
                language: course.language || undefined,
                category: course.category
                    ? {
                        id: course.category.id,
                        name: course.category.name,
                    }
                    : undefined,
                instructor: {
                    id: course.instructor.id,
                    username: course.instructor.username,
                },
                averageRating: ratingsMap.get(course.id) || 0,
                reviewCount: course._count.reviews,
                enrollmentCount: course._count.enrollments,
                lessonCount: course._count.collectionLessons,
                moduleCount: course._count.modules,
                hasCertificate: course._count.certificates > 0,
                prerequisites: course.prerequisites.map((p) => ({
                    id: p.prerequisite.id,
                    title: p.prerequisite.title,
                })),
                tags: course.tags.map((t) => t.name),
            })),
        };
    }
}
exports.ComparisonService = ComparisonService;

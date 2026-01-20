"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionsService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
class CollectionsService {
    // ============================================================
    // COLLECTION CRUD
    // ============================================================
    /**
     * @swagger
     * /courses:
     *   post:
     *     summary: Create a new course
     *     tags: [Courses]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *               description:
     *                 type: string
     *               price:
     *                 type: number
     *               order:
     *                 type: number
     *               createdBy:
     *                 type: number
     *               instructorId:
     *                 type: number
     *     responses:
     *       201:
     *         description: Course created successfully
     */
    async createCollection(data) {
        // Validate instructor exists
        const instructor = await prisma_1.prisma.user.findUnique({
            where: { id: data.instructorId },
        });
        if (!instructor) {
            throw new Error('Instructor not found');
        }
        const courseData = {
            title: data.title,
            description: data.description,
            price: data.price,
            order: data.order,
            createdBy: data.createdBy,
            instructorId: data.instructorId,
        };
        if (data.thumbnailUrl)
            courseData.thumbnailUrl = data.thumbnailUrl;
        if (data.categoryId)
            courseData.categoryId = data.categoryId;
        if (data.difficulty)
            courseData.difficulty = data.difficulty;
        if (data.duration)
            courseData.duration = data.duration;
        if (data.language)
            courseData.language = data.language;
        if (data.learningObjectives)
            courseData.learningObjectives = data.learningObjectives;
        if (data.requirements)
            courseData.requirements = data.requirements;
        const collection = await prisma_1.prisma.collection.create({ data: courseData });
        // Invalidate collection list cache
        await (0, cache_1.deleteCachePattern)('collections:list:*');
        return collection;
    }
    /**
     * @swagger
     * /courses:
     *   get:
     *     summary: Get all courses (paginated, searchable, filterable)
     *     tags: [Courses]
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 20
     *           maximum: 100
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *         description: Search in title and description
     *       - in: query
     *         name: minPrice
     *         schema:
     *           type: number
     *       - in: query
     *         name: maxPrice
     *         schema:
     *           type: number
     *       - in: query
     *         name: instructorId
     *         schema:
     *           type: string
     *       - in: query
     *         name: categoryId
     *         schema:
     *           type: string
     *         description: Filter by category ID
     *       - in: query
     *         name: difficulty
     *         schema:
     *           type: string
     *           enum: [BEGINNER, INTERMEDIATE, ADVANCED, EXPERT]
     *         description: Filter by difficulty level
     *       - in: query
     *         name: minRating
     *         schema:
     *           type: number
     *         description: Minimum average rating (0-5)
     *       - in: query
     *         name: maxRating
     *         schema:
     *           type: number
     *         description: Maximum average rating (0-5)
     *       - in: query
     *         name: minDuration
     *         schema:
     *           type: integer
     *         description: Minimum course duration in hours
     *       - in: query
     *         name: maxDuration
     *         schema:
     *           type: integer
     *         description: Maximum course duration in hours
     *       - in: query
     *         name: language
     *         schema:
     *           type: string
     *         description: Filter by language code (e.g., en, es, fr)
     *       - in: query
     *         name: tags
     *         schema:
     *           type: string
     *         description: Comma-separated list of tags
     *       - in: query
     *         name: sortBy
     *         schema:
     *           type: string
     *           enum: [createdAt, price, title, popularity, rating]
     *           default: createdAt
     *       - in: query
     *         name: sortOrder
     *         schema:
     *           type: string
     *           enum: [asc, desc]
     *           default: desc
     *     responses:
     *       200:
     *         description: Paginated list of courses
     */
    async getAllCollections(page = 1, limit = 20, search, minPrice, maxPrice, instructorId, categoryId, difficulty, minRating, maxRating, minDuration, maxDuration, language, tags, sortBy = 'createdAt', sortOrder = 'desc') {
        // Generate cache key with filters to ensure different queries don't share cache
        const cacheKey = cache_1.cacheKeys.collectionList(page, limit, {
            instructorId,
            categoryId,
            difficulty,
            search,
            sortBy,
            sortOrder,
        });
        // Try cache first
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            return cached;
        }
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100); // Max 100 per page
        // Build where clause
        const where = {};
        // Search filter
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        // Price filters
        if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = {};
            if (minPrice !== undefined)
                where.price.gte = minPrice;
            if (maxPrice !== undefined)
                where.price.lte = maxPrice;
        }
        // Instructor filter
        if (instructorId) {
            where.instructorId = instructorId;
        }
        // Category filter
        if (categoryId) {
            where.categoryId = categoryId;
        }
        // Difficulty filter
        if (difficulty) {
            where.difficulty = difficulty.toUpperCase();
        }
        // Rating filter (will be applied after fetching reviews)
        // Duration filter
        if (minDuration !== undefined || maxDuration !== undefined) {
            where.duration = {};
            if (minDuration !== undefined)
                where.duration.gte = minDuration;
            if (maxDuration !== undefined)
                where.duration.lte = maxDuration;
        }
        // Language filter
        if (language) {
            where.language = language.toLowerCase();
        }
        // Tags filter
        if (tags && tags.length > 0) {
            where.tags = {
                some: {
                    name: { in: tags.map((t) => t.toLowerCase()) },
                },
            };
        }
        // Build orderBy
        let orderBy = {};
        switch (sortBy) {
            case 'price':
                orderBy = { price: sortOrder };
                break;
            case 'title':
                orderBy = { title: sortOrder };
                break;
            case 'popularity':
                // Sort by enrollment count (requires aggregation or separate query)
                orderBy = { createdAt: sortOrder }; // Fallback
                break;
            case 'rating':
                // Will be sorted after fetching reviews
                orderBy = { createdAt: sortOrder };
                break;
            default:
                orderBy = { createdAt: sortOrder };
        }
        const [collections, total] = await Promise.all([
            prisma_1.prisma.collection.findMany({
                where,
                skip,
                take,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    price: true,
                    order: true,
                    thumbnailUrl: true,
                    categoryId: true,
                    difficulty: true,
                    duration: true,
                    language: true,
                    learningObjectives: true,
                    requirements: true,
                    category: {
                        select: { id: true, name: true, slug: true }
                    },
                    createdAt: true,
                    updatedAt: true,
                    createdBy: true,
                    instructorId: true,
                    instructor: {
                        select: { id: true, username: true, email: true }
                    },
                    _count: {
                        select: {
                            enrollments: true,
                            collectionLessons: true,
                            quizzes: true,
                            reviews: true,
                        }
                    }
                },
                orderBy,
            }),
            prisma_1.prisma.collection.count({ where }),
        ]);
        // Fetch average ratings for all collections
        const collectionIds = collections.map(c => c.id);
        const reviews = await prisma_1.prisma.collectionReview.findMany({
            where: {
                collectionId: { in: collectionIds },
                isPublished: true,
            },
            select: {
                collectionId: true,
                rating: true,
            },
        });
        // Calculate average rating per collection
        const ratingsMap = new Map();
        for (const collectionId of collectionIds) {
            const collectionReviews = reviews.filter(r => r.collectionId === collectionId);
            const average = collectionReviews.length > 0
                ? collectionReviews.reduce((sum, r) => sum + r.rating, 0) / collectionReviews.length
                : 0;
            ratingsMap.set(collectionId, {
                average: Math.round(average * 10) / 10,
                count: collectionReviews.length,
            });
        }
        // Add ratings to courses
        let collectionsWithRatings = collections.map(collection => {
            const enrollmentCount = collection._count.enrollments;
            const averageRating = ratingsMap.get(collection.id)?.average || 0;
            const reviewCount = ratingsMap.get(collection.id)?.count || 0;
            return {
                ...collection,
                averageRating,
                reviewCount,
                enrollmentCount,
            };
        });
        // Apply rating filter if specified
        if (minRating !== undefined || maxRating !== undefined) {
            collectionsWithRatings = collectionsWithRatings.filter((collection) => {
                if (minRating !== undefined && collection.averageRating < minRating)
                    return false;
                if (maxRating !== undefined && collection.averageRating > maxRating)
                    return false;
                return true;
            });
        }
        // For popularity sorting, we need to sort by enrollment count
        if (sortBy === 'popularity') {
            collectionsWithRatings.sort((a, b) => {
                const aCount = a.enrollmentCount;
                const bCount = b.enrollmentCount;
                return sortOrder === 'desc' ? bCount - aCount : aCount - bCount;
            });
        }
        // For rating sorting
        if (sortBy === 'rating') {
            collectionsWithRatings.sort((a, b) => {
                return sortOrder === 'desc'
                    ? b.averageRating - a.averageRating
                    : a.averageRating - b.averageRating;
            });
        }
        // Recalculate total after rating filter
        const filteredTotal = collectionsWithRatings.length;
        const actualTotal = minRating !== undefined || maxRating !== undefined
            ? filteredTotal
            : total;
        // Include tags in response
        const collectionIdsForTags = collectionsWithRatings.map((c) => c.id);
        const collectionTags = await prisma_1.prisma.collectionTag.findMany({
            where: { collectionId: { in: collectionIdsForTags } },
            select: {
                collectionId: true,
                name: true,
            },
        });
        const tagsMap = new Map();
        for (const tag of collectionTags) {
            if (!tagsMap.has(tag.collectionId)) {
                tagsMap.set(tag.collectionId, []);
            }
            tagsMap.get(tag.collectionId).push(tag.name);
        }
        const collectionsWithTags = collectionsWithRatings.map((collection) => ({
            ...collection,
            tags: tagsMap.get(collection.id) || [],
        }));
        const result = {
            collections: collectionsWithTags,
            pagination: {
                page,
                limit: take,
                total: actualTotal,
                totalPages: Math.ceil(actualTotal / take),
                hasNext: page * take < actualTotal,
                hasPrev: page > 1,
            },
        };
        // Cache result
        await (0, cache_1.setCache)(cacheKey, result, cache_1.CACHE_TTL.SHORT);
        return result;
    }
    /**
     * @swagger
     * /courses/{id}:
     *   get:
     *     summary: Get a specific course by ID
     *     tags: [Courses]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Course details
     *       404:
     *         description: Course not found
     */
    async getCollectionById(id) {
        const cacheKey = cache_1.cacheKeys.collection(id);
        // Try cache first
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            return cached;
        }
        const collection = await prisma_1.prisma.collection.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                description: true,
                price: true,
                order: true,
                thumbnailUrl: true,
                categoryId: true,
                difficulty: true,
                duration: true,
                language: true,
                learningObjectives: true,
                requirements: true,
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    }
                },
                createdAt: true,
                updatedAt: true,
                createdBy: true,
                instructorId: true,
                instructor: {
                    select: { id: true, username: true, email: true }
                },
                modules: {
                    select: { id: true, title: true, order: true }
                },
                collectionLessons: {
                    include: {
                        lesson: {
                            select: { id: true, title: true, order: true }
                        }
                    },
                    orderBy: { order: 'asc' }
                },
                quizzes: {
                    select: { id: true, title: true }
                },
                _count: {
                    select: {
                        enrollments: true,
                        payments: true,
                        reviews: true,
                    }
                }
            },
        });
        if (!collection) {
            return null;
        }
        // Calculate average rating
        const reviews = await prisma_1.prisma.collectionReview.findMany({
            where: {
                collectionId: id,
                isPublished: true,
            },
            select: {
                rating: true,
            },
        });
        const averageRating = reviews.length > 0
            ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
            : 0;
        // Get prerequisites
        const prerequisites = await prisma_1.prisma.collectionPrerequisite.findMany({
            where: { collectionId: id },
            include: {
                prerequisite: {
                    select: {
                        id: true,
                        title: true,
                        difficulty: true,
                        thumbnailUrl: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        // Get tags for collection
        const collectionTags = await prisma_1.prisma.collectionTag.findMany({
            where: { collectionId: id },
            select: { name: true },
        });
        const collectionWithRating = {
            ...collection,
            averageRating,
            reviewCount: collection._count.reviews,
            prerequisites: prerequisites.map((p) => ({
                id: p.id,
                prerequisiteId: p.prerequisiteId,
                prerequisite: p.prerequisite,
                isRequired: p.isRequired,
            })),
            tags: collectionTags.map((t) => t.name),
            learningObjectives: collection.learningObjectives ? collection.learningObjectives : undefined,
            requirements: collection.requirements ? collection.requirements : undefined,
        };
        // Cache result
        await (0, cache_1.setCache)(cacheKey, collectionWithRating, cache_1.CACHE_TTL.MEDIUM);
        return collectionWithRating;
    }
    /**
     * @swagger
     * /courses/{id}:
     *   patch:
     *     summary: Update course information
     *     tags: [Courses]
     */
    async updateCollection(id, data) {
        const collection = await prisma_1.prisma.collection.update({
            where: { id },
            data,
            select: {
                id: true,
                title: true,
                description: true,
                price: true,
                order: true,
                createdAt: true,
                updatedAt: true,
                createdBy: true,
                instructorId: true,
                instructor: {
                    select: { id: true, username: true, email: true }
                },
                modules: {
                    select: { id: true, title: true, order: true }
                },
                collectionLessons: {
                    include: { lesson: { select: { id: true, title: true, order: true } } }
                },
                quizzes: {
                    select: { id: true, title: true }
                }
            },
        });
        // Invalidate caches
        await (0, cache_1.deleteCache)(cache_1.cacheKeys.collection(id));
        await (0, cache_1.deleteCachePattern)('collections:list:*');
        return collection;
    }
    /**
     * @swagger
     * /courses/{id}:
     *   delete:
     *     summary: Delete a course by ID
     *     tags: [Courses]
     */
    async deleteCollection(id) {
        await prisma_1.prisma.collection.delete({ where: { id } });
        // Invalidate caches
        await (0, cache_1.deleteCache)(cache_1.cacheKeys.collection(id));
        await (0, cache_1.deleteCachePattern)('collections:list:*');
    }
    // ============================================================
    // MODULE CRUD
    // ============================================================
    /**
     * @swagger
     * /courses/{courseId}/modules:
     *   post:
     *     summary: Add a module to a course
     *     tags: [Modules]
     */
    async addModuleToCollection(collectionId, data) {
        // Default to published if not specified
        const isPublished = data.isPublished !== undefined ? data.isPublished : true;
        const module = await prisma_1.prisma.collectionModule.create({
            data: {
                ...data,
                collectionId,
                content: data.content ?? {},
                description: data.description ?? '',
                isPublished,
                publishedAt: isPublished ? new Date() : null,
            },
        });
        // Invalidate both collection and modules cache
        await Promise.all([
            (0, cache_1.deleteCache)(cache_1.cacheKeys.collection(collectionId)),
            (0, cache_1.deleteCache)(cache_1.cacheKeys.collectionModules(collectionId))
        ]);
        return module;
    }
    /**
     * @swagger
     * /modules/{moduleId}:
     *   get:
     *     summary: Get a module by ID
     *     tags: [Modules]
     */
    async getModuleById(moduleId) {
        return prisma_1.prisma.collectionModule.findUnique({
            where: { id: moduleId },
            include: {
                quizzes: true,
                assignments: true,
                progress: true,
                collection: { include: { collectionLessons: { include: { lesson: true } } } },
            },
        });
    }
    /**
     * @swagger
     * /modules/{moduleId}:
     *   patch:
     *     summary: Update a module
     *     tags: [Modules]
     */
    async updateModule(moduleId, data) {
        return prisma_1.prisma.collectionModule.update({ where: { id: moduleId }, data });
    }
    /**
     * Get all modules with lessons for a course
     */
    async getCollectionModulesWithLessons(collectionId) {
        // Check cache first
        const cacheKey = cache_1.cacheKeys.collectionModules(collectionId);
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            return cached;
        }
        // Fetch modules and collection lessons in parallel with minimal data
        const [modules, collectionLessons] = await Promise.all([
            prisma_1.prisma.collectionModule.findMany({
                where: { collectionId },
                select: {
                    id: true,
                    collectionId: true,
                    title: true,
                    description: true,
                    order: true,
                    isPublished: true,
                    publishedAt: true,
                    createdBy: true,
                    createdAt: true,
                    updatedAt: true,
                    // Don't include quizzes for builder - they're not needed
                },
                orderBy: { order: 'asc' },
            }),
            prisma_1.prisma.collectionLesson.findMany({
                where: { collectionId },
                include: {
                    lesson: {
                        select: {
                            id: true,
                            title: true,
                            content: true,
                            duration: true,
                            isPreview: true,
                            createdAt: true,
                            updatedAt: true,
                        }
                    }
                },
                orderBy: { order: 'asc' },
            }),
        ]);
        // Group lessons by moduleId stored in content JSON
        const moduleMap = new Map();
        collectionLessons.forEach(collectionLesson => {
            const lesson = collectionLesson.lesson;
            const content = lesson.content;
            const moduleId = content?.moduleId;
            if (moduleId) {
                if (!moduleMap.has(moduleId)) {
                    moduleMap.set(moduleId, []);
                }
                // Extract description from content if it exists
                const lessonWithDescription = {
                    ...lesson,
                    description: content?.description || '',
                    moduleId: moduleId,
                    quizzes: [], // Empty array for builder view
                };
                moduleMap.get(moduleId).push(lessonWithDescription);
            }
        });
        const result = modules.map(module => ({
            ...module,
            lessons: moduleMap.get(module.id) || []
        }));
        // Cache the result
        await (0, cache_1.setCache)(cacheKey, result, cache_1.CACHE_TTL.SHORT);
        return result;
    }
    /**
     * Update a module
     */
    async updateModuleInCollection(collectionId, moduleId, data) {
        // Verify module belongs to collection
        const module = await prisma_1.prisma.collectionModule.findFirst({
            where: { id: moduleId, collectionId },
        });
        if (!module) {
            throw new Error('Module not found or does not belong to this collection');
        }
        const updated = await prisma_1.prisma.collectionModule.update({
            where: { id: moduleId },
            data,
        });
        // Invalidate both collection and modules cache
        await Promise.all([
            (0, cache_1.deleteCache)(cache_1.cacheKeys.collection(collectionId)),
            (0, cache_1.deleteCache)(cache_1.cacheKeys.collectionModules(collectionId))
        ]);
        return updated;
    }
    async deleteModule(moduleId) {
        // Get module to find collectionId for cache invalidation
        const module = await prisma_1.prisma.collectionModule.findUnique({
            where: { id: moduleId },
            select: { collectionId: true },
        });
        if (!module) {
            throw new Error('Module not found');
        }
        // Delete all collection lessons in this module first
        // Query all collection lessons and filter by moduleId in content JSON
        const allCollectionLessons = await prisma_1.prisma.collectionLesson.findMany({
            where: {
                collectionId: module.collectionId,
            },
            include: {
                lesson: true
            }
        });
        // Filter collection lessons where lesson content.moduleId matches
        const collectionLessonsToRemove = allCollectionLessons.filter((cl) => {
            const content = cl.lesson.content;
            return content?.moduleId === moduleId;
        });
        // Remove collection lesson relationships (don't delete lessons - they're independent)
        for (const collectionLesson of collectionLessonsToRemove) {
            await prisma_1.prisma.collectionLesson.delete({ where: { id: collectionLesson.id } });
        }
        // Delete the module
        await prisma_1.prisma.collectionModule.delete({ where: { id: moduleId } });
        // Invalidate both collection and modules cache
        await Promise.all([
            (0, cache_1.deleteCache)(cache_1.cacheKeys.collection(module.collectionId)),
            (0, cache_1.deleteCache)(cache_1.cacheKeys.collectionModules(module.collectionId))
        ]);
    }
    // ============================================================
    // LESSON CRUD
    // ============================================================
    /**
     * @swagger
     * /modules/{moduleId}/lessons:
     *   post:
     *     summary: Add a lesson to a module
     *     tags: [Lessons]
     */
    async addLessonToModule(moduleId, data) {
        // Validate price
        if (data.price === undefined || data.price === null) {
            throw new Error('Price is required for lessons');
        }
        if (typeof data.price !== 'number' || data.price < 0) {
            throw new Error('Price must be a non-negative number');
        }
        // Store moduleId and description in content JSON since Lesson model doesn't have these fields
        const content = data.content || {};
        content.moduleId = moduleId;
        if (data.description !== undefined && data.description !== null) {
            content.description = data.description;
        }
        // Create lesson (independent of collection)
        const lessonData = {
            title: data.title,
            order: data.order,
            content: content,
            price: data.price || 0,
        };
        // Add optional fields only if they exist
        if (data.duration !== undefined) {
            lessonData.duration = data.duration;
        }
        if (data.isPreview !== undefined) {
            lessonData.isPreview = data.isPreview;
        }
        const lesson = await prisma_1.prisma.lesson.create({
            data: lessonData
        });
        // Add lesson to collection via CollectionLesson
        await prisma_1.prisma.collectionLesson.create({
            data: {
                collectionId: data.collectionId,
                lessonId: lesson.id,
                order: data.order,
            }
        });
        // Invalidate both collection and modules cache
        await Promise.all([
            (0, cache_1.deleteCache)(cache_1.cacheKeys.collection(data.collectionId)),
            (0, cache_1.deleteCache)(cache_1.cacheKeys.collectionModules(data.collectionId))
        ]);
        // Extract description from content for the response
        const lessonContent = lesson.content;
        return {
            ...lesson,
            description: lessonContent?.description || '',
        };
    }
    /**
     * @swagger
     * /lessons/{lessonId}:
     *   patch:
     *     summary: Update lesson details
     *     tags: [Lessons]
     */
    async updateLesson(lessonId, data) {
        const lesson = await prisma_1.prisma.lesson.update({ where: { id: lessonId }, data });
        // Invalidate collection caches for all collections this lesson belongs to
        const collectionLessons = await prisma_1.prisma.collectionLesson.findMany({
            where: { lessonId },
            select: { collectionId: true }
        });
        await Promise.all(collectionLessons.map(cl => Promise.all([
            (0, cache_1.deleteCache)(cache_1.cacheKeys.collection(cl.collectionId)),
            (0, cache_1.deleteCache)(cache_1.cacheKeys.collectionModules(cl.collectionId))
        ])));
        return lesson;
    }
    /**
     * @swagger
     * /lessons/{lessonId}:
     *   delete:
     *     summary: Delete a lesson
     *     tags: [Lessons]
     */
    async deleteLesson(lessonId) {
        // Get all collections this lesson belongs to for cache invalidation
        const collectionLessons = await prisma_1.prisma.collectionLesson.findMany({
            where: { lessonId },
            select: { collectionId: true }
        });
        // Delete all collection lesson relationships
        await prisma_1.prisma.collectionLesson.deleteMany({
            where: { lessonId }
        });
        // Delete the lesson itself
        const deletedLesson = await prisma_1.prisma.lesson.delete({ where: { id: lessonId } });
        // Invalidate collection caches for all affected collections
        await Promise.all(collectionLessons.map(cl => Promise.all([
            (0, cache_1.deleteCache)(cache_1.cacheKeys.collection(cl.collectionId)),
            (0, cache_1.deleteCache)(cache_1.cacheKeys.collectionModules(cl.collectionId))
        ])));
        return deletedLesson;
    }
    // ============================================================
    // QUIZZES
    // ============================================================
    /**
     * @swagger
     * /lessons/{lessonId}/quizzes:
     *   post:
     *     summary: Add a quiz to a lesson
     *     tags: [Quizzes]
     */
    async addQuizToLesson(lessonId, data) {
        return prisma_1.prisma.quiz.create({
            data: {
                title: data.title,
                collection: { connect: { id: data.collectionId } },
                Lesson: { connect: { id: lessonId } },
                creator: { connect: { id: data.createdBy } },
                description: data.description,
                instructions: data.instructions,
                timeLimit: data.timeLimit,
                maxAttempts: data.maxAttempts,
                passingScore: data.passingScore,
                dueDate: data.dueDate,
                isPublished: data.isPublished ?? false,
                questions: {
                    create: data.questions.map(q => ({
                        question: q.question,
                        type: q.type,
                        options: q.options ?? null,
                        correctAnswer: q.correctAnswer ?? null,
                        points: q.points ?? 1,
                        order: q.order,
                        explanation: q.explanation ?? null,
                    })),
                },
            },
            include: { questions: true },
        });
    }
    /**
     * @swagger
     * /quizzes/{quizId}:
     *   patch:
     *     summary: Update quiz details
     *     tags: [Quizzes]
     */
    async updateQuiz(quizId, data) {
        return prisma_1.prisma.quiz.update({ where: { id: quizId }, data });
    }
    /**
     * @swagger
     * /quizzes/{quizId}:
     *   delete:
     *     summary: Delete a quiz
     *     tags: [Quizzes]
     */
    async deleteQuiz(quizId) {
        return prisma_1.prisma.quiz.delete({ where: { id: quizId } });
    }
    // ============================================================
    // ASSIGNMENTS, MATERIALS, ENROLLMENTS, ETC.
    // ============================================================
    /**
     * @swagger
     * /modules/{moduleId}/assignments:
     *   post:
     *     summary: Add an assignment to a module
     *     tags: [Assignments]
     */
    async addAssignmentToModule(moduleId, data) {
        return prisma_1.prisma.assignment.create({ data: { ...data, moduleId } });
    }
}
exports.CollectionsService = CollectionsService;

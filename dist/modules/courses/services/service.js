"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgramsService = exports.CollectionsService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
const monetization_service_1 = require("./monetization.service");
class CollectionsService {
    // ============================================================
    // PROGRAM CRUD (formerly Collection)
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
    async createProgram(data) {
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
        const program = await prisma_1.prisma.program.create({ data: courseData });
        // Invalidate program list cache
        await (0, cache_1.deleteCachePattern)('programs:list:*');
        return program;
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
    async getAllPrograms(page = 1, limit = 20, search, minPrice, maxPrice, instructorId, categoryId, difficulty, minRating, maxRating, minDuration, maxDuration, language, tags, sortBy = 'createdAt', sortOrder = 'desc') {
        // Generate cache key with filters to ensure different queries don't share cache
        const cacheKey = cache_1.cacheKeys.programList(page, limit, {
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
        // Note: We show all collections in marketplace regardless of isPublished status
        // Teachers can control visibility through other means if needed
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
        const [programs, total] = await Promise.all([
            prisma_1.prisma.program.findMany({
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
                        select: { id: true, username: true, email: true, firstName: true, lastName: true }
                    },
                    _count: {
                        select: {
                            enrollments: true,
                            programModules: true,
                            quizzes: true,
                            reviews: true,
                        }
                    }
                },
                orderBy,
            }),
            prisma_1.prisma.program.count({ where }),
        ]);
        // Fetch average ratings for all programs
        const programIds = programs.map(c => c.id);
        const reviews = await prisma_1.prisma.programReview.findMany({
            where: {
                programId: { in: programIds },
                isPublished: true,
            },
            select: {
                programId: true,
                rating: true,
            },
        });
        // Calculate average rating per program
        const ratingsMap = new Map();
        for (const programId of programIds) {
            const programReviews = reviews.filter(r => r.programId === programId);
            const average = programReviews.length > 0
                ? programReviews.reduce((sum, r) => sum + r.rating, 0) / programReviews.length
                : 0;
            ratingsMap.set(programId, {
                average: Math.round(average * 10) / 10,
                count: programReviews.length,
            });
        }
        // Add ratings to programs
        let programsWithRatings = programs.map(program => {
            const enrollmentCount = program._count.enrollments;
            const averageRating = ratingsMap.get(program.id)?.average || 0;
            const reviewCount = ratingsMap.get(program.id)?.count || 0;
            return {
                ...program,
                averageRating,
                reviewCount,
                enrollmentCount,
            };
        });
        // Apply rating filter if specified
        if (minRating !== undefined || maxRating !== undefined) {
            programsWithRatings = programsWithRatings.filter((program) => {
                if (minRating !== undefined && program.averageRating < minRating)
                    return false;
                if (maxRating !== undefined && program.averageRating > maxRating)
                    return false;
                return true;
            });
        }
        // For popularity sorting, we need to sort by enrollment count
        if (sortBy === 'popularity') {
            programsWithRatings.sort((a, b) => {
                const aCount = a.enrollmentCount;
                const bCount = b.enrollmentCount;
                return sortOrder === 'desc' ? bCount - aCount : aCount - bCount;
            });
        }
        // For rating sorting
        if (sortBy === 'rating') {
            programsWithRatings.sort((a, b) => {
                return sortOrder === 'desc'
                    ? b.averageRating - a.averageRating
                    : a.averageRating - b.averageRating;
            });
        }
        // Recalculate total after rating filter
        const filteredTotal = programsWithRatings.length;
        const actualTotal = minRating !== undefined || maxRating !== undefined
            ? filteredTotal
            : total;
        // Include tags in response
        const programIdsForTags = programsWithRatings.map((p) => p.id);
        const programTags = await prisma_1.prisma.programTag.findMany({
            where: { programId: { in: programIdsForTags } },
            select: {
                programId: true,
                name: true,
            },
        });
        const tagsMap = new Map();
        for (const tag of programTags) {
            if (!tagsMap.has(tag.programId)) {
                tagsMap.set(tag.programId, []);
            }
            tagsMap.get(tag.programId).push(tag.name);
        }
        const programsWithTags = programsWithRatings.map((program) => ({
            ...program,
            tags: tagsMap.get(program.id) || [],
            studentPrice: (0, monetization_service_1.getStudentPrice)(program.price ?? 0),
        }));
        const result = {
            programs: programsWithTags,
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
    async getProgramById(id) {
        const cacheKey = cache_1.cacheKeys.program(id);
        // Try cache first
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            return cached;
        }
        const program = await prisma_1.prisma.program.findUnique({
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
                sections: {
                    select: { id: true, title: true, order: true }
                },
                programModules: {
                    include: {
                        module: {
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
        if (!program) {
            return null;
        }
        // Calculate average rating
        const reviews = await prisma_1.prisma.programReview.findMany({
            where: {
                programId: id,
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
        const prerequisites = await prisma_1.prisma.programPrerequisite.findMany({
            where: { programId: id },
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
        // Get tags for program
        const programTags = await prisma_1.prisma.programTag.findMany({
            where: { programId: id },
            select: { name: true },
        });
        const programWithRating = {
            ...program,
            averageRating,
            studentPrice: (0, monetization_service_1.getStudentPrice)(program.price ?? 0),
            reviewCount: program._count.reviews,
            prerequisites: prerequisites.map((p) => ({
                id: p.id,
                prerequisiteId: p.prerequisiteId,
                prerequisite: p.prerequisite,
                isRequired: p.isRequired,
            })),
            tags: programTags.map((t) => t.name),
            learningObjectives: program.learningObjectives ? program.learningObjectives : undefined,
            requirements: program.requirements ? program.requirements : undefined,
        };
        // Cache result
        // Use short cache TTL for individual program queries
        await (0, cache_1.setCache)(cacheKey, programWithRating, cache_1.CACHE_TTL.SHORT);
        return programWithRating;
    }
    /**
     * @swagger
     * /courses/{id}:
     *   patch:
     *     summary: Update course information
     *     tags: [Courses]
     */
    async updateProgram(id, data) {
        const program = await prisma_1.prisma.program.update({
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
                sections: {
                    select: { id: true, title: true, order: true }
                },
                programModules: {
                    include: { module: { select: { id: true, title: true, order: true } } }
                },
                quizzes: {
                    select: { id: true, title: true }
                }
            },
        });
        // Invalidate caches
        await (0, cache_1.deleteCache)(cache_1.cacheKeys.program(id));
        await (0, cache_1.deleteCachePattern)('programs:list:*');
        return program;
    }
    /**
     * @swagger
     * /courses/{id}:
     *   delete:
     *     summary: Delete a course by ID
     *     tags: [Courses]
     */
    async deleteCollection(id) {
        // Check if program exists first
        const program = await prisma_1.prisma.program.findUnique({ where: { id } });
        if (!program) {
            throw new Error('Program not found');
        }
        // Delete related records that don't have cascade delete
        // Use a transaction with increased timeout and parallel operations
        await prisma_1.prisma.$transaction(async (tx) => {
            // Run all delete operations in parallel for better performance
            await Promise.all([
                // Delete required relations (no cascade)
                tx.enrollment.deleteMany({ where: { programId: id } }),
                tx.programSection.deleteMany({ where: { programId: id } }),
                tx.quiz.deleteMany({ where: { programId: id } }),
                tx.poll.deleteMany({ where: { programId: id } }),
                tx.assignment.deleteMany({ where: { programId: id } }),
                tx.material.deleteMany({ where: { programId: id } }),
                tx.video.deleteMany({ where: { programId: id } }),
                tx.liveStream.deleteMany({ where: { programId: id } }),
                tx.progress.deleteMany({ where: { programId: id } }),
                tx.certificate.deleteMany({ where: { programId: id } }),
                tx.programRecommendation.deleteMany({ where: { programId: id } }),
            ]);
            // Run all update operations in parallel
            await Promise.all([
                // Update optional relations to null
                tx.payment.updateMany({
                    where: { programId: id },
                    data: { programId: null }
                }),
                tx.achievement.updateMany({
                    where: { programId: id },
                    data: { programId: null }
                }),
                tx.userInteraction.updateMany({
                    where: { programId: id },
                    data: { programId: null }
                }),
                tx.calendarEvent.updateMany({
                    where: { programId: id },
                    data: { programId: null }
                }),
                tx.programImport.updateMany({
                    where: { importedProgramId: id },
                    data: { importedProgramId: null }
                }),
                tx.coupon.updateMany({
                    where: { programId: id },
                    data: { programId: null }
                }),
                tx.interaction.updateMany({
                    where: { programId: id },
                    data: { programId: null }
                }),
                tx.announcement.updateMany({
                    where: { programId: id },
                    data: { programId: null }
                }),
                tx.whiteboard.updateMany({
                    where: { programId: id },
                    data: { programId: null }
                }),
            ]);
            // Now delete the program itself
            // Records with onDelete: Cascade will be automatically deleted
            await tx.program.delete({ where: { id } });
        }, {
            maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
            timeout: 30000, // Maximum time the transaction can run (30 seconds)
        });
        // Aggressively invalidate all related caches BEFORE returning
        // This ensures cache is cleared before any subsequent requests
        console.log(`[Cache] Invalidating caches for deleted program: ${id}`);
        // Clear individual program cache
        await (0, cache_1.deleteCache)(cache_1.cacheKeys.program(id));
        await (0, cache_1.deleteCache)(cache_1.cacheKeys.programSections(id));
        // Clear all program list patterns - Redis pattern matching
        // Pattern 'programs:list:*' should match all keys like:
        // - programs:list:1:20
        // - programs:list:1:20:instructor:xxx
        // - programs:list:1:20:instructor:xxx:category:yyy
        // etc.
        await (0, cache_1.deleteCachePattern)('programs:list:*');
        // Also clear any potential variations
        await (0, cache_1.deleteCachePattern)('programs:list:*:*');
        await (0, cache_1.deleteCachePattern)('programs:list:*:*:*');
        await (0, cache_1.deleteCachePattern)('programs:list:*:*:*:*');
        console.log(`[Cache] Cache invalidation completed for program: ${id}`);
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
    async addSectionToProgram(programId, data) {
        // Default to published if not specified
        const isPublished = data.isPublished !== undefined ? data.isPublished : true;
        const section = await prisma_1.prisma.programSection.create({
            data: {
                ...data,
                programId,
                content: data.content ?? {},
                description: data.description ?? '',
                isPublished,
                publishedAt: isPublished ? new Date() : null,
            },
        });
        // Invalidate both program and sections cache
        await Promise.all([
            (0, cache_1.deleteCache)(cache_1.cacheKeys.program(programId)),
            (0, cache_1.deleteCache)(cache_1.cacheKeys.programSections(programId))
        ]);
        return section;
    }
    /**
     * @swagger
     * /modules/{moduleId}:
     *   get:
     *     summary: Get a module by ID
     *     tags: [Modules]
     */
    async getSectionById(sectionId) {
        return prisma_1.prisma.programSection.findUnique({
            where: { id: sectionId },
            include: {
                quizzes: true,
                assignments: true,
                progress: true,
                program: { include: { programModules: { include: { module: true } } } },
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
    async updateSection(sectionId, data) {
        return prisma_1.prisma.programSection.update({ where: { id: sectionId }, data });
    }
    /**
     * Get all modules with lessons for a course
     */
    async getProgramSectionsWithModules(programId) {
        // Check cache first
        const cacheKey = cache_1.cacheKeys.programSections(programId);
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            return cached;
        }
        // Fetch sections and program modules in parallel with minimal data
        const [sections, programModules] = await Promise.all([
            prisma_1.prisma.programSection.findMany({
                where: { programId },
                select: {
                    id: true,
                    programId: true,
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
            prisma_1.prisma.programModule.findMany({
                where: { programId },
                include: {
                    module: {
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
        // Group modules by sectionId stored in content JSON
        const moduleMap = new Map();
        programModules.forEach(programModule => {
            const module = programModule.module;
            const content = module.content;
            const sectionId = content?.sectionId;
            if (sectionId) {
                if (!moduleMap.has(sectionId)) {
                    moduleMap.set(sectionId, []);
                }
                // Extract description from content if it exists
                const moduleWithDescription = {
                    ...module,
                    description: content?.description || '',
                    sectionId: sectionId,
                    quizzes: [], // Empty array for builder view
                };
                moduleMap.get(sectionId).push(moduleWithDescription);
            }
        });
        const result = sections.map(section => ({
            ...section,
            modules: moduleMap.get(section.id) || []
        }));
        // Cache the result
        await (0, cache_1.setCache)(cacheKey, result, cache_1.CACHE_TTL.SHORT);
        return result;
    }
    /**
     * Update a module
     */
    async updateSectionInProgram(programId, sectionId, data) {
        // Verify section belongs to program
        const section = await prisma_1.prisma.programSection.findFirst({
            where: { id: sectionId, programId },
        });
        if (!section) {
            throw new Error('Section not found or does not belong to this program');
        }
        const updated = await prisma_1.prisma.programSection.update({
            where: { id: sectionId },
            data,
        });
        // Invalidate both program and sections cache
        await Promise.all([
            (0, cache_1.deleteCache)(cache_1.cacheKeys.program(programId)),
            (0, cache_1.deleteCache)(cache_1.cacheKeys.programSections(programId))
        ]);
        return updated;
    }
    async deleteSection(sectionId) {
        // Get section to find programId for cache invalidation
        const section = await prisma_1.prisma.programSection.findUnique({
            where: { id: sectionId },
            select: { programId: true },
        });
        if (!section) {
            throw new Error('Section not found');
        }
        // Delete all program modules in this section first
        // Query all program modules and filter by sectionId in content JSON
        const allProgramModules = await prisma_1.prisma.programModule.findMany({
            where: {
                programId: section.programId,
            },
            include: {
                module: true
            }
        });
        // Filter program modules where module content.sectionId matches
        const programModulesToRemove = allProgramModules.filter((pm) => {
            const content = pm.module.content;
            return content?.sectionId === sectionId;
        });
        // Remove program module relationships (don't delete modules - they're independent)
        for (const programModule of programModulesToRemove) {
            await prisma_1.prisma.programModule.delete({ where: { id: programModule.id } });
        }
        // Delete the section
        await prisma_1.prisma.programSection.delete({ where: { id: sectionId } });
        // Invalidate both program and sections cache
        await Promise.all([
            (0, cache_1.deleteCache)(cache_1.cacheKeys.program(section.programId)),
            (0, cache_1.deleteCache)(cache_1.cacheKeys.programSections(section.programId))
        ]);
    }
    // ============================================================
    // MODULE CRUD (standalone modules)
    // ============================================================
    /**
     * @swagger
     * /sections/{sectionId}/modules:
     *   post:
     *     summary: Add a module to a section
     *     tags: [Modules]
     */
    async addModuleToSection(sectionId, data) {
        // Validate price
        if (data.price === undefined || data.price === null) {
            throw new Error('Price is required for lessons');
        }
        if (typeof data.price !== 'number' || data.price < 0) {
            throw new Error('Price must be a non-negative number');
        }
        // Store sectionId and description in content JSON since Module model doesn't have these fields
        const content = data.content || {};
        content.sectionId = sectionId;
        if (data.description !== undefined && data.description !== null) {
            content.description = data.description;
        }
        // Create module (independent of program)
        const moduleData = {
            title: data.title,
            order: data.order,
            content: content,
            price: data.price || 0,
        };
        // Add optional fields only if they exist
        if (data.duration !== undefined) {
            moduleData.duration = data.duration;
        }
        if (data.isPreview !== undefined) {
            moduleData.isPreview = data.isPreview;
        }
        const module = await prisma_1.prisma.module.create({
            data: moduleData
        });
        // Add module to program via ProgramModule
        await prisma_1.prisma.programModule.create({
            data: {
                programId: data.programId,
                moduleId: module.id,
                order: data.order,
            }
        });
        // Invalidate both program and sections cache
        await Promise.all([
            (0, cache_1.deleteCache)(cache_1.cacheKeys.program(data.programId)),
            (0, cache_1.deleteCache)(cache_1.cacheKeys.programSections(data.programId))
        ]);
        // Extract description from content for the response
        const moduleContent = module.content;
        return {
            ...module,
            description: moduleContent?.description || '',
        };
    }
    /**
     * @swagger
     * /lessons/{lessonId}:
     *   patch:
     *     summary: Update lesson details
     *     tags: [Lessons]
     */
    async updateModule(moduleId, data) {
        const module = await prisma_1.prisma.module.update({ where: { id: moduleId }, data });
        // Invalidate program caches for all programs this module belongs to
        const programModules = await prisma_1.prisma.programModule.findMany({
            where: { moduleId },
            select: { programId: true }
        });
        await Promise.all(programModules.map(pm => Promise.all([
            (0, cache_1.deleteCache)(cache_1.cacheKeys.program(pm.programId)),
            (0, cache_1.deleteCache)(cache_1.cacheKeys.programSections(pm.programId))
        ])));
        return module;
    }
    /**
     * @swagger
     * /lessons/{lessonId}:
     *   delete:
     *     summary: Delete a lesson
     *     tags: [Lessons]
     */
    async deleteModule(moduleId) {
        // Get all programs this module belongs to for cache invalidation
        const programModules = await prisma_1.prisma.programModule.findMany({
            where: { moduleId },
            select: { programId: true }
        });
        // Delete all program module relationships
        await prisma_1.prisma.programModule.deleteMany({
            where: { moduleId }
        });
        // Delete the module itself
        const deletedModule = await prisma_1.prisma.module.delete({ where: { id: moduleId } });
        // Invalidate program caches for all affected programs
        await Promise.all(programModules.map(pm => Promise.all([
            (0, cache_1.deleteCache)(cache_1.cacheKeys.program(pm.programId)),
            (0, cache_1.deleteCache)(cache_1.cacheKeys.programSections(pm.programId))
        ])));
        return deletedModule;
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
    async addQuizToModule(moduleId, data) {
        return prisma_1.prisma.quiz.create({
            data: {
                title: data.title,
                program: { connect: { id: data.programId } },
                Module: { connect: { id: moduleId } },
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
        return prisma_1.prisma.assignment.create({ data: { ...data, sectionId: moduleId } });
    }
    // (Continue in same style for updateAssignment, deleteAssignment, materials, enrollments, progress, achievements, etc.)
    // Backward compatibility aliases for GraphQL and other consumers
    async getAllCollections(page, limit, ...args) {
        return this.getAllPrograms(page, limit, ...args);
    }
    async getCollectionById(id) {
        return this.getProgramById(id);
    }
    async createCollection(data) {
        return this.createProgram(data);
    }
    async updateCollection(id, data) {
        return this.updateProgram(id, data);
    }
    async deleteProgram(id) {
        return this.deleteCollection(id);
    }
    async addModuleToCollection(programId, data) {
        // Get or create default section for the program
        const sections = await prisma_1.prisma.programSection.findMany({
            where: { programId },
            orderBy: { order: 'asc' },
            take: 1
        });
        let sectionId = sections[0]?.id;
        if (!sectionId) {
            // Create a default section
            const defaultSection = await prisma_1.prisma.programSection.create({
                data: {
                    programId,
                    title: 'Modules',
                    description: '',
                    order: 0,
                    createdBy: data.createdBy || programId, // Fallback if createdBy not provided
                }
            });
            sectionId = defaultSection.id;
        }
        // Add programId to data and call addModuleToSection
        return this.addModuleToSection(sectionId, {
            ...data,
            programId
        });
    }
}
exports.CollectionsService = CollectionsService;
// Backward compatibility: export ProgramsService as alias
exports.ProgramsService = CollectionsService;

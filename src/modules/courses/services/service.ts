import { Prisma } from '@prisma/client';
import { CreateQuizQuestionDto } from '../dtos/learning.dto';
import { prisma } from '../../../utils/prisma';
import { getCache, setCache, deleteCache, deleteCachePattern, cacheKeys, CACHE_TTL } from '../../../utils/cache';

export class CoursesService {
    // ============================================================
    // COURSE CRUD
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
    async createCourse(data: {
        title: string;
        description?: string;
        price: number;
        order: number;
        createdBy: string;
        instructorId: string;
        thumbnailUrl?: string;
        categoryId?: string;
        difficulty?: string;
        duration?: number;
        language?: string;
        learningObjectives?: string[];
        requirements?: string[];
    }) {
        // Validate instructor exists
        const instructor = await prisma.user.findUnique({
            where: { id: data.instructorId },
        });
        if (!instructor) {
            throw new Error('Instructor not found');
        }
        
        const courseData: any = {
            title: data.title,
            description: data.description,
            price: data.price,
            order: data.order,
            createdBy: data.createdBy,
            instructorId: data.instructorId,
        };

        if (data.thumbnailUrl) courseData.thumbnailUrl = data.thumbnailUrl;
        if (data.categoryId) courseData.categoryId = data.categoryId;
        if (data.difficulty) courseData.difficulty = data.difficulty;
        if (data.duration) courseData.duration = data.duration;
        if (data.language) courseData.language = data.language;
        if (data.learningObjectives) courseData.learningObjectives = data.learningObjectives;
        if (data.requirements) courseData.requirements = data.requirements;

        const course = await prisma.course.create({ data: courseData });
        
        // Invalidate course list cache
        await deleteCachePattern('courses:list:*');
        
        return course;
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
    async getAllCourses(
        page: number = 1,
        limit: number = 20,
        search?: string,
        minPrice?: number,
        maxPrice?: number,
        instructorId?: string,
        categoryId?: string,
        difficulty?: string,
        minRating?: number,
        maxRating?: number,
        minDuration?: number,
        maxDuration?: number,
        language?: string,
        tags?: string[],
        sortBy: string = 'createdAt',
        sortOrder: 'asc' | 'desc' = 'desc'
    ) {
        // Generate cache key with filters to ensure different queries don't share cache
        const cacheKey = cacheKeys.courseList(page, limit, {
            instructorId,
            categoryId,
            difficulty,
            search,
            sortBy,
            sortOrder,
        });
        
        // Try cache first
        const cached = await getCache(cacheKey);
        if (cached) {
            return cached;
        }

        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100); // Max 100 per page

        // Build where clause
        const where: any = {};
        
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
            if (minPrice !== undefined) where.price.gte = minPrice;
            if (maxPrice !== undefined) where.price.lte = maxPrice;
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
            if (minDuration !== undefined) where.duration.gte = minDuration;
            if (maxDuration !== undefined) where.duration.lte = maxDuration;
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
        let orderBy: any = {};
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

        const [courses, total] = await Promise.all([
            prisma.course.findMany({
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
                            lessons: true,
                            quizzes: true,
                            reviews: true,
                        }
                    }
                },
                orderBy,
            }),
            prisma.course.count({ where }),
        ]);
        
        // Fetch average ratings for all courses
        const courseIds = courses.map(c => c.id);
        const reviews = await prisma.courseReview.findMany({
            where: {
                courseId: { in: courseIds },
                isPublished: true,
            },
            select: {
                courseId: true,
                rating: true,
            },
        });

        // Calculate average rating per course
        const ratingsMap = new Map<string, { average: number; count: number }>();
        for (const courseId of courseIds) {
            const courseReviews = reviews.filter(r => r.courseId === courseId);
            const average = courseReviews.length > 0
                ? courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length
                : 0;
            ratingsMap.set(courseId, {
                average: Math.round(average * 10) / 10,
                count: courseReviews.length,
            });
        }

        // Add ratings to courses
        let coursesWithRatings = courses.map(course => {
            const enrollmentCount = course._count.enrollments;
            const averageRating = ratingsMap.get(course.id)?.average || 0;
            const reviewCount = ratingsMap.get(course.id)?.count || 0;
            
            return {
                ...course,
                averageRating,
                reviewCount,
                enrollmentCount,
            };
        });
        
        // Apply rating filter if specified
        if (minRating !== undefined || maxRating !== undefined) {
            coursesWithRatings = coursesWithRatings.filter((course) => {
                if (minRating !== undefined && course.averageRating < minRating) return false;
                if (maxRating !== undefined && course.averageRating > maxRating) return false;
                return true;
            });
        }
        
        // For popularity sorting, we need to sort by enrollment count
        if (sortBy === 'popularity') {
            coursesWithRatings.sort((a, b) => {
                const aCount = a.enrollmentCount;
                const bCount = b.enrollmentCount;
                return sortOrder === 'desc' ? bCount - aCount : aCount - bCount;
            });
        }
        
        // For rating sorting
        if (sortBy === 'rating') {
            coursesWithRatings.sort((a, b) => {
                return sortOrder === 'desc' 
                    ? b.averageRating - a.averageRating 
                    : a.averageRating - b.averageRating;
            });
        }

        // Recalculate total after rating filter
        const filteredTotal = coursesWithRatings.length;
        const actualTotal = minRating !== undefined || maxRating !== undefined 
            ? filteredTotal 
            : total;

        // Include tags in response
        const courseIdsForTags = coursesWithRatings.map((c) => c.id);
        const courseTags = await prisma.courseTag.findMany({
            where: { courseId: { in: courseIdsForTags } },
            select: {
                courseId: true,
                name: true,
            },
        });

        const tagsMap = new Map<string, string[]>();
        for (const tag of courseTags) {
            if (!tagsMap.has(tag.courseId)) {
                tagsMap.set(tag.courseId, []);
            }
            tagsMap.get(tag.courseId)!.push(tag.name);
        }

        const coursesWithTags = coursesWithRatings.map((course) => ({
            ...course,
            tags: tagsMap.get(course.id) || [],
        }));

        const result = {
            courses: coursesWithTags,
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
        await setCache(cacheKey, result, CACHE_TTL.SHORT);
        
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
    async getCourseById(id: string) {
        const cacheKey = cacheKeys.course(id);
        
        // Try cache first
        const cached = await getCache(cacheKey);
        if (cached) {
            return cached;
        }

        const course = await prisma.course.findUnique({
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
                lessons: {
                    select: { id: true, title: true, order: true }
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

        if (!course) {
            return null;
        }

        // Calculate average rating
        const reviews = await prisma.courseReview.findMany({
            where: {
                courseId: id,
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
        const prerequisites = await prisma.coursePrerequisite.findMany({
            where: { courseId: id },
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

        // Get tags for course
        const tags = await prisma.courseTag.findMany({
            where: { courseId: id },
            select: { name: true },
        });

        // Get tags for course
        const courseTags = await prisma.courseTag.findMany({
            where: { courseId: id },
            select: { name: true },
        });

        const courseWithRating = {
            ...course,
            averageRating,
            reviewCount: course._count.reviews,
            prerequisites: prerequisites.map((p) => ({
                id: p.id,
                prerequisiteId: p.prerequisiteId,
                prerequisite: p.prerequisite,
                isRequired: p.isRequired,
            })),
            tags: courseTags.map((t) => t.name),
            learningObjectives: course.learningObjectives ? (course.learningObjectives as any) : undefined,
            requirements: course.requirements ? (course.requirements as any) : undefined,
        };

        // Cache result
        await setCache(cacheKey, courseWithRating, CACHE_TTL.MEDIUM);

        return courseWithRating;
    }

    /**
     * @swagger
     * /courses/{id}:
     *   patch:
     *     summary: Update course information
     *     tags: [Courses]
     */
    async updateCourse(id: string, data: Prisma.CourseUpdateInput) {
        const course = await prisma.course.update({
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
                lessons: {
                    select: { id: true, title: true, order: true }
                },
                quizzes: {
                    select: { id: true, title: true }
                }
            },
        });
        
        // Invalidate caches
        await deleteCache(cacheKeys.course(id));
        await deleteCachePattern('courses:list:*');
        
        return course;
    }

    /**
     * @swagger
     * /courses/{id}:
     *   delete:
     *     summary: Delete a course by ID
     *     tags: [Courses]
     */
    async deleteCourse(id: string) {
        await prisma.course.delete({ where: { id } });
        
        // Invalidate caches
        await deleteCache(cacheKeys.course(id));
        await deleteCachePattern('courses:list:*');
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
    async addModuleToCourse(courseId: string, data: {
        title: string;
        content?: Prisma.InputJsonValue;
        description?: string;
        order: number;
        isPublished?: boolean;
        createdBy: string;
    }) {
        return prisma.courseModule.create({
            data: { ...data, courseId, content: data.content ?? {}, description: data.description ?? '' },
        });
    }

    /**
     * @swagger
     * /modules/{moduleId}:
     *   get:
     *     summary: Get a module by ID
     *     tags: [Modules]
     */
    async getModuleById(moduleId: string) {
        return prisma.courseModule.findUnique({
            where: { id: moduleId },
            include: {
                quizzes: true,
                assignments: true,
                progress: true,
                course: { include: { lessons: true } },
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
    async updateModule(moduleId: string, data: Prisma.CourseModuleUpdateInput) {
        return prisma.courseModule.update({ where: { id: moduleId }, data });
    }

    /**
     * @swagger
     * /modules/{moduleId}:
     *   delete:
     *     summary: Delete a module
     *     tags: [Modules]
     */
    async deleteModule(moduleId: string) {
        return prisma.courseModule.delete({ where: { id: moduleId } });
    }

    /**
     * Get all modules with lessons for a course
     */
    async getCourseModulesWithLessons(courseId: string) {
        const modules = await prisma.courseModule.findMany({
            where: { courseId },
            include: {
                quizzes: {
                    include: {
                        creator: {
                            select: { id: true, username: true, email: true }
                        }
                    }
                }
            },
            orderBy: { order: 'asc' },
        });

        const lessons = await prisma.lesson.findMany({
            where: { courseId },
            include: {
                quizzes: {
                    include: {
                        creator: {
                            select: { id: true, username: true, email: true }
                        }
                    }
                }
            },
            orderBy: { order: 'asc' },
        });

        // Group lessons by moduleId stored in content JSON
        // If moduleId is not in content, we'll need to handle it differently
        const moduleMap = new Map<string, any[]>();
        
        lessons.forEach(lesson => {
            const content = lesson.content as any;
            const moduleId = content?.moduleId;
            if (moduleId) {
                if (!moduleMap.has(moduleId)) {
                    moduleMap.set(moduleId, []);
                }
                moduleMap.get(moduleId)!.push(lesson);
            }
        });

        return modules.map(module => ({
            ...module,
            lessons: moduleMap.get(module.id) || []
        }));
    }

    /**
     * Update a module
     */
    async updateModuleInCourse(courseId: string, moduleId: string, data: {
        title?: string;
        description?: string;
    }) {
        // Verify module belongs to course
        const module = await prisma.courseModule.findFirst({
            where: { id: moduleId, courseId },
        });
        if (!module) {
            throw new Error('Module not found or does not belong to this course');
        }
        return prisma.courseModule.update({
            where: { id: moduleId },
            data,
        });
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
    async addLessonToModule(moduleId: string, data: {
        title: string;
        content?: Prisma.InputJsonValue;
        order: number;
        courseId: string;
        description?: string;
        duration?: number;
        isPreview?: boolean;
    }) {
        // Store moduleId in content JSON since Lesson model doesn't have moduleId field
        const content = (data.content as any) || {};
        content.moduleId = moduleId;
        
        return prisma.lesson.create({ 
            data: {
                ...data,
                content: content as Prisma.InputJsonValue,
            }
        });
    }

    /**
     * @swagger
     * /lessons/{lessonId}:
     *   patch:
     *     summary: Update lesson details
     *     tags: [Lessons]
     */
    async updateLesson(lessonId: string, data: Partial<{ title: string; content: Prisma.InputJsonValue; order: number }>) {
        return prisma.lesson.update({ where: { id: lessonId }, data });
    }

    /**
     * @swagger
     * /lessons/{lessonId}:
     *   delete:
     *     summary: Delete a lesson
     *     tags: [Lessons]
     */
    async deleteLesson(lessonId: string) {
        return prisma.lesson.delete({ where: { id: lessonId } });
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
    async addQuizToLesson(lessonId: string, data: {
        title: string;
        courseId: string;
        description?: string;
        instructions?: string;
        timeLimit?: number;
        maxAttempts?: number;
        passingScore?: number;
        dueDate?: Date;
        isPublished?: boolean;
        questions: CreateQuizQuestionDto[];
        createdBy: string;
    }) {
        return prisma.quiz.create({
            data: {
                title: data.title,
                course: { connect: { id: data.courseId } },
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
    async updateQuiz(quizId: string, data: Partial<{ title: string; description: string; instructions: string; timeLimit: number; maxAttempts: number; passingScore: number; dueDate: Date; isPublished: boolean }>) {
        return prisma.quiz.update({ where: { id: quizId }, data });
    }

    /**
     * @swagger
     * /quizzes/{quizId}:
     *   delete:
     *     summary: Delete a quiz
     *     tags: [Quizzes]
     */
    async deleteQuiz(quizId: string) {
        return prisma.quiz.delete({ where: { id: quizId } });
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
    async addAssignmentToModule(moduleId: string, data: {
        title: string;
        description?: string;
        instructions?: string;
        type: string;
        maxScore?: number;
        dueDate?: Date;
        isPublished?: boolean;
        createdBy: string;
        courseId: string;
    }) {
        return prisma.assignment.create({ data: { ...data, moduleId } });
    }

    // (Continue in same style for updateAssignment, deleteAssignment, materials, enrollments, progress, achievements, etc.)
}
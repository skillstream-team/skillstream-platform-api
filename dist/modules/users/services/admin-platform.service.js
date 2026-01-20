"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPlatformService = void 0;
// Admin Platform Service - Comprehensive admin management
const user_model_1 = require("../models/user.model");
const email_service_1 = require("./email.service");
class AdminPlatformService {
    // ============================================================
    // EMAIL TEMPLATES MANAGEMENT
    // ============================================================
    async getAllEmailTemplates() {
        const templates = await user_model_1.prisma.emailTemplate.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return {
            success: true,
            templates: templates.map((t) => ({
                id: t.id,
                name: t.name,
                subject: t.subject,
                body: t.body,
                variables: t.variables,
                type: t.type,
                isActive: t.isActive,
                createdAt: t.createdAt.toISOString(),
                updatedAt: t.updatedAt.toISOString(),
            })),
        };
    }
    async getEmailTemplate(id) {
        const template = await user_model_1.prisma.emailTemplate.findUnique({
            where: { id },
        });
        if (!template) {
            throw new Error('Email template not found');
        }
        return {
            success: true,
            data: {
                id: template.id,
                name: template.name,
                subject: template.subject,
                body: template.body,
                variables: template.variables,
                type: template.type,
                isActive: template.isActive,
                createdAt: template.createdAt.toISOString(),
                updatedAt: template.updatedAt.toISOString(),
            },
        };
    }
    async createEmailTemplate(data) {
        const template = await user_model_1.prisma.emailTemplate.create({
            data: {
                name: data.name,
                subject: data.subject,
                body: data.body,
                variables: data.variables,
                type: data.type,
                isActive: data.isActive ?? true,
            },
        });
        return {
            success: true,
            data: {
                id: template.id,
                name: template.name,
                subject: template.subject,
                body: template.body,
                variables: template.variables,
                type: template.type,
                isActive: template.isActive,
                createdAt: template.createdAt.toISOString(),
                updatedAt: template.updatedAt.toISOString(),
            },
        };
    }
    async updateEmailTemplate(id, data) {
        const template = await user_model_1.prisma.emailTemplate.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.subject && { subject: data.subject }),
                ...(data.body && { body: data.body }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
        return {
            success: true,
            data: {
                id: template.id,
                name: template.name,
                subject: template.subject,
                body: template.body,
                variables: template.variables,
                type: template.type,
                isActive: template.isActive,
                createdAt: template.createdAt.toISOString(),
                updatedAt: template.updatedAt.toISOString(),
            },
        };
    }
    async deleteEmailTemplate(id) {
        await user_model_1.prisma.emailTemplate.delete({
            where: { id },
        });
        return {
            success: true,
            message: 'Email template deleted successfully',
        };
    }
    async testEmailTemplate(id, testEmail, variables) {
        const template = await user_model_1.prisma.emailTemplate.findUnique({
            where: { id },
        });
        if (!template) {
            throw new Error('Email template not found');
        }
        // Replace variables in subject and body
        let subject = template.subject;
        let body = template.body;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, value);
            body = body.replace(regex, value);
        }
        // Send test email
        await email_service_1.emailService.sendEmail(testEmail, subject, body, true);
        return {
            success: true,
            message: 'Test email sent successfully',
        };
    }
    // ============================================================
    // QUIZZES MANAGEMENT
    // ============================================================
    async getAllQuizzes(options) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {};
        if (options.search) {
            where.title = { contains: options.search, mode: 'insensitive' };
        }
        if (options.courseId) {
            where.collectionId = options.courseId;
        }
        if (options.status) {
            where.isPublished = options.status === 'PUBLISHED';
        }
        const [quizzes, total] = await Promise.all([
            user_model_1.prisma.quiz.findMany({
                where,
                skip,
                take: limit,
                include: {
                    collection: {
                        select: { id: true, title: true },
                    },
                    questions: {
                        select: { id: true },
                    },
                    attempts: {
                        select: { id: true, score: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            user_model_1.prisma.quiz.count({ where }),
        ]);
        const formattedQuizzes = quizzes.map((quiz) => {
            const attempts = quiz.attempts || [];
            const averageScore = attempts.length > 0
                ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length
                : 0;
            return {
                id: quiz.id,
                title: quiz.title,
                courseId: quiz.collectionId,
                courseName: quiz.collection?.title || 'N/A',
                lessonId: quiz.lessonId,
                questions: quiz.questions?.length || 0,
                totalAttempts: attempts.length,
                averageScore: Math.round(averageScore * 100) / 100,
                isActive: quiz.isPublished || false,
                createdAt: quiz.createdAt.toISOString(),
            };
        });
        return {
            success: true,
            quizzes: formattedQuizzes,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    async getQuiz(id) {
        const quiz = await user_model_1.prisma.quiz.findUnique({
            where: { id },
            include: {
                collection: {
                    select: { id: true, title: true },
                },
                questions: {
                    orderBy: { order: 'asc' },
                },
            },
        });
        if (!quiz) {
            throw new Error('Quiz not found');
        }
        return {
            success: true,
            data: {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                courseId: quiz.collectionId,
                lessonId: quiz.lessonId,
                questions: quiz.questions,
                settings: {
                    timeLimit: quiz.timeLimit,
                    maxAttempts: quiz.maxAttempts,
                    passingScore: quiz.passingScore,
                    isPublished: quiz.isPublished,
                },
                createdAt: quiz.createdAt.toISOString(),
                updatedAt: quiz.updatedAt.toISOString(),
            },
        };
    }
    async updateQuiz(id, data) {
        const updateData = {};
        if (data.title)
            updateData.title = data.title;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.isActive !== undefined)
            updateData.isPublished = data.isActive;
        if (data.settings) {
            if (data.settings.timeLimit !== undefined)
                updateData.timeLimit = data.settings.timeLimit;
            if (data.settings.maxAttempts !== undefined)
                updateData.maxAttempts = data.settings.maxAttempts;
            if (data.settings.passingScore !== undefined)
                updateData.passingScore = data.settings.passingScore;
        }
        const quiz = await user_model_1.prisma.quiz.update({
            where: { id },
            data: updateData,
            include: {
                questions: true,
            },
        });
        return {
            success: true,
            data: {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                courseId: quiz.collectionId,
                lessonId: quiz.lessonId,
                questions: quiz.questions,
                settings: {
                    timeLimit: quiz.timeLimit,
                    maxAttempts: quiz.maxAttempts,
                    passingScore: quiz.passingScore,
                    isPublished: quiz.isPublished,
                },
                createdAt: quiz.createdAt.toISOString(),
                updatedAt: quiz.updatedAt.toISOString(),
            },
        };
    }
    async deleteQuiz(id) {
        await user_model_1.prisma.quiz.delete({
            where: { id },
        });
        return {
            success: true,
            message: 'Quiz deleted successfully',
        };
    }
    // ============================================================
    // FORUMS MANAGEMENT
    // ============================================================
    async getAllForumPosts(options) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {};
        if (options.search) {
            where.OR = [
                { title: { contains: options.search, mode: 'insensitive' } },
                { content: { contains: options.search, mode: 'insensitive' } },
            ];
        }
        if (options.courseId) {
            where.collectionId = options.courseId;
        }
        if (options.status) {
            if (options.status === 'HIDDEN') {
                where.isHidden = true;
            }
            else if (options.status === 'DELETED') {
                where.deletedAt = { not: null };
            }
            else {
                where.isHidden = false;
                where.deletedAt = null;
            }
        }
        const [posts, total] = await Promise.all([
            user_model_1.prisma.forumPost.findMany({
                where,
                skip,
                take: limit,
                include: {
                    author: {
                        select: { id: true, username: true, email: true, firstName: true, lastName: true },
                    },
                    collection: {
                        select: { id: true, title: true },
                    },
                    replies: {
                        select: { id: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            user_model_1.prisma.forumPost.count({ where }),
        ]);
        const formattedPosts = posts.map((post) => ({
            id: post.id,
            title: post.title,
            content: post.content,
            author: {
                id: post.authorId,
                name: `${post.author?.firstName || ''} ${post.author?.lastName || ''}`.trim() || post.author?.username || 'Unknown',
                email: post.author?.email,
            },
            courseId: post.collectionId,
            courseName: post.collection?.title || 'N/A',
            replies: post.replies?.length || 0,
            views: post.views || 0,
            isPinned: post.isPinned || false,
            isLocked: post.isLocked || false,
            status: post.deletedAt ? 'DELETED' : post.isHidden ? 'HIDDEN' : 'ACTIVE',
            createdAt: post.createdAt.toISOString(),
        }));
        return {
            success: true,
            posts: formattedPosts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    async getForumPost(id) {
        const post = await user_model_1.prisma.forumPost.findUnique({
            where: { id },
            include: {
                author: {
                    select: { id: true, username: true, email: true, firstName: true, lastName: true },
                },
                replies: {
                    include: {
                        author: {
                            select: { id: true, username: true, email: true, firstName: true, lastName: true },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!post) {
            throw new Error('Forum post not found');
        }
        return {
            success: true,
            data: {
                id: post.id,
                title: post.title,
                content: post.content,
                author: {
                    id: post.authorId,
                    name: `${post.author?.firstName || ''} ${post.author?.lastName || ''}`.trim() || post.author?.username || 'Unknown',
                    email: post.author?.email,
                },
                replies: post.replies.map((reply) => ({
                    id: reply.id,
                    content: reply.content,
                    author: {
                        id: reply.authorId,
                        name: `${reply.author?.firstName || ''} ${reply.author?.lastName || ''}`.trim() || reply.author?.username || 'Unknown',
                        email: reply.author?.email,
                    },
                    createdAt: reply.createdAt.toISOString(),
                })),
                createdAt: post.createdAt.toISOString(),
            },
        };
    }
    async moderateForumPost(id, data) {
        const updateData = {};
        if (data.status) {
            if (data.status === 'HIDDEN') {
                updateData.isHidden = true;
                updateData.deletedAt = null;
            }
            else if (data.status === 'DELETED') {
                updateData.deletedAt = new Date();
                updateData.isHidden = true;
            }
            else {
                updateData.isHidden = false;
                updateData.deletedAt = null;
            }
        }
        if (data.isPinned !== undefined)
            updateData.isPinned = data.isPinned;
        if (data.isLocked !== undefined)
            updateData.isLocked = data.isLocked;
        const post = await user_model_1.prisma.forumPost.update({
            where: { id },
            data: updateData,
            include: {
                author: {
                    select: { id: true, username: true, email: true },
                },
            },
        });
        return {
            success: true,
            data: {
                id: post.id,
                title: post.title,
                content: post.content,
                status: post.deletedAt ? 'DELETED' : post.isHidden ? 'HIDDEN' : 'ACTIVE',
                isPinned: post.isPinned || false,
                isLocked: post.isLocked || false,
                createdAt: post.createdAt.toISOString(),
            },
        };
    }
    async deleteForumPost(id) {
        await user_model_1.prisma.forumPost.update({
            where: { id },
            data: { deletedAt: new Date(), isHidden: true },
        });
        return {
            success: true,
            message: 'Forum post deleted successfully',
        };
    }
    // ============================================================
    // QA MANAGEMENT
    // ============================================================
    async getAllQA(options) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {};
        if (options.search) {
            where.question = { contains: options.search, mode: 'insensitive' };
        }
        if (options.courseId) {
            where.collectionId = options.courseId;
        }
        if (options.status) {
            if (options.status === 'HIDDEN') {
                where.isHidden = true;
            }
            else if (options.status === 'DELETED') {
                where.deletedAt = { not: null };
            }
            else {
                where.isHidden = false;
                where.deletedAt = null;
            }
        }
        const [questions, total] = await Promise.all([
            user_model_1.prisma.instructorQA.findMany({
                where,
                skip,
                take: limit,
                include: {
                    student: {
                        select: { id: true, username: true, firstName: true, lastName: true },
                    },
                    collection: {
                        select: { id: true, title: true },
                    },
                    answers: {
                        select: { id: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            user_model_1.prisma.instructorQA.count({ where }),
        ]);
        const formattedQuestions = questions.map((qa) => ({
            id: qa.id,
            question: qa.question,
            student: {
                id: qa.studentId,
                name: `${qa.student?.firstName || ''} ${qa.student?.lastName || ''}`.trim() || qa.student?.username || 'Unknown',
            },
            courseId: qa.collectionId,
            courseName: qa.collection?.title || 'N/A',
            lessonId: qa.lessonId,
            answers: qa.answers?.length || 0,
            isResolved: qa.isResolved || false,
            status: qa.deletedAt ? 'DELETED' : qa.isHidden ? 'HIDDEN' : 'ACTIVE',
            createdAt: qa.createdAt.toISOString(),
        }));
        return {
            success: true,
            questions: formattedQuestions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    async getQA(id) {
        const qa = await user_model_1.prisma.instructorQA.findUnique({
            where: { id },
            include: {
                student: {
                    select: { id: true, username: true, email: true, firstName: true, lastName: true },
                },
                answers: {
                    include: {
                        instructor: {
                            select: { id: true, username: true, email: true, firstName: true, lastName: true },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!qa) {
            throw new Error('Q&A not found');
        }
        return {
            success: true,
            data: {
                id: qa.id,
                question: qa.question,
                student: {
                    id: qa.studentId,
                    name: `${qa.student?.firstName || ''} ${qa.student?.lastName || ''}`.trim() || qa.student?.username || 'Unknown',
                    email: qa.student?.email,
                },
                answers: qa.answers.map((answer) => ({
                    id: answer.id,
                    answer: answer.answer,
                    instructor: {
                        id: answer.instructorId,
                        name: `${answer.instructor?.firstName || ''} ${answer.instructor?.lastName || ''}`.trim() || answer.instructor?.username || 'Unknown',
                        email: answer.instructor?.email,
                    },
                    createdAt: answer.createdAt.toISOString(),
                })),
                createdAt: qa.createdAt.toISOString(),
            },
        };
    }
    async moderateQA(id, data) {
        const updateData = {};
        if (data.status) {
            if (data.status === 'HIDDEN') {
                updateData.isHidden = true;
                updateData.deletedAt = null;
            }
            else if (data.status === 'DELETED') {
                updateData.deletedAt = new Date();
                updateData.isHidden = true;
            }
            else {
                updateData.isHidden = false;
                updateData.deletedAt = null;
            }
        }
        const qa = await user_model_1.prisma.instructorQA.update({
            where: { id },
            data: updateData,
        });
        return {
            success: true,
            data: {
                id: qa.id,
                question: qa.question,
                status: qa.deletedAt ? 'DELETED' : qa.isHidden ? 'HIDDEN' : 'ACTIVE',
                createdAt: qa.createdAt.toISOString(),
            },
        };
    }
    async deleteQA(id) {
        await user_model_1.prisma.instructorQA.update({
            where: { id },
            data: { deletedAt: new Date(), isHidden: true },
        });
        return {
            success: true,
            message: 'Q&A deleted successfully',
        };
    }
    // ============================================================
    // REFERRALS MANAGEMENT
    // ============================================================
    async getReferralSettings() {
        // For now, return default settings. In production, these would be stored in a settings table
        return {
            success: true,
            data: {
                isEnabled: true,
                referrerReward: {
                    type: 'PERCENTAGE',
                    value: 10,
                },
                refereeReward: {
                    type: 'PERCENTAGE',
                    value: 5,
                },
                minPayout: 50,
                terms: 'Referral program terms and conditions',
            },
        };
    }
    async updateReferralSettings(data) {
        // In production, this would update a settings table
        // For now, return the updated settings
        return {
            success: true,
            data: {
                isEnabled: data.isEnabled ?? true,
                referrerReward: data.referrerReward || { type: 'PERCENTAGE', value: 10 },
                refereeReward: data.refereeReward || { type: 'PERCENTAGE', value: 5 },
                minPayout: data.minPayout || 50,
                terms: data.terms || 'Referral program terms and conditions',
            },
        };
    }
    async getReferralStats(options) {
        const where = {};
        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate)
                where.createdAt.gte = options.startDate;
            if (options.endDate)
                where.createdAt.lte = options.endDate;
        }
        const [referrals, earnings] = await Promise.all([
            user_model_1.prisma.referral.findMany({
                where,
                include: {
                    referrer: {
                        select: { id: true, username: true, firstName: true, lastName: true },
                    },
                },
            }),
            user_model_1.prisma.referralEarning.findMany({
                where: options.startDate || options.endDate ? {
                    createdAt: {
                        ...(options.startDate && { gte: options.startDate }),
                        ...(options.endDate && { lte: options.endDate }),
                    },
                } : undefined,
            }),
        ]);
        const totalReferrals = referrals.length;
        const uniqueReferrers = new Set(referrals.map((r) => r.referrerId));
        const totalRewardsPaid = earnings
            .filter((e) => e.status === 'PAID')
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        const pendingRewards = earnings
            .filter((e) => e.status === 'PENDING')
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        // Calculate top referrers
        const referrerStats = new Map();
        referrals.forEach((ref) => {
            const stats = referrerStats.get(ref.referrerId) || { referrals: 0, earnings: 0, name: `${ref.referrer?.firstName || ''} ${ref.referrer?.lastName || ''}`.trim() || ref.referrer?.username || 'Unknown' };
            stats.referrals++;
            referrerStats.set(ref.referrerId, stats);
        });
        earnings.forEach((earning) => {
            const stats = referrerStats.get(earning.userId);
            if (stats) {
                stats.earnings += earning.amount || 0;
            }
        });
        const topReferrers = Array.from(referrerStats.entries())
            .map(([userId, stats]) => ({
            userId,
            name: stats.name,
            referrals: stats.referrals,
            earnings: stats.earnings,
        }))
            .sort((a, b) => b.referrals - a.referrals)
            .slice(0, 10);
        return {
            success: true,
            data: {
                totalReferrals,
                activeReferrers: uniqueReferrers.size,
                totalRewardsPaid,
                pendingRewards,
                topReferrers,
            },
        };
    }
    // ============================================================
    // BUNDLES MANAGEMENT
    // ============================================================
    async getAllBundles(options) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {};
        if (options.search) {
            where.title = { contains: options.search, mode: 'insensitive' };
        }
        const [bundles, total] = await Promise.all([
            user_model_1.prisma.collectionBundle.findMany({
                where,
                skip,
                take: limit,
                include: {
                    items: {
                        include: {
                            collection: {
                                select: { id: true, title: true, price: true },
                            },
                        },
                    },
                    enrollments: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            user_model_1.prisma.collectionBundle.count({ where }),
        ]);
        const formattedBundles = bundles.map((bundle) => {
            const courses = bundle.items.map((item) => item.collection.id);
            const totalPrice = bundle.items.reduce((sum, item) => sum + (item.collection.price || 0), 0);
            const discount = totalPrice > 0 ? ((totalPrice - bundle.price) / totalPrice) * 100 : 0;
            return {
                id: bundle.id,
                name: bundle.title,
                description: bundle.description,
                courses,
                price: bundle.price,
                discount: Math.round(discount),
                isActive: bundle.isActive,
                sales: bundle.enrollments?.length || 0,
                revenue: (bundle.enrollments?.length || 0) * bundle.price,
                createdAt: bundle.createdAt.toISOString(),
            };
        });
        return {
            success: true,
            bundles: formattedBundles,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    async getBundle(id) {
        const bundle = await user_model_1.prisma.collectionBundle.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        collection: {
                            select: { id: true, title: true, description: true, price: true },
                        },
                    },
                    orderBy: { order: 'asc' },
                },
            },
        });
        if (!bundle) {
            throw new Error('Bundle not found');
        }
        return {
            success: true,
            data: {
                id: bundle.id,
                name: bundle.title,
                description: bundle.description,
                courses: bundle.items.map((item) => ({
                    id: item.collection.id,
                    title: item.collection.title,
                    description: item.collection.description,
                    price: item.collection.price,
                })),
                price: bundle.price,
                isActive: bundle.isActive,
                createdAt: bundle.createdAt.toISOString(),
            },
        };
    }
    async createBundle(data) {
        // Calculate discount if not provided
        const courses = await user_model_1.prisma.collection.findMany({
            where: { id: { in: data.courseIds } },
            select: { id: true, price: true },
        });
        const totalPrice = courses.reduce((sum, c) => sum + (c.price || 0), 0);
        const finalPrice = data.price || (data.discount ? totalPrice * (1 - data.discount / 100) : totalPrice);
        const bundle = await user_model_1.prisma.collectionBundle.create({
            data: {
                title: data.name,
                description: data.description,
                price: finalPrice,
                isActive: data.isActive ?? true,
                items: {
                    create: data.courseIds.map((courseId, index) => ({
                        collectionId: courseId,
                        order: index,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        collection: true,
                    },
                },
            },
        });
        return {
            success: true,
            data: {
                id: bundle.id,
                name: bundle.title,
                description: bundle.description,
                courses: bundle.items.map((item) => item.collection.id),
                price: bundle.price,
                isActive: bundle.isActive,
                createdAt: bundle.createdAt.toISOString(),
            },
        };
    }
    async updateBundle(id, data) {
        const updateData = {};
        if (data.name)
            updateData.title = data.name;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.price !== undefined)
            updateData.price = data.price;
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        // Update courses if provided
        if (data.courseIds) {
            // Delete existing items
            await user_model_1.prisma.collectionBundleItem.deleteMany({
                where: { bundleId: id },
            });
            // Create new items
            await user_model_1.prisma.collectionBundleItem.createMany({
                data: data.courseIds.map((courseId, index) => ({
                    bundleId: id,
                    collectionId: courseId,
                    order: index,
                })),
            });
        }
        const bundle = await user_model_1.prisma.collectionBundle.update({
            where: { id },
            data: updateData,
            include: {
                items: {
                    include: {
                        collection: true,
                    },
                },
            },
        });
        return {
            success: true,
            data: {
                id: bundle.id,
                name: bundle.title,
                description: bundle.description,
                courses: bundle.items.map((item) => item.collection.id),
                price: bundle.price,
                isActive: bundle.isActive,
                createdAt: bundle.createdAt.toISOString(),
                updatedAt: bundle.updatedAt.toISOString(),
            },
        };
    }
    async deleteBundle(id) {
        await user_model_1.prisma.collectionBundle.delete({
            where: { id },
        });
        return {
            success: true,
            message: 'Bundle deleted successfully',
        };
    }
    // ============================================================
    // CERTIFICATE TEMPLATES MANAGEMENT
    // ============================================================
    async getAllCertificateTemplates() {
        const templates = await user_model_1.prisma.certificateTemplate.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return {
            success: true,
            templates: templates.map((t) => ({
                id: t.id,
                name: t.name,
                description: t.design?.description || '',
                template: JSON.stringify(t.design),
                variables: t.fields,
                isDefault: t.isDefault,
                createdAt: t.createdAt.toISOString(),
            })),
        };
    }
    async getCertificateTemplate(id) {
        const template = await user_model_1.prisma.certificateTemplate.findUnique({
            where: { id },
        });
        if (!template) {
            throw new Error('Certificate template not found');
        }
        return {
            success: true,
            data: {
                id: template.id,
                name: template.name,
                description: template.design?.description || '',
                template: JSON.stringify(template.design),
                variables: template.fields,
                isDefault: template.isDefault,
                createdAt: template.createdAt.toISOString(),
                updatedAt: template.updatedAt.toISOString(),
            },
        };
    }
    async createCertificateTemplate(data) {
        let design;
        try {
            design = JSON.parse(data.template);
        }
        catch {
            design = { html: data.template };
        }
        const template = await user_model_1.prisma.certificateTemplate.create({
            data: {
                name: data.name,
                design,
                fields: data.variables,
                isDefault: false,
                isActive: true,
            },
        });
        return {
            success: true,
            data: {
                id: template.id,
                name: template.name,
                description: template.design?.description || '',
                template: JSON.stringify(template.design),
                variables: template.fields,
                isDefault: template.isDefault,
                createdAt: template.createdAt.toISOString(),
            },
        };
    }
    async updateCertificateTemplate(id, data) {
        const updateData = {};
        if (data.name)
            updateData.name = data.name;
        if (data.variables)
            updateData.fields = data.variables;
        if (data.template) {
            try {
                updateData.design = JSON.parse(data.template);
            }
            catch {
                updateData.design = { html: data.template };
            }
        }
        const template = await user_model_1.prisma.certificateTemplate.update({
            where: { id },
            data: updateData,
        });
        return {
            success: true,
            data: {
                id: template.id,
                name: template.name,
                description: template.design?.description || '',
                template: JSON.stringify(template.design),
                variables: template.fields,
                isDefault: template.isDefault,
                createdAt: template.createdAt.toISOString(),
                updatedAt: template.updatedAt.toISOString(),
            },
        };
    }
    async deleteCertificateTemplate(id) {
        await user_model_1.prisma.certificateTemplate.delete({
            where: { id },
        });
        return {
            success: true,
            message: 'Template deleted successfully',
        };
    }
    // ============================================================
    // WHITEBOARDS MANAGEMENT
    // ============================================================
    async getAllWhiteboards(options) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {};
        if (options.search) {
            where.name = { contains: options.search, mode: 'insensitive' };
        }
        const [whiteboards, total] = await Promise.all([
            user_model_1.prisma.whiteboard.findMany({
                where,
                skip,
                take: limit,
                include: {
                    creator: {
                        select: { id: true, username: true, firstName: true, lastName: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            user_model_1.prisma.whiteboard.count({ where }),
        ]);
        const formattedWhiteboards = whiteboards.map((wb) => ({
            id: wb.id,
            name: wb.title || 'Untitled',
            owner: {
                id: wb.createdBy,
                name: `${wb.creator?.firstName || ''} ${wb.creator?.lastName || ''}`.trim() || wb.creator?.username || 'Unknown',
            },
            courseId: wb.collectionId,
            size: 0, // Whiteboard size not available in schema
            createdAt: wb.createdAt.toISOString(),
            lastAccessed: wb.updatedAt.toISOString(),
        }));
        return {
            success: true,
            whiteboards: formattedWhiteboards,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    async deleteWhiteboard(id) {
        await user_model_1.prisma.whiteboard.delete({
            where: { id },
        });
        return {
            success: true,
            message: 'Whiteboard deleted successfully',
        };
    }
    // ============================================================
    // BANNERS MANAGEMENT
    // ============================================================
    async getAllBanners() {
        const banners = await user_model_1.prisma.banner.findMany({
            orderBy: { priority: 'desc' },
        });
        return {
            success: true,
            banners: banners.map((b) => ({
                id: b.id,
                title: b.title,
                image: b.imageUrl,
                link: b.linkUrl,
                position: b.position.toUpperCase(),
                isActive: b.isActive,
                startDate: b.startDate?.toISOString(),
                endDate: b.endDate?.toISOString(),
                targetAudience: (b.targetAudience || 'ALL').toUpperCase(),
                clicks: b.clicks || 0,
                impressions: b.impressions || 0,
                createdAt: b.createdAt.toISOString(),
            })),
        };
    }
    async getBanner(id) {
        const banner = await user_model_1.prisma.banner.findUnique({
            where: { id },
        });
        if (!banner) {
            throw new Error('Banner not found');
        }
        return {
            success: true,
            data: {
                id: banner.id,
                title: banner.title,
                image: banner.imageUrl,
                link: banner.linkUrl,
                position: banner.position.toUpperCase(),
                isActive: banner.isActive,
                startDate: banner.startDate?.toISOString(),
                endDate: banner.endDate?.toISOString(),
                targetAudience: (banner.targetAudience || 'ALL').toUpperCase(),
                clicks: banner.clicks || 0,
                impressions: banner.impressions || 0,
                createdAt: banner.createdAt.toISOString(),
                updatedAt: banner.updatedAt.toISOString(),
            },
        };
    }
    async createBanner(data) {
        const banner = await user_model_1.prisma.banner.create({
            data: {
                title: data.title,
                imageUrl: data.image,
                linkUrl: data.link,
                position: data.position.toLowerCase(),
                isActive: data.isActive ?? true,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
                targetAudience: data.targetAudience?.toLowerCase() || 'all',
            },
        });
        return {
            success: true,
            data: {
                id: banner.id,
                title: banner.title,
                image: banner.imageUrl,
                link: banner.linkUrl,
                position: banner.position.toUpperCase(),
                isActive: banner.isActive,
                startDate: banner.startDate?.toISOString(),
                endDate: banner.endDate?.toISOString(),
                targetAudience: (banner.targetAudience || 'ALL').toUpperCase(),
                createdAt: banner.createdAt.toISOString(),
            },
        };
    }
    async updateBanner(id, data) {
        const updateData = {};
        if (data.title)
            updateData.title = data.title;
        if (data.link !== undefined)
            updateData.linkUrl = data.link;
        if (data.position)
            updateData.position = data.position.toLowerCase();
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        if (data.startDate !== undefined)
            updateData.startDate = data.startDate ? new Date(data.startDate) : null;
        if (data.endDate !== undefined)
            updateData.endDate = data.endDate ? new Date(data.endDate) : null;
        if (data.targetAudience)
            updateData.targetAudience = data.targetAudience.toLowerCase();
        const banner = await user_model_1.prisma.banner.update({
            where: { id },
            data: updateData,
        });
        return {
            success: true,
            data: {
                id: banner.id,
                title: banner.title,
                image: banner.imageUrl,
                link: banner.linkUrl,
                position: banner.position.toUpperCase(),
                isActive: banner.isActive,
                startDate: banner.startDate?.toISOString(),
                endDate: banner.endDate?.toISOString(),
                targetAudience: (banner.targetAudience || 'ALL').toUpperCase(),
                createdAt: banner.createdAt.toISOString(),
                updatedAt: banner.updatedAt.toISOString(),
            },
        };
    }
    async deleteBanner(id) {
        await user_model_1.prisma.banner.delete({
            where: { id },
        });
        return {
            success: true,
            message: 'Banner deleted successfully',
        };
    }
}
exports.AdminPlatformService = AdminPlatformService;

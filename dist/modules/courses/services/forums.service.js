"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForumsService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
class ForumsService {
    /**
     * Create a forum post
     */
    async createPost(data) {
        const post = await prisma_1.prisma.forumPost.create({
            data: {
                programId: data.collectionId,
                authorId: data.authorId,
                title: data.title,
                content: data.content,
            },
            include: {
                program: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                author: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        await (0, cache_1.deleteCache)(`collection:${data.collectionId}`);
        return this.mapPostToDto(post);
    }
    /**
     * Get forum posts for a course
     */
    async getCoursePosts(collectionId, page = 1, limit = 20, search) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const where = { collectionId };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [posts, total] = await Promise.all([
            prisma_1.prisma.forumPost.findMany({
                where,
                skip,
                take,
                include: {
                    program: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    author: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
                orderBy: [
                    { isPinned: 'desc' },
                    { lastReplyAt: 'desc' },
                    { createdAt: 'desc' },
                ],
            }),
            prisma_1.prisma.forumPost.count({ where }),
        ]);
        return {
            data: posts.map(this.mapPostToDto),
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        };
    }
    /**
     * Get post by ID
     */
    async getPostById(postId) {
        const post = await prisma_1.prisma.forumPost.findUnique({
            where: { id: postId },
            include: {
                program: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                author: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        if (!post) {
            throw new Error('Post not found');
        }
        // Increment view count
        await prisma_1.prisma.forumPost.update({
            where: { id: postId },
            data: { viewCount: { increment: 1 } },
        });
        return this.mapPostToDto({
            ...post,
            viewCount: post.viewCount + 1,
        });
    }
    /**
     * Create a reply
     */
    async createReply(data) {
        const post = await prisma_1.prisma.forumPost.findUnique({
            where: { id: data.postId },
        });
        if (!post) {
            throw new Error('Post not found');
        }
        if (post.isLocked) {
            throw new Error('This post is locked');
        }
        const reply = await prisma_1.prisma.forumReply.create({
            data: {
                postId: data.postId,
                authorId: data.authorId,
                content: data.content,
                parentId: data.parentId,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        // Update post reply count and last reply time
        await prisma_1.prisma.forumPost.update({
            where: { id: data.postId },
            data: {
                replyCount: { increment: 1 },
                lastReplyAt: new Date(),
            },
        });
        return this.mapReplyToDto(reply);
    }
    /**
     * Get replies for a post
     */
    async getPostReplies(postId) {
        const replies = await prisma_1.prisma.forumReply.findMany({
            where: { postId, parentId: null },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                replies: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            },
                        },
                        replies: {
                            include: {
                                author: {
                                    select: {
                                        id: true,
                                        username: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: [
                { isBestAnswer: 'desc' },
                { upvoteCount: 'desc' },
                { createdAt: 'asc' },
            ],
        });
        return replies.map((r) => this.mapReplyToDto(r, true));
    }
    /**
     * Upvote a post or reply
     */
    async upvote(postId, replyId, userId) {
        if (!postId && !replyId) {
            throw new Error('Either postId or replyId must be provided');
        }
        if (postId) {
            const existing = await prisma_1.prisma.forumUpvote.findFirst({
                where: { postId, userId },
            });
            if (existing) {
                await prisma_1.prisma.forumUpvote.delete({
                    where: { id: existing.id },
                });
            }
            else {
                await prisma_1.prisma.forumUpvote.create({
                    data: { postId, userId },
                });
            }
            const upvoteCount = await prisma_1.prisma.forumUpvote.count({
                where: { postId },
            });
            await prisma_1.prisma.forumPost.update({
                where: { id: postId },
                data: { upvoteCount },
            });
            return upvoteCount;
        }
        else {
            const existing = await prisma_1.prisma.forumUpvote.findFirst({
                where: { replyId, userId },
            });
            if (existing) {
                await prisma_1.prisma.forumUpvote.delete({
                    where: { id: existing.id },
                });
            }
            else {
                await prisma_1.prisma.forumUpvote.create({
                    data: { replyId, userId },
                });
            }
            const upvoteCount = await prisma_1.prisma.forumUpvote.count({
                where: { replyId },
            });
            await prisma_1.prisma.forumReply.update({
                where: { id: replyId },
                data: { upvoteCount },
            });
            return upvoteCount;
        }
    }
    /**
     * Mark best answer
     */
    async markBestAnswer(postId, replyId, instructorId) {
        const post = await prisma_1.prisma.forumPost.findUnique({
            where: { id: postId },
            include: {
                program: {
                    select: {
                        instructorId: true,
                    },
                },
            },
        });
        if (!post) {
            throw new Error('Post not found');
        }
        if (post.program?.instructorId !== instructorId) {
            throw new Error('Only the collection instructor can mark best answer');
        }
        const reply = await prisma_1.prisma.forumReply.findFirst({
            where: { id: replyId, postId },
        });
        if (!reply) {
            throw new Error('Reply not found');
        }
        // Unmark previous best answer if any
        if (post.bestAnswerId) {
            await prisma_1.prisma.forumReply.update({
                where: { id: post.bestAnswerId },
                data: { isBestAnswer: false },
            });
        }
        // Mark new best answer
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.forumReply.update({
                where: { id: replyId },
                data: { isBestAnswer: true },
            }),
            prisma_1.prisma.forumPost.update({
                where: { id: postId },
                data: {
                    bestAnswerId: replyId,
                    isResolved: true,
                },
            }),
        ]);
    }
    /**
     * Pin/unpin a post (Teacher/Admin only)
     */
    async togglePin(postId, isPinned) {
        const post = await prisma_1.prisma.forumPost.update({
            where: { id: postId },
            data: { isPinned },
            include: {
                program: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                author: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        return this.mapPostToDto(post);
    }
    /**
     * Lock/unlock a post (Teacher/Admin only)
     */
    async toggleLock(postId, isLocked) {
        const post = await prisma_1.prisma.forumPost.update({
            where: { id: postId },
            data: { isLocked },
            include: {
                program: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                author: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        return this.mapPostToDto(post);
    }
    /**
     * Map Prisma model to DTO
     */
    mapPostToDto(post) {
        return {
            id: post.id,
            collectionId: post.programId, // Backward compatibility
            collection: post.program, // Backward compatibility
            authorId: post.authorId,
            author: post.author,
            title: post.title,
            content: post.content,
            isPinned: post.isPinned,
            isLocked: post.isLocked,
            isResolved: post.isResolved,
            bestAnswerId: post.bestAnswerId || undefined,
            upvoteCount: post.upvoteCount,
            replyCount: post.replyCount,
            viewCount: post.viewCount,
            lastReplyAt: post.lastReplyAt || undefined,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
        };
    }
    /**
     * Map Prisma model to DTO (recursive for nested replies)
     */
    mapReplyToDto(reply, includeReplies = false) {
        return {
            id: reply.id,
            postId: reply.postId,
            authorId: reply.authorId,
            author: reply.author,
            content: reply.content,
            parentId: reply.parentId || undefined,
            replies: includeReplies && reply.replies
                ? reply.replies.map((r) => this.mapReplyToDto(r, true))
                : [],
            upvoteCount: reply.upvoteCount,
            isBestAnswer: reply.isBestAnswer,
            createdAt: reply.createdAt,
            updatedAt: reply.updatedAt,
        };
    }
}
exports.ForumsService = ForumsService;

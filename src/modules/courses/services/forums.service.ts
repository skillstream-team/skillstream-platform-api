import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface CreateForumPostDto {
  collectionId: string;
  authorId: string;
  title: string;
  content: string;
}

export interface CreateForumReplyDto {
  postId: string;
  authorId: string;
  content: string;
  parentId?: string;
}

export interface ForumPostResponseDto {
  id: string;
  collectionId: string;
  collection: {
    id: string;
    title: string;
  };
  authorId: string;
  author: {
    id: string;
    username: string;
    email: string;
  };
  title: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  isResolved: boolean;
  bestAnswerId?: string;
  upvoteCount: number;
  replyCount: number;
  viewCount: number;
  lastReplyAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ForumReplyResponseDto {
  id: string;
  postId: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    email: string;
  };
  content: string;
  parentId?: string;
  replies: ForumReplyResponseDto[];
  upvoteCount: number;
  isBestAnswer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ForumsService {
  /**
   * Create a forum post
   */
  async createPost(data: CreateForumPostDto): Promise<ForumPostResponseDto> {
    const post = await prisma.forumPost.create({
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

    await deleteCache(`collection:${data.collectionId}`);

    return this.mapPostToDto(post);
  }

  /**
   * Get forum posts for a course
   */
  async getCoursePosts(
    collectionId: string,
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{
    data: ForumPostResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const where: any = { collectionId };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
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
      prisma.forumPost.count({ where }),
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
  async getPostById(postId: string): Promise<ForumPostResponseDto> {
    const post = await prisma.forumPost.findUnique({
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
    await prisma.forumPost.update({
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
  async createReply(data: CreateForumReplyDto): Promise<ForumReplyResponseDto> {
    const post = await prisma.forumPost.findUnique({
      where: { id: data.postId },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.isLocked) {
      throw new Error('This post is locked');
    }

    const reply = await prisma.forumReply.create({
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
    await prisma.forumPost.update({
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
  async getPostReplies(postId: string): Promise<ForumReplyResponseDto[]> {
    const replies = await prisma.forumReply.findMany({
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
  async upvote(
    postId: string | null,
    replyId: string | null,
    userId: string
  ): Promise<number> {
    if (!postId && !replyId) {
      throw new Error('Either postId or replyId must be provided');
    }

    if (postId) {
      const existing = await prisma.forumUpvote.findFirst({
        where: { postId, userId },
      });

      if (existing) {
        await prisma.forumUpvote.delete({
          where: { id: existing.id },
        });
      } else {
        await prisma.forumUpvote.create({
          data: { postId, userId },
        });
      }

      const upvoteCount = await prisma.forumUpvote.count({
        where: { postId },
      });

      await prisma.forumPost.update({
        where: { id: postId },
        data: { upvoteCount },
      });

      return upvoteCount;
    } else {
      const existing = await prisma.forumUpvote.findFirst({
        where: { replyId, userId },
      });

      if (existing) {
        await prisma.forumUpvote.delete({
          where: { id: existing.id },
        });
      } else {
        await prisma.forumUpvote.create({
          data: { replyId, userId },
        });
      }

      const upvoteCount = await prisma.forumUpvote.count({
        where: { replyId },
      });

      await prisma.forumReply.update({
        where: { id: replyId! },
        data: { upvoteCount },
      });

      return upvoteCount;
    }
  }

  /**
   * Mark best answer
   */
  async markBestAnswer(
    postId: string,
    replyId: string,
    instructorId: string
  ): Promise<void> {
    const post = await prisma.forumPost.findUnique({
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

    const reply = await prisma.forumReply.findFirst({
      where: { id: replyId, postId },
    });

    if (!reply) {
      throw new Error('Reply not found');
    }

    // Unmark previous best answer if any
    if (post.bestAnswerId) {
      await prisma.forumReply.update({
        where: { id: post.bestAnswerId },
        data: { isBestAnswer: false },
      });
    }

    // Mark new best answer
    await prisma.$transaction([
      prisma.forumReply.update({
        where: { id: replyId },
        data: { isBestAnswer: true },
      }),
      prisma.forumPost.update({
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
  async togglePin(postId: string, isPinned: boolean): Promise<ForumPostResponseDto> {
    const post = await prisma.forumPost.update({
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
  async toggleLock(postId: string, isLocked: boolean): Promise<ForumPostResponseDto> {
    const post = await prisma.forumPost.update({
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
  private mapPostToDto(post: any): ForumPostResponseDto {
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
  private mapReplyToDto(reply: any, includeReplies: boolean = false): ForumReplyResponseDto {
    return {
      id: reply.id,
      postId: reply.postId,
      authorId: reply.authorId,
      author: reply.author,
      content: reply.content,
      parentId: reply.parentId || undefined,
      replies: includeReplies && reply.replies
        ? reply.replies.map((r: any) => this.mapReplyToDto(r, true))
        : [],
      upvoteCount: reply.upvoteCount,
      isBestAnswer: reply.isBestAnswer,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
    };
  }
}

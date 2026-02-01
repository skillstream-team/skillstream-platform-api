import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export class TagsService {
  /**
   * Add tags to a course
   */
  async addTagsToProgram(programId: string, tags: string[]): Promise<void> {
    const uniqueTags = [...new Set(tags.map((t) => t.toLowerCase().trim()))];

    await prisma.$transaction(
      uniqueTags.map((tag) =>
        prisma.programTag.upsert({
          where: {
            programId_name: {
              programId,
              name: tag,
            },
          },
          update: {},
          create: {
            programId,
            name: tag,
          },
        })
      )
    );

    await deleteCache(`program:${programId}`);
  }

  /**
   * Remove tags from a program
   */
  async removeTagsFromProgram(programId: string, tags: string[]): Promise<void> {
    await prisma.programTag.deleteMany({
      where: {
        programId,
        name: { in: tags.map((t) => t.toLowerCase().trim()) },
      },
    });

    await deleteCache(`program:${programId}`);
  }

  /**
   * Get all tags for a program
   */
  async getProgramTags(programId: string): Promise<string[]> {
    const tags = await prisma.programTag.findMany({
      where: { programId },
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    return tags.map((t) => t.name);
  }

  /**
   * Get all unique tags across platform
   */
  async getAllTags(): Promise<Array<{ name: string; count: number }>> {
    const tags = await prisma.programTag.groupBy({
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

    return tags.map((t: any) => ({
      name: t.name,
      count: t._count.name,
    }));
  }

  /**
   * Get courses by tag
   */
  async getCoursesByTag(tag: string, page: number = 1, limit: number = 20): Promise<{
    data: Array<{
      id: string;
      title: string;
      thumbnailUrl?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const [courses, total] = await Promise.all([
      prisma.program.findMany({
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
      prisma.program.count({
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
      data: courses.map((c: any) => ({
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

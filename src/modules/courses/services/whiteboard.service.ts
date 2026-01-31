import {
  CreateWhiteboardDto,
  UpdateWhiteboardDto,
  WhiteboardResponseDto,
  CreateWhiteboardActionDto,
  WhiteboardActionResponseDto,
  WhiteboardWithActionsDto,
} from '../dtos/whiteboard.dto';
import { prisma } from '../../../utils/prisma';

export class WhiteboardService {
  /**
   * Create a new whiteboard
   */
  async createWhiteboard(data: CreateWhiteboardDto, userId: string): Promise<WhiteboardResponseDto> {
    // Validate program or liveStream exists
    if (data.courseId) {
      const course = await prisma.program.findUnique({
        where: { id: data.courseId },
      });
      if (!course) {
        throw new Error('Program not found');
      }
    }

    if (data.liveStreamId) {
      const stream = await prisma.liveStream.findUnique({
        where: { id: data.liveStreamId },
      });
      if (!stream) {
        throw new Error('Live stream not found');
      }
    }

    const whiteboard = await prisma.whiteboard.create({
      data: {
        programId: data.courseId,
        liveStreamId: data.liveStreamId,
        title: data.title,
        description: data.description,
        backgroundColor: data.backgroundColor || '#FFFFFF',
        width: data.width || 1920,
        height: data.height || 1080,
        isPublic: data.isPublic || false,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            actions: true,
          },
        },
      },
    });

    return this.mapToResponseDto(whiteboard);
  }

  /**
   * Get whiteboard by ID
   */
  async getWhiteboardById(id: string, includeActions: boolean = false): Promise<WhiteboardWithActionsDto | WhiteboardResponseDto> {
    const whiteboard = await prisma.whiteboard.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        actions: includeActions
          ? {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
              orderBy: { timestamp: 'asc' },
            }
          : false,
        _count: {
          select: {
            actions: true,
          },
        },
      },
    });

    if (!whiteboard) {
      throw new Error('Whiteboard not found');
    }

    const response = this.mapToResponseDto(whiteboard);
    
    if (includeActions && 'actions' in whiteboard) {
      return {
        ...response,
        actions: whiteboard.actions.map(this.mapActionToResponseDto),
      } as WhiteboardWithActionsDto;
    }

    return response;
  }

  /**
   * Get whiteboards for a course
   */
  async getCollectionWhiteboards(courseId: string, page: number = 1, limit: number = 20): Promise<{
    data: WhiteboardResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const [whiteboards, total] = await Promise.all([
      prisma.whiteboard.findMany({
        where: { programId: courseId },
        skip,
        take,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          _count: {
            select: {
              actions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.whiteboard.count({ where: { programId: courseId } }),
    ]);

    return {
      data: whiteboards.map(this.mapToResponseDto),
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
   * Get whiteboards for a live stream
   */
  async getStreamWhiteboards(liveStreamId: string): Promise<WhiteboardResponseDto[]> {
    const whiteboards = await prisma.whiteboard.findMany({
      where: { liveStreamId, isActive: true },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            actions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return whiteboards.map(this.mapToResponseDto);
  }

  /**
   * Update whiteboard
   */
  async updateWhiteboard(id: string, userId: string, data: UpdateWhiteboardDto): Promise<WhiteboardResponseDto> {
    // Check if user has permission
    const whiteboard = await prisma.whiteboard.findFirst({
      where: { id, createdBy: userId },
    });

    if (!whiteboard) {
      throw new Error('Whiteboard not found or you do not have permission to update it');
    }

    const updated = await prisma.whiteboard.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.backgroundColor && { backgroundColor: data.backgroundColor }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            actions: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Delete whiteboard
   */
  async deleteWhiteboard(id: string, userId: string): Promise<void> {
    const whiteboard = await prisma.whiteboard.findFirst({
      where: { id, createdBy: userId },
    });

    if (!whiteboard) {
      throw new Error('Whiteboard not found or you do not have permission to delete it');
    }

    await prisma.whiteboard.delete({
      where: { id },
    });
  }

  /**
   * Add action to whiteboard
   */
  async addAction(data: CreateWhiteboardActionDto, userId: string): Promise<WhiteboardActionResponseDto> {
    // Verify whiteboard exists and is active
    const whiteboard = await prisma.whiteboard.findUnique({
      where: { id: data.whiteboardId },
    });

    if (!whiteboard) {
      throw new Error('Whiteboard not found');
    }

    if (!whiteboard.isActive) {
      throw new Error('Whiteboard is not active');
    }

    // Check permissions (public or user is creator)
    if (!whiteboard.isPublic && whiteboard.createdBy !== userId) {
      throw new Error('You do not have permission to draw on this whiteboard');
    }

    const action = await prisma.whiteboardAction.create({
      data: {
        whiteboardId: data.whiteboardId,
        userId,
        actionType: data.actionType,
        data: data.data as any,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return this.mapActionToResponseDto(action);
  }

  /**
   * Get whiteboard actions
   */
  async getWhiteboardActions(whiteboardId: string, limit: number = 1000): Promise<WhiteboardActionResponseDto[]> {
    const actions = await prisma.whiteboardAction.findMany({
      where: { whiteboardId },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    return actions.map(this.mapActionToResponseDto);
  }

  /**
   * Clear whiteboard (delete all actions)
   */
  async clearWhiteboard(whiteboardId: string, userId: string): Promise<void> {
    const whiteboard = await prisma.whiteboard.findFirst({
      where: { id: whiteboardId, createdBy: userId },
    });

    if (!whiteboard) {
      throw new Error('Whiteboard not found or you do not have permission to clear it');
    }

    await prisma.whiteboardAction.deleteMany({
      where: { whiteboardId },
    });
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToResponseDto(whiteboard: any): WhiteboardResponseDto {
    return {
      id: whiteboard.id,
      courseId: whiteboard.programId,
      liveStreamId: whiteboard.liveStreamId,
      title: whiteboard.title,
      description: whiteboard.description,
      createdBy: whiteboard.createdBy,
      creator: whiteboard.creator,
      isActive: whiteboard.isActive,
      isPublic: whiteboard.isPublic,
      backgroundColor: whiteboard.backgroundColor,
      width: whiteboard.width,
      height: whiteboard.height,
      actionCount: whiteboard._count?.actions || 0,
      createdAt: whiteboard.createdAt,
      updatedAt: whiteboard.updatedAt,
    };
  }

  /**
   * Map action to DTO
   */
  private mapActionToResponseDto(action: any): WhiteboardActionResponseDto {
    return {
      id: action.id,
      whiteboardId: action.whiteboardId,
      userId: action.userId,
      user: action.user,
      actionType: action.actionType,
      data: action.data,
      timestamp: action.timestamp,
      createdAt: action.createdAt,
    };
  }
}

import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface CreateStudyGroupDto {
  collectionId?: string;
  name: string;
  description?: string;
  createdBy: string;
  maxMembers?: number;
  isPublic?: boolean;
}

export interface StudyGroupDto {
  id: string;
  collectionId?: string;
  collection?: {
    id: string;
    title: string;
  };
  name: string;
  description?: string;
  createdBy: string;
  creator: {
    id: string;
    username: string;
  };
  maxMembers: number;
  isPublic: boolean;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGroupProjectDto {
  groupId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  createdBy: string;
}

export interface GroupProjectDto {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSharedWorkspaceDto {
  groupId?: string;
  collectionId?: string;
  userId: string;
  name: string;
  description?: string;
  type: 'document' | 'whiteboard' | 'code';
  content?: any;
  isPublic?: boolean;
}

export interface SharedWorkspaceDto {
  id: string;
  groupId?: string;
  collectionId?: string;
  userId: string;
  user: {
    id: string;
    username: string;
  };
  name: string;
  description?: string;
  type: string;
  content?: any;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CollaborationService {
  /**
   * Create a study group
   */
  async createStudyGroup(data: CreateStudyGroupDto): Promise<StudyGroupDto> {
    const group = await prisma.studyGroup.create({
      data: {
        programId: data.collectionId,
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        maxMembers: data.maxMembers || 10,
        isPublic: data.isPublic !== false,
      },
      include: {
        program: {
          select: {
            id: true,
            title: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
        members: true,
      },
    });

    // Add creator as admin member
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: data.createdBy,
        role: 'admin',
      },
    });

    return this.mapGroupToDto(group);
  }

  /**
   * Get study groups
   */
  async getStudyGroups(
    collectionId?: string,
    userId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: StudyGroupDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const where: any = {};
    if (collectionId) where.collectionId = collectionId;
    if (userId) {
      where.OR = [
        { isPublic: true },
        { members: { some: { userId } } },
        { createdBy: userId },
      ];
    } else {
      where.isPublic = true;
    }

    const [groups, total] = await Promise.all([
      prisma.studyGroup.findMany({
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
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
          members: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.studyGroup.count({ where }),
    ]);

    return {
      data: groups.map(this.mapGroupToDto),
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Join a study group
   */
  async joinStudyGroup(groupId: string, userId: string): Promise<void> {
    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      throw new Error('Study group not found');
    }

    if (group.members.length >= group.maxMembers) {
      throw new Error('Study group is full');
    }

    const existing = group.members.find((m) => m.userId === userId);
    if (existing) {
      throw new Error('Already a member of this group');
    }

    await prisma.groupMember.create({
      data: {
        groupId,
        userId,
        role: 'member',
      },
    });
  }

  /**
   * Leave a study group
   */
  async leaveStudyGroup(groupId: string, userId: string): Promise<void> {
    const member = await prisma.groupMember.findFirst({
      where: { groupId, userId },
    });

    if (!member) {
      throw new Error('Not a member of this group');
    }

    await prisma.groupMember.delete({
      where: { id: member.id },
    });
  }

  /**
   * Create a group project
   */
  async createGroupProject(data: CreateGroupProjectDto): Promise<GroupProjectDto> {
    // Verify user is a member of the group
    const member = await prisma.groupMember.findFirst({
      where: { groupId: data.groupId, userId: data.createdBy },
    });

    if (!member) {
      throw new Error('You must be a member of the group to create projects');
    }

    const project = await prisma.groupProject.create({
      data: {
        groupId: data.groupId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        createdBy: data.createdBy,
        status: 'planning',
      },
    });

    return this.mapProjectToDto(project);
  }

  /**
   * Get group projects
   */
  async getGroupProjects(groupId: string): Promise<GroupProjectDto[]> {
    const projects = await prisma.groupProject.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map(this.mapProjectToDto);
  }

  /**
   * Create a shared workspace
   */
  async createSharedWorkspace(data: CreateSharedWorkspaceDto): Promise<SharedWorkspaceDto> {
    const workspace = await prisma.sharedWorkspace.create({
      data: {
        groupId: data.groupId,
        programId: data.collectionId,
        userId: data.userId,
        name: data.name,
        description: data.description,
        type: data.type,
        content: data.content as any,
        isPublic: data.isPublic || false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return this.mapWorkspaceToDto(workspace);
  }

  /**
   * Get shared workspaces
   */
  async getSharedWorkspaces(
    groupId?: string,
    collectionId?: string,
    userId?: string
  ): Promise<SharedWorkspaceDto[]> {
    const where: any = {};
    if (groupId) where.groupId = groupId;
    if (collectionId) where.collectionId = collectionId;
    if (userId) {
      where.OR = [
        { userId },
        { isPublic: true },
      ];
    } else {
      where.isPublic = true;
    }

    const workspaces = await prisma.sharedWorkspace.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return workspaces.map(this.mapWorkspaceToDto);
  }

  /**
   * Update shared workspace
   */
  async updateSharedWorkspace(
    workspaceId: string,
    userId: string,
    data: Partial<CreateSharedWorkspaceDto>
  ): Promise<SharedWorkspaceDto> {
    const workspace = await prisma.sharedWorkspace.findFirst({
      where: { id: workspaceId, userId },
    });

    if (!workspace) {
      throw new Error('Workspace not found or unauthorized');
    }

    const updated = await prisma.sharedWorkspace.update({
      where: { id: workspaceId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.content !== undefined && { content: data.content as any }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return this.mapWorkspaceToDto(updated);
  }

  /**
   * Map Prisma model to DTO
   */
  private mapGroupToDto(group: any): StudyGroupDto {
    return {
      id: group.id,
      collectionId: group.collectionId || undefined,
      collection: group.collection || undefined,
      name: group.name,
      description: group.description || undefined,
      createdBy: group.createdBy,
      creator: group.creator,
      maxMembers: group.maxMembers,
      isPublic: group.isPublic,
      memberCount: group.members?.length || 0,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  private mapProjectToDto(project: any): GroupProjectDto {
    return {
      id: project.id,
      groupId: project.groupId,
      title: project.title,
      description: project.description || undefined,
      dueDate: project.dueDate || undefined,
      status: project.status,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private mapWorkspaceToDto(workspace: any): SharedWorkspaceDto {
    return {
      id: workspace.id,
      groupId: workspace.groupId || undefined,
      collectionId: workspace.collectionId || undefined,
      userId: workspace.userId,
      user: workspace.user,
      name: workspace.name,
      description: workspace.description || undefined,
      type: workspace.type,
      content: workspace.content,
      isPublic: workspace.isPublic,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }
}

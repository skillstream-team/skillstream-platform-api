"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationService = void 0;
const prisma_1 = require("../../../utils/prisma");
class CollaborationService {
    /**
     * Create a study group
     */
    async createStudyGroup(data) {
        const group = await prisma_1.prisma.studyGroup.create({
            data: {
                collectionId: data.collectionId,
                name: data.name,
                description: data.description,
                createdBy: data.createdBy,
                maxMembers: data.maxMembers || 10,
                isPublic: data.isPublic !== false,
            },
            include: {
                collection: {
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
        await prisma_1.prisma.groupMember.create({
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
    async getStudyGroups(collectionId, userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const where = {};
        if (collectionId)
            where.collectionId = collectionId;
        if (userId) {
            where.OR = [
                { isPublic: true },
                { members: { some: { userId } } },
                { createdBy: userId },
            ];
        }
        else {
            where.isPublic = true;
        }
        const [groups, total] = await Promise.all([
            prisma_1.prisma.studyGroup.findMany({
                where,
                skip,
                take,
                include: {
                    collection: {
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
            prisma_1.prisma.studyGroup.count({ where }),
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
    async joinStudyGroup(groupId, userId) {
        const group = await prisma_1.prisma.studyGroup.findUnique({
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
        await prisma_1.prisma.groupMember.create({
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
    async leaveStudyGroup(groupId, userId) {
        const member = await prisma_1.prisma.groupMember.findFirst({
            where: { groupId, userId },
        });
        if (!member) {
            throw new Error('Not a member of this group');
        }
        await prisma_1.prisma.groupMember.delete({
            where: { id: member.id },
        });
    }
    /**
     * Create a group project
     */
    async createGroupProject(data) {
        // Verify user is a member of the group
        const member = await prisma_1.prisma.groupMember.findFirst({
            where: { groupId: data.groupId, userId: data.createdBy },
        });
        if (!member) {
            throw new Error('You must be a member of the group to create projects');
        }
        const project = await prisma_1.prisma.groupProject.create({
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
    async getGroupProjects(groupId) {
        const projects = await prisma_1.prisma.groupProject.findMany({
            where: { groupId },
            orderBy: { createdAt: 'desc' },
        });
        return projects.map(this.mapProjectToDto);
    }
    /**
     * Create a shared workspace
     */
    async createSharedWorkspace(data) {
        const workspace = await prisma_1.prisma.sharedWorkspace.create({
            data: {
                groupId: data.groupId,
                collectionId: data.collectionId,
                userId: data.userId,
                name: data.name,
                description: data.description,
                type: data.type,
                content: data.content,
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
    async getSharedWorkspaces(groupId, collectionId, userId) {
        const where = {};
        if (groupId)
            where.groupId = groupId;
        if (collectionId)
            where.collectionId = collectionId;
        if (userId) {
            where.OR = [
                { userId },
                { isPublic: true },
            ];
        }
        else {
            where.isPublic = true;
        }
        const workspaces = await prisma_1.prisma.sharedWorkspace.findMany({
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
    async updateSharedWorkspace(workspaceId, userId, data) {
        const workspace = await prisma_1.prisma.sharedWorkspace.findFirst({
            where: { id: workspaceId, userId },
        });
        if (!workspace) {
            throw new Error('Workspace not found or unauthorized');
        }
        const updated = await prisma_1.prisma.sharedWorkspace.update({
            where: { id: workspaceId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.content !== undefined && { content: data.content }),
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
    mapGroupToDto(group) {
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
    mapProjectToDto(project) {
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
    mapWorkspaceToDto(workspace) {
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
exports.CollaborationService = CollaborationService;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentVersioningService = void 0;
const prisma_1 = require("../../../utils/prisma");
class ContentVersioningService {
    /**
     * Create a new version of content
     */
    async createVersion(data) {
        // Get current version number
        const latestVersion = await prisma_1.prisma.contentVersion.findFirst({
            where: {
                entityType: data.entityType,
                entityId: data.entityId,
            },
            orderBy: { version: 'desc' },
        });
        const nextVersion = latestVersion ? latestVersion.version + 1 : 1;
        // Mark previous version as not current
        if (latestVersion) {
            await prisma_1.prisma.contentVersion.updateMany({
                where: {
                    entityType: data.entityType,
                    entityId: data.entityId,
                    isCurrent: true,
                },
                data: { isCurrent: false },
            });
        }
        // Create new version
        const version = await prisma_1.prisma.contentVersion.create({
            data: {
                entityType: data.entityType,
                entityId: data.entityId,
                version: nextVersion,
                content: data.content,
                createdBy: data.createdBy,
                changeNote: data.changeNote,
                isCurrent: true,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        return this.mapToDto(version);
    }
    /**
     * Get all versions for an entity
     */
    async getVersions(entityType, entityId) {
        const versions = await prisma_1.prisma.contentVersion.findMany({
            where: {
                entityType,
                entityId,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
            orderBy: { version: 'desc' },
        });
        return versions.map(this.mapToDto);
    }
    /**
     * Get current version
     */
    async getCurrentVersion(entityType, entityId) {
        const version = await prisma_1.prisma.contentVersion.findFirst({
            where: {
                entityType,
                entityId,
                isCurrent: true,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        return version ? this.mapToDto(version) : null;
    }
    /**
     * Get version by number
     */
    async getVersionByNumber(entityType, entityId, version) {
        const versionRecord = await prisma_1.prisma.contentVersion.findUnique({
            where: {
                entityType_entityId_version: {
                    entityType,
                    entityId,
                    version,
                },
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        return versionRecord ? this.mapToDto(versionRecord) : null;
    }
    /**
     * Restore a version (make it current)
     */
    async restoreVersion(entityType, entityId, version, userId) {
        const versionToRestore = await prisma_1.prisma.contentVersion.findUnique({
            where: {
                entityType_entityId_version: {
                    entityType,
                    entityId,
                    version,
                },
            },
        });
        if (!versionToRestore) {
            throw new Error('Version not found');
        }
        // Mark all versions as not current
        await prisma_1.prisma.contentVersion.updateMany({
            where: {
                entityType,
                entityId,
            },
            data: { isCurrent: false },
        });
        // Create a new version from the restored content
        const latestVersion = await prisma_1.prisma.contentVersion.findFirst({
            where: {
                entityType,
                entityId,
            },
            orderBy: { version: 'desc' },
        });
        const nextVersion = latestVersion ? latestVersion.version + 1 : 1;
        const restored = await prisma_1.prisma.contentVersion.create({
            data: {
                entityType,
                entityId,
                version: nextVersion,
                content: versionToRestore.content,
                createdBy: userId,
                changeNote: `Restored from version ${version}`,
                isCurrent: true,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        return this.mapToDto(restored);
    }
    /**
     * Delete a version
     */
    async deleteVersion(entityType, entityId, version) {
        const versionRecord = await prisma_1.prisma.contentVersion.findUnique({
            where: {
                entityType_entityId_version: {
                    entityType,
                    entityId,
                    version,
                },
            },
        });
        if (!versionRecord) {
            throw new Error('Version not found');
        }
        if (versionRecord.isCurrent) {
            throw new Error('Cannot delete current version');
        }
        await prisma_1.prisma.contentVersion.delete({
            where: {
                entityType_entityId_version: {
                    entityType,
                    entityId,
                    version,
                },
            },
        });
    }
    /**
     * Map Prisma model to DTO
     */
    mapToDto(version) {
        return {
            id: version.id,
            entityType: version.entityType,
            entityId: version.entityId,
            version: version.version,
            content: version.content,
            createdBy: version.createdBy,
            creator: version.creator,
            changeNote: version.changeNote || undefined,
            isCurrent: version.isCurrent,
            createdAt: version.createdAt,
        };
    }
}
exports.ContentVersioningService = ContentVersioningService;

import { prisma } from '../../../utils/prisma';

export interface CreateVersionDto {
  entityType: 'course' | 'lesson' | 'quiz' | 'assignment';
  entityId: string;
  content: any;
  createdBy: string;
  changeNote?: string;
}

export interface ContentVersionDto {
  id: string;
  entityType: string;
  entityId: string;
  version: number;
  content: any;
  createdBy: string;
  creator: {
    id: string;
    username: string;
    email: string;
  };
  changeNote?: string;
  isCurrent: boolean;
  createdAt: Date;
}

export class ContentVersioningService {
  /**
   * Create a new version of content
   */
  async createVersion(data: CreateVersionDto): Promise<ContentVersionDto> {
    // Get current version number
    const latestVersion = await prisma.contentVersion.findFirst({
      where: {
        entityType: data.entityType,
        entityId: data.entityId,
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    // Mark previous version as not current
    if (latestVersion) {
      await prisma.contentVersion.updateMany({
        where: {
          entityType: data.entityType,
          entityId: data.entityId,
          isCurrent: true,
        },
        data: { isCurrent: false },
      });
    }

    // Create new version
    const version = await prisma.contentVersion.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        version: nextVersion,
        content: data.content as any,
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
  async getVersions(
    entityType: string,
    entityId: string
  ): Promise<ContentVersionDto[]> {
    const versions = await prisma.contentVersion.findMany({
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
  async getCurrentVersion(
    entityType: string,
    entityId: string
  ): Promise<ContentVersionDto | null> {
    const version = await prisma.contentVersion.findFirst({
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
  async getVersionByNumber(
    entityType: string,
    entityId: string,
    version: number
  ): Promise<ContentVersionDto | null> {
    const versionRecord = await prisma.contentVersion.findUnique({
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
  async restoreVersion(
    entityType: string,
    entityId: string,
    version: number,
    userId: string
  ): Promise<ContentVersionDto> {
    const versionToRestore = await prisma.contentVersion.findUnique({
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
    await prisma.contentVersion.updateMany({
      where: {
        entityType,
        entityId,
      },
      data: { isCurrent: false },
    });

    // Create a new version from the restored content
    const latestVersion = await prisma.contentVersion.findFirst({
      where: {
        entityType,
        entityId,
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    const restored = await prisma.contentVersion.create({
      data: {
        entityType,
        entityId,
        version: nextVersion,
        content: versionToRestore.content as any,
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
  async deleteVersion(
    entityType: string,
    entityId: string,
    version: number
  ): Promise<void> {
    const versionRecord = await prisma.contentVersion.findUnique({
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

    await prisma.contentVersion.delete({
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
  private mapToDto(version: any): ContentVersionDto {
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

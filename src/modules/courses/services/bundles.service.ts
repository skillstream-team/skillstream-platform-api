import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface CreateBundleDto {
  title: string;
  description?: string;
  price: number;
  thumbnailUrl?: string;
  collectionIds: string[];
}

export interface BundleResponseDto {
  id: string;
  title: string;
  description?: string;
  price: number;
  thumbnailUrl?: string;
  isActive: boolean;
  collections: Array<{
    id: string;
    title: string;
    thumbnailUrl?: string;
    price: number;
  }>;
  totalValue: number;
  savings: number;
  createdAt: Date;
  updatedAt: Date;
}

export class BundlesService {
  /**
   * Create a collection bundle
   */
  async createBundle(data: CreateBundleDto): Promise<BundleResponseDto> {
    // Validate all collections exist
    const programs = await prisma.program.findMany({
      where: { id: { in: data.collectionIds } },
      select: {
        id: true,
        title: true,
        price: true,
        thumbnailUrl: true,
      },
    });

    if (programs.length !== data.collectionIds.length) {
      throw new Error('One or more programs not found');
    }

    // Calculate total value
    const totalValue = programs.reduce((sum: number, program: any) => sum + program.price, 0);
    const savings = totalValue - data.price;

    const bundle = await prisma.programBundle.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        thumbnailUrl: data.thumbnailUrl,
        items: {
          create: data.collectionIds.map((programId, index) => ({
            programId,
            order: index,
          })),
        },
      },
      include: {
        items: {
          include: {
            program: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
                price: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.mapToDto(bundle, totalValue, savings);
  }

  /**
   * Get all active bundles
   */
  async getAllBundles(): Promise<BundleResponseDto[]> {
    const bundles = await prisma.programBundle.findMany({
      where: { isActive: true },
      include: {
        items: {
          include: {
            program: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
                price: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bundles.map((bundle: any) => {
      const totalValue = bundle.items.reduce(
        (sum: number, item: any) => sum + item.collection.price,
        0
      );
      const savings = totalValue - bundle.price;
      return this.mapToDto(bundle, totalValue, savings);
    });
  }

  /**
   * Get bundle by ID
   */
  async getBundleById(bundleId: string): Promise<BundleResponseDto | null> {
    const bundle = await prisma.programBundle.findUnique({
      where: { id: bundleId },
      include: {
        items: {
          include: {
            program: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
                price: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!bundle) {
      return null;
    }

    const totalValue = bundle.items.reduce((sum: number, item: any) => sum + (item.program?.price || 0), 0);
    const savings = totalValue - bundle.price;

    return this.mapToDto(bundle, totalValue, savings);
  }

  /**
   * Enroll student in bundle (enrolls in all collections)
   */
  async enrollInBundle(
    bundleId: string,
    studentId: string
  ): Promise<{ enrolled: number; alreadyEnrolled: number }> {
    const bundle = await prisma.programBundle.findUnique({
      where: { id: bundleId },
      include: {
        items: {
          select: {
            programId: true,
          },
        },
      },
    });

    if (!bundle) {
      throw new Error('Bundle not found');
    }

    if (!bundle.isActive) {
      throw new Error('Bundle is not active');
    }

    const programIds = bundle.items.map((item: any) => item.programId);

    // Check existing enrollments
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        programId: { in: programIds },
      },
      select: {
        programId: true,
      },
    });

    const existingProgramIds = new Set(existingEnrollments.map((e) => e.programId));
    const newProgramIds = programIds.filter((id: string) => !existingProgramIds.has(id));

    // Create bundle enrollment
    await prisma.bundleEnrollment.create({
      data: {
        bundleId,
        studentId,
      },
    });

    // Note: Actual collection enrollments would be handled by the enrollment service
    // This just tracks bundle enrollment

    return {
      enrolled: newProgramIds.length,
      alreadyEnrolled: existingProgramIds.size,
    };
  }

  private mapToDto(
    bundle: any,
    totalValue: number,
    savings: number
  ): BundleResponseDto {
    return {
      id: bundle.id,
      title: bundle.title,
      description: bundle.description || undefined,
      price: bundle.price,
      thumbnailUrl: bundle.thumbnailUrl || undefined,
      isActive: bundle.isActive,
      collections: bundle.items.map((item: any) => ({
        id: item.collection.id,
        title: item.collection.title,
        thumbnailUrl: item.collection.thumbnailUrl || undefined,
        price: item.collection.price,
      })),
      totalValue,
      savings,
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
    };
  }
}

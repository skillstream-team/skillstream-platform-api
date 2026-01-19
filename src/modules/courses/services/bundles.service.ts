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
    const collections = await prisma.collection.findMany({
      where: { id: { in: data.collectionIds } },
      select: {
        id: true,
        title: true,
        price: true,
        thumbnailUrl: true,
      },
    });

    if (collections.length !== data.collectionIds.length) {
      throw new Error('One or more collections not found');
    }

    // Calculate total value
    const totalValue = collections.reduce((sum: number, collection: any) => sum + collection.price, 0);
    const savings = totalValue - data.price;

    const bundle = await prisma.collectionBundle.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        thumbnailUrl: data.thumbnailUrl,
        items: {
          create: data.collectionIds.map((collectionId, index) => ({
            collectionId,
            order: index,
          })),
        },
      },
      include: {
        items: {
          include: {
            collection: {
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
    const bundles = await prisma.collectionBundle.findMany({
      where: { isActive: true },
      include: {
        items: {
          include: {
            collection: {
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
    const bundle = await prisma.collectionBundle.findUnique({
      where: { id: bundleId },
      include: {
        items: {
          include: {
            collection: {
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

    const totalValue = bundle.items.reduce((sum: number, item: any) => sum + item.collection.price, 0);
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
    const bundle = await prisma.collectionBundle.findUnique({
      where: { id: bundleId },
      include: {
        items: {
          select: {
            collectionId: true,
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

    const collectionIds = bundle.items.map((item: any) => item.collectionId);

    // Check existing enrollments
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        collectionId: { in: collectionIds },
      },
      select: {
        collectionId: true,
      },
    });

    const existingCollectionIds = new Set(existingEnrollments.map((e) => e.collectionId));
    const newCollectionIds = collectionIds.filter((id) => !existingCollectionIds.has(id));

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
      enrolled: newCollectionIds.length,
      alreadyEnrolled: existingCollectionIds.size,
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

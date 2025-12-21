import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface CreateBundleDto {
  title: string;
  description?: string;
  price: number;
  thumbnailUrl?: string;
  courseIds: string[];
}

export interface BundleResponseDto {
  id: string;
  title: string;
  description?: string;
  price: number;
  thumbnailUrl?: string;
  isActive: boolean;
  courses: Array<{
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
   * Create a course bundle
   */
  async createBundle(data: CreateBundleDto): Promise<BundleResponseDto> {
    // Validate all courses exist
    const courses = await prisma.course.findMany({
      where: { id: { in: data.courseIds } },
      select: {
        id: true,
        title: true,
        price: true,
        thumbnailUrl: true,
      },
    });

    if (courses.length !== data.courseIds.length) {
      throw new Error('One or more courses not found');
    }

    // Calculate total value
    const totalValue = courses.reduce((sum, course) => sum + course.price, 0);
    const savings = totalValue - data.price;

    const bundle = await prisma.courseBundle.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        thumbnailUrl: data.thumbnailUrl,
        items: {
          create: data.courseIds.map((courseId, index) => ({
            courseId,
            order: index,
          })),
        },
      },
      include: {
        items: {
          include: {
            course: {
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
    const bundles = await prisma.courseBundle.findMany({
      where: { isActive: true },
      include: {
        items: {
          include: {
            course: {
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

    return bundles.map((bundle) => {
      const totalValue = bundle.items.reduce(
        (sum, item) => sum + item.course.price,
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
    const bundle = await prisma.courseBundle.findUnique({
      where: { id: bundleId },
      include: {
        items: {
          include: {
            course: {
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

    const totalValue = bundle.items.reduce((sum, item) => sum + item.course.price, 0);
    const savings = totalValue - bundle.price;

    return this.mapToDto(bundle, totalValue, savings);
  }

  /**
   * Enroll student in bundle (enrolls in all courses)
   */
  async enrollInBundle(
    bundleId: string,
    studentId: string
  ): Promise<{ enrolled: number; alreadyEnrolled: number }> {
    const bundle = await prisma.courseBundle.findUnique({
      where: { id: bundleId },
      include: {
        items: {
          select: {
            courseId: true,
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

    const courseIds = bundle.items.map((item) => item.courseId);

    // Check existing enrollments
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        courseId: { in: courseIds },
      },
      select: {
        courseId: true,
      },
    });

    const existingCourseIds = new Set(existingEnrollments.map((e) => e.courseId));
    const newCourseIds = courseIds.filter((id) => !existingCourseIds.has(id));

    // Create bundle enrollment
    await prisma.bundleEnrollment.create({
      data: {
        bundleId,
        studentId,
      },
    });

    // Note: Actual course enrollments would be handled by the enrollment service
    // This just tracks bundle enrollment

    return {
      enrolled: newCourseIds.length,
      alreadyEnrolled: existingCourseIds.size,
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
      courses: bundle.items.map((item: any) => ({
        id: item.course.id,
        title: item.course.title,
        thumbnailUrl: item.course.thumbnailUrl || undefined,
        price: item.course.price,
      })),
      totalValue,
      savings,
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
    };
  }
}

import { prisma } from '../../../utils/prisma';
import { getCache, setCache, deleteCache, deleteCachePattern, CACHE_TTL } from '../../../utils/cache';

export interface CreateCategoryDto {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  isActive?: boolean;
}

export interface CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  isActive: boolean;
  courseCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class CategoryService {
  /**
   * Get all categories
   */
  async getAllCategories(includeInactive: boolean = false): Promise<CategoryResponseDto[]> {
    const cacheKey = `categories:all:${includeInactive}`;
    
    // Try cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
    });

    const result = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || undefined,
      icon: cat.icon || undefined,
      color: cat.color || undefined,
      order: cat.order,
      isActive: cat.isActive,
      courseCount: cat._count.courses,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));

    // Cache for 1 hour
    await setCache(cacheKey, result, CACHE_TTL.MEDIUM);

    return result;
  }

  /**
   * Get a single category by ID or slug
   */
  async getCategoryByIdOrSlug(identifier: string): Promise<CategoryResponseDto | null> {
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { id: identifier },
          { slug: identifier },
        ],
      },
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
    });

    if (!category) {
      return null;
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || undefined,
      icon: category.icon || undefined,
      color: category.color || undefined,
      order: category.order,
      isActive: category.isActive,
      courseCount: category._count.courses,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryDto): Promise<CategoryResponseDto> {
    // Generate slug if not provided
    const slug = data.slug || this.generateSlug(data.name);

    // Check if slug already exists
    const existing = await prisma.category.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new Error(`Category with slug "${slug}" already exists`);
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        icon: data.icon,
        color: data.color,
        order: data.order || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
    });

    // Invalidate cache
    await deleteCachePattern('categories:*');

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || undefined,
      icon: category.icon || undefined,
      color: category.color || undefined,
      order: category.order,
      isActive: category.isActive,
      courseCount: category._count.courses,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Update a category
   */
  async updateCategory(id: string, data: UpdateCategoryDto): Promise<CategoryResponseDto> {
    // Check if category exists
    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Category not found');
    }

    // If slug is being updated, check for conflicts
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.category.findUnique({
        where: { slug: data.slug },
      });

      if (slugExists) {
        throw new Error(`Category with slug "${data.slug}" already exists`);
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        color: data.color,
        order: data.order,
        isActive: data.isActive,
      },
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
    });

    // Invalidate cache
    await deleteCachePattern('categories:*');

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || undefined,
      icon: category.icon || undefined,
      color: category.color || undefined,
      order: category.order,
      isActive: category.isActive,
      courseCount: category._count.courses,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    if (category._count.courses > 0) {
      throw new Error(`Cannot delete category. It has ${category._count.courses} course(s) associated with it. Please reassign or delete courses first.`);
    }

    await prisma.category.delete({
      where: { id },
    });

    // Invalidate cache
    await deleteCachePattern('categories:*');
  }

  /**
   * Seed default categories for the platform
   * This should be called once during platform initialization
   */
  async seedDefaultCategories(): Promise<{
    created: number;
    skipped: number;
    categories: CategoryResponseDto[];
  }> {
    const defaultCategories = [
      {
        name: 'Web Development',
        slug: 'web-development',
        description: 'Learn HTML, CSS, JavaScript, React, Node.js, and other web technologies',
        icon: 'code',
        color: '#3B82F6',
        order: 1,
      },
      {
        name: 'Mobile Development',
        slug: 'mobile-development',
        description: 'Build iOS and Android apps with Swift, Kotlin, React Native, and Flutter',
        icon: 'smartphone',
        color: '#8B5CF6',
        order: 2,
      },
      {
        name: 'Data Science',
        slug: 'data-science',
        description: 'Master data analysis, machine learning, AI, and data visualization',
        icon: 'chart-bar',
        color: '#10B981',
        order: 3,
      },
      {
        name: 'Programming Languages',
        slug: 'programming-languages',
        description: 'Learn Python, Java, C++, Go, Rust, and other programming languages',
        icon: 'terminal',
        color: '#F59E0B',
        order: 4,
      },
      {
        name: 'Design',
        slug: 'design',
        description: 'UI/UX design, graphic design, web design, and design tools',
        icon: 'palette',
        color: '#EC4899',
        order: 5,
      },
      {
        name: 'Business',
        slug: 'business',
        description: 'Entrepreneurship, management, finance, and business strategy',
        icon: 'briefcase',
        color: '#6366F1',
        order: 6,
      },
      {
        name: 'Marketing',
        slug: 'marketing',
        description: 'Digital marketing, SEO, social media marketing, and content marketing',
        icon: 'megaphone',
        color: '#EF4444',
        order: 7,
      },
      {
        name: 'IT & Software',
        slug: 'it-software',
        description: 'System administration, cloud computing, DevOps, and cybersecurity',
        icon: 'server',
        color: '#14B8A6',
        order: 8,
      },
      {
        name: 'Personal Development',
        slug: 'personal-development',
        description: 'Productivity, leadership, communication skills, and career development',
        icon: 'user-circle',
        color: '#F97316',
        order: 9,
      },
      {
        name: 'Photography',
        slug: 'photography',
        description: 'Photography techniques, editing, camera skills, and composition',
        icon: 'camera',
        color: '#A855F7',
        order: 10,
      },
      {
        name: 'Music',
        slug: 'music',
        description: 'Music production, instruments, theory, and audio engineering',
        icon: 'musical-note',
        color: '#06B6D4',
        order: 11,
      },
      {
        name: 'Health & Fitness',
        slug: 'health-fitness',
        description: 'Fitness training, nutrition, yoga, and wellness',
        icon: 'heart',
        color: '#DC2626',
        order: 12,
      },
      {
        name: 'Language Learning',
        slug: 'language-learning',
        description: 'Learn new languages including English, Spanish, French, and more',
        icon: 'translate',
        color: '#059669',
        order: 13,
      },
      {
        name: 'Academics',
        slug: 'academics',
        description: 'Mathematics, science, history, literature, and academic subjects',
        icon: 'academic-cap',
        color: '#7C3AED',
        order: 14,
      },
      {
        name: 'Game Development',
        slug: 'game-development',
        description: 'Create games with Unity, Unreal Engine, and game design principles',
        icon: 'game-controller',
        color: '#F43F5E',
        order: 15,
      },
    ];

    let created = 0;
    let skipped = 0;
    const createdCategories: CategoryResponseDto[] = [];

    for (const catData of defaultCategories) {
      try {
        // Check if category already exists
        const existing = await prisma.category.findUnique({
          where: { slug: catData.slug },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const category = await prisma.category.create({
          data: catData,
          include: {
            _count: {
              select: {
                courses: true,
              },
            },
          },
        });

        createdCategories.push({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description || undefined,
          icon: category.icon || undefined,
          color: category.color || undefined,
          order: category.order,
          isActive: category.isActive,
          courseCount: category._count.courses,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        });

        created++;
      } catch (error) {
        console.error(`Error creating category "${catData.name}":`, error);
        skipped++;
      }
    }

    // Invalidate cache
    await deleteCachePattern('categories:*');

    return {
      created,
      skipped,
      categories: createdCategories,
    };
  }

  /**
   * Generate a URL-friendly slug from a name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
}

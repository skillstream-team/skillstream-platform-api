import { Router } from 'express';
import { CategoryService } from '../../services/category.service';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const categoryService = new CategoryService();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     description: Returns a list of all categories on the platform
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive categories
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const categories = await categoryService.getAllCategories(includeInactive);
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get a single category by ID or slug
 *     tags: [Categories]
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categoryService.getCategoryByIdOrSlug(id);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category (Admin only)
 *     tags: [Categories]
 */
const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

router.post('/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createCategorySchema }),
  async (req, res) => {
    try {
      const category = await categoryService.createCategory(req.body);
      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully',
      });
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(400).json({ error: (error as Error).message || 'Failed to create category' });
    }
  }
);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category (Admin only)
 *     tags: [Categories]
 */
const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

router.put('/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({
    params: z.object({ id: z.string().min(1) }),
    body: updateCategorySchema,
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const category = await categoryService.updateCategory(id, req.body);
      res.json({
        success: true,
        data: category,
        message: 'Category updated successfully',
      });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(400).json({ error: (error as Error).message || 'Failed to update category' });
    }
  }
);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category (Admin only)
 *     tags: [Categories]
 */
router.delete('/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({
    params: z.object({ id: z.string().min(1) }),
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      await categoryService.deleteCategory(id);
      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(400).json({ error: (error as Error).message || 'Failed to delete category' });
    }
  }
);

/**
 * @swagger
 * /api/categories/seed:
 *   post:
 *     summary: Seed default categories (Admin only)
 *     description: Creates default categories for the e-learning platform. Safe to run multiple times - skips existing categories.
 *     tags: [Categories]
 */
router.post('/seed',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const result = await categoryService.seedDefaultCategories();
      res.json({
        success: true,
        message: `Categories seeded: ${result.created} created, ${result.skipped} skipped`,
        data: result,
      });
    } catch (error) {
      console.error('Error seeding categories:', error);
      res.status(500).json({ error: 'Failed to seed categories' });
    }
  }
);

export default router;

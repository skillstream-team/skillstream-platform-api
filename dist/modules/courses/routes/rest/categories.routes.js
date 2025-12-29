"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_service_1 = require("../../services/category.service");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const categoryService = new category_service_1.CategoryService();
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
    }
    catch (error) {
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
    }
    catch (error) {
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
const createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    slug: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().max(500).optional(),
    icon: zod_1.z.string().optional(),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    order: zod_1.z.number().int().min(0).optional(),
    isActive: zod_1.z.boolean().optional(),
});
router.post('/', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({ body: createCategorySchema }), async (req, res) => {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json({
            success: true,
            data: category,
            message: 'Category created successfully',
        });
    }
    catch (error) {
        console.error('Error creating category:', error);
        res.status(400).json({ error: error.message || 'Failed to create category' });
    }
});
/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category (Admin only)
 *     tags: [Categories]
 */
const updateCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    slug: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().max(500).optional(),
    icon: zod_1.z.string().optional(),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    order: zod_1.z.number().int().min(0).optional(),
    isActive: zod_1.z.boolean().optional(),
});
router.put('/:id', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
    body: updateCategorySchema,
}), async (req, res) => {
    try {
        const { id } = req.params;
        const category = await categoryService.updateCategory(id, req.body);
        res.json({
            success: true,
            data: category,
            message: 'Category updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating category:', error);
        res.status(400).json({ error: error.message || 'Failed to update category' });
    }
});
/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category (Admin only)
 *     tags: [Categories]
 */
router.delete('/:id', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
}), async (req, res) => {
    try {
        const { id } = req.params;
        await categoryService.deleteCategory(id);
        res.json({
            success: true,
            message: 'Category deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting category:', error);
        res.status(400).json({ error: error.message || 'Failed to delete category' });
    }
});
/**
 * @swagger
 * /api/categories/seed:
 *   post:
 *     summary: Seed default categories (Admin only)
 *     description: Creates default categories for the e-learning platform. Safe to run multiple times - skips existing categories.
 *     tags: [Categories]
 */
router.post('/seed', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const result = await categoryService.seedDefaultCategories();
        res.json({
            success: true,
            message: `Categories seeded: ${result.created} created, ${result.skipped} skipped`,
            data: result,
        });
    }
    catch (error) {
        console.error('Error seeding categories:', error);
        res.status(500).json({ error: 'Failed to seed categories' });
    }
});
exports.default = router;

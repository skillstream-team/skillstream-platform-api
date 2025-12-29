"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const bundles_service_1 = require("../../services/bundles.service");
const router = (0, express_1.Router)();
const bundlesService = new bundles_service_1.BundlesService();
/**
 * @swagger
 * /api/bundles:
 *   get:
 *     summary: Get all active course bundles
 *     description: Returns list of all active course bundles
 *     tags: [Bundles]
 *     responses:
 *       200:
 *         description: Bundles retrieved successfully
 */
router.get('/', async (req, res) => {
    try {
        const bundles = await bundlesService.getAllBundles();
        res.json({ data: bundles });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * @swagger
 * /api/bundles/{bundleId}:
 *   get:
 *     summary: Get bundle by ID
 *     description: Returns detailed information about a specific bundle
 *     tags: [Bundles]
 *     parameters:
 *       - in: path
 *         name: bundleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bundle retrieved successfully
 *       404:
 *         description: Bundle not found
 */
router.get('/:bundleId', async (req, res) => {
    try {
        const { bundleId } = req.params;
        const bundle = await bundlesService.getBundleById(bundleId);
        if (!bundle) {
            return res.status(404).json({ error: 'Bundle not found' });
        }
        res.json(bundle);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * @swagger
 * /api/bundles:
 *   post:
 *     summary: Create a course bundle (Admin/Teacher only)
 *     description: Creates a new course bundle with multiple courses
 *     tags: [Bundles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, price, courseIds]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               thumbnailUrl:
 *                 type: string
 *               courseIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Bundle created successfully
 */
router.post('/', (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const bundle = await bundlesService.createBundle(req.body);
        res.status(201).json(bundle);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
/**
 * @swagger
 * /api/bundles/{bundleId}/enroll:
 *   post:
 *     summary: Enroll in bundle
 *     description: Enrolls the authenticated student in all courses in the bundle
 *     tags: [Bundles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bundleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully enrolled in bundle
 */
router.post('/:bundleId/enroll', auth_1.requireAuth, async (req, res) => {
    try {
        const { bundleId } = req.params;
        const userId = req.user.id;
        const result = await bundlesService.enrollInBundle(bundleId, userId);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;

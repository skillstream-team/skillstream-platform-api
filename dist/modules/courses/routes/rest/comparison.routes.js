"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const comparison_service_1 = require("../../services/comparison.service");
const router = (0, express_1.Router)();
const comparisonService = new comparison_service_1.ComparisonService();
/**
 * @swagger
 * /api/courses/compare:
 *   get:
 *     summary: Compare courses
 *     description: Compare multiple courses side-by-side (2-5 courses)
 *     tags: [Course Comparison]
 *     parameters:
 *       - in: query
 *         name: courseIds
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated list of course IDs (2-5 courses)
 *     responses:
 *       200:
 *         description: Course comparison retrieved successfully
 *       400:
 *         description: Invalid number of courses or invalid course IDs
 */
router.get('/compare', async (req, res) => {
    try {
        const { courseIds } = req.query;
        if (!courseIds || typeof courseIds !== 'string') {
            return res.status(400).json({ error: 'courseIds parameter is required' });
        }
        const ids = courseIds.split(',').map((id) => id.trim());
        if (ids.length < 2 || ids.length > 5) {
            return res.status(400).json({
                error: 'Can compare between 2 and 5 courses',
            });
        }
        const comparison = await comparisonService.compareCourses(ids);
        res.json(comparison);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;

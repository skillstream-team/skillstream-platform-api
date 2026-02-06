"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roles_1 = require("../../../../middleware/roles");
const tags_service_1 = require("../../services/tags.service");
const router = (0, express_1.Router)();
const tagsService = new tags_service_1.TagsService();
/**
 * @swagger
 * /api/courses/{courseId}/tags:
 *   get:
 *     summary: Get tags for a course
 *     description: Returns all tags associated with a course
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tags retrieved successfully
 */
router.get('/:programId/tags', async (req, res) => {
    try {
        const { programId } = req.params;
        const tags = await tagsService.getProgramTags(programId);
        res.json({ data: tags });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * @swagger
 * /api/courses/{courseId}/tags:
 *   post:
 *     summary: Add tags to a course (Teacher only)
 *     description: Adds one or more tags to a course
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tags]
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Tags added successfully
 */
router.post('/:programId/tags', (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const { programId } = req.params;
        const { tags } = req.body;
        await tagsService.addTagsToProgram(programId, tags);
        res.json({ message: 'Tags added successfully' });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
/**
 * @swagger
 * /api/courses/{courseId}/tags:
 *   delete:
 *     summary: Remove tags from a course (Teacher only)
 *     description: Removes specified tags from a course
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tags]
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Tags removed successfully
 */
router.delete('/:programId/tags', (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const { programId } = req.params;
        const { tags } = req.body;
        await tagsService.removeTagsFromProgram(programId, tags);
        res.json({ message: 'Tags removed successfully' });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;

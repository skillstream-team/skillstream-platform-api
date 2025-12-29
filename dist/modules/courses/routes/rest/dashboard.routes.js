"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const dashboard_service_1 = require("../../services/dashboard.service");
const router = (0, express_1.Router)();
const dashboardService = new dashboard_service_1.DashboardService();
/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get student dashboard
 *     description: Returns comprehensive dashboard data including enrolled courses, progress, deadlines, recommendations, and statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const dashboard = await dashboardService.getStudentDashboard(userId);
        res.json(dashboard);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const goals_service_1 = require("../../services/goals.service");
const auth_1 = require("../../../../middleware/auth");
const router = (0, express_1.Router)();
const goalsService = new goals_service_1.GoalsService();
/**
 * GET /api/users/:userId/goals
 * List study goals for the authenticated user (or userId must match)
 */
router.get('/users/:userId/goals', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.params.userId;
        const authUserId = req.user?.id;
        if (authUserId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const goals = await goalsService.getGoals(userId);
        return res.json({ data: goals });
    }
    catch (error) {
        console.error('Error fetching goals:', error);
        return res.status(500).json({ error: error?.message || 'Failed to fetch goals' });
    }
});
/**
 * POST /api/users/:userId/goals
 * Create a study goal
 */
router.post('/users/:userId/goals', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.params.userId;
        const authUserId = req.user?.id;
        if (authUserId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { title, type, target, period, endDate, categoryId } = req.body;
        if (!title || !type || target == null || !period || !endDate) {
            return res.status(400).json({ error: 'Missing required fields: title, type, target, period, endDate' });
        }
        const goal = await goalsService.createGoal(userId, {
            title,
            type,
            target: Number(target),
            period,
            endDate: new Date(endDate),
            categoryId,
        });
        return res.status(201).json(goal);
    }
    catch (error) {
        console.error('Error creating goal:', error);
        return res.status(500).json({ error: error?.message || 'Failed to create goal' });
    }
});
/**
 * PATCH /api/users/:userId/goals/:goalId
 * Update a study goal
 */
router.patch('/users/:userId/goals/:goalId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId, goalId } = req.params;
        const authUserId = req.user?.id;
        if (authUserId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const body = req.body;
        const data = {};
        if (body.title != null)
            data.title = body.title;
        if (body.type != null)
            data.type = body.type;
        if (body.target != null)
            data.target = Number(body.target);
        if (body.current != null)
            data.current = Number(body.current);
        if (body.period != null)
            data.period = body.period;
        if (body.endDate != null)
            data.endDate = new Date(body.endDate);
        if (body.completed != null)
            data.completed = body.completed;
        if (body.categoryId != null)
            data.categoryId = body.categoryId;
        const goal = await goalsService.updateGoal(goalId, userId, data);
        return res.json(goal);
    }
    catch (error) {
        console.error('Error updating goal:', error);
        return res.status(500).json({ error: error?.message || 'Failed to update goal' });
    }
});
/**
 * DELETE /api/users/:userId/goals/:goalId
 * Delete a study goal
 */
router.delete('/users/:userId/goals/:goalId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId, goalId } = req.params;
        const authUserId = req.user?.id;
        if (authUserId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await goalsService.deleteGoal(goalId, userId);
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting goal:', error);
        return res.status(500).json({ error: error?.message || 'Failed to delete goal' });
    }
});
exports.default = router;

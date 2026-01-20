"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const teacher_earnings_service_1 = require("../../services/teacher-earnings.service");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const earningsService = new teacher_earnings_service_1.TeacherEarningsService();
/**
 * @swagger
 * /api/teachers/{teacherId}/earnings/summary:
 *   get:
 *     summary: Get teacher earnings summary
 *     description: Returns lifetime earnings, total paid, pending, and available amounts
 *     tags: [Teacher Earnings]
 */
router.get('/teachers/:teacherId/earnings/summary', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const { teacherId } = req.params;
        const currentUserId = req.user?.id;
        if (teacherId !== currentUserId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const summary = await earningsService.getTeacherEarningsSummary(teacherId);
        res.json({
            success: true,
            data: summary,
        });
    }
    catch (error) {
        console.error('Error fetching earnings summary:', error);
        res.status(500).json({ error: 'Failed to fetch earnings summary' });
    }
});
/**
 * @swagger
 * /api/teachers/{teacherId}/earnings/available:
 *   get:
 *     summary: Get available earnings ready for cashout
 *     tags: [Teacher Earnings]
 */
router.get('/teachers/:teacherId/earnings/available', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const { teacherId } = req.params;
        const currentUserId = req.user?.id;
        if (teacherId !== currentUserId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const available = await earningsService.getAvailableEarnings(teacherId);
        res.json({
            success: true,
            data: available,
        });
    }
    catch (error) {
        console.error('Error fetching available earnings:', error);
        res.status(500).json({ error: 'Failed to fetch available earnings' });
    }
});
/**
 * @swagger
 * /api/teachers/{teacherId}/earnings/monthly:
 *   get:
 *     summary: Get monthly earnings breakdown
 *     tags: [Teacher Earnings]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 */
router.get('/teachers/:teacherId/earnings/monthly', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const { teacherId } = req.params;
        const currentUserId = req.user?.id;
        if (teacherId !== currentUserId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const year = req.query.year ? parseInt(req.query.year) : undefined;
        const month = req.query.month ? parseInt(req.query.month) : undefined;
        const breakdown = await earningsService.getMonthlyEarningsBreakdown(teacherId, year, month);
        res.json({
            success: true,
            data: breakdown,
        });
    }
    catch (error) {
        console.error('Error fetching monthly earnings:', error);
        res.status(500).json({ error: 'Failed to fetch monthly earnings' });
    }
});
/**
 * @swagger
 * /api/teachers/{teacherId}/earnings/calculate:
 *   post:
 *     summary: Calculate monthly earnings for a course
 *     description: Calculates earnings for a specific month based on active users (15/30 days)
 *     tags: [Teacher Earnings]
 */
const calculateEarningsSchema = zod_1.z.object({
    courseId: zod_1.z.string().min(1).optional(),
    year: zod_1.z.number().int().min(2020).max(2100),
    month: zod_1.z.number().int().min(1).max(12),
    allCourses: zod_1.z.boolean().optional().default(false),
});
router.post('/teachers/:teacherId/earnings/calculate', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), (0, validation_1.validate)({
    params: zod_1.z.object({ teacherId: zod_1.z.string().min(1) }),
    body: calculateEarningsSchema,
}), async (req, res) => {
    try {
        const { teacherId } = req.params;
        const currentUserId = req.user?.id;
        if (teacherId !== currentUserId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const { courseId, year, month, allCourses } = req.body;
        if (allCourses) {
            // Calculate for all courses
            const result = await earningsService.calculateAllCoursesEarnings(teacherId, year, month);
            res.json({
                success: true,
                data: result,
            });
        }
        else {
            if (!courseId) {
                return res.status(400).json({ error: 'courseId is required when allCourses is false' });
            }
            // Verify teacher owns the collection
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../../../../utils/prisma')));
            const collection = await prisma.collection.findUnique({
                where: { id: courseId },
            });
            if (!collection || collection.instructorId !== teacherId) {
                return res.status(403).json({ error: 'Collection not found or unauthorized' });
            }
            const result = await earningsService.calculateMonthlyEarnings(teacherId, courseId, year, month);
            res.json({
                success: true,
                data: result,
            });
        }
    }
    catch (error) {
        console.error('Error calculating earnings:', error);
        res.status(500).json({ error: error.message || 'Failed to calculate earnings' });
    }
});
/**
 * @swagger
 * /api/teachers/{teacherId}/earnings/payout:
 *   post:
 *     summary: Request a payout (cashout)
 *     description: Creates a payout request for available earnings
 *     tags: [Teacher Earnings]
 */
const requestPayoutSchema = zod_1.z.object({
    amount: zod_1.z.number().min(0.01).optional(),
    paymentMethod: zod_1.z.string().optional(),
    paymentDetails: zod_1.z.any().optional(),
});
router.post('/teachers/:teacherId/earnings/payout', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), (0, validation_1.validate)({
    params: zod_1.z.object({ teacherId: zod_1.z.string().min(1) }),
    body: requestPayoutSchema,
}), async (req, res) => {
    try {
        const { teacherId } = req.params;
        const currentUserId = req.user?.id;
        if (teacherId !== currentUserId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const { amount, paymentMethod, paymentDetails } = req.body;
        const result = await earningsService.requestPayout(teacherId, amount, paymentMethod, paymentDetails);
        res.json({
            success: true,
            data: result,
            message: 'Payout request created successfully',
        });
    }
    catch (error) {
        console.error('Error requesting payout:', error);
        res.status(400).json({ error: error.message || 'Failed to request payout' });
    }
});
/**
 * @swagger
 * /api/teachers/{teacherId}/earnings/payouts:
 *   get:
 *     summary: Get payout history
 *     tags: [Teacher Earnings]
 */
router.get('/teachers/:teacherId/earnings/payouts', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const { teacherId } = req.params;
        const currentUserId = req.user?.id;
        if (teacherId !== currentUserId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const history = await earningsService.getPayoutHistory(teacherId, page, limit);
        res.json({
            success: true,
            ...history,
        });
    }
    catch (error) {
        console.error('Error fetching payout history:', error);
        res.status(500).json({ error: 'Failed to fetch payout history' });
    }
});
exports.default = router;

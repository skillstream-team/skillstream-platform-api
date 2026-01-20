"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const prisma_1 = require("../../../../utils/prisma");
const monetization_service_1 = require("../../services/monetization.service");
const teacher_earnings_service_1 = require("../../../earnings/services/teacher-earnings.service");
const router = (0, express_1.Router)();
const monetizationService = new monetization_service_1.MonetizationService();
const earningsService = new teacher_earnings_service_1.TeacherEarningsService();
/**
 * @swagger
 * /api/lessons/:id/purchase:
 *   post:
 *     summary: Purchase a standalone premium lesson
 */
router.post('/lessons/:id/purchase', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const lessonId = req.params.id;
        // Check lesson exists and is premium
        const lesson = await prisma_1.prisma.lesson.findUnique({
            where: { id: lessonId },
            select: {
                id: true,
                title: true,
                price: true,
                monetizationType: true,
                teacherId: true,
            },
        });
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        if (lesson.monetizationType !== 'PREMIUM') {
            return res.status(400).json({
                error: 'This lesson is not available for purchase',
                monetizationType: lesson.monetizationType,
            });
        }
        // Check if already purchased
        const existingPayment = await prisma_1.prisma.payment.findFirst({
            where: {
                studentId: userId,
                lessonId,
                status: 'COMPLETED',
            },
        });
        if (existingPayment) {
            return res.status(400).json({ error: 'You have already purchased this lesson' });
        }
        // Create payment record
        const payment = await prisma_1.prisma.payment.create({
            data: {
                studentId: userId,
                lessonId,
                amount: lesson.price,
                currency: 'USD',
                status: 'PENDING',
                provider: req.body.provider || 'stripe',
                transactionId: req.body.transactionId,
            },
        });
        // If payment is immediately completed (e.g., from webhook), record earnings
        if (req.body.status === 'COMPLETED' || payment.status === 'COMPLETED') {
            if (lesson.teacherId) {
                try {
                    await earningsService.recordLessonSale(lessonId, payment.id);
                }
                catch (earningsError) {
                    console.warn('Failed to record teacher earnings:', earningsError);
                }
            }
        }
        res.status(201).json({
            payment,
            lesson: {
                id: lesson.id,
                title: lesson.title,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;

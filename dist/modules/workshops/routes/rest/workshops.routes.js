"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const workshop_service_1 = require("../../services/workshop.service");
const prisma_1 = require("../../../../utils/prisma");
const daily_1 = require("../../../../utils/daily");
const router = (0, express_1.Router)();
const workshopService = new workshop_service_1.WorkshopService();
/**
 * @swagger
 * /api/workshops:
 *   post:
 *     summary: Create a live workshop
 */
router.post('/', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const { title, description, scheduledAt, duration, maxSeats, pricePerSeat, platformFeePercent } = req.body;
        if (!title || !scheduledAt || !duration || !maxSeats || !pricePerSeat) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Create Daily.co room
        const dailyRoom = await (0, daily_1.createDailyRoom)(title, new Date(scheduledAt));
        // Create workshop
        const workshop = await workshopService.createWorkshop(userId, {
            title,
            description,
            scheduledAt: new Date(scheduledAt),
            duration,
            maxSeats,
            pricePerSeat,
            platformFeePercent,
        });
        // Update workshop with Daily.co room info
        const updatedWorkshop = await prisma_1.prisma.liveWorkshop.update({
            where: { id: workshop.id },
            data: {
                joinLink: dailyRoom.roomUrl,
                meetingId: dailyRoom.meetingId,
            },
        });
        res.status(201).json(updatedWorkshop);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/workshops:
 *   get:
 *     summary: Get workshops (teacher gets their own, students get available)
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        if (user?.role === 'TEACHER' || user?.role === 'ADMIN') {
            const workshops = await workshopService.getTeacherWorkshops(userId, req.query.status);
            res.json(workshops);
        }
        else {
            const workshops = await workshopService.getAvailableWorkshops();
            res.json(workshops);
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/workshops/:id:
 *   get:
 *     summary: Get workshop details
 */
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const workshop = await prisma_1.prisma.liveWorkshop.findUnique({
            where: { id: req.params.id },
            include: {
                teacher: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                    },
                },
                enrollments: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        if (!workshop) {
            return res.status(404).json({ error: 'Workshop not found' });
        }
        res.json(workshop);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/workshops/:id/enroll:
 *   post:
 *     summary: Enroll in a workshop
 */
router.post('/:id/enroll', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { paymentId } = req.body;
        // Create payment if not provided
        let finalPaymentId = paymentId;
        if (!finalPaymentId) {
            const workshop = await prisma_1.prisma.liveWorkshop.findUnique({
                where: { id: req.params.id },
            });
            if (!workshop) {
                return res.status(404).json({ error: 'Workshop not found' });
            }
            // Create payment record
            const payment = await prisma_1.prisma.payment.create({
                data: {
                    studentId: userId,
                    amount: workshop.pricePerSeat,
                    currency: 'USD',
                    status: 'PENDING',
                    provider: 'stripe', // or from req.body
                },
            });
            finalPaymentId = payment.id;
        }
        const enrollment = await workshopService.enrollStudent(req.params.id, userId, finalPaymentId);
        res.status(201).json(enrollment);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/workshops/:id/complete:
 *   post:
 *     summary: Mark workshop as completed (teacher only)
 */
router.post('/:id/complete', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const result = await workshopService.completeWorkshop(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/workshops/:id/recording:
 *   get:
 *     summary: Get workshop recording URL (if available)
 */
router.get('/:id/recording', auth_1.requireAuth, async (req, res) => {
    try {
        const workshop = await prisma_1.prisma.liveWorkshop.findUnique({
            where: { id: req.params.id },
            select: {
                recordingUrl: true,
                status: true,
                enrollments: {
                    where: {
                        studentId: req.user?.id,
                    },
                },
            },
        });
        if (!workshop) {
            return res.status(404).json({ error: 'Workshop not found' });
        }
        if (workshop.status !== 'COMPLETED') {
            return res.status(400).json({ error: 'Workshop not completed yet' });
        }
        if (workshop.enrollments.length === 0) {
            return res.status(403).json({ error: 'You are not enrolled in this workshop' });
        }
        res.json({ recordingUrl: workshop.recordingUrl });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;

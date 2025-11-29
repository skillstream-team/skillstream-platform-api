"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const prisma_1 = require("../../../../utils/prisma");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/users/{userId}/video/recent-contacts:
 *   get:
 *     summary: Get recent video contacts
 *     tags: [Video]
 */
router.get('/users/:userId/video/recent-contacts', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        // Get recent video conferences where user participated
        const conferences = await prisma_1.prisma.videoConference.findMany({
            where: {
                OR: [
                    { hostId: userId }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        // Filter conferences where user is a participant (check metadata)
        const allConferences = conferences.filter(conf => {
            if (conf.hostId === userId)
                return true;
            const metadata = conf.metadata;
            const participants = metadata?.participants || [];
            return Array.isArray(participants) && participants.includes(userId);
        });
        // Extract unique user IDs from conferences
        const contactIds = new Set();
        allConferences.forEach(conf => {
            if (conf.hostId !== userId) {
                contactIds.add(conf.hostId);
            }
            const participants = conf.metadata?.participants || [];
            if (Array.isArray(participants)) {
                participants.forEach((id) => {
                    if (id !== userId)
                        contactIds.add(id);
                });
            }
        });
        // Get user details for contacts
        const contacts = await prisma_1.prisma.user.findMany({
            where: { id: { in: Array.from(contactIds) } },
            select: { id: true, username: true, email: true }
        });
        res.json({
            success: true,
            data: contacts
        });
    }
    catch (error) {
        console.error('Error fetching recent contacts:', error);
        res.status(500).json({ error: 'Failed to fetch recent contacts' });
    }
});
/**
 * @swagger
 * /api/video/conferences/{conferenceId}/breakout-rooms:
 *   post:
 *     summary: Create breakout rooms
 *     tags: [Video]
 */
router.post('/video/conferences/:conferenceId/breakout-rooms', auth_1.requireAuth, async (req, res) => {
    try {
        const { conferenceId } = req.params;
        const { name } = req.body;
        // Find conference by conferenceId (not database ID)
        const conference = await prisma_1.prisma.videoConference.findUnique({
            where: { conferenceId }
        });
        if (!conference) {
            return res.status(404).json({ error: 'Conference not found' });
        }
        const breakoutRoom = await prisma_1.prisma.breakoutRoom.create({
            data: {
                conferenceDbId: conference.id,
                name: name || `Room ${Date.now()}`,
                status: 'open',
                joinLink: `https://meet.skillstream.com/breakout/${Date.now()}`,
                participants: []
            }
        });
        res.status(201).json({
            success: true,
            data: breakoutRoom
        });
    }
    catch (error) {
        console.error('Error creating breakout room:', error);
        res.status(500).json({ error: 'Failed to create breakout room' });
    }
});
/**
 * @swagger
 * /api/video/conferences/{conferenceId}/breakout-rooms/{roomId}/assign:
 *   post:
 *     summary: Assign participants to breakout room
 *     tags: [Video]
 */
router.post('/video/conferences/:conferenceId/breakout-rooms/:roomId/assign', auth_1.requireAuth, async (req, res) => {
    try {
        const { roomId } = req.params;
        const { participantIds } = req.body;
        if (!Array.isArray(participantIds)) {
            return res.status(400).json({ error: 'participantIds must be an array' });
        }
        const room = await prisma_1.prisma.breakoutRoom.findUnique({
            where: { id: roomId }
        });
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        const updatedRoom = await prisma_1.prisma.breakoutRoom.update({
            where: { id: roomId },
            data: {
                participants: {
                    set: participantIds
                }
            }
        });
        res.json({
            success: true,
            data: updatedRoom
        });
    }
    catch (error) {
        console.error('Error assigning participants:', error);
        res.status(500).json({ error: 'Failed to assign participants' });
    }
});
/**
 * @swagger
 * /api/video/conferences/{conferenceId}/breakout-rooms/{roomId}/close:
 *   post:
 *     summary: Close a breakout room
 *     tags: [Video]
 */
router.post('/video/conferences/:conferenceId/breakout-rooms/:roomId/close', auth_1.requireAuth, async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await prisma_1.prisma.breakoutRoom.update({
            where: { id: roomId },
            data: {
                status: 'closed'
            }
        });
        res.json({
            success: true,
            data: room
        });
    }
    catch (error) {
        console.error('Error closing breakout room:', error);
        res.status(500).json({ error: 'Failed to close breakout room' });
    }
});
exports.default = router;

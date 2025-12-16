"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_export_service_1 = require("../../services/data-export.service");
const auth_1 = require("../../../../middleware/auth");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const dataExportService = new data_export_service_1.DataExportService();
/**
 * @swagger
 * /api/users/{userId}/data-export:
 *   get:
 *     summary: Export user data (GDPR compliance)
 *     tags: [Data Export]
 */
router.get('/users/:userId/data-export', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ userId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const data = await dataExportService.exportUserData(userId);
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        console.error('Error exporting user data:', error);
        res.status(500).json({ error: error.message || 'Failed to export user data' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/data-export/email:
 *   post:
 *     summary: Export user data and send via email
 *     tags: [Data Export]
 */
router.post('/users/:userId/data-export/email', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ userId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        await dataExportService.exportAndEmailUserData(userId);
        res.json({
            success: true,
            message: 'Data export sent to your email address'
        });
    }
    catch (error) {
        console.error('Error exporting and emailing user data:', error);
        res.status(500).json({ error: error.message || 'Failed to export and email user data' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/delete-account:
 *   delete:
 *     summary: Delete user account and all data (GDPR right to be forgotten)
 *     tags: [Data Export]
 */
router.delete('/users/:userId/delete-account', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ userId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        // Export data before deletion
        try {
            await dataExportService.exportAndEmailUserData(userId);
        }
        catch (exportError) {
            console.error('Error exporting data before deletion:', exportError);
            // Continue with deletion even if export fails
        }
        await dataExportService.deleteUserAccount(userId);
        res.json({
            success: true,
            message: 'Account and all associated data deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting user account:', error);
        res.status(500).json({ error: error.message || 'Failed to delete user account' });
    }
});
exports.default = router;

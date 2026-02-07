"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_service_1 = require("../../services/settings.service");
const auth_1 = require("../../../../middleware/auth");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const settingsService = new settings_service_1.SettingsService();
// Billing routes - defined first to ensure they match before general settings route
/**
 * @swagger
 * /api/users/{userId}/settings/billing:
 *   get:
 *     summary: Get user billing information
 *     tags: [Settings]
 */
router.get('/users/:userId/settings/billing', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        // For now, return empty billing info - can be extended to fetch from database
        res.json({
            success: true,
            data: {
                cardNumber: '',
                cardHolderName: '',
                expiryDate: '',
                cvv: '',
                street: '',
                city: '',
                state: '',
                zip: '',
                country: 'US',
            },
        });
    }
    catch (error) {
        console.error('Error fetching billing info:', error);
        res.status(500).json({ error: 'Failed to fetch billing info' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/settings/billing:
 *   put:
 *     summary: Update user billing information
 *     tags: [Settings]
 */
const billingInfoSchema = zod_1.z.object({
    cardNumber: zod_1.z.string().optional(),
    cardHolderName: zod_1.z.string().optional(),
    expiryDate: zod_1.z.string().optional(),
    cvv: zod_1.z.string().optional(),
    street: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    zip: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
});
router.put('/users/:userId/settings/billing', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ userId: zod_1.z.string().min(1) }),
    body: billingInfoSchema
}), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        // For now, just return the updated data - can be extended to save to database
        res.json({
            success: true,
            data: req.body,
            message: 'Billing information updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating billing info:', error);
        res.status(500).json({ error: 'Failed to update billing info' });
    }
});
// General settings routes
/**
 * @swagger
 * /api/users/{userId}/settings:
 *   get:
 *     summary: Get user settings
 *     tags: [Settings]
 */
router.get('/users/:userId/settings', auth_1.requireAuth, async (req, res) => {
    try {
        res.set('Cache-Control', 'private, no-store');
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        // Users can only access their own settings
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const settings = await settingsService.getUserSettings(userId);
        res.json({
            success: true,
            data: settings
        });
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/settings:
 *   put:
 *     summary: Update user settings
 *     tags: [Settings]
 */
const updateSettingsSchema = zod_1.z.object({
    notifications: zod_1.z.object({
        emailNotifications: zod_1.z.boolean().optional(),
        pushNotifications: zod_1.z.boolean().optional(),
        courseUpdates: zod_1.z.boolean().optional(),
        deadlineReminders: zod_1.z.boolean().optional(),
        newMessages: zod_1.z.boolean().optional(),
        marketingEmails: zod_1.z.boolean().optional(),
        weeklyDigest: zod_1.z.boolean().optional(),
        certificateIssued: zod_1.z.boolean().optional(),
        assignmentGraded: zod_1.z.boolean().optional(),
        quizResults: zod_1.z.boolean().optional(),
    }).optional(),
    privacy: zod_1.z.object({
        profileVisibility: zod_1.z.enum(['public', 'private', 'friends']).optional(),
        showEmail: zod_1.z.boolean().optional(),
        showProgress: zod_1.z.boolean().optional(),
        showAchievements: zod_1.z.boolean().optional(),
        showCertificates: zod_1.z.boolean().optional(),
    }).optional(),
    learning: zod_1.z.object({
        language: zod_1.z.string().optional(),
        timezone: zod_1.z.string().optional(),
        dateFormat: zod_1.z.string().optional(),
        videoPlaybackSpeed: zod_1.z.number().min(0.25).max(2.0).optional(),
        autoPlayVideos: zod_1.z.boolean().optional(),
        showSubtitles: zod_1.z.boolean().optional(),
        preferredSubtitleLang: zod_1.z.string().optional(),
    }).optional(),
    account: zod_1.z.object({
        twoFactorEnabled: zod_1.z.boolean().optional(),
        connectedAccounts: zod_1.z.object({
            google: zod_1.z.boolean().optional(),
            linkedin: zod_1.z.boolean().optional(),
        }).optional(),
    }).optional(),
    ui: zod_1.z.object({
        theme: zod_1.z.enum(['light', 'dark', 'auto']).optional(),
        compactMode: zod_1.z.boolean().optional(),
        sidebarCollapsed: zod_1.z.boolean().optional(),
    }).optional(),
});
router.put('/users/:userId/settings', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ userId: zod_1.z.string().min(1) }),
    body: updateSettingsSchema
}), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        // Users can only update their own settings
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const settings = await settingsService.updateUserSettings(userId, req.body);
        res.json({
            success: true,
            data: settings,
            message: 'Settings updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: error.message || 'Failed to update settings' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/settings/notifications:
 *   put:
 *     summary: Update notification preferences
 *     tags: [Settings]
 */
const notificationPreferencesSchema = zod_1.z.object({
    emailNotifications: zod_1.z.boolean().optional(),
    pushNotifications: zod_1.z.boolean().optional(),
    courseUpdates: zod_1.z.boolean().optional(),
    deadlineReminders: zod_1.z.boolean().optional(),
    newMessages: zod_1.z.boolean().optional(),
    marketingEmails: zod_1.z.boolean().optional(),
    weeklyDigest: zod_1.z.boolean().optional(),
    certificateIssued: zod_1.z.boolean().optional(),
    assignmentGraded: zod_1.z.boolean().optional(),
    quizResults: zod_1.z.boolean().optional(),
});
router.put('/users/:userId/settings/notifications', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ userId: zod_1.z.string().min(1) }),
    body: notificationPreferencesSchema
}), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const settings = await settingsService.updateNotificationPreferences(userId, req.body);
        res.json({
            success: true,
            data: settings,
            message: 'Notification preferences updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ error: 'Failed to update notification preferences' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/settings/privacy:
 *   put:
 *     summary: Update privacy settings
 *     tags: [Settings]
 */
const privacySettingsSchema = zod_1.z.object({
    profileVisibility: zod_1.z.enum(['public', 'private', 'friends']).optional(),
    showEmail: zod_1.z.boolean().optional(),
    showProgress: zod_1.z.boolean().optional(),
    showAchievements: zod_1.z.boolean().optional(),
    showCertificates: zod_1.z.boolean().optional(),
});
router.put('/users/:userId/settings/privacy', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ userId: zod_1.z.string().min(1) }),
    body: privacySettingsSchema
}), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const settings = await settingsService.updatePrivacySettings(userId, req.body);
        res.json({
            success: true,
            data: settings,
            message: 'Privacy settings updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating privacy settings:', error);
        res.status(500).json({ error: 'Failed to update privacy settings' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/settings/learning:
 *   put:
 *     summary: Update learning preferences
 *     tags: [Settings]
 */
const learningPreferencesSchema = zod_1.z.object({
    language: zod_1.z.string().optional(),
    timezone: zod_1.z.string().optional(),
    dateFormat: zod_1.z.string().optional(),
    videoPlaybackSpeed: zod_1.z.number().min(0.25).max(2.0).optional(),
    autoPlayVideos: zod_1.z.boolean().optional(),
    showSubtitles: zod_1.z.boolean().optional(),
    preferredSubtitleLang: zod_1.z.string().optional(),
});
router.put('/users/:userId/settings/learning', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ userId: zod_1.z.string().min(1) }),
    body: learningPreferencesSchema
}), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const settings = await settingsService.updateLearningPreferences(userId, req.body);
        res.json({
            success: true,
            data: settings,
            message: 'Learning preferences updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating learning preferences:', error);
        res.status(500).json({ error: 'Failed to update learning preferences' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/settings/account:
 *   put:
 *     summary: Update account settings
 *     tags: [Settings]
 */
const accountSettingsSchema = zod_1.z.object({
    twoFactorEnabled: zod_1.z.boolean().optional(),
    connectedAccounts: zod_1.z.object({
        google: zod_1.z.boolean().optional(),
        linkedin: zod_1.z.boolean().optional(),
    }).optional(),
});
router.put('/users/:userId/settings/account', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ userId: zod_1.z.string().min(1) }),
    body: accountSettingsSchema
}), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const settings = await settingsService.updateAccountSettings(userId, req.body);
        res.json({
            success: true,
            data: settings,
            message: 'Account settings updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating account settings:', error);
        res.status(500).json({ error: 'Failed to update account settings' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/settings/ui:
 *   put:
 *     summary: Update UI preferences
 *     tags: [Settings]
 */
const uiPreferencesSchema = zod_1.z.object({
    theme: zod_1.z.enum(['light', 'dark', 'auto']).optional(),
    compactMode: zod_1.z.boolean().optional(),
    sidebarCollapsed: zod_1.z.boolean().optional(),
});
router.put('/users/:userId/settings/ui', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ userId: zod_1.z.string().min(1) }),
    body: uiPreferencesSchema
}), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const settings = await settingsService.updateUIPreferences(userId, req.body);
        res.json({
            success: true,
            data: settings,
            message: 'UI preferences updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating UI preferences:', error);
        res.status(500).json({ error: 'Failed to update UI preferences' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/settings/two-factor:
 *   post:
 *     summary: Enable/disable two-factor authentication
 *     tags: [Settings]
 */
const twoFactorSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    secret: zod_1.z.string().optional(),
});
router.post('/users/:userId/settings/two-factor', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ userId: zod_1.z.string().min(1) }),
    body: twoFactorSchema
}), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const settings = await settingsService.toggleTwoFactor(userId, req.body.enabled, req.body.secret);
        res.json({
            success: true,
            data: settings,
            message: `Two-factor authentication ${req.body.enabled ? 'enabled' : 'disabled'} successfully`
        });
    }
    catch (error) {
        console.error('Error updating two-factor authentication:', error);
        res.status(500).json({ error: 'Failed to update two-factor authentication' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/settings/account-deletion:
 *   post:
 *     summary: Request account deletion
 *     tags: [Settings]
 */
const accountDeletionSchema = zod_1.z.object({
    deletionDate: zod_1.z.string().datetime(),
});
router.post('/users/:userId/settings/account-deletion', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ userId: zod_1.z.string().min(1) }),
    body: accountDeletionSchema
}), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const deletionDate = new Date(req.body.deletionDate);
        const settings = await settingsService.requestAccountDeletion(userId, deletionDate);
        res.json({
            success: true,
            data: settings,
            message: 'Account deletion requested successfully'
        });
    }
    catch (error) {
        console.error('Error requesting account deletion:', error);
        res.status(500).json({ error: 'Failed to request account deletion' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/settings/account-deletion:
 *   delete:
 *     summary: Cancel account deletion request
 *     tags: [Settings]
 */
router.delete('/users/:userId/settings/account-deletion', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ userId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const settings = await settingsService.cancelAccountDeletion(userId);
        res.json({
            success: true,
            data: settings,
            message: 'Account deletion request cancelled successfully'
        });
    }
    catch (error) {
        console.error('Error cancelling account deletion:', error);
        res.status(500).json({ error: 'Failed to cancel account deletion' });
    }
});
exports.default = router;

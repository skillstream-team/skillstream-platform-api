"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
/**
 * Default settings for new users
 */
const DEFAULT_SETTINGS = {
    emailNotifications: true,
    pushNotifications: true,
    courseUpdates: true,
    deadlineReminders: true,
    newMessages: true,
    marketingEmails: false,
    weeklyDigest: true,
    certificateIssued: true,
    assignmentGraded: true,
    quizResults: true,
    profileVisibility: 'public',
    showEmail: false,
    showProgress: true,
    showAchievements: true,
    showCertificates: true,
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    videoPlaybackSpeed: 1.0,
    autoPlayVideos: false,
    showSubtitles: false,
    preferredSubtitleLang: 'en',
    twoFactorEnabled: false,
    theme: 'light',
    compactMode: false,
    sidebarCollapsed: false,
};
class SettingsService {
    /**
     * Get user settings
     */
    async getUserSettings(userId) {
        let settings = await prisma_1.prisma.userSettings.findFirst({
            where: { userId },
        });
        // Create default settings if they don't exist
        if (!settings) {
            settings = await this.createDefaultSettings(userId);
        }
        return this.mapToDto(settings);
    }
    /**
     * Create default settings for a user
     */
    async createDefaultSettings(userId) {
        const settings = await prisma_1.prisma.userSettings.create({
            data: {
                userId,
                ...DEFAULT_SETTINGS,
            },
        });
        return settings;
    }
    /**
     * Update user settings
     */
    async updateUserSettings(userId, data) {
        // Get existing settings or create default
        let existing = await prisma_1.prisma.userSettings.findFirst({
            where: { userId },
        });
        if (!existing) {
            existing = await this.createDefaultSettings(userId);
        }
        // Build update data
        const updateData = {};
        if (data.notifications) {
            Object.assign(updateData, {
                emailNotifications: data.notifications.emailNotifications ?? existing.emailNotifications,
                pushNotifications: data.notifications.pushNotifications ?? existing.pushNotifications,
                courseUpdates: data.notifications.courseUpdates ?? existing.courseUpdates,
                deadlineReminders: data.notifications.deadlineReminders ?? existing.deadlineReminders,
                newMessages: data.notifications.newMessages ?? existing.newMessages,
                marketingEmails: data.notifications.marketingEmails ?? existing.marketingEmails,
                weeklyDigest: data.notifications.weeklyDigest ?? existing.weeklyDigest,
                certificateIssued: data.notifications.certificateIssued ?? existing.certificateIssued,
                assignmentGraded: data.notifications.assignmentGraded ?? existing.assignmentGraded,
                quizResults: data.notifications.quizResults ?? existing.quizResults,
            });
        }
        if (data.privacy) {
            Object.assign(updateData, {
                profileVisibility: data.privacy.profileVisibility ?? existing.profileVisibility,
                showEmail: data.privacy.showEmail ?? existing.showEmail,
                showProgress: data.privacy.showProgress ?? existing.showProgress,
                showAchievements: data.privacy.showAchievements ?? existing.showAchievements,
                showCertificates: data.privacy.showCertificates ?? existing.showCertificates,
            });
        }
        if (data.learning) {
            Object.assign(updateData, {
                language: data.learning.language ?? existing.language,
                timezone: data.learning.timezone ?? existing.timezone,
                dateFormat: data.learning.dateFormat ?? existing.dateFormat,
                videoPlaybackSpeed: data.learning.videoPlaybackSpeed ?? existing.videoPlaybackSpeed,
                autoPlayVideos: data.learning.autoPlayVideos ?? existing.autoPlayVideos,
                showSubtitles: data.learning.showSubtitles ?? existing.showSubtitles,
                preferredSubtitleLang: data.learning.preferredSubtitleLang ?? existing.preferredSubtitleLang,
            });
        }
        if (data.account) {
            Object.assign(updateData, {
                twoFactorEnabled: data.account.twoFactorEnabled ?? existing.twoFactorEnabled,
                connectedAccounts: data.account.connectedAccounts !== undefined
                    ? data.account.connectedAccounts
                    : existing.connectedAccounts,
            });
        }
        if (data.ui) {
            Object.assign(updateData, {
                theme: data.ui.theme ?? existing.theme,
                compactMode: data.ui.compactMode ?? existing.compactMode,
                sidebarCollapsed: data.ui.sidebarCollapsed ?? existing.sidebarCollapsed,
            });
        }
        const updated = await prisma_1.prisma.userSettings.update({
            where: { id: existing.id },
            data: updateData,
        });
        // Invalidate user cache
        await (0, cache_1.deleteCache)(`user:${userId}`);
        return this.mapToDto(updated);
    }
    /**
     * Update notification preferences
     */
    async updateNotificationPreferences(userId, preferences) {
        return this.updateUserSettings(userId, { notifications: preferences });
    }
    /**
     * Update privacy settings
     */
    async updatePrivacySettings(userId, settings) {
        return this.updateUserSettings(userId, { privacy: settings });
    }
    /**
     * Update learning preferences
     */
    async updateLearningPreferences(userId, preferences) {
        return this.updateUserSettings(userId, { learning: preferences });
    }
    /**
     * Update account settings
     */
    async updateAccountSettings(userId, settings) {
        return this.updateUserSettings(userId, { account: settings });
    }
    /**
     * Update UI preferences
     */
    async updateUIPreferences(userId, preferences) {
        return this.updateUserSettings(userId, { ui: preferences });
    }
    /**
     * Enable/disable two-factor authentication
     */
    async toggleTwoFactor(userId, enabled, secret) {
        const existing = await prisma_1.prisma.userSettings.findFirst({
            where: { userId },
        });
        if (!existing) {
            throw new Error('Settings not found');
        }
        const updateData = {
            twoFactorEnabled: enabled,
        };
        if (enabled && secret) {
            updateData.twoFactorSecret = secret;
        }
        else if (!enabled) {
            updateData.twoFactorSecret = null;
        }
        const updated = await prisma_1.prisma.userSettings.update({
            where: { id: existing.id },
            data: updateData,
        });
        return this.mapToDto(updated);
    }
    /**
     * Request account deletion
     */
    async requestAccountDeletion(userId, deletionDate) {
        const existing = await prisma_1.prisma.userSettings.findFirst({
            where: { userId },
        });
        if (!existing) {
            throw new Error('Settings not found');
        }
        const updated = await prisma_1.prisma.userSettings.update({
            where: { id: existing.id },
            data: {
                accountDeletionRequested: true,
                accountDeletionDate: deletionDate,
            },
        });
        return this.mapToDto(updated);
    }
    /**
     * Cancel account deletion request
     */
    async cancelAccountDeletion(userId) {
        const existing = await prisma_1.prisma.userSettings.findFirst({
            where: { userId },
        });
        if (!existing) {
            throw new Error('Settings not found');
        }
        const updated = await prisma_1.prisma.userSettings.update({
            where: { id: existing.id },
            data: {
                accountDeletionRequested: false,
                accountDeletionDate: null,
            },
        });
        return this.mapToDto(updated);
    }
    /**
     * Map Prisma model to DTO
     */
    mapToDto(settings) {
        return {
            id: settings.id,
            userId: settings.userId,
            notifications: {
                emailNotifications: settings.emailNotifications,
                pushNotifications: settings.pushNotifications,
                courseUpdates: settings.courseUpdates,
                deadlineReminders: settings.deadlineReminders,
                newMessages: settings.newMessages,
                marketingEmails: settings.marketingEmails,
                weeklyDigest: settings.weeklyDigest,
                certificateIssued: settings.certificateIssued,
                assignmentGraded: settings.assignmentGraded,
                quizResults: settings.quizResults,
            },
            privacy: {
                profileVisibility: settings.profileVisibility,
                showEmail: settings.showEmail,
                showProgress: settings.showProgress,
                showAchievements: settings.showAchievements,
                showCertificates: settings.showCertificates,
            },
            learning: {
                language: settings.language,
                timezone: settings.timezone,
                dateFormat: settings.dateFormat,
                videoPlaybackSpeed: settings.videoPlaybackSpeed,
                autoPlayVideos: settings.autoPlayVideos,
                showSubtitles: settings.showSubtitles,
                preferredSubtitleLang: settings.preferredSubtitleLang,
            },
            account: {
                twoFactorEnabled: settings.twoFactorEnabled,
                connectedAccounts: settings.connectedAccounts
                    ? (typeof settings.connectedAccounts === 'string'
                        ? JSON.parse(settings.connectedAccounts)
                        : settings.connectedAccounts)
                    : undefined,
            },
            ui: {
                theme: settings.theme,
                compactMode: settings.compactMode,
                sidebarCollapsed: settings.sidebarCollapsed,
            },
            createdAt: settings.createdAt,
            updatedAt: settings.updatedAt,
        };
    }
}
exports.SettingsService = SettingsService;

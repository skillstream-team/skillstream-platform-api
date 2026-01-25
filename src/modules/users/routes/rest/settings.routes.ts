import { Router } from 'express';
import { SettingsService } from '../../services/settings.service';
import { requireAuth } from '../../../../middleware/auth';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const settingsService = new SettingsService();

// Billing routes - defined first to ensure they match before general settings route
/**
 * @swagger
 * /api/users/{userId}/settings/billing:
 *   get:
 *     summary: Get user billing information
 *     tags: [Settings]
 */
router.get('/users/:userId/settings/billing', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).user?.id;

    if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
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
  } catch (error) {
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
const billingInfoSchema = z.object({
  cardNumber: z.string().optional(),
  cardHolderName: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

router.put('/users/:userId/settings/billing',
  requireAuth,
  validate({ 
    params: z.object({ userId: z.string().min(1) }),
    body: billingInfoSchema 
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // For now, just return the updated data - can be extended to save to database
      res.json({
        success: true,
        data: req.body,
        message: 'Billing information updated successfully',
      });
    } catch (error) {
      console.error('Error updating billing info:', error);
      res.status(500).json({ error: 'Failed to update billing info' });
    }
  }
);

// General settings routes
/**
 * @swagger
 * /api/users/{userId}/settings:
 *   get:
 *     summary: Get user settings
 *     tags: [Settings]
 */
router.get('/users/:userId/settings', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).user?.id;

    // Users can only access their own settings
    if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const settings = await settingsService.getUserSettings(userId);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
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
const updateSettingsSchema = z.object({
  notifications: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    courseUpdates: z.boolean().optional(),
    deadlineReminders: z.boolean().optional(),
    newMessages: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
    certificateIssued: z.boolean().optional(),
    assignmentGraded: z.boolean().optional(),
    quizResults: z.boolean().optional(),
  }).optional(),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'private', 'friends']).optional(),
    showEmail: z.boolean().optional(),
    showProgress: z.boolean().optional(),
    showAchievements: z.boolean().optional(),
    showCertificates: z.boolean().optional(),
  }).optional(),
  learning: z.object({
    language: z.string().optional(),
    timezone: z.string().optional(),
    dateFormat: z.string().optional(),
    videoPlaybackSpeed: z.number().min(0.25).max(2.0).optional(),
    autoPlayVideos: z.boolean().optional(),
    showSubtitles: z.boolean().optional(),
    preferredSubtitleLang: z.string().optional(),
  }).optional(),
  account: z.object({
    twoFactorEnabled: z.boolean().optional(),
    connectedAccounts: z.object({
      google: z.boolean().optional(),
      linkedin: z.boolean().optional(),
    }).optional(),
  }).optional(),
  ui: z.object({
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    compactMode: z.boolean().optional(),
    sidebarCollapsed: z.boolean().optional(),
  }).optional(),
});

router.put('/users/:userId/settings',
  requireAuth,
  validate({ 
    params: z.object({ userId: z.string().min(1) }),
    body: updateSettingsSchema 
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      // Users can only update their own settings
      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const settings = await settingsService.updateUserSettings(userId, req.body);
      
      res.json({
        success: true,
        data: settings,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to update settings' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/settings/notifications:
 *   put:
 *     summary: Update notification preferences
 *     tags: [Settings]
 */
const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  courseUpdates: z.boolean().optional(),
  deadlineReminders: z.boolean().optional(),
  newMessages: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  certificateIssued: z.boolean().optional(),
  assignmentGraded: z.boolean().optional(),
  quizResults: z.boolean().optional(),
});

router.put('/users/:userId/settings/notifications',
  requireAuth,
  validate({ 
    params: z.object({ userId: z.string().min(1) }),
    body: notificationPreferencesSchema 
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const settings = await settingsService.updateNotificationPreferences(userId, req.body);
      
      res.json({
        success: true,
        data: settings,
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/settings/privacy:
 *   put:
 *     summary: Update privacy settings
 *     tags: [Settings]
 */
const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'private', 'friends']).optional(),
  showEmail: z.boolean().optional(),
  showProgress: z.boolean().optional(),
  showAchievements: z.boolean().optional(),
  showCertificates: z.boolean().optional(),
});

router.put('/users/:userId/settings/privacy',
  requireAuth,
  validate({ 
    params: z.object({ userId: z.string().min(1) }),
    body: privacySettingsSchema 
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const settings = await settingsService.updatePrivacySettings(userId, req.body);
      
      res.json({
        success: true,
        data: settings,
        message: 'Privacy settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      res.status(500).json({ error: 'Failed to update privacy settings' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/settings/learning:
 *   put:
 *     summary: Update learning preferences
 *     tags: [Settings]
 */
const learningPreferencesSchema = z.object({
  language: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  videoPlaybackSpeed: z.number().min(0.25).max(2.0).optional(),
  autoPlayVideos: z.boolean().optional(),
  showSubtitles: z.boolean().optional(),
  preferredSubtitleLang: z.string().optional(),
});

router.put('/users/:userId/settings/learning',
  requireAuth,
  validate({ 
    params: z.object({ userId: z.string().min(1) }),
    body: learningPreferencesSchema 
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const settings = await settingsService.updateLearningPreferences(userId, req.body);
      
      res.json({
        success: true,
        data: settings,
        message: 'Learning preferences updated successfully'
      });
    } catch (error) {
      console.error('Error updating learning preferences:', error);
      res.status(500).json({ error: 'Failed to update learning preferences' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/settings/account:
 *   put:
 *     summary: Update account settings
 *     tags: [Settings]
 */
const accountSettingsSchema = z.object({
  twoFactorEnabled: z.boolean().optional(),
  connectedAccounts: z.object({
    google: z.boolean().optional(),
    linkedin: z.boolean().optional(),
  }).optional(),
});

router.put('/users/:userId/settings/account',
  requireAuth,
  validate({ 
    params: z.object({ userId: z.string().min(1) }),
    body: accountSettingsSchema 
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const settings = await settingsService.updateAccountSettings(userId, req.body);
      
      res.json({
        success: true,
        data: settings,
        message: 'Account settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating account settings:', error);
      res.status(500).json({ error: 'Failed to update account settings' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/settings/ui:
 *   put:
 *     summary: Update UI preferences
 *     tags: [Settings]
 */
const uiPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  compactMode: z.boolean().optional(),
  sidebarCollapsed: z.boolean().optional(),
});

router.put('/users/:userId/settings/ui',
  requireAuth,
  validate({ 
    params: z.object({ userId: z.string().min(1) }),
    body: uiPreferencesSchema 
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const settings = await settingsService.updateUIPreferences(userId, req.body);
      
      res.json({
        success: true,
        data: settings,
        message: 'UI preferences updated successfully'
      });
    } catch (error) {
      console.error('Error updating UI preferences:', error);
      res.status(500).json({ error: 'Failed to update UI preferences' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/settings/two-factor:
 *   post:
 *     summary: Enable/disable two-factor authentication
 *     tags: [Settings]
 */
const twoFactorSchema = z.object({
  enabled: z.boolean(),
  secret: z.string().optional(),
});

router.post('/users/:userId/settings/two-factor',
  requireAuth,
  validate({ 
    params: z.object({ userId: z.string().min(1) }),
    body: twoFactorSchema 
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const settings = await settingsService.toggleTwoFactor(
        userId,
        req.body.enabled,
        req.body.secret
      );
      
      res.json({
        success: true,
        data: settings,
        message: `Two-factor authentication ${req.body.enabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Error updating two-factor authentication:', error);
      res.status(500).json({ error: 'Failed to update two-factor authentication' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/settings/account-deletion:
 *   post:
 *     summary: Request account deletion
 *     tags: [Settings]
 */
const accountDeletionSchema = z.object({
  deletionDate: z.string().datetime(),
});

router.post('/users/:userId/settings/account-deletion',
  requireAuth,
  validate({ 
    params: z.object({ userId: z.string().min(1) }),
    body: accountDeletionSchema 
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

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
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      res.status(500).json({ error: 'Failed to request account deletion' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/settings/account-deletion:
 *   delete:
 *     summary: Cancel account deletion request
 *     tags: [Settings]
 */
router.delete('/users/:userId/settings/account-deletion',
  requireAuth,
  validate({ params: z.object({ userId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const settings = await settingsService.cancelAccountDeletion(userId);
      
      res.json({
        success: true,
        data: settings,
        message: 'Account deletion request cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling account deletion:', error);
      res.status(500).json({ error: 'Failed to cancel account deletion' });
    }
  }
);

export default router;

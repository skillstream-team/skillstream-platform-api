/**
 * User Settings DTOs
 * Handles user preferences and settings
 */

export interface NotificationPreferencesDto {
  emailNotifications: boolean;
  pushNotifications: boolean;
  courseUpdates: boolean;
  deadlineReminders: boolean;
  newMessages: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
  certificateIssued: boolean;
  assignmentGraded: boolean;
  quizResults: boolean;
}

export interface PrivacySettingsDto {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showProgress: boolean;
  showAchievements: boolean;
  showCertificates: boolean;
}

export interface LearningPreferencesDto {
  language: string;
  timezone: string;
  dateFormat: string;
  videoPlaybackSpeed: number;
  autoPlayVideos: boolean;
  showSubtitles: boolean;
  preferredSubtitleLang: string;
}

export interface AccountSettingsDto {
  twoFactorEnabled: boolean;
  connectedAccounts?: {
    google?: boolean;
    linkedin?: boolean;
  };
}

export interface UIPreferencesDto {
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  sidebarCollapsed: boolean;
}

export interface UserSettingsDto {
  id: string;
  userId: string;
  notifications: NotificationPreferencesDto;
  privacy: PrivacySettingsDto;
  learning: LearningPreferencesDto;
  account: AccountSettingsDto;
  ui: UIPreferencesDto;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserSettingsDto {
  notifications?: Partial<NotificationPreferencesDto>;
  privacy?: Partial<PrivacySettingsDto>;
  learning?: Partial<LearningPreferencesDto>;
  account?: Partial<AccountSettingsDto>;
  ui?: Partial<UIPreferencesDto>;
}

export interface CreateUserSettingsDto {
  userId: string;
  notifications?: Partial<NotificationPreferencesDto>;
  privacy?: Partial<PrivacySettingsDto>;
  learning?: Partial<LearningPreferencesDto>;
  account?: Partial<AccountSettingsDto>;
  ui?: Partial<UIPreferencesDto>;
}

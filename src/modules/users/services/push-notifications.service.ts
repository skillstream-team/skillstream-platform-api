import { prisma } from '../../../utils/prisma';
import webpush from 'web-push';
import { getMessaging } from '../../../utils/firebase';

export interface PushSubscriptionDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: {
    url?: string;
    type?: string;
    id?: string;
    [key: string]: any;
  };
}

export class PushNotificationsService {
  private vapidPublicKey: string;
  private vapidPrivateKey: string;
  private vapidContactEmail: string;

  constructor() {
    this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
    this.vapidContactEmail = process.env.VAPID_CONTACT_EMAIL || 'mailto:noreply@skillstream.com';

    // Set VAPID details for web-push
    if (this.vapidPublicKey && this.vapidPrivateKey) {
      webpush.setVapidDetails(
        this.vapidContactEmail,
        this.vapidPublicKey,
        this.vapidPrivateKey
      );
    }
  }

  /**
   * Subscribe a user to push notifications (VAPID)
   */
  async subscribe(userId: string, subscription: PushSubscriptionDto): Promise<void> {
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      throw new Error('Invalid push subscription data');
    }

    await prisma.pushSubscription.upsert({
      where: { userId },
      update: {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
    });
  }

  /**
   * Register FCM token for a user (Firebase Cloud Messaging)
   */
  async registerFcmToken(userId: string, fcmToken: string): Promise<void> {
    if (!fcmToken || typeof fcmToken !== 'string') {
      throw new Error('Invalid FCM token');
    }

    await prisma.pushSubscription.upsert({
      where: { userId },
      update: {
        fcmToken,
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint: '',
        keys: {},
        fcmToken,
      },
    });
  }

  /**
   * Unsubscribe a user from push notifications
   */
  async unsubscribe(userId: string): Promise<void> {
    await prisma.pushSubscription.delete({
      where: { userId },
    }).catch(() => {
      // Ignore error if subscription doesn't exist
    });
  }

  /**
   * Get user's push subscription status
   */
  async getSubscriptionStatus(userId: string): Promise<{ subscribed: boolean }> {
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId },
    });

    return {
      subscribed: !!subscription,
    };
  }

  /**
   * Get user's push subscription (VAPID format for legacy; FCM is stored separately)
   */
  async getSubscription(userId: string): Promise<(PushSubscriptionDto & { fcmToken?: string | null }) | null> {
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId },
    });

    if (!subscription) return null;

    const result: PushSubscriptionDto & { fcmToken?: string | null } = {
      endpoint: subscription.endpoint || '',
      keys: (subscription.keys as { p256dh: string; auth: string }) || { p256dh: '', auth: '' },
    };
    if (subscription.fcmToken) result.fcmToken = subscription.fcmToken;
    return result;
  }

  /**
   * Send a push notification to a user (tries FCM first if token exists, else VAPID)
   */
  async sendNotification(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<void> {
    const record = await prisma.pushSubscription.findUnique({
      where: { userId },
    });

    if (!record) {
      throw new Error('User does not have a push subscription');
    }

    // Prefer FCM when available
    if (record.fcmToken) {
      try {
        const messaging = getMessaging();
        await messaging.send({
          token: record.fcmToken,
          notification: {
            title: payload.title,
            body: payload.body,
            imageUrl: payload.image,
          },
          webpush: {
            notification: {
              title: payload.title,
              body: payload.body,
              icon: payload.icon || '/vite.svg',
              badge: payload.badge || '/vite.svg',
              image: payload.image,
              tag: payload.tag,
              data: payload.data as Record<string, string> | undefined,
            },
            fcmOptions: payload.data?.url ? { link: payload.data.url } : undefined,
          },
          data: payload.data as Record<string, string> | undefined,
        });
        return;
      } catch (error: any) {
        if (error?.code === 'messaging/registration-token-not-registered' || error?.code === 'messaging/invalid-registration-token') {
          await prisma.pushSubscription.update({
            where: { userId },
            data: { fcmToken: null },
          });
        }
        throw error;
      }
    }

    // Fallback to VAPID web-push
    if (!record.endpoint || !record.keys) {
      throw new Error('User does not have a valid push subscription');
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/vite.svg',
      badge: payload.badge || '/vite.svg',
      image: payload.image,
      tag: payload.tag,
      data: payload.data,
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: record.endpoint,
          keys: record.keys as { p256dh: string; auth: string },
        },
        notificationPayload
      );
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await this.unsubscribe(userId);
        throw new Error('Push subscription is invalid and has been removed');
      }
      throw error;
    }
  }

  /**
   * Send push notifications to multiple users
   */
  async sendNotificationsToUsers(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = {
      success: [] as string[],
      failed: [] as string[],
    };

    // Send notifications in parallel
    const promises = userIds.map(async (userId) => {
      try {
        await this.sendNotification(userId, payload);
        results.success.push(userId);
      } catch (error) {
        results.failed.push(userId);
        console.error(`Failed to send push notification to user ${userId}:`, error);
      }
    });

    await Promise.allSettled(promises);

    return results;
  }

  /**
   * Get VAPID public key (for frontend)
   */
  getVapidPublicKey(): string {
    if (!this.vapidPublicKey) {
      throw new Error('VAPID public key is not configured');
    }
    return this.vapidPublicKey;
  }
}


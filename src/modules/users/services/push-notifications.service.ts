import { prisma } from '../../../utils/prisma';
import webpush from 'web-push';

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
   * Subscribe a user to push notifications
   */
  async subscribe(userId: string, subscription: PushSubscriptionDto): Promise<void> {
    // Validate subscription
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      throw new Error('Invalid push subscription data');
    }

    // Upsert subscription (update if exists, create if not)
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
   * Get user's push subscription
   */
  async getSubscription(userId: string): Promise<PushSubscriptionDto | null> {
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return null;
    }

    return {
      endpoint: subscription.endpoint,
      keys: subscription.keys as { p256dh: string; auth: string },
    };
  }

  /**
   * Send a push notification to a user
   */
  async sendNotification(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<void> {
    const subscription = await this.getSubscription(userId);

    if (!subscription) {
      throw new Error('User does not have a push subscription');
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
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
        notificationPayload
      );
    } catch (error: any) {
      // If subscription is invalid (410 Gone), remove it
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


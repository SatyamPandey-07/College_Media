/**
 * Push Notification Service
 * Issue #964: Advanced Multi-Channel Notification System
 * 
 * Handles Web Push notifications using VAPID keys.
 */

const webpush = require('web-push');

class PushNotificationService {
    constructor() {
        this.configured = false;
        this.initialize();
    }

    initialize() {
        const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
        const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
        const mailto = process.env.VAPID_MAILTO || 'mailto:admin@example.com';

        if (publicVapidKey && privateVapidKey) {
            webpush.setVapidDetails(mailto, publicVapidKey, privateVapidKey);
            this.configured = true;
            console.log('[PushService] VAPID keys configured');
        } else {
            console.warn('[PushService] VAPID keys missing - push notifications disabled');
        }
    }

    /**
     * Send push notification to a user
     */
    async sendToUser(userPreferences, notification) {
        if (!this.configured) return { success: false, error: 'Not configured' };

        const payload = JSON.stringify({
            title: notification.title,
            body: notification.body,
            icon: notification.data?.image || '/icon-192x192.png',
            badge: '/badge-72x72.png',
            url: notification.data?.url || '/',
            data: notification.data,
            timestamp: Date.now()
        });

        const subscriptions = userPreferences.pushSubscriptions || [];
        const results = [];
        const invalidEndpoints = [];

        // Send to all active subscriptions
        for (const subscription of subscriptions) {
            try {
                await webpush.sendNotification(subscription, payload);
                results.push({ success: true, endpoint: subscription.endpoint });
            } catch (error) {
                console.error(`[PushService] Send error for ${subscription.endpoint}:`, error.statusCode);

                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Subscription expired or invalid
                    invalidEndpoints.push(subscription.endpoint);
                }

                results.push({
                    success: false,
                    endpoint: subscription.endpoint,
                    error: error.message
                });
            }
        }

        // Cleanup invalid subscriptions
        if (invalidEndpoints.length > 0) {
            await this.removeInvalidSubscriptions(userPreferences._id, invalidEndpoints);
        }

        const successCount = results.filter(r => r.success).length;
        return {
            success: successCount > 0,
            deliveredTo: successCount,
            total: subscriptions.length
        };
    }

    /**
     * Remove invalid subscriptions from database
     */
    async removeInvalidSubscriptions(preferenceId, endpoints) {
        try {
            const NotificationPreferences = require('../models/NotificationPreferences');
            await NotificationPreferences.updateOne(
                { _id: preferenceId },
                {
                    $pull: {
                        pushSubscriptions: {
                            endpoint: { $in: endpoints }
                        }
                    }
                }
            );
            console.log(`[PushService] Removed ${endpoints.length} invalid subscriptions`);
        } catch (error) {
            console.error('[PushService] Error removing invalid subscriptions:', error);
        }
    }

    /**
     * Get VAPID public key for frontend
     */
    getPublicKey() {
        return process.env.VAPID_PUBLIC_KEY;
    }
}

module.exports = new PushNotificationService();

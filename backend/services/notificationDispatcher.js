/**
 * Notification Dispatcher
 * Issue #964: Advanced Multi-Channel Notification System
 * 
 * Coordinates multi-channel notification delivery based on user preferences.
 */

const Notification = require('../models/Notification');
const NotificationPreferences = require('../models/NotificationPreferences');
const pushService = require('./pushNotificationService');
const { sendToUser, isUserOnline } = require('../socket'); // Re-using existing socket service

class NotificationDispatcher {

    /**
     * Send a notification to a user
     */
    async send(recipientId, payload) {
        try {
            // 1. Get user preferences
            let preferences = await NotificationPreferences.findOne({ user: recipientId });

            // Create defaults if not exists
            if (!preferences) {
                preferences = await NotificationPreferences.create({ user: recipientId });
            }

            // 2. Create notification record
            const notification = new Notification({
                recipient: recipientId,
                sender: payload.sender,
                type: payload.type,
                category: payload.category || this.inferCategory(payload.type),
                title: payload.title,
                body: payload.body,
                data: payload.data,
                priority: payload.priority || 'normal',
                groupKey: payload.groupKey,
                expiresAt: payload.expiresAt,
                tenantId: payload.tenantId
            });

            // 3. Determine channels based on preferences
            const channels = {
                inApp: preferences.shouldSend('inApp', notification.category),
                push: preferences.shouldSend('push', notification.category),
                email: preferences.shouldSend('email', notification.category)
            };

            // 4. Handle Quiet Hours for Push
            if (channels.push && preferences.isInQuietHours() && notification.priority !== 'urgent') {
                channels.push = false;
                console.log(`[Dispatcher] Suppressed push for user ${recipientId} due to quiet hours`);
            }

            // 5. Deliver: In-App (WebSocket)
            if (channels.inApp) {
                if (isUserOnline(recipientId)) {
                    sendToUser(recipientId, 'notification:new', notification);
                    notification.markChannelDelivered('inApp');
                }
            }

            // 6. Deliver: Push Notification
            if (channels.push) {
                // Run async, don't block
                this.sendPush(preferences, notification).then(status => {
                    if (status.success) {
                        notification.markChannelDelivered('push');
                    }
                });
            }

            // 7. Deliver: Email (Immediate vs Digest)
            if (channels.email) {
                if (preferences.digest.frequency === 'never' || notification.priority === 'urgent') {
                    // Send immediately (placeholder)
                    // await emailService.sendNotification(user, notification);
                    notification.markChannelDelivered('email');
                    // Mark as not needing digest
                    notification.channels.email.includeInDigest = false;
                } else {
                    // Leave includeInDigest=true for the scheduler
                    notification.channels.email.includeInDigest = true;
                }
            } else {
                notification.channels.email.includeInDigest = false;
            }

            // 8. Save notification
            await notification.save();

            return notification;

        } catch (error) {
            console.error('[NotificationDispatcher] Error dispatching:', error);
            throw error;
        }
    }

    /**
     * Helper to execute push sending
     */
    async sendPush(preferences, notification) {
        try {
            const result = await pushService.sendToUser(preferences, notification);
            return result;
        } catch (error) {
            console.error('[NotificationDispatcher] Push error:', error);
            return { success: false };
        }
    }

    /**
     * Infer category from type
     */
    inferCategory(type) {
        const map = {
            like: 'social',
            comment: 'social',
            follow: 'social',
            mention: 'social',
            reply: 'social',
            share: 'content',
            post: 'content',
            message: 'messaging',
            event: 'events',
            announcement: 'system',
            system: 'system',
            reminder: 'system',
            achievement: 'system'
        };
        return map[type] || 'system';
    }
}

module.exports = new NotificationDispatcher();

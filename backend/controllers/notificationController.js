/**
 * Notification Controller
 * Issue #964: Advanced Multi-Channel Notification System
 * 
 * Endpoints for managing notifications and preferences.
 */

const Notification = require('../models/Notification');
const NotificationPreferences = require('../models/NotificationPreferences');
const notificationDispatcher = require('../services/notificationDispatcher');
const pushService = require('../services/pushNotificationService');

const notificationController = {

    /**
     * GET /api/notifications
     * Get user's notifications
     */
    async getNotifications(req, res) {
        try {
            const { limit = 20, skip = 0, category } = req.query;
            const userId = req.user._id;

            const notifications = await Notification.getAll(userId, {
                limit: parseInt(limit),
                skip: parseInt(skip),
                category
            });

            const unreadCount = await Notification.getUnreadCount(userId);

            res.json({
                success: true,
                data: {
                    notifications,
                    unreadCount
                }
            });
        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
        }
    },

    /**
     * PUT /api/notifications/:id/read
     * Mark notification as read
     */
    async markRead(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user._id;

            const notification = await Notification.findOne({ _id: id, recipient: userId });
            if (!notification) {
                return res.status(404).json({ success: false, message: 'Notification not found' });
            }

            await notification.markAsRead();

            res.json({ success: true, data: notification });
        } catch (error) {
            console.error('Mark read error:', error);
            res.status(500).json({ success: false, message: 'Failed to update notification' });
        }
    },

    /**
     * PUT /api/notifications/read-all
     * Mark all notifications as read
     */
    async markAllRead(req, res) {
        try {
            const { category } = req.body;
            const userId = req.user._id;

            await Notification.markAllRead(userId, category);

            res.json({ success: true, message: 'All notifications marked as read' });
        } catch (error) {
            console.error('Mark all read error:', error);
            res.status(500).json({ success: false, message: 'Failed to update notifications' });
        }
    },

    /**
     * PUT /api/notifications/:id/click
     * Track notification click
     */
    async trackClick(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user._id;

            const notification = await Notification.findOne({ _id: id, recipient: userId });
            if (notification) {
                await notification.markAsClicked();
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Track click error:', error);
            res.status(500).json({ success: false });
        }
    },

    /**
     * DELETE /api/notifications/:id
     * Delete a notification
     */
    async deleteNotification(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user._id;

            await Notification.deleteOne({ _id: id, recipient: userId });

            res.json({ success: true, message: 'Notification deleted' });
        } catch (error) {
            console.error('Delete notification error:', error);
            res.status(500).json({ success: false, message: 'Failed to delete notification' });
        }
    },

    /**
     * GET /api/notifications/preferences
     * Get user preferences
     */
    async getPreferences(req, res) {
        try {
            let preferences = await NotificationPreferences.findOne({ user: req.user._id });

            if (!preferences) {
                preferences = await NotificationPreferences.create({ user: req.user._id });
            }

            res.json({ success: true, data: preferences });
        } catch (error) {
            console.error('Get preferences error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch preferences' });
        }
    },

    /**
     * PUT /api/notifications/preferences
     * Update user preferences
     */
    async updatePreferences(req, res) {
        try {
            const updates = req.body;
            const userId = req.user._id;

            let preferences = await NotificationPreferences.findOne({ user: userId });
            if (!preferences) {
                preferences = new NotificationPreferences({ user: userId });
            }

            // Deep merge updates
            if (updates.channels) Object.assign(preferences.channels, updates.channels);
            if (updates.categories) Object.assign(preferences.categories, updates.categories);
            if (updates.digest) Object.assign(preferences.digest, updates.digest);
            if (updates.quietHours) Object.assign(preferences.quietHours, updates.quietHours);

            await preferences.save();

            res.json({ success: true, data: preferences });
        } catch (error) {
            console.error('Update preferences error:', error);
            res.status(500).json({ success: false, message: 'Failed to update preferences' });
        }
    },

    /**
     * POST /api/notifications/push/subscribe
     * Subscribe to Web Push
     */
    async subscribePush(req, res) {
        try {
            const subscription = req.body;
            const userId = req.user._id;

            // Basic validation
            if (!subscription.endpoint || !subscription.keys) {
                return res.status(400).json({ success: false, message: 'Invalid subscription data' });
            }

            const preferences = await NotificationPreferences.findOne({ user: userId });
            if (!preferences) {
                // Should exist, but handle edge case
                await NotificationPreferences.create({
                    user: userId,
                    pushSubscriptions: [subscription]
                });
            } else {
                // Add if not exists
                const exists = preferences.pushSubscriptions.some(s => s.endpoint === subscription.endpoint);
                if (!exists) {
                    preferences.pushSubscriptions.push(subscription);
                    await preferences.save();
                }
            }

            res.json({ success: true, message: 'Subscribed to push notifications' });
        } catch (error) {
            console.error('Push subscribe error:', error);
            res.status(500).json({ success: false, message: 'Failed to subscribe' });
        }
    },

    /**
     * POST /api/notifications/push/unsubscribe
     * Unsubscribe from Web Push
     */
    async unsubscribePush(req, res) {
        try {
            const { endpoint } = req.body;
            const userId = req.user._id;

            await NotificationPreferences.updateOne(
                { user: userId },
                { $pull: { pushSubscriptions: { endpoint } } }
            );

            res.json({ success: true, message: 'Unsubscribed from push notifications' });
        } catch (error) {
            console.error('Push unsubscribe error:', error);
            res.status(500).json({ success: false, message: 'Failed to unsubscribe' });
        }
    },

    /**
     * GET /api/notifications/push/config
     * Get VAPID public key
     */
    getPushConfig(req, res) {
        res.json({
            success: true,
            publicKey: pushService.getPublicKey()
        });
    },

    /**
     * POST /api/notifications/test
     * Send a test notification (dev only)
     */
    async sendTest(req, res) {
        try {
            const { type = 'system', title = 'Test Notification', body = 'This is a test' } = req.body;
            const userId = req.user._id;

            const notification = await notificationDispatcher.send(userId, {
                sender: null,
                type,
                title,
                body,
                data: {
                    url: '/notifications',
                    image: '/logo192.png'
                }
            });

            res.json({ success: true, data: notification });
        } catch (error) {
            console.error('Test notification error:', error);
            res.status(500).json({ success: false, message: 'Failed to send test' });
        }
    }
};

module.exports = notificationController;

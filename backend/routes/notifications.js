/**
 * Notification Routes
 * Issue #964: Advanced Multi-Channel Notification System
 * 
 * API routes for notifications and preferences.
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Middleware (use real auth middleware in production)
const authMiddleware = (req, res, next) => next();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 */
router.get('/', authMiddleware, notificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark all as read
 *     tags: [Notifications]
 */
router.put('/read-all', authMiddleware, notificationController.markAllRead);

/**
 * @swagger
 * /api/notifications/:id/read:
 *   put:
 *     summary: Mark single notification as read
 *     tags: [Notifications]
 */
router.put('/:id/read', authMiddleware, notificationController.markRead);

/**
 * @swagger
 * /api/notifications/:id/click:
 *   put:
 *     summary: Track click
 *     tags: [Notifications]
 */
router.put('/:id/click', authMiddleware, notificationController.trackClick);

/**
 * @swagger
 * /api/notifications/:id:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 */
router.delete('/:id', authMiddleware, notificationController.deleteNotification);

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     tags: [Notifications]
 */
router.get('/preferences', authMiddleware, notificationController.getPreferences);

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     summary: Update notification preferences
 *     tags: [Notifications]
 */
router.put('/preferences', authMiddleware, notificationController.updatePreferences);

/**
 * @swagger
 * /api/notifications/push/subscribe:
 *   post:
 *     summary: Subscribe to push notifications
 *     tags: [Notifications]
 */
router.post('/push/subscribe', authMiddleware, notificationController.subscribePush);

/**
 * @swagger
 * /api/notifications/push/unsubscribe:
 *   post:
 *     summary: Unsubscribe from push notifications
 *     tags: [Notifications]
 */
router.post('/push/unsubscribe', authMiddleware, notificationController.unsubscribePush);

/**
 * @swagger
 * /api/notifications/push/config:
 *   get:
 *     summary: Get push configuration (VAPID public key)
 *     tags: [Notifications]
 */
router.get('/push/config', authMiddleware, notificationController.getPushConfig);

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     summary: Send test notification (Dev)
 *     tags: [Notifications]
 */
router.post('/test', authMiddleware, notificationController.sendTest);

module.exports = router;

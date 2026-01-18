/**
 * Digest Scheduler
 * Issue #964: Advanced Multi-Channel Notification System
 * 
 * Background job to process and send email digests.
 */

const cron = require('node-cron');
const Notification = require('../models/Notification');
const NotificationPreferences = require('../models/NotificationPreferences');
const emailDigestService = require('../services/emailDigestService');

class DigestScheduler {
    constructor() {
        this.jobs = [];
        this.batchSize = 100; // Process 100 users at a time
    }

    /**
     * Start scheduler
     */
    start() {
        console.log('[DigestScheduler] Starting digest jobs...');

        // Daily Digest: Run every hour to check user's preferred time
        // In production, we'd use a more robust queue system
        this.jobs.push(
            cron.schedule('0 * * * *', () => this.processDailyDigests())
        );

        // Weekly Digest: Run every hour to check time and day
        this.jobs.push(
            cron.schedule('0 * * * *', () => this.processWeeklyDigests())
        );

        console.log('[DigestScheduler] Jobs scheduled');
    }

    /**
     * Stop scheduler
     */
    stop() {
        this.jobs.forEach(job => job.stop());
        console.log('[DigestScheduler] Jobs stopped');
    }

    /**
     * Process Daily Digests
     */
    async processDailyDigests() {
        const now = new Date();
        const currentHour = now.getUTCHours();
        const currentMinuteStr = `${currentHour.toString().padStart(2, '0')}:00`; // Simplify to hour matching

        console.log(`[DigestScheduler] Checking daily digests for ${currentMinuteStr} UTC`);

        try {
            // Find users who want daily digest at this hour
            // Note: This matches simple string time. Ideally store as minutes from midnight UTC
            const preferences = await NotificationPreferences.find({
                'digest.frequency': 'daily',
                'digest.time': { $regex: `^${currentHour.toString().padStart(2, '0')}:` } // Match XX:*
            })
                .populate('user')
                .limit(this.batchSize);

            for (const pref of preferences) {
                await this.sendDigestForUser(pref.user, 'daily');
            }

        } catch (error) {
            console.error('[DigestScheduler] Error processing daily digests:', error);
        }
    }

    /**
     * Process Weekly Digests
     */
    async processWeeklyDigests() {
        const now = new Date();
        const currentHour = now.getUTCHours();
        const currentDay = now.getUTCDay(); // 0-6

        console.log(`[DigestScheduler] Checking weekly digests for Day ${currentDay}, Hour ${currentHour}`);

        try {
            const preferences = await NotificationPreferences.find({
                'digest.frequency': 'weekly',
                'digest.dayOfWeek': currentDay,
                'digest.time': { $regex: `^${currentHour.toString().padStart(2, '0')}:` }
            })
                .populate('user')
                .limit(this.batchSize);

            for (const pref of preferences) {
                await this.sendDigestForUser(pref.user, 'weekly');
            }

        } catch (error) {
            console.error('[DigestScheduler] Error processing weekly digests:', error);
        }
    }

    /**
     * Generate and send digest for a single user
     */
    async sendDigestForUser(user, frequency) {
        if (!user || !user.email) return;

        try {
            // Calculate time range
            const since = new Date();
            if (frequency === 'daily') {
                since.setDate(since.getDate() - 1);
            } else {
                since.setDate(since.getDate() - 7);
            }

            // Get pending digest notifications
            const notifications = await Notification.getDigestNotifications(user._id, since);

            if (notifications.length > 0) {
                const sent = await emailDigestService.sendDigest(user, notifications, frequency);

                if (sent) {
                    // Mark sent notifications
                    const ids = notifications.map(n => n._id);
                    await Notification.updateMany(
                        { _id: { $in: ids } },
                        {
                            $set: {
                                'channels.email.delivered': true,
                                'channels.email.deliveredAt': new Date()
                            }
                        }
                    );
                }
            }
        } catch (error) {
            console.error(`[DigestScheduler] Error sending digest to ${user._id}:`, error);
        }
    }
}

module.exports = new DigestScheduler();

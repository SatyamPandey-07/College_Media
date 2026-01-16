const User = require('../models/User');
const Post = require('../models/Post');
const logger = require('../utils/logger');

class AnalyticsService {

    /**
     * Calculate User Growth Statistics
     */
    static async getUserGrowth(interval = 'day') {
        try {
            const format = interval === 'month' ? "%Y-%m" : "%Y-%m-%d";

            const stats = await User.aggregate([
                {
                    $group: {
                        _id: { $dateToString: { format: format, date: "$createdAt" } },
                        users: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            return stats.map(s => ({ date: s._id, users: s.users }));
        } catch (error) {
            logger.error('Analytics User Growth Error:', error);
            throw error;
        }
    }

    /**
     * Calculate Post Activity Distribution (Engagement)
     * Segmentation: Lurkers (0), Contributors (1-5), Power Users (6+)
     */
    static async getEngagementStats() {
        try {
            // 1. Count posts per user
            const postCounts = await Post.aggregate([
                {
                    $group: {
                        _id: "$user",
                        count: { $sum: 1 }
                    }
                }
            ]);

            // 2. Bucket them (In memory or via Facet - Facet is cleaner but heavy)
            // Using Buckets directly on aggregation if possible requires lookup, so 2 stages is fine for medium datasets.
            // Actually, $bucket works on numbers.

            // Let's do it via $bucketAuto or manual filtering for clearer control
            // Better: doing it all in one pipeline is complex with $lookup.
            // Simplified approach: Get distribution of Post Counts.

            const distribution = await Post.aggregate([
                { $group: { _id: "$user", count: { $sum: 1 } } },
                {
                    $bucket: {
                        groupBy: "$count",
                        boundaries: [1, 5, 20],
                        default: "20+",
                        output: { count: { $sum: 1 } }
                    }
                }
            ]);

            // Note: Users with 0 posts won't appear here (Post aggregation).
            // To get 0 posts (lurkers), we subtract active users from Total Users.
            const totalUsers = await User.countDocuments();
            const activeUsers = distribution.reduce((sum, b) => sum + b.count, 0);

            return [
                { name: 'Lurkers (0 Posts)', value: totalUsers - activeUsers },
                ...distribution.map(d => ({
                    name: typeof d._id === 'number' ? `${d._id}-${(d._id === 1 ? 4 : 19)} Posts` : 'Power Users (20+)',
                    value: d.count
                }))
            ];

        } catch (error) {
            logger.error('Analytics Engagement Error:', error);
            throw error;
        }
    }

    /**
     * Activity Heatmap (Day of Week x Hour)
     */
    static async getActivityHeatmap() {
        try {
            return await Post.aggregate([
                {
                    $project: {
                        hour: { $hour: "$createdAt" }, // 0-23
                        day: { $dayOfWeek: "$createdAt" } // 1 (Sun) - 7 (Sat)
                    }
                },
                {
                    $group: {
                        _id: { day: "$day", hour: "$hour" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.day": 1, "_id.hour": 1 } }
            ]);
        } catch (error) {
            logger.error('Analytics Heatmap Error:', error);
            throw error;
        }
    }
}

module.exports = AnalyticsService;

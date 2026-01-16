const Analytics = require('../models/Analytics');
const Post = require('../models/Post');
const mongoose = require('mongoose');

exports.getUserOverview = async (req, res) => {
    try {
        const userId = req.user._id;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Total Engagement Stats
        const stats = await Analytics.aggregate([
            { $match: { userId: mongoose.Types.ObjectId(userId), timestamp: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        // 2. Likes over time (last 30 days)
        const engagementOverTime = await Analytics.aggregate([
            {
                $match: {
                    userId: mongoose.Types.ObjectId(userId),
                    type: 'like',
                    timestamp: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    likes: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 3. Top performing posts
        const topPosts = await Post.find({ author: userId })
            .sort({ likesCount: -1 })
            .limit(5)
            .select('caption likesCount commentsCount createdAt');

        // 4. Content performance (views vs likes)
        const contentPerformance = stats.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        res.json({
            overview: {
                totalLikes: contentPerformance.like || 0,
                totalViews: contentPerformance.post_view || 0,
                totalComments: contentPerformance.comment || 0,
                totalShares: contentPerformance.share || 0
            },
            engagementOverTime,
            topPosts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getTopTags = async (req, res) => {
    try {
        const userId = req.user._id;

        const tags = await Post.aggregate([
            { $match: { author: mongoose.Types.ObjectId(userId) } },
            { $unwind: '$tags' },
            {
                $group: {
                    _id: '$tags',
                    count: { $sum: 1 },
                    avgLikes: { $avg: '$likesCount' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json(tags);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.trackEvent = async (req, res) => {
    try {
        const { type, postId, metadata } = req.body;
        const userId = req.user ? req.user._id : null;

        const event = new Analytics({
            userId,
            type,
            postId,
            metadata
        });

        await event.save();
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

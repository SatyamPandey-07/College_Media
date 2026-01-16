const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['post_view', 'profile_view', 'like', 'comment', 'share'],
        required: true
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    metadata: {
        browser: String,
        os: String,
        device: String,
        location: String
    }
}, { timestamps: true });

// Index for efficient aggregation by user and time
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ postId: 1, timestamp: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);

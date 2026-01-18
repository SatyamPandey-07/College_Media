/**
 * Notification Model
 * Issue #964: Advanced Multi-Channel Notification System
 * 
 * Enhanced notification model with multi-channel support.
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // Recipient
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Sender (optional for system notifications)
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Notification type
    type: {
        type: String,
        enum: [
            'like', 'comment', 'follow', 'mention', 'reply',
            'share', 'message', 'event', 'post', 'announcement',
            'system', 'reminder', 'digest', 'achievement'
        ],
        required: true,
        index: true
    },

    // Category for grouping
    category: {
        type: String,
        enum: ['social', 'content', 'messaging', 'events', 'system', 'marketing'],
        default: 'social'
    },

    // Notification content
    title: {
        type: String,
        required: true,
        maxlength: 200
    },

    body: {
        type: String,
        required: true,
        maxlength: 500
    },

    // Rich content
    data: {
        // Reference to related entity
        entityType: {
            type: String,
            enum: ['post', 'comment', 'user', 'event', 'message', 'conversation']
        },
        entityId: mongoose.Schema.Types.ObjectId,

        // Action URL
        url: String,

        // Additional data
        metadata: mongoose.Schema.Types.Mixed,

        // Image for rich notifications
        image: String,

        // Action buttons
        actions: [{
            action: String,
            title: String,
            icon: String
        }]
    },

    // Delivery channels
    channels: {
        inApp: {
            delivered: { type: Boolean, default: false },
            deliveredAt: Date
        },
        push: {
            delivered: { type: Boolean, default: false },
            deliveredAt: Date,
            error: String
        },
        email: {
            delivered: { type: Boolean, default: false },
            deliveredAt: Date,
            error: String,
            includeInDigest: { type: Boolean, default: true }
        }
    },

    // Status tracking
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
        default: 'pending',
        index: true
    },

    // Read tracking
    read: {
        type: Boolean,
        default: false,
        index: true
    },

    readAt: Date,

    // Clicked tracking
    clicked: {
        type: Boolean,
        default: false
    },

    clickedAt: Date,

    // Priority
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },

    // Grouping key for batching similar notifications
    groupKey: {
        type: String,
        index: true
    },

    // Count for grouped notifications
    groupCount: {
        type: Number,
        default: 1
    },

    // Expiration
    expiresAt: {
        type: Date,
        index: true
    },

    // Tenant for multi-tenancy
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },

    // Scheduling
    scheduledFor: Date,

    // Retry tracking
    retryCount: {
        type: Number,
        default: 0
    },

    lastRetryAt: Date

}, {
    timestamps: true
});

// Compound indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ groupKey: 1, recipient: 1 });

// Mark as read
notificationSchema.methods.markAsRead = function () {
    this.read = true;
    this.readAt = new Date();
    this.status = 'read';
    return this.save();
};

// Mark as clicked
notificationSchema.methods.markAsClicked = function () {
    this.clicked = true;
    this.clickedAt = new Date();
    if (!this.read) {
        this.read = true;
        this.readAt = new Date();
    }
    return this.save();
};

// Update channel delivery status
notificationSchema.methods.markChannelDelivered = function (channel) {
    if (this.channels[channel]) {
        this.channels[channel].delivered = true;
        this.channels[channel].deliveredAt = new Date();

        // Update overall status
        const allDelivered = Object.values(this.channels).some(c => c.delivered);
        if (allDelivered && this.status === 'pending') {
            this.status = 'delivered';
        }
    }
    return this.save();
};

// Get unread notifications
notificationSchema.statics.getUnread = function (userId, options = {}) {
    const { limit = 50, types, category } = options;

    const query = {
        recipient: userId,
        read: false,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } }
        ]
    };

    if (types && types.length > 0) {
        query.type = { $in: types };
    }

    if (category) {
        query.category = category;
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('sender', 'username avatar')
        .lean();
};

// Get all notifications with pagination
notificationSchema.statics.getAll = function (userId, options = {}) {
    const { limit = 20, skip = 0, category } = options;

    const query = {
        recipient: userId,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } }
        ]
    };

    if (category) {
        query.category = category;
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'username avatar')
        .lean();
};

// Mark all as read
notificationSchema.statics.markAllRead = function (userId, category = null) {
    const query = { recipient: userId, read: false };
    if (category) {
        query.category = category;
    }

    return this.updateMany(query, {
        $set: {
            read: true,
            readAt: new Date(),
            status: 'read'
        }
    });
};

// Get unread count
notificationSchema.statics.getUnreadCount = function (userId, category = null) {
    const query = { recipient: userId, read: false };
    if (category) {
        query.category = category;
    }
    return this.countDocuments(query);
};

// Get digest notifications
notificationSchema.statics.getDigestNotifications = function (userId, since) {
    return this.find({
        recipient: userId,
        'channels.email.includeInDigest': true,
        'channels.email.delivered': false,
        createdAt: { $gte: since }
    })
        .sort({ createdAt: -1 })
        .populate('sender', 'username avatar')
        .lean();
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

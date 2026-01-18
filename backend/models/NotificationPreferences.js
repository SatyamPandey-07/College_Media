/**
 * Notification Preferences Model
 * Issue #964: Advanced Multi-Channel Notification System
 * 
 * User settings for notification channels and categories.
 */

const mongoose = require('mongoose');

const notificationPreferencesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Channels enable/disable
  channels: {
    email: {
      enabled: { type: Boolean, default: true },
      address: String // Override primary email if needed
    },
    push: {
      enabled: { type: Boolean, default: true }
    },
    inApp: {
      enabled: { type: Boolean, default: true }
    },
    sms: {
      enabled: { type: Boolean, default: false },
      phoneNumber: String
    }
  },

  // Categories fine-tuning per channel
  categories: {
    social: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true }
    },
    content: {
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true }
    },
    messaging: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true }
    },
    events: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true }
    },
    system: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true }
    },
    marketing: {
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true }
    }
  },

  // Digest settings
  digest: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'never'],
      default: 'daily'
    },
    time: { type: String, default: '09:00' }, // HH:mm format
    dayOfWeek: { type: Number, default: 1 } // 0-6 (Sun-Sat) for weekly
  },

  // Push subscriptions (Web Push API)
  pushSubscriptions: [{
    endpoint: String,
    expirationTime: Date,
    keys: {
      p256dh: String,
      auth: String
    },
    deviceType: String,
    browser: String,
    lastUsed: Date,
    createdAt: { type: Date, default: Date.now }
  }],

  // Quiet hours (Do Not Disturb)
  quietHours: {
    enabled: { type: Boolean, default: false },
    startTime: { type: String, default: '22:00' },
    endTime: { type: String, default: '08:00' },
    timezone: { type: String, default: 'UTC' }
  }

}, {
  timestamps: true
});

// Helper to check if notification should be sent
notificationPreferencesSchema.methods.shouldSend = function (channel, category) {
  // Check master channel switch
  if (!this.channels[channel]?.enabled) return false;

  // Check specific category setting
  if (this.categories[category] && this.categories[category][channel] !== undefined) {
    return this.categories[category][channel];
  }

  return true;
};

// Helper to check quiet hours
notificationPreferencesSchema.methods.isInQuietHours = function () {
  if (!this.quietHours.enabled) return false;

  const now = new Date();

  // Basic implementation - needs actual timezone handling in production
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();

  const [startHour, startMinute] = this.quietHours.startTime.split(':').map(Number);
  const [endHour, endMinute] = this.quietHours.endTime.split(':').map(Number);

  const currentTime = currentHour * 60 + currentMinute;
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  if (startTime < endTime) {
    return currentTime >= startTime && currentTime < endTime;
  } else {
    // Crosses midnight
    return currentTime >= startTime || currentTime < endTime;
  }
};

const NotificationPreferences = mongoose.model('NotificationPreferences', notificationPreferencesSchema);

module.exports = NotificationPreferences;

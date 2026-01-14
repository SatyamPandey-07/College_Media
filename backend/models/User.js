const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const PointSchema = require('./Location');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true // Basic index
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true // Basic index
  },
  password: {
    type: String,
    required: function () { return !this.googleId && !this.githubId; },
    select: false // Do not return password by default
  },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  profilePicture: { type: String, default: '' },
  bio: { type: String, default: '' },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },

  // OAuth Fields
  googleId: String,
  githubId: String,
  authProvider: { type: String, enum: ['local', 'google', 'github'], default: 'local' },

  // Status & Security
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  lastLoginAt: Date,

  // Social Graph
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  postCount: { type: Number, default: 0 },
  followerCount: { type: Number, default: 0 },

  // MFA / 2FA Security (New Fields)
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false }, // Encrypted secret in real app, hidden
  backupCodes: [{ type: String, select: false }],   // Hashed in real app, hidden
  trustedDevices: [{
    deviceId: String,
    deviceName: String,
    userAgent: String,
    lastUsed: Date
  }],

  // Location
  lastLocation: {
    type: PointSchema,
    default: undefined
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Password hashing middleware
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/* ============================================================
   📊 DATABASE INDEXES (From previous file content)
   ============================================================ */

// Active & non-deleted users
userSchema.index({ isDeleted: 1, isActive: 1 }, { name: "idx_users_active_non_deleted" });

// Role-based dashboards
userSchema.index({ role: 1, isActive: 1, isDeleted: 1 }, { name: "idx_users_role_active", partialFilterExpression: { isDeleted: false } });

// OAuth identities
userSchema.index({ googleId: 1 }, { name: "idx_google_oauth_users", sparse: true });
userSchema.index({ githubId: 1 }, { name: "idx_github_oauth_users", sparse: true });

// Two-factor enabled users
userSchema.index({ twoFactorEnabled: 1 }, { name: "idx_users_2fa_enabled" });

// Geospatial Index
userSchema.index({ lastLocation: "2dsphere" }, { name: "idx_geo_users" });

// Text search
userSchema.index(
  { username: "text", firstName: "text", lastName: "text", bio: "text" },
  { name: "idx_users_text_search", weights: { username: 10, firstName: 6, lastName: 6, bio: 1 } }
);

module.exports = mongoose.model('User', userSchema);

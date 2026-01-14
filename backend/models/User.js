/* ============================================================
   📊 DATABASE INDEXES (ENTERPRISE-GRADE | LARGE COLLECTIONS)
   ============================================================ */

/**
 * INDEXING PRINCIPLES USED:
 * ------------------------------------------------------------
 * 1. Avoid duplicate unique indexes (handled by schema)
 * 2. Prefer compound indexes over multiple single-field ones
 * 3. Use partialFilterExpression for soft-delete & flags
 * 4. Optimize for READ-heavy workloads
 * 5. Keep index size under control for millions of docs
 */

/* ============================================================
   🔍 CORE FILTERING & STATUS INDEXES
   ============================================================ */

// Active & non-deleted users (most common filter)
userSchema.index(
  { isDeleted: 1, isActive: 1 },
  {
    name: "idx_users_active_non_deleted"
  }
);

// Role-based dashboards (admin / alumni / student)
userSchema.index(
  { role: 1, isActive: 1, isDeleted: 1 },
  {
    name: "idx_users_role_active",
    partialFilterExpression: { isDeleted: false }
  }
);

// Verified users filtering
userSchema.index(
  { isVerified: 1, isActive: 1 },
  {
    name: "idx_verified_active_users",
    partialFilterExpression: { isActive: true }
  }
);

/* ============================================================
   ⏱ SORTING & TIMELINE INDEXES
   ============================================================ */

// Recent registrations
userSchema.index(
  { createdAt: -1 },
  {
    name: "idx_users_recent_created"
  }
);

// Recently active users
userSchema.index(
  { lastLoginAt: -1 },
  {
    name: "idx_users_last_login"
  }
);

// Scheduled deletion cleanup jobs
userSchema.index(
  { scheduledDeletionDate: 1 },
  {
    name: "idx_users_scheduled_deletion",
    partialFilterExpression: { isDeleted: true }
  }
);

/* ============================================================
   🔎 LOOKUP & IDENTITY INDEXES
   ============================================================ */

// Username lookup (excluding deleted)
userSchema.index(
  { username: 1 },
  {
    name: "idx_username_lookup_active",
    partialFilterExpression: { isDeleted: false }
  }
);

// Email lookup (login / recovery)
userSchema.index(
  { email: 1 },
  {
    name: "idx_email_lookup_active",
    partialFilterExpression: { isDeleted: false }
  }
);

// OAuth identities
userSchema.index(
  { googleId: 1 },
  {
    name: "idx_google_oauth_users",
    sparse: true
  }
);

userSchema.index(
  { githubId: 1 },
  {
    name: "idx_github_oauth_users",
    sparse: true
  }
);

/* ============================================================
   👥 SOCIAL GRAPH INDEXES
   ============================================================ */

// Followers lookup
userSchema.index(
  { followers: 1 },
  {
    name: "idx_users_followers"
  }
);

// Following lookup
userSchema.index(
  { following: 1 },
  {
    name: "idx_users_following"
  }
);

// Blocked users (privacy & safety checks)
userSchema.index(
  { blockedUsers: 1 },
  {
    name: "idx_users_blocked"
  }
);

/* ============================================================
   🔐 SECURITY & ADMIN INDEXES
   ============================================================ */

// Admin accounts
userSchema.index(
  { role: 1 },
  {
    name: "idx_admin_users",
    partialFilterExpression: { role: "admin" }
  }
);

// Two-factor enabled users
userSchema.index(
  { twoFactorEnabled: 1 },
  {
    name: "idx_users_2fa_enabled"
  }
);

// Disabled / inactive accounts
userSchema.index(
  { isActive: 1 },
  {
    name: "idx_users_inactive",
    partialFilterExpression: { isActive: false }
  }
);

/* ============================================================
   📈 ANALYTICS & COUNTERS
   ============================================================ */

// Users with high follower count (leaderboards)
userSchema.index(
  { followerCount: -1 },
  {
    name: "idx_users_by_followers"
  }
);

// Highly active content creators
userSchema.index(
  { postCount: -1 },
  {
    name: "idx_users_by_posts"
  }
);

/* ============================================================
   📝 FULL-TEXT SEARCH INDEX
   ============================================================ */

userSchema.index(
  {
    username: "text",
    firstName: "text",
    lastName: "text",
    bio: "text"
  },
  {
    name: "idx_users_text_search",
    weights: {
      username: 10,
      firstName: 6,
      lastName: 6,
      bio: 1
    }
  }
);

/* ============================================================
   ⚠️ PERFORMANCE & MAINTENANCE NOTES
   ============================================================

✔ All indexes aligned with real query patterns
✔ Partial indexes reduce disk + memory usage
✔ Soft-delete aware (no full scans)
✔ Admin & security queries optimized
✔ Scales safely to millions of users
✔ Suitable for high-read social platforms

============================================================ */

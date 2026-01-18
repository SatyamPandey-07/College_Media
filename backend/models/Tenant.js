/**
 * Tenant Model
 * Issue #935: Multi-Tenant Architecture with RBAC
 * 
 * Represents organizations/colleges with isolated data and custom branding.
 */

const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
    // Identification
    tenantId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        lowercase: true,
        trim: true
    },

    // Organization details
    name: {
        type: String,
        required: true,
        trim: true
    },

    displayName: {
        type: String,
        trim: true
    },

    type: {
        type: String,
        enum: ['university', 'college', 'department', 'organization', 'enterprise'],
        default: 'college'
    },

    // Domain configuration
    domains: [{
        domain: {
            type: String,
            required: true,
            lowercase: true
        },
        isPrimary: {
            type: Boolean,
            default: false
        },
        verified: {
            type: Boolean,
            default: false
        },
        verificationToken: String
    }],

    subdomain: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true
    },

    // Branding
    branding: {
        logo: String,
        favicon: String,
        primaryColor: {
            type: String,
            default: '#3b82f6'
        },
        secondaryColor: {
            type: String,
            default: '#8b5cf6'
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'auto'
        },
        customCSS: String,
        loginBackground: String,
        welcomeMessage: String
    },

    // Contact information
    contact: {
        email: String,
        phone: String,
        address: {
            street: String,
            city: String,
            state: String,
            country: String,
            postalCode: String
        },
        website: String
    },

    // Owner and admins
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Subscription and billing
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'starter', 'professional', 'enterprise'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['active', 'trial', 'suspended', 'cancelled'],
            default: 'trial'
        },
        trialEndsAt: Date,
        currentPeriodStart: Date,
        currentPeriodEnd: Date,
        billingEmail: String,
        paymentMethod: String
    },

    // Limits based on plan
    limits: {
        maxUsers: {
            type: Number,
            default: 100
        },
        maxStorage: {
            type: Number,
            default: 10 * 1024 * 1024 * 1024 // 10GB
        },
        maxPosts: {
            type: Number,
            default: 10000
        },
        features: {
            analytics: { type: Boolean, default: false },
            customBranding: { type: Boolean, default: false },
            advancedRoles: { type: Boolean, default: false },
            apiAccess: { type: Boolean, default: false },
            sso: { type: Boolean, default: false },
            prioritySupport: { type: Boolean, default: false }
        }
    },

    // Usage statistics
    usage: {
        userCount: { type: Number, default: 0 },
        postCount: { type: Number, default: 0 },
        storageUsed: { type: Number, default: 0 },
        bandwidth: { type: Number, default: 0 },
        lastCalculated: Date
    },

    // Settings
    settings: {
        registrationEnabled: {
            type: Boolean,
            default: true
        },
        emailVerificationRequired: {
            type: Boolean,
            default: true
        },
        allowedEmailDomains: [String],
        defaultRole: {
            type: String,
            default: 'member'
        },
        contentModeration: {
            type: String,
            enum: ['none', 'basic', 'strict'],
            default: 'basic'
        },
        privateByDefault: {
            type: Boolean,
            default: false
        },
        timezone: {
            type: String,
            default: 'UTC'
        },
        language: {
            type: String,
            default: 'en'
        }
    },

    // Database configuration (for multi-database tenancy)
    database: {
        connectionString: String,
        databaseName: String,
        strategy: {
            type: String,
            enum: ['shared', 'dedicated'],
            default: 'shared'
        }
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending'],
        default: 'pending',
        index: true
    },

    // Metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
tenantSchema.index({ subdomain: 1 });
tenantSchema.index({ 'domains.domain': 1 });
tenantSchema.index({ status: 1, 'subscription.status': 1 });

// Virtual for full URL
tenantSchema.virtual('url').get(function () {
    if (this.subdomain) {
        return `https://${this.subdomain}.collegemedia.com`;
    }
    const primaryDomain = this.domains.find(d => d.isPrimary);
    return primaryDomain ? `https://${primaryDomain.domain}` : null;
});

// Check if tenant has feature
tenantSchema.methods.hasFeature = function (feature) {
    return this.limits.features[feature] === true;
};

// Check if tenant is within limits
tenantSchema.methods.isWithinLimits = function (resource, currentCount) {
    const limitMap = {
        users: this.limits.maxUsers,
        storage: this.limits.maxStorage,
        posts: this.limits.maxPosts
    };

    return currentCount < (limitMap[resource] || Infinity);
};

// Get tenant by domain or subdomain
tenantSchema.statics.findByHost = async function (host) {
    // Try subdomain first
    const subdomainMatch = host.match(/^([^.]+)\.collegemedia\.com$/);
    if (subdomainMatch) {
        return this.findOne({ subdomain: subdomainMatch[1], status: 'active' });
    }

    // Try custom domain
    return this.findOne({
        'domains.domain': host,
        'domains.verified': true,
        status: 'active'
    });
};

// Get active tenants
tenantSchema.statics.getActiveTenants = function () {
    return this.find({
        status: 'active',
        'subscription.status': { $in: ['active', 'trial'] }
    }).lean();
};

const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;

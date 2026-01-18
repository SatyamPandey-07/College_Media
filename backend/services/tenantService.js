/**
 * Tenant Service
 * Issue #935: Multi-Tenant Architecture with RBAC
 * 
 * Service for tenant provisioning and management.
 */

const Tenant = require('../models/Tenant');
const crypto = require('crypto');

class TenantService {

    /**
     * Create new tenant
     */
    async createTenant(data) {
        const {
            name,
            type = 'college',
            subdomain,
            domain,
            ownerId,
            branding = {},
            contact = {},
            plan = 'free'
        } = data;

        // Generate unique tenant ID
        const tenantId = this.generateTenantId(name);

        // Check if subdomain is available
        if (subdomain) {
            const existing = await Tenant.findOne({ subdomain });
            if (existing) {
                throw new Error('Subdomain already taken');
            }
        }

        // Set plan limits
        const limits = this.getPlanLimits(plan);

        // Create tenant
        const tenant = await Tenant.create({
            tenantId,
            name,
            displayName: name,
            type,
            subdomain,
            domains: domain ? [{ domain, isPrimary: true, verified: false }] : [],
            branding,
            contact,
            owner: ownerId,
            admins: [ownerId],
            subscription: {
                plan,
                status: plan === 'free' ? 'active' : 'trial',
                trialEndsAt: plan !== 'free' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null
            },
            limits,
            status: 'active'
        });

        return tenant;
    }

    /**
     * Generate unique tenant ID from name
     */
    generateTenantId(name) {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 30);

        const suffix = crypto.randomBytes(4).toString('hex');
        return `${slug}-${suffix}`;
    }

    /**
     * Get plan limits
     */
    getPlanLimits(plan) {
        const plans = {
            free: {
                maxUsers: 50,
                maxStorage: 1 * 1024 * 1024 * 1024, // 1GB
                maxPosts: 1000,
                features: {
                    analytics: false,
                    customBranding: false,
                    advancedRoles: false,
                    apiAccess: false,
                    sso: false,
                    prioritySupport: false
                }
            },
            starter: {
                maxUsers: 500,
                maxStorage: 10 * 1024 * 1024 * 1024, // 10GB
                maxPosts: 10000,
                features: {
                    analytics: true,
                    customBranding: true,
                    advancedRoles: false,
                    apiAccess: false,
                    sso: false,
                    prioritySupport: false
                }
            },
            professional: {
                maxUsers: 5000,
                maxStorage: 100 * 1024 * 1024 * 1024, // 100GB
                maxPosts: 100000,
                features: {
                    analytics: true,
                    customBranding: true,
                    advancedRoles: true,
                    apiAccess: true,
                    sso: false,
                    prioritySupport: true
                }
            },
            enterprise: {
                maxUsers: -1, // Unlimited
                maxStorage: 1024 * 1024 * 1024 * 1024, // 1TB
                maxPosts: -1, // Unlimited
                features: {
                    analytics: true,
                    customBranding: true,
                    advancedRoles: true,
                    apiAccess: true,
                    sso: true,
                    prioritySupport: true
                }
            }
        };

        return plans[plan] || plans.free;
    }

    /**
     * Update tenant
     */
    async updateTenant(tenantId, updates) {
        const allowedUpdates = [
            'name', 'displayName', 'branding', 'contact', 'settings', 'metadata'
        ];

        const filteredUpdates = {};
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                filteredUpdates[key] = updates[key];
            }
        }

        const tenant = await Tenant.findOneAndUpdate(
            { tenantId },
            { $set: filteredUpdates },
            { new: true }
        );

        return tenant;
    }

    /**
     * Add domain to tenant
     */
    async addDomain(tenantId, domain) {
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const tenant = await Tenant.findOneAndUpdate(
            { tenantId },
            {
                $push: {
                    domains: {
                        domain,
                        isPrimary: false,
                        verified: false,
                        verificationToken
                    }
                }
            },
            { new: true }
        );

        return { tenant, verificationToken };
    }

    /**
     * Verify domain ownership
     */
    async verifyDomain(tenantId, domain, token) {
        const tenant = await Tenant.findOne({ tenantId });

        if (!tenant) {
            throw new Error('Tenant not found');
        }

        const domainEntry = tenant.domains.find(d => d.domain === domain);

        if (!domainEntry) {
            throw new Error('Domain not found');
        }

        if (domainEntry.verificationToken !== token) {
            throw new Error('Invalid verification token');
        }

        domainEntry.verified = true;
        domainEntry.verificationToken = null;

        await tenant.save();

        return tenant;
    }

    /**
     * Update subscription
     */
    async updateSubscription(tenantId, plan) {
        const limits = this.getPlanLimits(plan);

        const tenant = await Tenant.findOneAndUpdate(
            { tenantId },
            {
                $set: {
                    'subscription.plan': plan,
                    'subscription.status': 'active',
                    limits
                }
            },
            { new: true }
        );

        return tenant;
    }

    /**
     * Suspend tenant
     */
    async suspendTenant(tenantId, reason) {
        const tenant = await Tenant.findOneAndUpdate(
            { tenantId },
            {
                $set: {
                    status: 'suspended',
                    'subscription.status': 'suspended',
                    'metadata.suspensionReason': reason,
                    'metadata.suspendedAt': new Date()
                }
            },
            { new: true }
        );

        return tenant;
    }

    /**
     * Reactivate tenant
     */
    async reactivateTenant(tenantId) {
        const tenant = await Tenant.findOneAndUpdate(
            { tenantId },
            {
                $set: {
                    status: 'active',
                    'subscription.status': 'active'
                },
                $unset: {
                    'metadata.suspensionReason': 1,
                    'metadata.suspendedAt': 1
                }
            },
            { new: true }
        );

        return tenant;
    }

    /**
     * Add admin to tenant
     */
    async addAdmin(tenantId, userId) {
        const tenant = await Tenant.findOneAndUpdate(
            { tenantId },
            { $addToSet: { admins: userId } },
            { new: true }
        );

        return tenant;
    }

    /**
     * Remove admin from tenant
     */
    async removeAdmin(tenantId, userId) {
        const tenant = await Tenant.findOne({ tenantId });

        if (tenant.owner.toString() === userId.toString()) {
            throw new Error('Cannot remove owner from admins');
        }

        tenant.admins = tenant.admins.filter(a => a.toString() !== userId.toString());
        await tenant.save();

        return tenant;
    }

    /**
     * Update usage statistics
     */
    async updateUsage(tenantId, stats) {
        const tenant = await Tenant.findOneAndUpdate(
            { tenantId },
            {
                $set: {
                    'usage.userCount': stats.userCount,
                    'usage.postCount': stats.postCount,
                    'usage.storageUsed': stats.storageUsed,
                    'usage.lastCalculated': new Date()
                }
            },
            { new: true }
        );

        return tenant;
    }

    /**
     * Get tenant statistics
     */
    async getTenantStats(tenantId) {
        const tenant = await Tenant.findOne({ tenantId });

        if (!tenant) {
            throw new Error('Tenant not found');
        }

        return {
            usage: tenant.usage,
            limits: tenant.limits,
            subscription: tenant.subscription,
            percentages: {
                users: tenant.limits.maxUsers > 0
                    ? (tenant.usage.userCount / tenant.limits.maxUsers * 100).toFixed(1)
                    : 0,
                storage: tenant.limits.maxStorage > 0
                    ? (tenant.usage.storageUsed / tenant.limits.maxStorage * 100).toFixed(1)
                    : 0,
                posts: tenant.limits.maxPosts > 0
                    ? (tenant.usage.postCount / tenant.limits.maxPosts * 100).toFixed(1)
                    : 0
            }
        };
    }

    /**
     * List all tenants (admin)
     */
    async listTenants(options = {}) {
        const { status, plan, limit = 50, skip = 0 } = options;

        const query = {};
        if (status) query.status = status;
        if (plan) query['subscription.plan'] = plan;

        const [tenants, total] = await Promise.all([
            Tenant.find(query)
                .select('-database')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Tenant.countDocuments(query)
        ]);

        return { tenants, total };
    }
}

module.exports = new TenantService();

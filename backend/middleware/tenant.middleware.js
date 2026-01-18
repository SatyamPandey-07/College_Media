/**
 * Tenant Middleware
 * Issue #935: Multi-Tenant Architecture with RBAC
 * 
 * Identifies tenant from request and attaches to req object.
 */

const Tenant = require('../models/Tenant');

/**
 * Tenant identification middleware
 * Identifies tenant from subdomain, header, or custom domain
 */
const tenantMiddleware = async (req, res, next) => {
    try {
        let tenant = null;
        let tenantId = null;

        // Strategy 1: Check X-Tenant-ID header (for API clients)
        if (req.headers['x-tenant-id']) {
            tenantId = req.headers['x-tenant-id'];
            tenant = await Tenant.findOne({ tenantId, status: 'active' });
        }

        // Strategy 2: Extract from subdomain
        if (!tenant && req.hostname) {
            tenant = await Tenant.findByHost(req.hostname);
        }

        // Strategy 3: Extract from path prefix (e.g., /t/tenant-id/...)
        if (!tenant && req.path.startsWith('/t/')) {
            const pathMatch = req.path.match(/^\/t\/([^\/]+)/);
            if (pathMatch) {
                tenantId = pathMatch[1];
                tenant = await Tenant.findOne({ tenantId, status: 'active' });

                // Rewrite path to remove tenant prefix
                req.originalPath = req.path;
                req.path = req.path.replace(`/t/${tenantId}`, '') || '/';
            }
        }

        // Strategy 4: Default tenant from environment (for single-tenant mode)
        if (!tenant && process.env.DEFAULT_TENANT_ID) {
            tenant = await Tenant.findOne({
                tenantId: process.env.DEFAULT_TENANT_ID,
                status: 'active'
            });
        }

        if (tenant) {
            // Attach tenant to request
            req.tenant = tenant;
            req.tenantId = tenant._id;

            // Check subscription status
            if (tenant.subscription.status === 'suspended') {
                return res.status(403).json({
                    success: false,
                    message: 'This organization has been suspended. Please contact support.',
                    code: 'TENANT_SUSPENDED'
                });
            }

            // Check if trial has expired
            if (tenant.subscription.status === 'trial' && tenant.subscription.trialEndsAt) {
                if (new Date() > tenant.subscription.trialEndsAt) {
                    return res.status(403).json({
                        success: false,
                        message: 'Your trial period has expired. Please upgrade to continue.',
                        code: 'TRIAL_EXPIRED'
                    });
                }
            }
        }

        next();
    } catch (error) {
        console.error('[TenantMiddleware] Error:', error);
        next(error);
    }
};

/**
 * Require tenant middleware
 * Ensures a valid tenant is attached to the request
 */
const requireTenant = (req, res, next) => {
    if (!req.tenant) {
        return res.status(400).json({
            success: false,
            message: 'Tenant identification required',
            code: 'TENANT_REQUIRED'
        });
    }
    next();
};

/**
 * Tenant admin middleware
 * Ensures user is an admin of the current tenant
 */
const requireTenantAdmin = (req, res, next) => {
    if (!req.tenant) {
        return res.status(400).json({
            success: false,
            message: 'Tenant not identified',
            code: 'TENANT_REQUIRED'
        });
    }

    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }

    const userId = req.user._id.toString();
    const isOwner = req.tenant.owner.toString() === userId;
    const isAdmin = req.tenant.admins.some(a => a.toString() === userId);

    if (!isOwner && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Tenant admin access required',
            code: 'TENANT_ADMIN_REQUIRED'
        });
    }

    req.isTenantAdmin = true;
    req.isTenantOwner = isOwner;

    next();
};

/**
 * Feature check middleware factory
 * Creates middleware that checks if tenant has a specific feature
 */
const requireFeature = (feature) => {
    return (req, res, next) => {
        if (!req.tenant) {
            return res.status(400).json({
                success: false,
                message: 'Tenant not identified',
                code: 'TENANT_REQUIRED'
            });
        }

        if (!req.tenant.hasFeature(feature)) {
            return res.status(403).json({
                success: false,
                message: `This feature requires an upgraded plan`,
                code: 'FEATURE_NOT_AVAILABLE',
                feature
            });
        }

        next();
    };
};

/**
 * Limit check middleware factory
 * Creates middleware that checks if tenant is within resource limits
 */
const checkLimit = (resource) => {
    return async (req, res, next) => {
        if (!req.tenant) {
            return res.status(400).json({
                success: false,
                message: 'Tenant not identified',
                code: 'TENANT_REQUIRED'
            });
        }

        const currentCount = req.tenant.usage[`${resource}Count`] || 0;

        if (!req.tenant.isWithinLimits(resource, currentCount)) {
            return res.status(403).json({
                success: false,
                message: `Resource limit reached for ${resource}. Please upgrade your plan.`,
                code: 'LIMIT_EXCEEDED',
                resource,
                current: currentCount,
                limit: req.tenant.limits[`max${resource.charAt(0).toUpperCase() + resource.slice(1)}`]
            });
        }

        next();
    };
};

module.exports = {
    tenantMiddleware,
    requireTenant,
    requireTenantAdmin,
    requireFeature,
    checkLimit
};

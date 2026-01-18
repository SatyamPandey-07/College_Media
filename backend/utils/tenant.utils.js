/**
 * Tenant Utility Functions
 * Issue #935: Multi-Tenant Architecture with RBAC
 * 
 * Helper functions for tenant operations.
 */

const Tenant = require('../models/Tenant');
const crypto = require('crypto');

/**
 * Generate subdomain from organization name
 */
const generateSubdomain = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 63); // Max subdomain length
};

/**
 * Validate subdomain format
 */
const isValidSubdomain = (subdomain) => {
    const regex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
    return regex.test(subdomain);
};

/**
 * Check if subdomain is reserved
 */
const isReservedSubdomain = (subdomain) => {
    const reserved = [
        'www', 'api', 'admin', 'app', 'dashboard', 'mail', 'email',
        'ftp', 'cdn', 'static', 'assets', 'images', 'media', 'files',
        'blog', 'docs', 'help', 'support', 'status', 'dev', 'staging',
        'test', 'demo', 'beta', 'alpha', 'login', 'signup', 'register',
        'account', 'billing', 'payment', 'settings', 'profile'
    ];

    return reserved.includes(subdomain.toLowerCase());
};

/**
 * Check subdomain availability
 */
const isSubdomainAvailable = async (subdomain) => {
    if (!isValidSubdomain(subdomain)) {
        return { available: false, reason: 'Invalid subdomain format' };
    }

    if (isReservedSubdomain(subdomain)) {
        return { available: false, reason: 'Subdomain is reserved' };
    }

    const existing = await Tenant.findOne({ subdomain });
    if (existing) {
        return { available: false, reason: 'Subdomain already taken' };
    }

    return { available: true };
};

/**
 * Extract tenant identifier from request
 */
const extractTenantFromRequest = (req) => {
    // From header
    if (req.headers['x-tenant-id']) {
        return { source: 'header', value: req.headers['x-tenant-id'] };
    }

    // From subdomain
    const host = req.hostname || req.headers.host;
    if (host) {
        const subdomainMatch = host.match(/^([^.]+)\.collegemedia\.com$/);
        if (subdomainMatch) {
            return { source: 'subdomain', value: subdomainMatch[1] };
        }
    }

    // From path
    if (req.path.startsWith('/t/')) {
        const pathMatch = req.path.match(/^\/t\/([^\/]+)/);
        if (pathMatch) {
            return { source: 'path', value: pathMatch[1] };
        }
    }

    return null;
};

/**
 * Generate DNS verification token
 */
const generateVerificationToken = () => {
    return `collegemedia-verify-${crypto.randomBytes(16).toString('hex')}`;
};

/**
 * Validate domain format
 */
const isValidDomain = (domain) => {
    const regex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
    return regex.test(domain.toLowerCase());
};

/**
 * Get tenant branding for frontend
 */
const getTenantBranding = (tenant) => {
    if (!tenant) {
        return getDefaultBranding();
    }

    return {
        name: tenant.displayName || tenant.name,
        logo: tenant.branding?.logo || null,
        favicon: tenant.branding?.favicon || null,
        primaryColor: tenant.branding?.primaryColor || '#3b82f6',
        secondaryColor: tenant.branding?.secondaryColor || '#8b5cf6',
        theme: tenant.branding?.theme || 'auto',
        customCSS: tenant.branding?.customCSS || '',
        welcomeMessage: tenant.branding?.welcomeMessage || `Welcome to ${tenant.name}`
    };
};

/**
 * Get default branding
 */
const getDefaultBranding = () => {
    return {
        name: 'College Media',
        logo: null,
        favicon: null,
        primaryColor: '#3b82f6',
        secondaryColor: '#8b5cf6',
        theme: 'auto',
        customCSS: '',
        welcomeMessage: 'Welcome to College Media'
    };
};

/**
 * Calculate storage used by tenant
 */
const calculateStorageUsed = async (tenantId) => {
    // In production, query media assets collection
    // This is a placeholder
    return 0;
};

/**
 * Get tenant limits based on plan
 */
const getPlanLimits = (plan) => {
    const limits = {
        free: { users: 50, storage: 1024, posts: 1000 },
        starter: { users: 500, storage: 10240, posts: 10000 },
        professional: { users: 5000, storage: 102400, posts: 100000 },
        enterprise: { users: -1, storage: 1048576, posts: -1 }
    };

    return limits[plan] || limits.free;
};

/**
 * Check if tenant is within resource limits
 */
const checkTenantLimits = async (tenant, resource, increment = 1) => {
    const currentUsage = tenant.usage[`${resource}Count`] || 0;
    const limit = tenant.limits[`max${resource.charAt(0).toUpperCase() + resource.slice(1)}`];

    if (limit === -1) {
        return { withinLimit: true, current: currentUsage, limit: 'unlimited' };
    }

    return {
        withinLimit: currentUsage + increment <= limit,
        current: currentUsage,
        limit,
        remaining: Math.max(0, limit - currentUsage - increment)
    };
};

/**
 * Scope mongoose query to tenant
 */
const scopeQuery = (query, tenantId) => {
    if (tenantId) {
        query.tenantId = tenantId;
    }
    return query;
};

/**
 * Create tenant-scoped model wrapper
 */
const createTenantScopedModel = (Model, tenantId) => {
    return {
        find: (query = {}) => Model.find(scopeQuery(query, tenantId)),
        findOne: (query = {}) => Model.findOne(scopeQuery(query, tenantId)),
        countDocuments: (query = {}) => Model.countDocuments(scopeQuery(query, tenantId)),
        create: (data) => Model.create({ ...data, tenantId }),
        findByIdAndUpdate: (id, updates, options) =>
            Model.findOneAndUpdate(
                scopeQuery({ _id: id }, tenantId),
                updates,
                options
            ),
        findByIdAndDelete: (id) =>
            Model.findOneAndDelete(scopeQuery({ _id: id }, tenantId))
    };
};

module.exports = {
    generateSubdomain,
    isValidSubdomain,
    isReservedSubdomain,
    isSubdomainAvailable,
    extractTenantFromRequest,
    generateVerificationToken,
    isValidDomain,
    getTenantBranding,
    getDefaultBranding,
    calculateStorageUsed,
    getPlanLimits,
    checkTenantLimits,
    scopeQuery,
    createTenantScopedModel
};

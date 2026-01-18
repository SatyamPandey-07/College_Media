/**
 * Tenant Controller
 * Issue #935: Multi-Tenant Architecture with RBAC
 * 
 * API endpoints for tenant administration.
 */

const tenantService = require('../services/tenantService');
const Tenant = require('../models/Tenant');

const tenantController = {

    /**
     * POST /api/tenants
     * Create new tenant
     */
    async createTenant(req, res) {
        try {
            const { name, type, subdomain, domain, branding, contact, plan } = req.body;
            const ownerId = req.user._id;

            const tenant = await tenantService.createTenant({
                name,
                type,
                subdomain,
                domain,
                ownerId,
                branding,
                contact,
                plan
            });

            res.status(201).json({
                success: true,
                data: tenant
            });
        } catch (error) {
            console.error('Create tenant error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * GET /api/tenants/current
     * Get current tenant info
     */
    async getCurrentTenant(req, res) {
        try {
            if (!req.tenant) {
                return res.status(404).json({
                    success: false,
                    message: 'No tenant context'
                });
            }

            const tenant = await Tenant.findById(req.tenant._id)
                .populate('owner', 'username email avatar')
                .populate('admins', 'username email avatar');

            res.json({
                success: true,
                data: tenant
            });
        } catch (error) {
            console.error('Get current tenant error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get tenant'
            });
        }
    },

    /**
     * GET /api/tenants/:tenantId
     * Get tenant by ID
     */
    async getTenant(req, res) {
        try {
            const { tenantId } = req.params;

            const tenant = await Tenant.findOne({ tenantId })
                .populate('owner', 'username email avatar')
                .populate('admins', 'username email avatar');

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    message: 'Tenant not found'
                });
            }

            res.json({
                success: true,
                data: tenant
            });
        } catch (error) {
            console.error('Get tenant error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get tenant'
            });
        }
    },

    /**
     * PUT /api/tenants/:tenantId
     * Update tenant
     */
    async updateTenant(req, res) {
        try {
            const { tenantId } = req.params;
            const updates = req.body;

            const tenant = await tenantService.updateTenant(tenantId, updates);

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    message: 'Tenant not found'
                });
            }

            res.json({
                success: true,
                data: tenant
            });
        } catch (error) {
            console.error('Update tenant error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * PUT /api/tenants/:tenantId/branding
     * Update tenant branding
     */
    async updateBranding(req, res) {
        try {
            const { tenantId } = req.params;
            const branding = req.body;

            const tenant = await tenantService.updateTenant(tenantId, { branding });

            res.json({
                success: true,
                data: tenant
            });
        } catch (error) {
            console.error('Update branding error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * POST /api/tenants/:tenantId/domains
     * Add domain to tenant
     */
    async addDomain(req, res) {
        try {
            const { tenantId } = req.params;
            const { domain } = req.body;

            const result = await tenantService.addDomain(tenantId, domain);

            res.json({
                success: true,
                data: result.tenant,
                verificationToken: result.verificationToken,
                instructions: `Add a TXT record with value "${result.verificationToken}" to verify ownership`
            });
        } catch (error) {
            console.error('Add domain error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * POST /api/tenants/:tenantId/domains/verify
     * Verify domain ownership
     */
    async verifyDomain(req, res) {
        try {
            const { tenantId } = req.params;
            const { domain, token } = req.body;

            const tenant = await tenantService.verifyDomain(tenantId, domain, token);

            res.json({
                success: true,
                data: tenant,
                message: 'Domain verified successfully'
            });
        } catch (error) {
            console.error('Verify domain error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * POST /api/tenants/:tenantId/admins
     * Add admin to tenant
     */
    async addAdmin(req, res) {
        try {
            const { tenantId } = req.params;
            const { userId } = req.body;

            const tenant = await tenantService.addAdmin(tenantId, userId);

            res.json({
                success: true,
                data: tenant
            });
        } catch (error) {
            console.error('Add admin error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * DELETE /api/tenants/:tenantId/admins/:userId
     * Remove admin from tenant
     */
    async removeAdmin(req, res) {
        try {
            const { tenantId, userId } = req.params;

            const tenant = await tenantService.removeAdmin(tenantId, userId);

            res.json({
                success: true,
                data: tenant
            });
        } catch (error) {
            console.error('Remove admin error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * PUT /api/tenants/:tenantId/subscription
     * Update subscription plan
     */
    async updateSubscription(req, res) {
        try {
            const { tenantId } = req.params;
            const { plan } = req.body;

            const tenant = await tenantService.updateSubscription(tenantId, plan);

            res.json({
                success: true,
                data: tenant
            });
        } catch (error) {
            console.error('Update subscription error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * GET /api/tenants/:tenantId/stats
     * Get tenant statistics
     */
    async getTenantStats(req, res) {
        try {
            const { tenantId } = req.params;

            const stats = await tenantService.getTenantStats(tenantId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Get tenant stats error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * POST /api/tenants/:tenantId/suspend
     * Suspend tenant (platform admin)
     */
    async suspendTenant(req, res) {
        try {
            const { tenantId } = req.params;
            const { reason } = req.body;

            const tenant = await tenantService.suspendTenant(tenantId, reason);

            res.json({
                success: true,
                data: tenant,
                message: 'Tenant suspended'
            });
        } catch (error) {
            console.error('Suspend tenant error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * POST /api/tenants/:tenantId/reactivate
     * Reactivate tenant (platform admin)
     */
    async reactivateTenant(req, res) {
        try {
            const { tenantId } = req.params;

            const tenant = await tenantService.reactivateTenant(tenantId);

            res.json({
                success: true,
                data: tenant,
                message: 'Tenant reactivated'
            });
        } catch (error) {
            console.error('Reactivate tenant error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * GET /api/tenants (platform admin)
     * List all tenants
     */
    async listTenants(req, res) {
        try {
            const { status, plan, limit, skip } = req.query;

            const result = await tenantService.listTenants({
                status,
                plan,
                limit: parseInt(limit) || 50,
                skip: parseInt(skip) || 0
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('List tenants error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to list tenants'
            });
        }
    }
};

module.exports = tenantController;

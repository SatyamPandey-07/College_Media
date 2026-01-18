/**
 * Tenant Routes
 * Issue #935: Multi-Tenant Architecture with RBAC
 * 
 * API routes for tenant administration.
 */

const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { requireTenant, requireTenantAdmin } = require('../middleware/tenant.middleware');
const { checkPermission, requireRole, PERMISSIONS, SYSTEM_ROLES } = require('../middleware/rbacMiddleware');

// Middleware (simplified - use actual auth middleware in production)
const authMiddleware = (req, res, next) => next();
const platformAdminMiddleware = (req, res, next) => next();

/**
 * @swagger
 * /api/tenants:
 *   post:
 *     summary: Create new tenant
 *     tags: [Tenants]
 */
router.post('/', authMiddleware, tenantController.createTenant);

/**
 * @swagger
 * /api/tenants:
 *   get:
 *     summary: List all tenants (platform admin)
 *     tags: [Tenants]
 */
router.get('/', authMiddleware, platformAdminMiddleware, tenantController.listTenants);

/**
 * @swagger
 * /api/tenants/current:
 *   get:
 *     summary: Get current tenant info
 *     tags: [Tenants]
 */
router.get('/current', requireTenant, tenantController.getCurrentTenant);

/**
 * @swagger
 * /api/tenants/:tenantId:
 *   get:
 *     summary: Get tenant by ID
 *     tags: [Tenants]
 */
router.get('/:tenantId', authMiddleware, tenantController.getTenant);

/**
 * @swagger
 * /api/tenants/:tenantId:
 *   put:
 *     summary: Update tenant
 *     tags: [Tenants]
 */
router.put('/:tenantId', authMiddleware, requireTenantAdmin, tenantController.updateTenant);

/**
 * @swagger
 * /api/tenants/:tenantId/branding:
 *   put:
 *     summary: Update tenant branding
 *     tags: [Tenants]
 */
router.put('/:tenantId/branding', authMiddleware, requireTenantAdmin, tenantController.updateBranding);

/**
 * @swagger
 * /api/tenants/:tenantId/domains:
 *   post:
 *     summary: Add domain to tenant
 *     tags: [Tenants]
 */
router.post('/:tenantId/domains', authMiddleware, requireTenantAdmin, tenantController.addDomain);

/**
 * @swagger
 * /api/tenants/:tenantId/domains/verify:
 *   post:
 *     summary: Verify domain ownership
 *     tags: [Tenants]
 */
router.post('/:tenantId/domains/verify', authMiddleware, requireTenantAdmin, tenantController.verifyDomain);

/**
 * @swagger
 * /api/tenants/:tenantId/admins:
 *   post:
 *     summary: Add admin to tenant
 *     tags: [Tenants]
 */
router.post('/:tenantId/admins', authMiddleware, requireTenantAdmin, tenantController.addAdmin);

/**
 * @swagger
 * /api/tenants/:tenantId/admins/:userId:
 *   delete:
 *     summary: Remove admin from tenant
 *     tags: [Tenants]
 */
router.delete('/:tenantId/admins/:userId', authMiddleware, requireTenantAdmin, tenantController.removeAdmin);

/**
 * @swagger
 * /api/tenants/:tenantId/subscription:
 *   put:
 *     summary: Update subscription plan
 *     tags: [Tenants]
 */
router.put('/:tenantId/subscription', authMiddleware, requireTenantAdmin, tenantController.updateSubscription);

/**
 * @swagger
 * /api/tenants/:tenantId/stats:
 *   get:
 *     summary: Get tenant statistics
 *     tags: [Tenants]
 */
router.get('/:tenantId/stats', authMiddleware, requireTenantAdmin, tenantController.getTenantStats);

/**
 * @swagger
 * /api/tenants/:tenantId/suspend:
 *   post:
 *     summary: Suspend tenant (platform admin)
 *     tags: [Tenants]
 */
router.post('/:tenantId/suspend', authMiddleware, platformAdminMiddleware, tenantController.suspendTenant);

/**
 * @swagger
 * /api/tenants/:tenantId/reactivate:
 *   post:
 *     summary: Reactivate tenant (platform admin)
 *     tags: [Tenants]
 */
router.post('/:tenantId/reactivate', authMiddleware, platformAdminMiddleware, tenantController.reactivateTenant);

module.exports = router;

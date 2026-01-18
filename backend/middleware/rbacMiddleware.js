/**
 * RBAC Middleware
 * Issue #935: Multi-Tenant Architecture with RBAC
 * 
 * Enhanced middleware with tenant-aware permission checks.
 */

const { hasPermission, getPermissions, PERMISSIONS, TENANT_ROLES, SYSTEM_ROLES } = require('../config/roles');

/**
 * Check if user has required permission
 */
const checkPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Get user's role(s)
    const userRole = getUserRole(req);

    // System admins bypass all checks
    if (userRole === SYSTEM_ROLES.SUPER_ADMIN) {
      return next();
    }

    // Check each required permission
    const missingPermissions = [];

    for (const permission of requiredPermissions) {
      if (!hasPermission(userRole, permission)) {
        missingPermissions.push(permission);
      }
    }

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        required: requiredPermissions,
        missing: missingPermissions
      });
    }

    // Attach permissions to request
    req.userPermissions = getPermissions(userRole);

    next();
  };
};

/**
 * Get user's role in current tenant context
 */
const getUserRole = (req) => {
  const user = req.user;
  const tenant = req.tenant;

  // Check for system-level role first
  if (user.systemRole) {
    return user.systemRole;
  }

  // If no tenant context, default to guest
  if (!tenant) {
    return TENANT_ROLES.GUEST;
  }

  // Check if user is tenant owner
  if (tenant.owner.toString() === user._id.toString()) {
    return TENANT_ROLES.OWNER;
  }

  // Check if user is tenant admin
  if (tenant.admins.some(a => a.toString() === user._id.toString())) {
    return TENANT_ROLES.ADMIN;
  }

  // Get user's role for this tenant from user's tenantRoles
  if (user.tenantRoles && user.tenantRoles[tenant._id.toString()]) {
    return user.tenantRoles[tenant._id.toString()];
  }

  // Default role from tenant settings
  return tenant.settings?.defaultRole || TENANT_ROLES.MEMBER;
};

/**
 * Require any of the specified roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = getUserRole(req);

    // System admins bypass role checks
    if (userRole === SYSTEM_ROLES.SUPER_ADMIN) {
      return next();
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Required role not found.',
        code: 'ROLE_REQUIRED',
        required: roles,
        current: userRole
      });
    }

    req.userRole = userRole;
    next();
  };
};

/**
 * Require minimum role level
 */
const requireMinRole = (minRole) => {
  const roleHierarchy = [
    TENANT_ROLES.GUEST,
    TENANT_ROLES.MEMBER,
    TENANT_ROLES.MODERATOR,
    TENANT_ROLES.ADMIN,
    TENANT_ROLES.OWNER
  ];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = getUserRole(req);

    // System admins bypass role checks
    if (Object.values(SYSTEM_ROLES).includes(userRole)) {
      return next();
    }

    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const minRoleIndex = roleHierarchy.indexOf(minRole);

    if (userRoleIndex < minRoleIndex) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Minimum role required: ${minRole}`,
        code: 'INSUFFICIENT_ROLE',
        required: minRole,
        current: userRole
      });
    }

    req.userRole = userRole;
    next();
  };
};

/**
 * Require resource ownership or specific permission
 */
const requireOwnershipOrPermission = (getResourceOwnerId, permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = getUserRole(req);

    // System admins bypass ownership checks
    if (userRole === SYSTEM_ROLES.SUPER_ADMIN) {
      return next();
    }

    // Check if user has the bypass permission
    if (hasPermission(userRole, permission)) {
      return next();
    }

    // Check resource ownership
    try {
      const ownerId = await getResourceOwnerId(req);

      if (ownerId && ownerId.toString() === req.user._id.toString()) {
        req.isResourceOwner = true;
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this resource.',
        code: 'NOT_OWNER'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership',
        code: 'OWNERSHIP_CHECK_FAILED'
      });
    }
  };
};

/**
 * Tenant-scoped query middleware
 * Automatically adds tenant filter to queries
 */
const scopeToTenant = (req, res, next) => {
  if (req.tenant) {
    // Attach tenant scope to request for use in controllers
    req.tenantScope = { tenantId: req.tenant._id };

    // Override query params to include tenant filter
    if (!req.query) req.query = {};
    req.query.tenantId = req.tenant._id;
  }

  next();
};

/**
 * Log permission check for auditing
 */
const auditPermission = (action) => {
  return (req, res, next) => {
    const user = req.user;
    const tenant = req.tenant;
    const userRole = user ? getUserRole(req) : 'anonymous';

    console.log(`[RBAC Audit] Action: ${action}, User: ${user?._id}, Role: ${userRole}, Tenant: ${tenant?.tenantId}`);

    next();
  };
};

module.exports = {
  checkPermission,
  requireRole,
  requireMinRole,
  requireOwnershipOrPermission,
  scopeToTenant,
  auditPermission,
  getUserRole,
  PERMISSIONS,
  TENANT_ROLES,
  SYSTEM_ROLES
};

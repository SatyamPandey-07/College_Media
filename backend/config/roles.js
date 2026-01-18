/**
 * Tenant Roles Configuration
 * Issue #935: Multi-Tenant Architecture with RBAC
 * 
 * Extended RBAC system with tenant-level permissions.
 */

// System-level roles (platform-wide)
const SYSTEM_ROLES = {
    SUPER_ADMIN: 'super_admin',
    PLATFORM_ADMIN: 'platform_admin',
    SUPPORT: 'support'
};

// Tenant-level roles
const TENANT_ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    MEMBER: 'member',
    GUEST: 'guest'
};

// All available permissions
const PERMISSIONS = {
    // Tenant management
    TENANT_CREATE: 'tenant:create',
    TENANT_READ: 'tenant:read',
    TENANT_UPDATE: 'tenant:update',
    TENANT_DELETE: 'tenant:delete',
    TENANT_MANAGE_BILLING: 'tenant:manage_billing',
    TENANT_MANAGE_BRANDING: 'tenant:manage_branding',
    TENANT_MANAGE_SETTINGS: 'tenant:manage_settings',

    // User management
    USER_CREATE: 'user:create',
    USER_READ: 'user:read',
    USER_UPDATE: 'user:update',
    USER_DELETE: 'user:delete',
    USER_MANAGE_ROLES: 'user:manage_roles',
    USER_INVITE: 'user:invite',
    USER_BAN: 'user:ban',

    // Content management
    POST_CREATE: 'post:create',
    POST_READ: 'post:read',
    POST_UPDATE: 'post:update',
    POST_DELETE: 'post:delete',
    POST_MODERATE: 'post:moderate',
    POST_PIN: 'post:pin',

    // Comment management
    COMMENT_CREATE: 'comment:create',
    COMMENT_READ: 'comment:read',
    COMMENT_UPDATE: 'comment:update',
    COMMENT_DELETE: 'comment:delete',
    COMMENT_MODERATE: 'comment:moderate',

    // Moderation
    MODERATION_ACCESS: 'moderation:access',
    MODERATION_APPROVE: 'moderation:approve',
    MODERATION_REJECT: 'moderation:reject',
    MODERATION_CONFIGURE: 'moderation:configure',

    // Analytics
    ANALYTICS_VIEW: 'analytics:view',
    ANALYTICS_EXPORT: 'analytics:export',
    ANALYTICS_CONFIGURE: 'analytics:configure',

    // Settings
    SETTINGS_VIEW: 'settings:view',
    SETTINGS_EDIT: 'settings:edit',

    // API
    API_ACCESS: 'api:access',
    API_MANAGE_KEYS: 'api:manage_keys'
};

// Role-permission mappings
const ROLE_PERMISSIONS = {
    // System roles
    [SYSTEM_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

    [SYSTEM_ROLES.PLATFORM_ADMIN]: [
        PERMISSIONS.TENANT_CREATE,
        PERMISSIONS.TENANT_READ,
        PERMISSIONS.TENANT_UPDATE,
        PERMISSIONS.TENANT_MANAGE_SETTINGS,
        PERMISSIONS.USER_READ,
        PERMISSIONS.ANALYTICS_VIEW,
        PERMISSIONS.ANALYTICS_EXPORT
    ],

    [SYSTEM_ROLES.SUPPORT]: [
        PERMISSIONS.TENANT_READ,
        PERMISSIONS.USER_READ,
        PERMISSIONS.POST_READ,
        PERMISSIONS.COMMENT_READ
    ],

    // Tenant roles
    [TENANT_ROLES.OWNER]: [
        PERMISSIONS.TENANT_READ,
        PERMISSIONS.TENANT_UPDATE,
        PERMISSIONS.TENANT_MANAGE_BILLING,
        PERMISSIONS.TENANT_MANAGE_BRANDING,
        PERMISSIONS.TENANT_MANAGE_SETTINGS,
        PERMISSIONS.USER_CREATE,
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.USER_MANAGE_ROLES,
        PERMISSIONS.USER_INVITE,
        PERMISSIONS.USER_BAN,
        PERMISSIONS.POST_CREATE,
        PERMISSIONS.POST_READ,
        PERMISSIONS.POST_UPDATE,
        PERMISSIONS.POST_DELETE,
        PERMISSIONS.POST_MODERATE,
        PERMISSIONS.POST_PIN,
        PERMISSIONS.COMMENT_CREATE,
        PERMISSIONS.COMMENT_READ,
        PERMISSIONS.COMMENT_UPDATE,
        PERMISSIONS.COMMENT_DELETE,
        PERMISSIONS.COMMENT_MODERATE,
        PERMISSIONS.MODERATION_ACCESS,
        PERMISSIONS.MODERATION_APPROVE,
        PERMISSIONS.MODERATION_REJECT,
        PERMISSIONS.MODERATION_CONFIGURE,
        PERMISSIONS.ANALYTICS_VIEW,
        PERMISSIONS.ANALYTICS_EXPORT,
        PERMISSIONS.ANALYTICS_CONFIGURE,
        PERMISSIONS.SETTINGS_VIEW,
        PERMISSIONS.SETTINGS_EDIT,
        PERMISSIONS.API_ACCESS,
        PERMISSIONS.API_MANAGE_KEYS
    ],

    [TENANT_ROLES.ADMIN]: [
        PERMISSIONS.TENANT_READ,
        PERMISSIONS.TENANT_UPDATE,
        PERMISSIONS.TENANT_MANAGE_BRANDING,
        PERMISSIONS.TENANT_MANAGE_SETTINGS,
        PERMISSIONS.USER_CREATE,
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.USER_INVITE,
        PERMISSIONS.USER_BAN,
        PERMISSIONS.POST_CREATE,
        PERMISSIONS.POST_READ,
        PERMISSIONS.POST_UPDATE,
        PERMISSIONS.POST_DELETE,
        PERMISSIONS.POST_MODERATE,
        PERMISSIONS.POST_PIN,
        PERMISSIONS.COMMENT_CREATE,
        PERMISSIONS.COMMENT_READ,
        PERMISSIONS.COMMENT_UPDATE,
        PERMISSIONS.COMMENT_DELETE,
        PERMISSIONS.COMMENT_MODERATE,
        PERMISSIONS.MODERATION_ACCESS,
        PERMISSIONS.MODERATION_APPROVE,
        PERMISSIONS.MODERATION_REJECT,
        PERMISSIONS.ANALYTICS_VIEW,
        PERMISSIONS.SETTINGS_VIEW
    ],

    [TENANT_ROLES.MODERATOR]: [
        PERMISSIONS.TENANT_READ,
        PERMISSIONS.USER_READ,
        PERMISSIONS.POST_CREATE,
        PERMISSIONS.POST_READ,
        PERMISSIONS.POST_UPDATE,
        PERMISSIONS.POST_MODERATE,
        PERMISSIONS.COMMENT_CREATE,
        PERMISSIONS.COMMENT_READ,
        PERMISSIONS.COMMENT_UPDATE,
        PERMISSIONS.COMMENT_MODERATE,
        PERMISSIONS.MODERATION_ACCESS,
        PERMISSIONS.MODERATION_APPROVE,
        PERMISSIONS.MODERATION_REJECT
    ],

    [TENANT_ROLES.MEMBER]: [
        PERMISSIONS.TENANT_READ,
        PERMISSIONS.USER_READ,
        PERMISSIONS.POST_CREATE,
        PERMISSIONS.POST_READ,
        PERMISSIONS.COMMENT_CREATE,
        PERMISSIONS.COMMENT_READ
    ],

    [TENANT_ROLES.GUEST]: [
        PERMISSIONS.TENANT_READ,
        PERMISSIONS.POST_READ,
        PERMISSIONS.COMMENT_READ
    ]
};

/**
 * Check if role has permission
 */
const hasPermission = (role, permission) => {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
};

/**
 * Get all permissions for role
 */
const getPermissions = (role) => {
    return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if role can manage another role
 */
const canManageRole = (managerRole, targetRole) => {
    const hierarchy = [
        TENANT_ROLES.GUEST,
        TENANT_ROLES.MEMBER,
        TENANT_ROLES.MODERATOR,
        TENANT_ROLES.ADMIN,
        TENANT_ROLES.OWNER
    ];

    const managerIndex = hierarchy.indexOf(managerRole);
    const targetIndex = hierarchy.indexOf(targetRole);

    return managerIndex > targetIndex;
};

/**
 * Get available roles for assignment by a given role
 */
const getAssignableRoles = (managerRole) => {
    const hierarchy = [
        TENANT_ROLES.GUEST,
        TENANT_ROLES.MEMBER,
        TENANT_ROLES.MODERATOR,
        TENANT_ROLES.ADMIN
    ];

    const managerIndex = hierarchy.indexOf(managerRole);
    if (managerIndex === -1) return [];

    return hierarchy.slice(0, managerIndex + 1);
};

module.exports = {
    SYSTEM_ROLES,
    TENANT_ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    hasPermission,
    getPermissions,
    canManageRole,
    getAssignableRoles
};

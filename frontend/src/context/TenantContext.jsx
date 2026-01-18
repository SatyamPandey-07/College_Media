/**
 * TenantContext
 * Issue #935: Multi-Tenant Architecture with RBAC
 * 
 * React context for managing tenant state and branding.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tenantsApi } from '../api/endpoints';

const TenantContext = createContext(null);

export const TenantProvider = ({ children }) => {
    const [tenant, setTenant] = useState(null);
    const [branding, setBranding] = useState(getDefaultBranding());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userRole, setUserRole] = useState(null);

    /**
     * Get default branding
     */
    function getDefaultBranding() {
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
    }

    /**
     * Fetch current tenant
     */
    const fetchTenant = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await tenantsApi.getCurrent();
            const tenantData = response.data.data;

            setTenant(tenantData);

            // Set branding
            if (tenantData.branding) {
                setBranding({
                    name: tenantData.displayName || tenantData.name,
                    logo: tenantData.branding.logo,
                    favicon: tenantData.branding.favicon,
                    primaryColor: tenantData.branding.primaryColor || '#3b82f6',
                    secondaryColor: tenantData.branding.secondaryColor || '#8b5cf6',
                    theme: tenantData.branding.theme || 'auto',
                    customCSS: tenantData.branding.customCSS || '',
                    welcomeMessage: tenantData.branding.welcomeMessage || `Welcome to ${tenantData.name}`
                });
            }

            // Apply branding
            applyBranding(tenantData.branding);

        } catch (err) {
            console.error('Fetch tenant error:', err);
            setError('Failed to load tenant');
            setBranding(getDefaultBranding());
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Apply branding to document
     */
    const applyBranding = useCallback((brandingData) => {
        if (!brandingData) return;

        // Set CSS custom properties
        const root = document.documentElement;
        root.style.setProperty('--color-primary', brandingData.primaryColor || '#3b82f6');
        root.style.setProperty('--color-secondary', brandingData.secondaryColor || '#8b5cf6');

        // Set favicon
        if (brandingData.favicon) {
            const favicon = document.querySelector('link[rel="icon"]');
            if (favicon) {
                favicon.href = brandingData.favicon;
            }
        }

        // Set document title
        if (brandingData.name) {
            document.title = brandingData.name;
        }

        // Apply custom CSS
        if (brandingData.customCSS) {
            let styleEl = document.getElementById('tenant-custom-css');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'tenant-custom-css';
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = brandingData.customCSS;
        }

        // Apply theme
        if (brandingData.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (brandingData.theme === 'light') {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    /**
     * Update tenant settings
     */
    const updateTenant = useCallback(async (updates) => {
        if (!tenant) return;

        try {
            const response = await tenantsApi.update(tenant.tenantId, updates);
            setTenant(response.data.data);
            return response.data.data;
        } catch (err) {
            console.error('Update tenant error:', err);
            throw err;
        }
    }, [tenant]);

    /**
     * Update branding
     */
    const updateBranding = useCallback(async (brandingUpdates) => {
        if (!tenant) return;

        try {
            const response = await tenantsApi.updateBranding(tenant.tenantId, brandingUpdates);
            const newBranding = response.data.data.branding;

            setBranding(prev => ({ ...prev, ...newBranding }));
            applyBranding(newBranding);

            return response.data.data;
        } catch (err) {
            console.error('Update branding error:', err);
            throw err;
        }
    }, [tenant, applyBranding]);

    /**
     * Check user permission
     */
    const hasPermission = useCallback((permission) => {
        // This would be populated from the auth context
        // For now, return true for basic permissions
        return true;
    }, []);

    /**
     * Check if user is tenant admin
     */
    const isTenantAdmin = useCallback(() => {
        return userRole === 'owner' || userRole === 'admin';
    }, [userRole]);

    /**
     * Get tenant URL
     */
    const getTenantUrl = useCallback(() => {
        if (!tenant) return window.location.origin;

        if (tenant.subdomain) {
            return `https://${tenant.subdomain}.collegemedia.com`;
        }

        const primaryDomain = tenant.domains?.find(d => d.isPrimary && d.verified);
        return primaryDomain ? `https://${primaryDomain.domain}` : window.location.origin;
    }, [tenant]);

    /**
     * Fetch tenant on mount
     */
    useEffect(() => {
        fetchTenant();
    }, [fetchTenant]);

    const value = {
        // State
        tenant,
        branding,
        loading,
        error,
        userRole,

        // Actions
        fetchTenant,
        updateTenant,
        updateBranding,
        hasPermission,
        isTenantAdmin,
        getTenantUrl,
        setUserRole
    };

    return (
        <TenantContext.Provider value={value}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = () => {
    const context = useContext(TenantContext);

    if (!context) {
        throw new Error('useTenant must be used within a TenantProvider');
    }

    return context;
};

export default TenantContext;

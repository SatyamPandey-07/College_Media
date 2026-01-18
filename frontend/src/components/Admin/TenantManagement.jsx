/**
 * TenantManagement Component
 * Issue #935: Multi-Tenant Architecture with RBAC
 * 
 * Admin dashboard for tenant management.
 */

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTenant } from '../../context/TenantContext';
import toast from 'react-hot-toast';

const TenantManagement = () => {
    const { tenant, branding, updateTenant, updateBranding, isTenantAdmin } = useTenant();

    const [activeTab, setActiveTab] = useState('general');
    const [saving, setSaving] = useState(false);

    // Form states
    const [generalForm, setGeneralForm] = useState({
        name: '',
        displayName: '',
        type: 'college'
    });

    const [brandingForm, setBrandingForm] = useState({
        primaryColor: '#3b82f6',
        secondaryColor: '#8b5cf6',
        theme: 'auto',
        welcomeMessage: ''
    });

    const [settingsForm, setSettingsForm] = useState({
        registrationEnabled: true,
        emailVerificationRequired: true,
        defaultRole: 'member',
        contentModeration: 'basic',
        privateByDefault: false
    });

    const tabs = [
        { id: 'general', label: 'General', icon: 'mdi:information-outline' },
        { id: 'branding', label: 'Branding', icon: 'mdi:palette' },
        { id: 'settings', label: 'Settings', icon: 'mdi:cog' },
        { id: 'domains', label: 'Domains', icon: 'mdi:web' },
        { id: 'team', label: 'Team', icon: 'mdi:account-group' },
        { id: 'billing', label: 'Billing', icon: 'mdi:credit-card' }
    ];

    // Initialize forms from tenant
    useEffect(() => {
        if (tenant) {
            setGeneralForm({
                name: tenant.name || '',
                displayName: tenant.displayName || '',
                type: tenant.type || 'college'
            });

            setBrandingForm({
                primaryColor: tenant.branding?.primaryColor || '#3b82f6',
                secondaryColor: tenant.branding?.secondaryColor || '#8b5cf6',
                theme: tenant.branding?.theme || 'auto',
                welcomeMessage: tenant.branding?.welcomeMessage || ''
            });

            setSettingsForm({
                registrationEnabled: tenant.settings?.registrationEnabled ?? true,
                emailVerificationRequired: tenant.settings?.emailVerificationRequired ?? true,
                defaultRole: tenant.settings?.defaultRole || 'member',
                contentModeration: tenant.settings?.contentModeration || 'basic',
                privateByDefault: tenant.settings?.privateByDefault ?? false
            });
        }
    }, [tenant]);

    /**
     * Handle general form save
     */
    const handleSaveGeneral = async () => {
        setSaving(true);
        try {
            await updateTenant({
                name: generalForm.name,
                displayName: generalForm.displayName
            });
            toast.success('General settings saved');
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Handle branding save
     */
    const handleSaveBranding = async () => {
        setSaving(true);
        try {
            await updateBranding(brandingForm);
            toast.success('Branding saved');
        } catch (error) {
            toast.error('Failed to save branding');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Handle settings save
     */
    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            await updateTenant({ settings: settingsForm });
            toast.success('Settings saved');
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (!tenant) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="tenant-management max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Organization Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Manage your organization's settings, branding, and team.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${activeTab === tab.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}
            `}
                    >
                        <Icon icon={tab.icon} className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">

                {/* General Tab */}
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            General Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Organization Name
                                </label>
                                <input
                                    type="text"
                                    value={generalForm.name}
                                    onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={generalForm.displayName}
                                    onChange={(e) => setGeneralForm({ ...generalForm, displayName: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Organization Type
                                </label>
                                <select
                                    value={generalForm.type}
                                    onChange={(e) => setGeneralForm({ ...generalForm, type: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="university">University</option>
                                    <option value="college">College</option>
                                    <option value="department">Department</option>
                                    <option value="organization">Organization</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tenant ID
                                </label>
                                <input
                                    type="text"
                                    value={tenant.tenantId}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveGeneral}
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}

                {/* Branding Tab */}
                {activeTab === 'branding' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Branding & Appearance
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Primary Color
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={brandingForm.primaryColor}
                                        onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                                        className="w-12 h-10 rounded border-0"
                                    />
                                    <input
                                        type="text"
                                        value={brandingForm.primaryColor}
                                        onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Secondary Color
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={brandingForm.secondaryColor}
                                        onChange={(e) => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })}
                                        className="w-12 h-10 rounded border-0"
                                    />
                                    <input
                                        type="text"
                                        value={brandingForm.secondaryColor}
                                        onChange={(e) => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Theme
                                </label>
                                <select
                                    value={brandingForm.theme}
                                    onChange={(e) => setBrandingForm({ ...brandingForm, theme: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="auto">Auto (System)</option>
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Welcome Message
                                </label>
                                <textarea
                                    value={brandingForm.welcomeMessage}
                                    onChange={(e) => setBrandingForm({ ...brandingForm, welcomeMessage: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="mt-8">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Preview</h4>
                            <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700"
                                style={{ background: `linear-gradient(135deg, ${brandingForm.primaryColor}20, ${brandingForm.secondaryColor}20)` }}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                                        style={{ backgroundColor: brandingForm.primaryColor }}>
                                        {tenant.name?.[0] || 'C'}
                                    </div>
                                    <span className="text-lg font-semibold" style={{ color: brandingForm.primaryColor }}>
                                        {generalForm.displayName || generalForm.name}
                                    </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {brandingForm.welcomeMessage || 'Welcome to our community!'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveBranding}
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Branding'}
                        </button>
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Organization Settings
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">Allow Registration</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Allow new users to register</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settingsForm.registrationEnabled}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, registrationEnabled: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-checked:bg-blue-600 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">Require Email Verification</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Users must verify email before accessing</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settingsForm.emailVerificationRequired}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, emailVerificationRequired: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-checked:bg-blue-600 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">Private by Default</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">New posts are private by default</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settingsForm.privateByDefault}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, privateByDefault: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-checked:bg-blue-600 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                </label>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-gray-900 dark:text-white">Content Moderation</p>
                                </div>
                                <select
                                    value={settingsForm.contentModeration}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, contentModeration: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                                >
                                    <option value="none">None</option>
                                    <option value="basic">Basic</option>
                                    <option value="strict">Strict</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                )}

                {/* Subscription Info */}
                {activeTab === 'billing' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Subscription & Billing
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
                                <p className="text-sm opacity-80">Current Plan</p>
                                <p className="text-2xl font-bold capitalize">{tenant.subscription?.plan || 'Free'}</p>
                            </div>

                            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                                    {tenant.subscription?.status || 'Active'}
                                </p>
                            </div>

                            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Users</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {tenant.usage?.userCount || 0} / {tenant.limits?.maxUsers === -1 ? '∞' : tenant.limits?.maxUsers}
                                </p>
                            </div>
                        </div>

                        <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90">
                            Upgrade Plan
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TenantManagement;

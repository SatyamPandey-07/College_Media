/**
 * Notification Preferences Settings
 * Issue #964: Advanced Multi-Channel Notification System
 * 
 * UI for managing notification channels, categories, and push subscription.
 */

import React, { useEffect, useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';

const NotificationPreferences = () => {
    const {
        preferences,
        fetchPreferences,
        updatePreferences,
        pushSupported,
        pushEnabled,
        enablePush,
        disablePush
    } = useNotifications();

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPreferences();
    }, [fetchPreferences]);

    if (!preferences) return (
        <div className="flex justify-center p-8">
            <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-gray-400" />
        </div>
    );

    const handleChannelToggle = async (channel) => {
        const newVal = !preferences.channels[channel].enabled;
        await updatePreferences({
            channels: { [channel]: { enabled: newVal } }
        });
    };

    const handleCategoryToggle = async (category, channel) => {
        const current = preferences.categories[category]?.[channel] ?? true;
        await updatePreferences({
            categories: {
                [category]: { [channel]: !current }
            }
        });
    };

    const handleDigestChange = async (e) => {
        const { name, value } = e.target;
        await updatePreferences({
            digest: { [name]: value }
        });
    };

    const handleQuietHoursChange = async (e) => {
        const { name, value, type, checked } = e.target;
        await updatePreferences({
            quietHours: { [name]: type === 'checkbox' ? checked : value }
        });
    };

    const categories = [
        { id: 'social', label: 'Social Interactions', icon: 'mdi:account-group' },
        { id: 'content', label: 'Content Updates', icon: 'mdi:file-document' },
        { id: 'messaging', label: 'Direct Messages', icon: 'mdi:message' },
        { id: 'events', label: 'Events & Calendar', icon: 'mdi:calendar' },
        { id: 'system', label: 'System & Security', icon: 'mdi:shield-alert' },
        { id: 'marketing', label: 'News & Updates', icon: 'mdi:bullhorn' }
    ];

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Control how and when you receive notifications.</p>
            </header>

            {/* Global Channels */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery Channels</h2>
                <div className="space-y-4">

                    {/* Email */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                                <Icon icon="mdi:email-outline" className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">Email Notifications</h3>
                                <p className="text-sm text-gray-500">Receive updates via email</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={preferences.channels.email.enabled}
                                onChange={() => handleChannelToggle('email')}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {/* Browser Push */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                                <Icon icon="mdi:bell-ring-outline" className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">Web Push Notifications</h3>
                                <p className="text-sm text-gray-500">Receive notifications on your device</p>
                                {pushSupported && (
                                    <button
                                        onClick={pushEnabled ? disablePush : enablePush}
                                        className="text-xs text-blue-600 hover:text-blue-700 mt-1 font-medium"
                                    >
                                        {pushEnabled ? 'Manage device' : 'Enable on this device'}
                                    </button>
                                )}
                                {!pushSupported && (
                                    <p className="text-xs text-red-500 mt-1">Not supported on this browser</p>
                                )}
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={preferences.channels.push.enabled}
                                onChange={() => handleChannelToggle('push')}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                </div>
            </section>

            {/* Fine-grained Control */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Notification Categories</h2>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className="text-left pb-4 font-medium text-gray-500">Category</th>
                                <th className="text-center pb-4 font-medium text-gray-500 w-24">Email</th>
                                <th className="text-center pb-4 font-medium text-gray-500 w-24">Push</th>
                                <th className="text-center pb-4 font-medium text-gray-500 w-24">In-App</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {categories.map((cat) => (
                                <tr key={cat.id}>
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <Icon icon={cat.icon} className="w-5 h-5 text-gray-400" />
                                            <span className="font-medium text-gray-900 dark:text-white">{cat.label}</span>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={preferences.categories[cat.id]?.email ?? false}
                                            onChange={() => handleCategoryToggle(cat.id, 'email')}
                                            disabled={!preferences.channels.email.enabled}
                                        />
                                    </td>
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={preferences.categories[cat.id]?.push ?? false}
                                            onChange={() => handleCategoryToggle(cat.id, 'push')}
                                            disabled={!preferences.channels.push.enabled}
                                        />
                                    </td>
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={preferences.categories[cat.id]?.inApp ?? true}
                                            onChange={() => handleCategoryToggle(cat.id, 'inApp')}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Email Digest */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Digest</h2>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Frequency
                        </label>
                        <select
                            name="frequency"
                            value={preferences.digest.frequency}
                            onChange={handleDigestChange}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="daily">Daily Digest</option>
                            <option value="weekly">Weekly Digest</option>
                            <option value="never">Send individually (No Digest)</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Delivery Time
                        </label>
                        <input
                            type="time"
                            name="time"
                            value={preferences.digest.time}
                            onChange={handleDigestChange}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                    Digests combine lower-priority notifications into a single email to reduce clutter.
                </p>
            </section>

            {/* Quiet Hours */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quiet Hours</h2>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            name="enabled"
                            className="sr-only peer"
                            checked={preferences.quietHours.enabled}
                            onChange={handleQuietHoursChange}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div className={`grid grid-cols-2 gap-4 transition-opacity ${!preferences.quietHours.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Start Time
                        </label>
                        <input
                            type="time"
                            name="startTime"
                            value={preferences.quietHours.startTime}
                            onChange={handleQuietHoursChange}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            End Time
                        </label>
                        <input
                            type="time"
                            name="endTime"
                            value={preferences.quietHours.endTime}
                            onChange={handleQuietHoursChange}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                    During quiet hours, push notifications will be paused but in-app notifications will still be saved. This does not affect urgent alerts.
                </p>
            </section>
        </div>
    );
};

export default NotificationPreferences;

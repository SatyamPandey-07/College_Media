/**
 * Notification Context
 * Issue #964: Advanced Multi-Channel Notification System
 * 
 * Manages notification state, polling, and push subscription.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../api/endpoints';
import { useMessaging } from './MessagingContext'; // Reuse socket connection
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [preferences, setPreferences] = useState(null);
    const [pushSupported, setPushSupported] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);

    const { socket } = useMessaging();

    // Initialize
    useEffect(() => {
        // Check push support
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setPushSupported(true);
            checkPushPermission();
        }
    }, []);

    // Socket listener for real-time notifications
    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (notification) => {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Show toast
            toast(notification.body, {
                icon: '🔔',
                duration: 4000
            });
        };

        socket.on('notification:new', handleNewNotification);

        return () => {
            socket.off('notification:new', handleNewNotification);
        };
    }, [socket]);

    /**
     * Fetch user notifications
     */
    const fetchNotifications = useCallback(async (options = {}) => {
        setLoading(true);
        try {
            const response = await notificationApi.getAll(options);
            if (options.page > 1) {
                setNotifications(prev => [...prev, ...response.data.data.notifications]);
            } else {
                setNotifications(response.data.data.notifications);
            }
            setUnreadCount(response.data.data.unreadCount);
        } catch (error) {
            console.error('Fetch notifications error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Mark notification as read
     */
    const markAsRead = useCallback(async (id) => {
        // Optimistic update
        setNotifications(prev => prev.map(n =>
            n._id === id ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await notificationApi.markRead(id);
        } catch (error) {
            console.error('Mark read error:', error);
            // Revert if failed (optional)
        }
    }, []);

    /**
     * Mark all as read
     */
    const markAllAsRead = useCallback(async (category) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);

        try {
            await notificationApi.markAllRead(category);
        } catch (error) {
            console.error('Mark all read error:', error);
        }
    }, []);

    /**
     * Delete notification
     */
    const deleteNotification = useCallback(async (id) => {
        setNotifications(prev => prev.filter(n => n._id !== id));

        try {
            await notificationApi.delete(id);
        } catch (error) {
            console.error('Delete notification error:', error);
        }
    }, []);

    /**
     * Track click
     */
    const trackClick = useCallback(async (id) => {
        try {
            await notificationApi.trackClick(id);
            markAsRead(id);
        } catch (error) {
            console.error('Track click error:', error);
        }
    }, [markAsRead]);

    /**
     * Fetch preferences
     */
    const fetchPreferences = useCallback(async () => {
        try {
            const response = await notificationApi.getPreferences();
            setPreferences(response.data.data);
        } catch (error) {
            console.error('Fetch preferences error:', error);
        }
    }, []);

    /**
     * Update preferences
     */
    const updatePreferences = useCallback(async (updates) => {
        try {
            const response = await notificationApi.updatePreferences(updates);
            setPreferences(response.data.data);
            toast.success('Preferences updated');
            return true;
        } catch (error) {
            console.error('Update preferences error:', error);
            toast.error('Failed to update preferences');
            return false;
        }
    }, []);

    /**
     * Check push permission status
     */
    const checkPushPermission = async () => {
        const permission = Notification.permission;
        if (permission === 'granted') {
            // Verify subscription exists
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setPushEnabled(!!subscription);
        } else {
            setPushEnabled(false);
        }
    };

    /**
     * Enable push notifications
     */
    const enablePush = async () => {
        if (!pushSupported) return false;

        try {
            // 1. Ask permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast.error('Permission denied');
                return false;
            }

            // 2. Get VAPID key
            const configRes = await notificationApi.getPushConfig();
            const vapidKey = configRes.data.publicKey;

            // 3. Register service worker (should already be done in index.js)
            const registration = await navigator.serviceWorker.ready;

            // 4. Subscribe
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            });

            // 5. Send to backend
            await notificationApi.subscribePush(subscription);

            setPushEnabled(true);
            toast.success('Push notifications enabled');
            updatePreferences({ channels: { push: { enabled: true } } });

            return true;
        } catch (error) {
            console.error('Enable push error:', error);
            toast.error('Failed to enable push notifications');
            return false;
        }
    };

    /**
     * Disable push notifications
     */
    const disablePush = async () => {
        if (!pushSupported) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Unsubscribe from browser
                await subscription.unsubscribe();

                // Notify backend
                await notificationApi.unsubscribePush({ endpoint: subscription.endpoint });
            }

            setPushEnabled(false);
            toast.success('Push notifications disabled');
            return true;
        } catch (error) {
            console.error('Disable push error:', error);
            return false;
        }
    };

    // Helper utility
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    const value = {
        notifications,
        unreadCount,
        loading,
        preferences,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        trackClick,
        fetchPreferences,
        updatePreferences,
        pushSupported,
        pushEnabled,
        enablePush,
        disablePush
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

export default NotificationContext;

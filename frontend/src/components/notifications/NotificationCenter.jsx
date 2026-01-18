/**
 * Notification Center
 * Issue #964: Advanced Multi-Channel Notification System
 * 
 * In-app notification UI component.
 */

import React, { useEffect, useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Icon } from '@iconify/react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const NotificationCenter = () => {
    const {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        trackClick,
        loading
    } = useNotifications();

    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState('all'); // all, social, content, system

    useEffect(() => {
        if (isOpen) {
            fetchNotifications({ limit: 20, page: 1 });
        }
    }, [isOpen, fetchNotifications]);

    const handleNotificationClick = (notification) => {
        trackClick(notification._id);
        setIsOpen(false);
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return true;
        return n.category === filter;
    });

    const getIcon = (type) => {
        switch (type) {
            case 'like': return 'mdi:heart';
            case 'comment': return 'mdi:comment';
            case 'follow': return 'mdi:account-plus';
            case 'mention': return 'mdi:at';
            case 'message': return 'mdi:message-text';
            case 'event': return 'mdi:calendar';
            case 'system': return 'mdi:bell';
            default: return 'mdi:circle-medium';
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'like': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
            case 'comment': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
            case 'follow': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
            case 'message': return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
            case 'system': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
            default: return 'text-gray-500 bg-gray-50 dark:bg-gray-800';
        }
    };

    return (
        <div className="relative">
            {/* Bell Icon Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <Icon icon="mdi:bell-outline" className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col max-h-[80vh]">

                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Notifications</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => markAllAsRead()}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                >
                                    Mark all read
                                </button>
                                <Link
                                    to="/settings/notifications"
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                                >
                                    <Icon icon="mdi:cog-outline" className="w-5 h-5" />
                                </Link>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex px-4 py-2 gap-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
                            {['all', 'social', 'content', 'system'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === f
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading && notifications.length === 0 ? (
                                <div className="flex justify-center items-center h-40">
                                    <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-blue-600" />
                                </div>
                            ) : filteredNotifications.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredNotifications.map(notification => (
                                        <div
                                            key={notification._id}
                                            className={`relative group p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!notification.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                {/* Icon/Avatar */}
                                                <div className="flex-shrink-0">
                                                    {notification.sender ? (
                                                        <img
                                                            src={notification.sender.avatar || '/default-avatar.png'}
                                                            alt=""
                                                            className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                                        />
                                                    ) : (
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getColor(notification.type)}`}>
                                                            <Icon icon={getIcon(notification.type)} className="w-5 h-5" />
                                                        </div>
                                                    )}

                                                    {/* Type badge overlapping avatar */}
                                                    {notification.sender && (
                                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 ${getColor(notification.type)}`}>
                                                            <Icon icon={getIcon(notification.type)} className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <Link
                                                        to={notification.data?.url || '#'}
                                                        onClick={() => handleNotificationClick(notification)}
                                                        className="block"
                                                    >
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                                                            {/* Bold the sender name if present */}
                                                            {notification.sender && <span className="font-bold">{notification.sender.username} </span>}
                                                            {notification.title}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                                            {notification.body}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                        </p>
                                                    </Link>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!notification.read && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                markAsRead(notification._id);
                                                            }}
                                                            className="w-2 h-2 bg-blue-600 rounded-full"
                                                            title="Mark as read"
                                                        />
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteNotification(notification._id);
                                                        }}
                                                        className="text-gray-400 hover:text-red-500"
                                                        title="Delete"
                                                    >
                                                        <Icon icon="mdi:close" className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Empty state padding */}
                                    <div className="h-10"></div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                        <Icon icon="mdi:bell-off-outline" className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h4 className="text-gray-900 dark:text-white font-medium">No notifications</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        You're all caught up! Check back later.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-gray-100 dark:border-gray-800 text-center bg-gray-50 dark:bg-gray-900/50">
                            <Link
                                to="/notifications"
                                onClick={() => setIsOpen(false)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                                View all notifications
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationCenter;

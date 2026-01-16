import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { useAnalytics } from '../hooks/useAnalytics';
import EngagementChart from '../components/EngagementChart';
import { format } from 'date-fns';

const AnalyticsDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { stats, topTags, loading, error } = useAnalytics();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Icon icon="mdi:loading" width={48} className="animate-spin text-brand-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-status-error/10 text-status-error rounded-xl border border-status-error/20">
                {t('analytics.errorLoading')}: {error}
            </div>
        );
    }

    const statCards = [
        {
            label: t('analytics.totalViews'),
            value: stats?.overview.totalViews || 0,
            icon: 'mdi:eye-outline',
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            label: t('analytics.totalLikes'),
            value: stats?.overview.totalLikes || 0,
            icon: 'mdi:heart-outline',
            color: 'text-rose-500',
            bg: 'bg-rose-500/10'
        },
        {
            label: t('analytics.totalComments'),
            value: stats?.overview.totalComments || 0,
            icon: 'mdi:comment-outline',
            color: 'text-amber-500',
            bg: 'bg-amber-500/10'
        },
        {
            label: t('analytics.totalShares'),
            value: stats?.overview.totalShares || 0,
            icon: 'mdi:share-variant-outline',
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        }
    ];

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight">
                        {t('analytics.dashboardTitle')}
                    </h1>
                    <p className="text-text-muted mt-1">
                        {t('analytics.dashboardSubtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-bg-secondary p-1 rounded-lg border border-border shadow-sm">
                    <button className="px-4 py-2 text-sm font-medium bg-brand-primary text-white rounded-md shadow-sm">
                        {t('analytics.last30Days')}
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-tertiary rounded-md transition-colors">
                        {t('analytics.last90Days')}
                    </button>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="bg-bg-secondary p-6 rounded-2xl border border-border shadow-soft group hover:border-brand-primary/30 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                                <Icon icon={stat.icon} width={24} />
                            </div>
                            <span className="text-xs font-medium text-green-500 bg-green-500/10 py-1 px-2 rounded-full">+12%</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm font-medium text-text-muted">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-text-primary mt-1">{stat.value.toLocaleString()}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Engagement Chart */}
                <div className="lg:col-span-2 bg-bg-secondary p-6 rounded-2xl border border-border shadow-soft">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-text-primary">{t('analytics.engagementTend')}</h3>
                        <button className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-muted">
                            <Icon icon="mdi:dots-horizontal" />
                        </button>
                    </div>
                    <EngagementChart data={stats?.engagementOverTime || []} />
                </div>

                {/* Top Tags */}
                <div className="bg-bg-secondary p-6 rounded-2xl border border-border shadow-soft">
                    <h3 className="text-lg font-semibold text-text-primary mb-6">{t('analytics.topTags')}</h3>
                    <div className="space-y-4">
                        {topTags.length > 0 ? topTags.map((tag, index) => (
                            <div key={index} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="text-sm font-bold text-text-muted w-4">{index + 1}</div>
                                    <div className="text-sm font-medium text-text-primary px-2 py-1 bg-bg-tertiary rounded-md group-hover:text-brand-primary transition-colors cursor-pointer">
                                        #{tag._id}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-text-primary">{tag.count} posts</div>
                                    <div className="text-xs text-text-muted">{tag.avgLikes.toFixed(1)} avg likes</div>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex items-center justify-center text-text-muted italic py-10">
                                {t('analytics.noTags')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Posts */}
            <div className="bg-bg-secondary rounded-2xl border border-border shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-text-primary">{t('analytics.topPerformingPosts')}</h3>
                    <button className="text-sm font-medium text-brand-primary hover:underline">
                        {t('analytics.viewAll')}
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-bg-tertiary/50">
                                <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">{t('analytics.post')}</th>
                                <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">{t('analytics.engagement')}</th>
                                <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">{t('analytics.date')}</th>
                                <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {stats?.topPosts.map((post) => (
                                <tr key={post._id} className="hover:bg-bg-tertiary/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-text-primary line-clamp-1 max-w-sm">
                                            {post.caption}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-1 text-xs text-rose-500 font-medium">
                                                <Icon icon="mdi:heart" /> {post.likesCount}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                                                <Icon icon="mdi:comment" /> {post.commentsCount}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-muted">
                                        {format(new Date(post.createdAt), 'MMM dd, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-muted">
                                            <Icon icon="mdi:chevron-right" width={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;

import { useState, useEffect } from 'react';
import { analyticsApi } from '../api/endpoints';
import { AnalyticsStats, TagAnalytics } from '../types';

export const useAnalytics = () => {
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [topTags, setTopTags] = useState<TagAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const [overviewRes, tagsRes] = await Promise.all([
                analyticsApi.getOverview(),
                analyticsApi.getTopTags()
            ]);
            setStats(overviewRes.data);
            setTopTags(tagsRes.data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const trackEvent = async (type: string, postId?: string, metadata?: any) => {
        try {
            await analyticsApi.track({ type, postId, metadata });
        } catch (err) {
            console.error('Failed to track event:', err);
        }
    };

    return { stats, topTags, loading, error, refetch: fetchAnalytics, trackEvent };
};

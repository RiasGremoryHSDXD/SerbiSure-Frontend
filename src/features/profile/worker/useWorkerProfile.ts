import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '../../auth/session/UserContext';
import { fetchJobStatus, updateJobStatus } from '../api/accountApi';
import { fetchReviewAnalytics, type ReviewAnalyticsData } from '../../reviews/api/reviewApi';

export function useWorkerProfile(enabled: boolean) {
  const { user } = useUser();
  const generation = useRef(0);
  const [isOnJob, setIsOnJob] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<ReviewAnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const refreshWorkerProfile = useCallback(async () => {
    const request = ++generation.current;
    if (!enabled || !user.token) {
      setIsOnJob(false); setAnalyticsData(null);
      return;
    }
    setIsLoadingAnalytics(true);
    const results = await Promise.allSettled([
      fetchReviewAnalytics(user.token), fetchJobStatus(user.token),
    ]);
    if (request !== generation.current) return;
    const [analytics, status] = results;
    if (analytics.status === 'fulfilled') setAnalyticsData(analytics.value);
    if (status.status === 'fulfilled') setIsOnJob(status.value);
    setIsLoadingAnalytics(false);
  }, [enabled, user.token, user.id]);

  useEffect(() => {
    void refreshWorkerProfile();
    return () => { generation.current++; };
  }, [refreshWorkerProfile]);

  const handleToggleJobStatus = async (newStatus: boolean) => {
    if (!enabled || !user.token) return;
    setIsOnJob(newStatus);
    try { setIsOnJob(await updateJobStatus(user.token, newStatus)); }
    catch (error) { setIsOnJob(!newStatus); console.warn('[WorkerProfile] Failed to update availability', error); }
  };

  return { isOnJob, analyticsData, isLoadingAnalytics, refreshWorkerProfile, handleToggleJobStatus };
}

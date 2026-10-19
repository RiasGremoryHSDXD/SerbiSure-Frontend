import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useUser } from '../../auth/session/UserContext';
import { useLanguage } from '../../../shared/localization/LanguageContext';
import { fetchJobStatus, updateJobStatus } from '../api/accountApi';
import { fetchReviewAnalytics, type ReviewAnalyticsData } from '../../reviews/api/reviewApi';

export function useWorkerProfile(enabled: boolean) {
  const { user, setUser } = useUser();
  const { tr } = useLanguage();
  const generation = useRef(0);
  const statusGeneration = useRef(0);
  const statusRef = useRef({ value: user.isOnJob, saving: user.isUpdatingJobStatus });
  statusRef.current = { value: user.isOnJob, saving: user.isUpdatingJobStatus };
  const isOnJob = user.isOnJob ?? null;
  const [jobStatusError, setJobStatusError] = useState(false);
  const isUpdatingJobStatus = user.isUpdatingJobStatus ?? false;
  const saving = useRef(false);
  const [analyticsData, setAnalyticsData] = useState<ReviewAnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const refreshWorkerProfile = useCallback(async (reloadStatus = true) => {
    const request = ++generation.current;
    if (!enabled || !user.token) {
      setAnalyticsData(null);
      return;
    }
    setIsLoadingAnalytics(true);
    const loadStatus = !saving.current && !statusRef.current.saving && (reloadStatus || statusRef.current.value === undefined);
    const statusRequest = loadStatus ? ++statusGeneration.current : statusGeneration.current;
    if (loadStatus) setJobStatusError(false);
    const results = await Promise.allSettled([
      fetchReviewAnalytics(user.token), loadStatus ? fetchJobStatus(user.token) : Promise.resolve(null),
    ]);
    if (request !== generation.current) return;
    const [analytics, status] = results;
    if (analytics.status === 'fulfilled') setAnalyticsData(analytics.value);
    if (loadStatus && statusRequest === statusGeneration.current) {
      if (status.status === 'fulfilled' && status.value !== null) {
        const value = status.value;
        setUser(previous => previous.id === user.id ? { ...previous, isOnJob: value } : previous);
      } else {
        setJobStatusError(true);
      }
    }
    setIsLoadingAnalytics(false);
  }, [enabled, user.token, user.id, setUser]);

  useEffect(() => {
    void refreshWorkerProfile(false);
    return () => { generation.current++; };
  }, [refreshWorkerProfile]);

  const handleToggleJobStatus = async (newStatus: boolean) => {
    if (!enabled || !user.token || isOnJob === null || saving.current || isUpdatingJobStatus) return;
    const previousStatus = isOnJob;
    const request = ++statusGeneration.current;
    saving.current = true;
    setUser(previous => previous.id === user.id ? { ...previous, isOnJob: newStatus, isUpdatingJobStatus: true } : previous);
    try {
      const updated = await updateJobStatus(user.token, newStatus);
      if (request === statusGeneration.current) {
        setUser(previous => previous.id === user.id ? { ...previous, isOnJob: updated } : previous);
      }
    } catch {
      if (request === statusGeneration.current) {
        setUser(previous => previous.id === user.id ? { ...previous, isOnJob: previousStatus } : previous);
        Alert.alert(tr('Status not updated'), tr('Could not update your status. Please try again.'));
      }
    } finally {
      saving.current = false;
      setUser(previous => previous.id === user.id ? { ...previous, isUpdatingJobStatus: false } : previous);
    }
  };

  return { isOnJob, jobStatusError, isUpdatingJobStatus, analyticsData, isLoadingAnalytics, refreshWorkerProfile, handleToggleJobStatus };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useUser } from '../../auth/session/UserContext';
import { fetchKasambahayResume, uploadKasambahayResume, fetchJobStatus, updateJobStatus } from '../api/accountApi';
import { fetchReviewAnalytics, type ReviewAnalyticsData } from '../../reviews/api/reviewApi';

// Safely require expo-document-picker to avoid crashing if native module is not yet compiled in APK
let DocumentPicker: typeof import('expo-document-picker') | null = null;
try {
  DocumentPicker = require('expo-document-picker');
} catch {
  DocumentPicker = null;
}

export function useWorkerProfile(enabled: boolean) {
  const { user, updateUser } = useUser();
  const updateRef = useRef(updateUser);
  updateRef.current = updateUser;
  const generation = useRef(0);
  const [isOnJob, setIsOnJob] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(user.resumeUrl || null);
  const [resumeUploadedAt, setResumeUploadedAt] = useState<string | null>(user.resumeUploadedAt || null);
  const [isLoadingResume, setIsLoadingResume] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<ReviewAnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const refreshWorkerProfile = useCallback(async () => {
    const request = ++generation.current;
    if (!enabled || !user.token) {
      setIsOnJob(false); setResumeUrl(null); setResumeUploadedAt(null); setAnalyticsData(null);
      return;
    }
    setIsLoadingResume(true); setIsLoadingAnalytics(true);
    const results = await Promise.allSettled([
      fetchKasambahayResume(user.token), fetchReviewAnalytics(user.token), fetchJobStatus(user.token),
    ]);
    if (request !== generation.current) return;
    const [resume, analytics, status] = results;
    if (resume.status === 'fulfilled' && resume.value) {
      setResumeUrl(resume.value.resume_url); setResumeUploadedAt(resume.value.resume_uploaded_at);
      updateRef.current({ resumeUrl: resume.value.resume_url, resumeUploadedAt: resume.value.resume_uploaded_at });
    }
    if (analytics.status === 'fulfilled') setAnalyticsData(analytics.value);
    if (status.status === 'fulfilled') setIsOnJob(status.value);
    setIsLoadingResume(false); setIsLoadingAnalytics(false);
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

  const handlePickAndUploadResume = async () => {
    if (!enabled || !user.token) {
      Alert.alert('Authentication Required', 'Please log in to upload your resume.');
      return;
    }

    if (!DocumentPicker || typeof DocumentPicker.getDocumentAsync !== 'function') {
      Alert.alert(
        'Rebuild Required',
        'ExpoDocumentPicker requires a new app build to link native code. Please run "npm run android:build" (or "npm run android") to install the updated APK on your device.'
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      if (!file) {
        return;
      }
      const fileName = file.name || 'resume.pdf';
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        Alert.alert('Invalid File Type', 'Only PDF files are accepted.');
        return;
      }

      if (file.size && file.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Resume file must be under 10MB.');
        return;
      }

      setIsUploadingResume(true);
      const idempotencyKey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

      const data = await uploadKasambahayResume(user.token, file.uri, fileName, idempotencyKey);
      setResumeUrl(data.resume_url);
      setResumeUploadedAt(data.resume_uploaded_at);
      updateUser({ resumeUrl: data.resume_url, resumeUploadedAt: data.resume_uploaded_at });
      Alert.alert('Success', 'Your resume was uploaded successfully!');
    } catch (err: any) {
      console.warn('[KasambahayProfile] upload resume error:', err);
      Alert.alert('Upload Failed', err.message || 'Failed to upload resume.');
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleViewResume = () => {
    if (!resumeUrl) {
      Alert.alert('No Resume', 'No resume has been uploaded yet.');
      return;
    }
    Linking.openURL(resumeUrl).catch(() => {
      Alert.alert('Preview Failed', 'Could not open resume in browser or PDF viewer.');
    });
  };

  return {
    isOnJob, resumeUrl, resumeUploadedAt, isLoadingResume, isUploadingResume, analyticsData, isLoadingAnalytics,
    refreshWorkerProfile, handleToggleJobStatus, handlePickAndUploadResume, handleViewResume
  };
}

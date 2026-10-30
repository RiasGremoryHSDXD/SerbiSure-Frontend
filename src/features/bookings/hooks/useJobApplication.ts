import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { savedJobsStore, type SavedJobItem } from '../store/savedJobsStore';

export function useJobApplication(token?: string | null, onUnavailable?: () => void) {
  const [applyingJobId, setApplyingJobId] = useState<string | number | null>(null);
  const busy = useRef(false);
  const activeToken = useRef(token);
  activeToken.current = token;

  const applyJob = async (post: SavedJobItem) => {
    if (busy.current) return null;
    busy.current = true;
    setApplyingJobId(post.id);
    try {
      return await savedJobsStore.applyToJob(post, token);
    } catch (error) {
      if (activeToken.current === token) {
        Alert.alert('Application not confirmed', error instanceof Error ? error.message : 'Please try again.');
        onUnavailable?.();
      }
      return null;
    } finally {
      busy.current = false;
      setApplyingJobId(null);
    }
  };

  return { applyJob, applyingJobId };
}

import { useState, useEffect } from 'react';

export interface SavedJobItem {
  id: string | number;
  employerName: string;
  title?: string;
  avatar: string;
  time?: string;
  location?: string;
  roleTag?: string;
  termTag?: string;
  price: string;
  unit: string;
  aboutText?: string;
  tags?: string[];
  image?: string;
}

type StoreListener = () => void;

class SavedJobsStore {
  private savedMap: Map<string | number, SavedJobItem> = new Map();
  private appliedMap: Map<string | number, SavedJobItem> = new Map();
  private closedJobs: Set<string | number> = new Set();
  private listeners: Set<StoreListener> = new Set();

  constructor() {
    // Initial demo item for realistic display if empty
  }

  subscribe(listener: StoreListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  toggleSave(job: SavedJobItem) {
    if (this.savedMap.has(job.id)) {
      this.savedMap.delete(job.id);
    } else {
      this.savedMap.set(job.id, { ...job });
    }
    this.notify();
  }

  isSaved(id: string | number): boolean {
    return this.savedMap.has(id);
  }

  applyJob(job: SavedJobItem) {
    this.appliedMap.set(job.id, { ...job });
    this.notify();
  }

  isApplied(id: string | number): boolean {
    return this.appliedMap.has(id);
  }

  markJobClosed(id?: string | number | null, ...extraKeys: (string | number | undefined | null)[]) {
    if (id !== undefined && id !== null) {
      this.closedJobs.add(id);
      this.closedJobs.add(String(id));
      if (typeof id === 'string') {
        this.closedJobs.add(id.trim().toLowerCase());
      }
    }
    extraKeys.forEach((key) => {
      if (key !== undefined && key !== null) {
        this.closedJobs.add(key);
        this.closedJobs.add(String(key));
        if (typeof key === 'string') {
          this.closedJobs.add(key.trim().toLowerCase());
        }
      }
    });
    this.notify();
  }

  isClosed(id?: string | number | null): boolean {
    if (id === undefined || id === null) return false;
    if (this.closedJobs.has(id) || this.closedJobs.has(String(id))) return true;
    if (typeof id === 'string' && this.closedJobs.has(id.trim().toLowerCase())) return true;
    return false;
  }

  isJobClosed(job?: any): boolean {
    if (!job) return false;
    if (job.id && this.isClosed(job.id)) return true;
    if (job.partnerId && this.isClosed(job.partnerId)) return true;
    if (job.employerName && this.isClosed(job.employerName)) return true;
    return false;
  }

  getSavedJobs(): SavedJobItem[] {
    return Array.from(this.savedMap.values());
  }

  getAppliedJobs(): SavedJobItem[] {
    return Array.from(this.appliedMap.values());
  }

  getSavedCount(): number {
    return this.savedMap.size;
  }

  getAppliedCount(): number {
    return this.appliedMap.size;
  }
}

export const savedJobsStore = new SavedJobsStore();

export function useJobsActivity() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = savedJobsStore.subscribe(() => {
      setTick((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  return {
    savedJobs: savedJobsStore.getSavedJobs(),
    appliedJobs: savedJobsStore.getAppliedJobs(),
    savedCount: savedJobsStore.getSavedCount(),
    appliedCount: savedJobsStore.getAppliedCount(),
    isSaved: (id: string | number) => savedJobsStore.isSaved(id),
    isApplied: (id: string | number) => savedJobsStore.isApplied(id),
    isClosed: (id?: string | number | null) => savedJobsStore.isClosed(id),
    isJobClosed: (job?: any) => savedJobsStore.isJobClosed(job),
    markJobClosed: (id?: string | number | null, ...extraKeys: (string | number | undefined | null)[]) =>
      savedJobsStore.markJobClosed(id, ...extraKeys),
    toggleSave: (job: SavedJobItem) => savedJobsStore.toggleSave(job),
    applyJob: (job: SavedJobItem) => savedJobsStore.applyJob(job),
  };
}

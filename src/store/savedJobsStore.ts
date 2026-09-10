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
    toggleSave: (job: SavedJobItem) => savedJobsStore.toggleSave(job),
    applyJob: (job: SavedJobItem) => savedJobsStore.applyJob(job),
  };
}

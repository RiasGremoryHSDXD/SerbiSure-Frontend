import type { Role } from '../../app/roleConfig';
import type { FeedQuery } from './types';

export type BrowseTab = 'explore' | 'saved' | 'applied';
export const BROWSE_QUICK_FILTERS = ['All', 'Stay-in', 'Part-time', 'Cleaning', 'Cooking', 'Caregiver', 'Laundry', 'Child Care'] as const;

export function quickBrowseFilters<T extends FeedQuery>(filters: T, label: string): T {
  if (label === 'All') return { ...filters, categories: [], bookingType: null };
  if (label === 'Stay-in') return { ...filters, categories: [], bookingType: 'long_term' };
  if (label === 'Part-time') return { ...filters, categories: [], bookingType: 'short_term' };
  return { ...filters, categories: [label], bookingType: null };
}

export function activeBrowseChip(filters: FeedQuery): string {
  if (filters.categories.length === 0) {
    if (filters.bookingType === 'long_term') return 'Stay-in';
    if (filters.bookingType === 'short_term') return 'Part-time';
    return 'All';
  }
  if (filters.categories.length === 1 && !filters.bookingType) return filters.categories[0] || '';
  return '';
}

export function countBrowseFilters(filters: FeedQuery): number {
  return filters.categories.length + Number(!!filters.bookingType) + Number(filters.maxRate !== null) + Number(!!filters.location.trim()) + Number(filters.sortBy !== 'newest');
}

export function browseHeaderCopy(role: Role, tab: BrowseTab, count: number, loading: boolean, error?: string | null) {
  const findingJobs = role === 'kasambahay';
  if (tab === 'saved') return { title: findingJobs ? 'Saved Jobs' : 'Saved Kasambahay', subtitle: `${count} saved ${count === 1 ? 'post' : 'posts'}` };
  if (tab === 'applied') return { title: 'My Applications', subtitle: `${count} submitted ${count === 1 ? 'application' : 'applications'}` };
  let subtitle = findingJobs ? 'No jobs available right now' : 'No services available right now';
  if (loading) subtitle = findingJobs ? 'Finding job posts...' : 'Finding service posts...';
  else if (error) subtitle = 'Unable to load posts';
  else if (count > 0) subtitle = `${count} ${findingJobs ? 'job' : 'service'} ${count === 1 ? 'post' : 'posts'} to explore`;
  return { title: findingJobs ? 'Find Jobs' : 'Find Kasambahay', subtitle };
}

export function browseEmptyCopy(role: Role, fetchedCount: number, hasFilters: boolean, error?: string | null) {
  const jobs = role === 'kasambahay';
  if (error) return { icon: 'cloud-offline-outline', title: 'Could not load posts', description: error, action: 'Try Again' } as const;
  if (fetchedCount > 0) return { icon: 'checkmark-circle-outline', title: "You're all caught up!", description: 'You have reviewed the current posts. Refresh to browse them again.', action: 'Refresh Posts' } as const;
  if (hasFilters) return { icon: 'search-outline', title: 'No matching posts', description: 'Try a different category, location, or rate to find more results.', action: 'Clear Filters' } as const;
  return {
    icon: 'newspaper-outline', title: jobs ? 'No jobs available yet' : 'No services available yet',
    description: jobs ? 'New job posts from homeowners will appear here. Check back soon.' : 'New service posts from kasambahay will appear here. Check back soon.',
    action: 'Refresh Posts',
  } as const;
}

import type { BookingItem } from '../bookings/api/bookingApi';
import type { SavedJobItem } from '../bookings/store/savedJobsStore';

export interface BookingFeedDto extends Omit<BookingItem, 'service_category'> {
  poster_id: string;
  name?: string | null;
  profile_link?: string | null;
  service_category: string[] | string;
}

export interface FeedPost extends SavedJobItem {
  kind: 'job' | 'service';
  partnerId: string;
  authorRole: 'Homeowner' | 'Kasambahay';
  categories: string[];
  location: string;
  time: string;
  roleTag: string;
  termTag: string;
  setupTag: string;
  aboutText: string;
  tags: string[];
}

export interface FeedQuery {
  categories: string[];
  bookingType: string | null;
  maxRate: number | null;
  location: string;
  sortBy: string;
}

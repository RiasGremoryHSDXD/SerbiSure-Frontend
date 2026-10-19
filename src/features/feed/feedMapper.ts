import { workSetupLabel } from '../bookings/workSetup';
import type { Role } from '../../app/roleConfig';
import { formatTimeAgo } from '../../shared/utils/date';
import { formatBookingAddress, formatBookingLocationShort } from '../bookings/api/bookingApi';
import type { BookingFeedDto, FeedPost } from './types';
import type { SavedJobItem } from '../bookings/store/savedJobsStore';

// Both Browse roles use one shape for cards, saved posts, profiles and chats.
export function mapBrowsePost(item: BookingFeedDto, role: Role): SavedJobItem & { title: string; location: string; aboutText: string; tags: string[] } {
  if (role === 'kasambahay') return mapJobPreview(item);
  const worker = mapWorkerPreview(item);
  return {
    id: worker.id, partnerId: worker.partnerId, employerName: worker.name, title: worker.role,
    avatar: worker.avatar, image: worker.image, location: worker.location, roleTag: worker.role,
    termTag: worker.years, setupTag: worker.setupTag, price: worker.price, unit: worker.unit,
    aboutText: worker.aboutText, tags: Array.from(new Set([worker.years, ...worker.tags])),
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  Cleaning: 'Cleaning', Child_care: 'Child Care', Cooking: 'Cook', Caregiver: 'Caregiver',
  Laundry: 'Laundry', 'All-around': 'All-around',
};

export function mapFeedPost(item: BookingFeedDto, viewerRole: Role): FeedPost {
  const isJob = viewerRole === 'kasambahay';
  const rawCategories = Array.isArray(item.service_category) ? item.service_category : item.service_category ? [item.service_category] : [isJob ? 'Household' : 'General Service'];
  const categories = rawCategories.map((value) => !isJob && value === 'Cleaning' ? 'Cleaner' : CATEGORY_LABELS[value] || value.replace(/_/g, ' '));
  const authorRole = isJob ? 'Homeowner' : 'Kasambahay';
  const name = item.name || (isJob ? 'Homeowner' : 'Kasambahay Worker');
  const longTerm = item.booking_type === 'long_term';
  const termTag = longTerm ? 'Long-term' : 'Short-term';
  const setupTag = workSetupLabel(item.work_setup);
  const location = formatBookingLocationShort(item, 'Location not provided');
  const description = item.special_instruction?.trim() || (isJob
    ? `I am looking for ${categories.join(' & ')} at ${formatBookingAddress(item, 'residence')}, ${item.work_setup ? 'on a ' + setupTag.toLowerCase() + ' setup' : 'with work setup to be confirmed'}.`
    : `Available for ${categories.join(' & ')} work in ${location}.`);
  return {
    id: item.booking_id, partnerId: item.poster_id, kind: isJob ? 'job' : 'service', authorRole,
    employerName: name, title: categories[0] || (isJob ? 'Household Service' : 'Kasambahay'),
    avatar: item.profile_link || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || authorRole)}&background=FFB43B&color=fff`,
    time: formatTimeAgo(item.createdAt), location, categories,
    roleTag: categories[0] || (isJob ? 'Household Service' : 'Kasambahay'), termTag, setupTag,
    price: `₱${item.rate_amount || '0'}`, unit: longTerm ? '/ month' : '/ day', aboutText: description,
    tags: Array.from(new Set(isJob ? [...(item.poster_verification_status === 'Verified' ? ['Verified Employer'] : []), termTag, setupTag, ...categories] : [...categories, termTag, ...(item.work_setup ? [setupTag] : [])])),
  };
}

export function mapWorkerPreview(item: BookingFeedDto) {
  const categories = Array.isArray(item.service_category)
    ? item.service_category
    : (item.service_category ? [item.service_category] : ['General']);
  const avatarUrl =
    item.profile_link ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Kasambahay')}&background=FFB43B&color=fff`;

  return {
    id: item.booking_id,
    partnerId: item.poster_id,
    name: item.name || 'Anonymous User',
    location: formatBookingLocationShort(item, 'Location not provided'),
    role: categories.map((category) => CATEGORY_LABELS[category] || category.replace(/_/g, ' ')).join(', '),
    years: item.booking_type === 'long_term' ? 'Long-term' : 'Short-term',
    setupTag: workSetupLabel(item.work_setup),
    tags: [...categories.map((category) => CATEGORY_LABELS[category] || category.replace(/_/g, ' ')), ...(item.work_setup ? [workSetupLabel(item.work_setup)] : [])],
    price: `₱${item.rate_amount || '0'}`,
    unit: item.booking_type === 'long_term' ? 'per month' : 'per day',
    aboutText: item.special_instruction?.trim() || 'Available for household services. View this post for more details.',
    image: avatarUrl,
    avatar: avatarUrl,
  };
}

export function mapJobPreview(item: BookingFeedDto) {
  const rawCategories = Array.isArray(item.service_category)
    ? item.service_category
    : item.service_category
      ? [item.service_category]
      : ['Household'];

  const categoryMap: Record<string, string> = {
    Cleaning: 'Cleaning',
    Child_care: 'Child Care',
    Cooking: 'Cook',
    Caregiver: 'Caregiver',
    Laundry: 'Laundry',
    'All-around': 'All-around',
  };
  const categories = rawCategories.map((c: string) => categoryMap[c] || c.replace(/_/g, ' '));
  const avatarUrl =
    item.profile_link ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Homeowner')}&background=FFB43B&color=fff`;

  const isLongTerm = item.booking_type === 'long_term';
  const termTag = isLongTerm ? 'Long-term' : 'Short-term';
  const setupTag = workSetupLabel(item.work_setup);
  const unit = isLongTerm ? 'per month' : 'per day';

  const locShort = formatBookingLocationShort(item, 'Location not provided');
  const locForDesc = formatBookingAddress(item, 'residence');

  let description = item.special_instruction && item.special_instruction.trim()
    ? item.special_instruction.trim()
    : `I am looking for ${categories.join(' & ')} at ${locForDesc}, ${item.work_setup ? 'on a ' + setupTag.toLowerCase() + ' setup' : 'with work setup to be confirmed'}.`;


  return {
    id: item.booking_id,
    partnerId: item.poster_id,
    employerName: item.name || 'Homeowner',
    title: categories.join(' & ') || 'Household Service',
    location: locShort,
    description,
    price: `₱${item.rate_amount || '0'}`,
    unit,
    tags: [...(item.poster_verification_status === 'Verified' ? ['Verified Employer'] : []), termTag, setupTag, ...categories].filter((v, i, a) => a.indexOf(v) === i),
    image: avatarUrl,
    avatar: avatarUrl,
    roleTag: categories[0] || 'Household Help',
    termTag,
    setupTag,
    aboutText: description,
  };
}

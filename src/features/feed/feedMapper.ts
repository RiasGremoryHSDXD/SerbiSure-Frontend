import type { Role } from '../../app/roleConfig';
import { formatTimeAgo } from '../../shared/utils/date';
import { formatBookingAddress, formatBookingLocationShort } from '../bookings/api/bookingApi';
import type { BookingFeedDto, FeedPost } from './types';

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
  const termTag = longTerm ? (isJob ? 'Long-term' : 'Stay-in') : 'Part-time';
  const location = formatBookingLocationShort(item, 'Cagayan de Oro');
  const description = item.special_instruction?.trim() || (isJob
    ? `I am looking for ${categories.join(' & ')} at ${formatBookingAddress(item, 'residence')}, capable of working on a ${longTerm ? 'stay-in' : 'stay-out'} setup.`
    : `Available for ${categories.join(' & ')} work in ${location}.`);
  const setupTag = description.toLowerCase().includes('stay-in') ? 'Stay-in' : description.toLowerCase().includes('stay-out') ? 'Stay-out' : longTerm ? 'Stay-in' : 'Stay-out';
  return {
    id: item.booking_id, partnerId: item.poster_id, kind: isJob ? 'job' : 'service', authorRole,
    employerName: name, title: categories[0] || (isJob ? 'Household Service' : 'Kasambahay'),
    avatar: item.profile_link || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || authorRole)}&background=FFB43B&color=fff`,
    time: formatTimeAgo(item.createdAt), location, categories,
    roleTag: categories[0] || (isJob ? 'Household Service' : 'Kasambahay'), termTag, setupTag,
    price: `₱${item.daily_rate || '0'}`, unit: longTerm ? '/ month' : '/ day', aboutText: description,
    tags: Array.from(new Set(isJob ? ['Verified Employer', termTag, setupTag, ...categories] : [...categories, termTag])),
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
    location: formatBookingLocationShort(item, 'Cagayan de Oro'),
    role: categories.map((category) => CATEGORY_LABELS[category] || category.replace(/_/g, ' ')).join(', '),
    years: item.booking_type === 'long_term' ? 'Stay-in' : 'Part-time',
    tags: categories.map((category) => CATEGORY_LABELS[category] || category.replace(/_/g, ' ')),
    price: `₱${item.daily_rate || '0'}`,
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
  const termTag = isLongTerm ? 'Long-term' : 'Part-time';
  const unit = isLongTerm ? 'per month' : 'per day';

  const locShort = formatBookingLocationShort(item, 'Cagayan de Oro');
  const locForDesc = formatBookingAddress(item, 'residence');

  let description = item.special_instruction && item.special_instruction.trim()
    ? item.special_instruction.trim()
    : (isLongTerm
      ? `I am looking for ${categories.join(' & ')} at ${locForDesc}, capable of working on a stay-in setup.`
      : `I am looking for ${categories.join(' & ')} at ${locForDesc}, capable of working on a stay-out setup.`);

  const descLower = description.toLowerCase();
  const setupTag = descLower.includes('stay-in') ? 'Stay-in' : descLower.includes('stay-out') ? 'Stay-out' : (isLongTerm ? 'Stay-in' : 'Stay-out');

  return {
    id: item.booking_id,
    partnerId: item.poster_id,
    employerName: item.name || 'Homeowner',
    title: categories.join(' & ') || 'Household Service',
    location: locShort,
    description,
    price: `₱${item.daily_rate || '0'}`,
    unit,
    tags: ['Verified Employer', termTag, setupTag, ...categories].filter((v, i, a) => a.indexOf(v) === i),
    image: avatarUrl,
    avatar: avatarUrl,
    roleTag: categories[0] || 'Household Help',
    termTag,
    aboutText: description,
  };
}

import type { BookingItem } from './api/bookingApi';

export function isBookingPoster(booking: BookingItem, userId?: string | number | null): boolean {
  return userId !== undefined && userId !== null && String(userId).trim() !== ''
    && !!booking.poster?.id && String(booking.poster.id) === String(userId);
}

export function getBookingCounterparty(booking: BookingItem, userId?: string | number | null) {
  if (userId === undefined || userId === null || String(userId).trim() === '') return null;
  return isBookingPoster(booking, userId)
    ? booking.assigned_partner || booking.recipient || null
    : booking.poster || null;
}

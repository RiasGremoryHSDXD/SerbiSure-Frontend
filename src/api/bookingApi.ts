import { API_BASE_URL, fetchWithTimeout } from '../config/api';

export interface BookingParticipant {
  id: string;
  name: string;
  account_type: string;
  verification_status: string;
  profile_link: string | null;
  rating: number;
  contact_number?: string | null;
  accepted_at?: string;
}

export interface BookingItem {
  booking_id: string;
  booking_type: 'short_term' | 'long_term';
  booking_status: 'Pending' | 'Accepted' | 'InProgress' | 'Completed' | 'Cancelled';
  service_category: string[];
  start_time: string;
  end_time?: string | null;
  service_address: string;
  floor_number?: string | null;
  zip_code?: string;
  special_instruction?: string | null;
  daily_rate: string;
  createdAt: string;
  poster?: BookingParticipant;
  assigned_partner?: BookingParticipant | null;
  has_reviewed?: boolean;
  proposals_count?: number;
}

export interface BookingProposal {
  proposal_id: string;
  booking_id: string;
  proposer_id: string;
  proposer_name: string;
  proposer_role: string;
  proposer_avatar: string | null;
  proposer_rating: number;
  proposed_rate: string;
  message?: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';
  createdAt: string;
}

export interface RecommendationItem {
  id?: string;
  booking_id?: string;
  name?: string;
  title?: string;
  role?: string;
  match_score: number;
  rating?: number;
  location: string;
  tags?: string[];
  avatar?: string | null;
  poster_name?: string;
  poster_avatar?: string | null;
  daily_rate?: string;
  verification_status?: string;
}

/**
 * Fetch a single booking's full details
 */
export async function fetchBookingDetail(token: string, bookingId: string): Promise<BookingItem | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/${bookingId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[bookingApi] fetchBookingDetail failed:', err);
    return null;
  }
}

/**
 * Fetch bookings posted by current user
 */
export async function fetchMyBookings(token: string, statusFilter?: string): Promise<BookingItem[]> {
  try {
    const url = statusFilter
      ? `${API_BASE_URL}/api/v1/booking/mine/?status=${encodeURIComponent(statusFilter)}`
      : `${API_BASE_URL}/api/v1/booking/mine/`;
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[bookingApi] fetchMyBookings failed:', err);
    return [];
  }
}

/**
 * Fetch bookings assigned to current user (Kasambahay accepted jobs)
 */
export async function fetchMyAssignedBookings(token: string, statusFilter?: string): Promise<BookingItem[]> {
  try {
    const url = statusFilter
      ? `${API_BASE_URL}/api/v1/booking/assigned/?status=${encodeURIComponent(statusFilter)}`
      : `${API_BASE_URL}/api/v1/booking/assigned/`;
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[bookingApi] fetchMyAssignedBookings failed:', err);
    return [];
  }
}

/**
 * Accept a pending booking
 */
export async function acceptBooking(token: string, bookingId: string): Promise<{ success: boolean; error?: string; booking?: BookingItem }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/${bookingId}/accept/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || data.detail || 'Could not accept booking.' };
    return { success: true, booking: data.booking };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error.' };
  }
}

/**
 * Mark booking as InProgress
 */
export async function startBooking(token: string, bookingId: string): Promise<{ success: boolean; error?: string; booking?: BookingItem }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/${bookingId}/start/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || data.detail || 'Could not start booking.' };
    return { success: true, booking: data.booking };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error.' };
  }
}

/**
 * Mark booking as Completed
 */
export async function completeBooking(token: string, bookingId: string): Promise<{ success: boolean; error?: string; booking?: BookingItem }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/${bookingId}/complete/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || data.detail || 'Could not complete booking.' };
    return { success: true, booking: data.booking };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error.' };
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(token: string, bookingId: string): Promise<{ success: boolean; error?: string; booking?: BookingItem }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/${bookingId}/cancel/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || data.detail || 'Could not cancel booking.' };
    return { success: true, booking: data.booking };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error.' };
  }
}

/**
 * Submit a counter-offer / proposal
 */
export async function submitBookingProposal(
  token: string,
  bookingId: string,
  proposedRate: number | string,
  message?: string
): Promise<{ success: boolean; error?: string; proposal?: BookingProposal }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/${bookingId}/proposals/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proposed_rate: proposedRate,
        message,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || data.detail || 'Could not submit proposal.' };
    return { success: true, proposal: data.proposal };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error.' };
  }
}

/**
 * Fetch proposals for a booking
 */
export async function fetchBookingProposals(token: string, bookingId: string): Promise<BookingProposal[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/${bookingId}/proposals/list/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[bookingApi] fetchBookingProposals failed:', err);
    return [];
  }
}

/**
 * Respond to a proposal ('accept' or 'reject')
 */
export async function respondToProposal(
  token: string,
  proposalId: string,
  action: 'accept' | 'reject'
): Promise<{ success: boolean; error?: string; proposal?: BookingProposal; booking?: BookingItem }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/proposals/${proposalId}/respond/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || data.detail || 'Could not respond to proposal.' };
    return { success: true, proposal: data.proposal, booking: data.booking };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error.' };
  }
}

/**
 * Fetch Smart Recommendations
 */
export async function fetchRecommendations(token: string): Promise<RecommendationItem[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/recommendations/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.recommendations || [];
  } catch (err) {
    console.warn('[bookingApi] fetchRecommendations failed:', err);
    return [];
  }
}

export interface MinimumWageData {
  booking_type: 'long_term' | 'short_term';
  min_daily_rate: string;
  min_monthly_rate?: string;
  working_days_per_month?: number;
  is_statutory_mandatory?: boolean;
  wage_order?: string;
  law?: string;
  description?: string;
}

/**
 * GET /api/v1/booking/minimum-wage/
 * Returns statutory minimum daily wage metadata under Batas Kasambahay (RA 10361).
 */
export async function fetchMinimumWage(
  token?: string,
  bookingType: 'long_term' | 'short_term' = 'long_term',
  address: string = ''
): Promise<MinimumWageData | null> {
  try {
    const qs = new URLSearchParams({
      booking_type: bookingType,
      address,
    });
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/minimum-wage/?${qs.toString()}`, {
      headers,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[bookingApi] fetchMinimumWage failed:', err);
    return null;
  }
}


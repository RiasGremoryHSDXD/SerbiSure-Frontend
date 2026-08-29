import { API_BASE_URL, fetchWithTimeout } from '../config/api';
import { generateUUID } from './chatApi';

const REVIEW_BASE = `${API_BASE_URL}/api/v1/reviews`;

export type SentimentType = 'Positive' | 'Neutral' | 'Negative';

export interface ReviewItem {
  review_id: string;
  booking_id: string;
  booking_service_category: string[];
  reviewer_id: string;
  reviewer_name: string;
  reviewer_account_type: string;
  reviewer_profile_link: string | null;
  reviewee_id: string;
  reviewee_name: string;
  reviewee_account_type: string;
  reviewee_profile_link: string | null;
  rating: number;
  unstructured_feedback: string;
  nlp_sentiment: SentimentType;
  createdAt: string;
}

export interface ReviewSummaryData {
  user_id: string;
  user_name: string;
  account_type: string;
  profile_link: string | null;
  average_rating: number;
  total_reviews: number;
  sentiment_breakdown: {
    Positive: number;
    Neutral: number;
    Negative: number;
  };
  rating_breakdown: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
}

export interface CreateReviewParams {
  booking_id: string;
  rating: number; // 1 to 5
  unstructured_feedback: string; // Min 10 chars, max 1000 chars
  nlp_sentiment?: SentimentType; // Auto-inferred / randomized if omitted
}

/**
 * Helper to determine or assign a sentiment value while ML model is in development.
 * Assigns a valid database enum based on rating score or sensible fallback.
 */
export function inferOrRandomizeSentiment(rating: number, userSentiment?: SentimentType): SentimentType {
  if (userSentiment && ['Positive', 'Neutral', 'Negative'].includes(userSentiment)) {
    return userSentiment;
  }
  if (rating >= 4) {
    return 'Positive';
  }
  if (rating === 3) {
    return 'Neutral';
  }
  return 'Negative';
}

/**
 * POST /api/v1/reviews/create/
 * Submits a new review for a completed booking.
 * Automatically generates a fresh Idempotency-Key and resolves sentiment.
 */
export async function submitReview(
  token: string,
  params: CreateReviewParams
): Promise<{ message: string; data: ReviewItem }> {
  const idempotencyKey = generateUUID();
  const sentiment = inferOrRandomizeSentiment(params.rating, params.nlp_sentiment);

  const res = await fetchWithTimeout(`${REVIEW_BASE}/create/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      booking_id: params.booking_id,
      rating: params.rating,
      unstructured_feedback: params.unstructured_feedback.trim(),
      nlp_sentiment: sentiment,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      data.detail ||
      data.booking_id?.[0] ||
      data.rating?.[0] ||
      data.unstructured_feedback?.[0] ||
      data.nlp_sentiment?.[0] ||
      `Failed to submit review (${res.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * GET /api/v1/reviews/received/
 * Retrieves all reviews received by the authenticated user.
 */
export async function fetchReceivedReviews(token: string): Promise<ReviewItem[]> {
  const res = await fetchWithTimeout(`${REVIEW_BASE}/received/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch received reviews (${res.status})`);
  }

  const json = await res.json();
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.results)) return json.results;
  return [];
}

/**
 * GET /api/v1/reviews/given/
 * Retrieves all reviews authored by the authenticated user.
 */
export async function fetchGivenReviews(token: string): Promise<ReviewItem[]> {
  const res = await fetchWithTimeout(`${REVIEW_BASE}/given/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch given reviews (${res.status})`);
  }

  const json = await res.json();
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.results)) return json.results;
  return [];
}

/**
 * GET /api/v1/reviews/summary/<uuid:user_id>/
 * Retrieves aggregated review metrics for a user.
 */
export async function fetchReviewSummary(token: string, userId: string): Promise<ReviewSummaryData | null> {
  const res = await fetchWithTimeout(`${REVIEW_BASE}/summary/${userId}/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch review summary (${res.status})`);
  }

  const responseJson = await res.json();
  return responseJson.data || responseJson;
}

/**
 * GET /api/v1/reviews/user/<uuid:user_id>/
 * Retrieves public list of reviews for a target user.
 */
export async function fetchUserReviews(token: string, userId: string): Promise<ReviewItem[]> {
  const res = await fetchWithTimeout(`${REVIEW_BASE}/user/${userId}/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 404) {
    return [];
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch user reviews (${res.status})`);
  }

  const json = await res.json();
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.results)) return json.results;
  return [];
}

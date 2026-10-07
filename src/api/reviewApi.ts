import { API_BASE_URL, fetchWithTimeout, HUGGINGFACE_SENTIMENT_SPACE_URL, HUGGINGFACE_API_TOKEN } from '../config/api';
import { generateUUID } from './chatApi';

const REVIEW_BASE = `${API_BASE_URL}/api/v1/reviews`;

export type SentimentType = 'Positive' | 'Neutral' | 'Negative';

export interface NlpSentimentResult {
  sentiment: SentimentType;
  confidence?: number;
  source: 'huggingface' | 'local_fallback';
  probabilities?: Record<string, number>;
}

/**
 * Predicts sentiment using the SerbiSure Hugging Face Space (XLM-RoBERTa / FiReCS):
 * https://riasgremory2-serbisure-sentiment-api.hf.space
 * Analyzes strictly based on the text comment, independently of star rating.
 */
export async function predictSentimentViaHuggingFace(
  text: string
): Promise<NlpSentimentResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      sentiment: 'Neutral',
      source: 'local_fallback',
    };
  }

  try {
    // Step 1: Initiate prediction call
    const postHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (HUGGINGFACE_API_TOKEN) {
      postHeaders['Authorization'] = `Bearer ${HUGGINGFACE_API_TOKEN}`;
    }

    const postRes = await fetchWithTimeout(
      `${HUGGINGFACE_SENTIMENT_SPACE_URL}/gradio_api/call/predict`,
      {
        method: 'POST',
        headers: postHeaders,
        body: JSON.stringify({ data: [trimmed] }),
      },
      12000
    );

    if (!postRes.ok) {
      throw new Error(`HF Space returned status ${postRes.status}`);
    }

    const { event_id } = await postRes.json();
    if (!event_id) {
      throw new Error('No event_id in HF Space response');
    }

    // Step 2: Fetch result event stream
    const streamHeaders: Record<string, string> = {};
    if (HUGGINGFACE_API_TOKEN) {
      streamHeaders['Authorization'] = `Bearer ${HUGGINGFACE_API_TOKEN}`;
    }

    const streamRes = await fetchWithTimeout(
      `${HUGGINGFACE_SENTIMENT_SPACE_URL}/gradio_api/call/predict/${event_id}`,
      {
        headers: streamHeaders,
      },
      12000
    );

    if (!streamRes.ok) {
      throw new Error(`HF Stream returned status ${streamRes.status}`);
    }

    const streamText = await streamRes.text();
    for (const line of streamText.split('\n')) {
      if (line.startsWith('data:')) {
        const parsed = JSON.parse(line.slice(5).trim());
        if (Array.isArray(parsed) && parsed[0]?.label) {
          const rawLabel = String(parsed[0].label).trim().toLowerCase();
          let sentiment: SentimentType = 'Neutral';
          if (rawLabel.includes('negative')) sentiment = 'Negative';
          else if (rawLabel.includes('neutral')) sentiment = 'Neutral';
          else if (rawLabel.includes('positive')) sentiment = 'Positive';

          return {
            sentiment,
            confidence: typeof parsed[1] === 'number' ? parsed[1] : undefined,
            probabilities: parsed[2] || undefined,
            source: 'huggingface',
          };
        }
      }
    }
  } catch (err) {
    console.warn('[ReviewApi] HuggingFace Space call failed, using text fallback:', err);
  }

  // Fallback to text analysis only (no star-based override)
  const lower = trimmed.toLowerCase();
  const positiveWords = ['great', 'good', 'excellent', 'amazing', 'super', 'satisfied', 'recommend', 'mabait', 'maayo', 'sipag', 'masipag', 'kugihan', 'buotan', 'malinis', 'limpyo'];
  const negativeWords = ['bad', 'poor', 'terrible', 'horrible', 'worst', 'disappointed', 'late', 'rude', 'bastos', 'tamad', 'tapulan', 'hugaw', 'madumi', 'salbahe', 'unprofessional', 'guba'];
  
  let pos = 0;
  let neg = 0;
  for (const w of positiveWords) { if (lower.includes(w)) pos++; }
  for (const w of negativeWords) { if (lower.includes(w)) neg++; }

  let fallbackSentiment: SentimentType = 'Neutral';
  if (pos > neg) fallbackSentiment = 'Positive';
  else if (neg > pos) fallbackSentiment = 'Negative';

  return {
    sentiment: fallbackSentiment,
    source: 'local_fallback',
  };
}

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

export interface ReviewAnalyticsData {
  user_id: string;
  user_name: string;
  account_type: string;
  total_jobs_completed: number;
  total_reviews: number;
  average_rating: number;
  positive_percentage: number;
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
  recent_reviews: ReviewItem[];
}

/**
 * GET /api/v1/reviews/analytics/
 * Retrieves reputation analytics for the authenticated user (Tier 2-5).
 */
export async function fetchReviewAnalytics(token: string): Promise<ReviewAnalyticsData | null> {
  try {
    const res = await fetchWithTimeout(`${REVIEW_BASE}/analytics/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.warn('[reviewApi] fetchReviewAnalytics failed:', err);
    return null;
  }
}


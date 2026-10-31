// Missing or malformed review data must never become a star rating.
export function validRating(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const rating = Number(value);
  return Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

export function averageReviewRating(reviews: ReadonlyArray<{ rating: unknown }>): number | null {
  const ratings = reviews.map(review => validRating(review.rating)).filter((rating): rating is number => rating !== null);
  return ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
}

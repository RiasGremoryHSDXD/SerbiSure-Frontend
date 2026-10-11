import { Image } from 'react-native';

const prefetchedUrls = new Set<string>();

/**
 * Preload a single image URL into native disk/memory cache (deduplicated).
 */
export function preloadImage(url?: string | null): Promise<boolean> {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return Promise.resolve(false);
  }
  if (prefetchedUrls.has(url)) {
    return Promise.resolve(true);
  }
  prefetchedUrls.add(url);
  return Image.prefetch(url)
    .then(() => true)
    .catch(() => {
      prefetchedUrls.delete(url); // Allow retry later if failed
      return false;
    });
}

/**
 * Preload an array of image URLs in parallel into native disk/memory cache.
 */
export function preloadImages(urls: (string | null | undefined)[]): Promise<boolean[]> {
  const uniqueUrls = Array.from(
    new Set(
      urls.filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
    )
  );

  return Promise.all(uniqueUrls.map((url) => preloadImage(url)));
}


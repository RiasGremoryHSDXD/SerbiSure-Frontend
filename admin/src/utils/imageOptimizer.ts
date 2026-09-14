/**
 * Image Optimizer Utility for SerbiSure Admin
 * 
 * Automatically transforms Cloudinary, Unsplash, and CDN image URLs to modern WebP format
 * with perceptual compression (f_webp, q_auto) for faster page reloads and reduced bandwidth.
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'limit' | 'thumb';
  quality?: 'auto' | 'auto:good' | 'auto:eco' | 'auto:low' | number;
}

/**
 * Transforms an image URL to deliver WebP with compression.
 * Safely handles Cloudinary (both public and signed URLs), Unsplash, and raw URLs.
 */
export function getOptimizedWebpUrl(
  url?: string | null,
  options: ImageOptimizationOptions = {}
): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  if (!trimmed) return '';

  // Cloudinary image handling
  if (trimmed.includes('res.cloudinary.com')) {
    // If the URL already has format or webp explicitly specified, return as-is
    if (trimmed.includes('f_webp') || trimmed.includes('.webp')) {
      return trimmed;
    }

    const { width, height, crop = 'limit', quality = 'auto' } = options;
    const flags: string[] = ['f_webp', `q_${quality}`];

    if (width) flags.push(`w_${width}`);
    if (height) flags.push(`h_${height}`);
    if (crop) flags.push(`c_${crop}`);

    const transformStr = flags.join(',');

    // If it's a signed URL (contains /s--...--/), do not alter the signed path as it invalidates the HMAC signature.
    // Instead, backend handles signed WebP formatting.
    if (trimmed.includes('/s--') && trimmed.includes('--/')) {
      return trimmed;
    }

    // Insert transformation after /image/upload/
    if (trimmed.includes('/image/upload/')) {
      return trimmed.replace('/image/upload/', `/image/upload/${transformStr}/`);
    }
  }

  // Unsplash CDN handling
  if (trimmed.includes('images.unsplash.com')) {
    const [baseUrl, query] = trimmed.split('?');
    const params = new URLSearchParams(query || '');
    params.set('fm', 'webp');
    if (!params.has('q')) params.set('q', '80');
    if (options.width) params.set('w', String(options.width));
    if (options.height) params.set('h', String(options.height));
    return `${baseUrl}?${params.toString()}`;
  }

  return trimmed;
}

/**
 * Checks whether an avatar URL is an auto-generated fallback (e.g. ui-avatars.com)
 * or a real user-uploaded profile photo.
 */
export function isDefaultAvatar(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase();
  return lower.includes('ui-avatars.com') || lower.includes('placeholder') || lower.includes('default-avatar');
}

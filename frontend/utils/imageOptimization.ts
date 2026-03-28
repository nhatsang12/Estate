/**
 * Cloudinary Image Optimization Utilities
 * Provides functions to optimize image loading and rendering
 */

/**
 * Optimize Cloudinary URL with automatic quality, format, and width
 * @param url - Original image URL (Cloudinary or other)
 * @param width - Desired width (default: 600px)
 * @param quality - Image quality (default: 'auto')
 * @returns Optimized URL with transformation parameters
 */
export const optimizeCloudinaryUrl = (
  url: string | undefined | null,
  width: number = 600,
  quality: string = 'auto'
): string => {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  
  // Return non-Cloudinary URLs as-is
  if (!url.includes('cloudinary.com')) return url;
  
  try {
    const urlObj = new URL(url);
    // Add optimization parameters only if not already present
    if (!urlObj.searchParams.has('w')) {
      urlObj.searchParams.set('w', width.toString());
    }
    if (!urlObj.searchParams.has('q')) {
      urlObj.searchParams.set('q', quality);
    }
    if (!urlObj.searchParams.has('f')) {
      urlObj.searchParams.set('f', 'auto'); // Auto format (webp for modern browsers)
    }
    return urlObj.toString();
  } catch {
    // Fallback for malformed URLs
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&q=${quality}&f=auto`;
  }
};

/**
 * Generate responsive srcset for different screen sizes
 * @param url - Original image URL
 * @param sizes - Array of widths to generate (default: [400, 600, 800])
 * @returns srcset string for use in img tag
 */
export const generateResponsiveSrcset = (
  url: string | undefined | null,
  sizes: number[] = [400, 600, 800]
): string => {
  if (!url || !url.includes('cloudinary.com')) return '';
  
  return sizes
    .map(size => `${optimizeCloudinaryUrl(url, size)} ${size}w`)
    .join(', ');
};

/**
 * Get placeholder image as data URI (very small blurred image)
 * Useful for progressive image loading
 * @returns Small data URI placeholder
 */
export const getImagePlaceholder = (): string => {
  // 1x1 pixel gray placeholder
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect fill="%23e8e8e8"/%3E%3C/svg%3E';
};

/**
 * Preload an image to ensure it's cached
 * @param url - Image URL to preload
 */
export const preloadImage = (url: string): void => {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
};

/**
 * Lazy load multiple images efficiently
 * @param imageUrls - Array of image URLs to preload
 */
export const preloadImages = (imageUrls: string[]): void => {
  imageUrls.forEach(url => preloadImage(url));
};

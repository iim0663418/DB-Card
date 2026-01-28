// Image Processing Utilities
// Provides image resizing and format conversion using Cloudflare Image Resizing

export type ImageVariant = 'detail' | 'thumb';

interface VariantConfig {
  width: number;
  height: number;
  quality: number;
}

const VARIANT_CONFIGS: Record<ImageVariant, VariantConfig> = {
  detail: { width: 1200, height: 1200, quality: 85 },
  thumb: { width: 256, height: 256, quality: 80 }
};

/**
 * Get R2 transform parameters for image variants
 * Uses R2 Transform on Read for dynamic image processing
 * 
 * @param variant - 'detail' or 'thumb'
 * @returns URL parameters for R2 image transformation
 */
export function getR2TransformParams(variant: ImageVariant): string {
  const config = VARIANT_CONFIGS[variant];
  
  // R2 Transform parameters
  // Format: ?width=X&height=Y&fit=scale-down&quality=Q&format=webp
  return `width=${config.width}&height=${config.height}&fit=scale-down&quality=${config.quality}&format=webp`;
}

/**
 * Generate R2 key for asset storage
 * Format: assets/{card_uuid}/{asset_type}/{asset_id}/v{version}/{variant}.webp
 */
export function generateR2Key(
  cardUuid: string,
  assetType: string,
  assetId: string,
  version: number,
  variant: ImageVariant
): string {
  const size = variant === 'detail' ? '1200' : '256';
  return `assets/${cardUuid}/${assetType}/${assetId}/v${version}/${size}.webp`;
}

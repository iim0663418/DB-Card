// Image Validation Utilities
// Provides magic bytes verification, dimension checks, and file size validation

const MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  webp: [0x52, 0x49, 0x46, 0x46] // RIFF
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PIXELS = 25 * 1000 * 1000; // 25 megapixels
const MIN_SHORT_EDGE = 600; // Minimum short edge (width or height)

/**
 * Verify file format using magic bytes
 * Scenario 3: Reject files with invalid magic bytes
 */
export function verifyMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer);

  if (mimeType === 'image/jpeg') {
    return bytes[0] === MAGIC_BYTES.jpeg[0] &&
           bytes[1] === MAGIC_BYTES.jpeg[1] &&
           bytes[2] === MAGIC_BYTES.jpeg[2];
  }

  if (mimeType === 'image/png') {
    return MAGIC_BYTES.png.every((byte, i) => bytes[i] === byte);
  }

  if (mimeType === 'image/webp') {
    return bytes[0] === MAGIC_BYTES.webp[0] &&
           bytes[1] === MAGIC_BYTES.webp[1] &&
           bytes[2] === MAGIC_BYTES.webp[2] &&
           bytes[3] === MAGIC_BYTES.webp[3];
  }

  return false;
}

/**
 * Validate file size
 * Scenario 2: Reject files exceeding 5 MB
 */
export function validateFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * Validate image dimensions and pixel count
 * Scenario 4: Reject images exceeding 25 megapixels
 * Scenario 8: Ensure minimum dimensions
 */
export async function validateImageDimensions(
  buffer: ArrayBuffer
): Promise<{ width: number; height: number; pixels: number }> {
  const bytes = new Uint8Array(buffer);

  // Detect format and extract dimensions
  let width = 0;
  let height = 0;

  // JPEG dimensions from SOF0 marker
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    for (let i = 2; i < bytes.length - 8; i++) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0xC0) {
        height = (bytes[i + 5] << 8) | bytes[i + 6];
        width = (bytes[i + 7] << 8) | bytes[i + 8];
        break;
      }
    }
  }

  // PNG dimensions from IHDR chunk
  else if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
    height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  }

  // WebP dimensions
  else if (bytes[0] === 0x52 && bytes[1] === 0x49) {
    // VP8 lossy
    if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38) {
      width = ((bytes[26] | (bytes[27] << 8)) & 0x3fff);
      height = ((bytes[28] | (bytes[29] << 8)) & 0x3fff);
    }
    // VP8L lossless
    else if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x4C) {
      const bits = (bytes[21] << 24) | (bytes[22] << 16) | (bytes[23] << 8) | bytes[24];
      width = (bits & 0x3FFF) + 1;
      height = ((bits >> 14) & 0x3FFF) + 1;
    }
  }

  if (width === 0 || height === 0) {
    throw new Error('Failed to extract image dimensions');
  }

  const pixels = width * height;

  // Check minimum short edge (allow non-square images like business cards)
  const shortEdge = Math.min(width, height);
  if (shortEdge < MIN_SHORT_EDGE) {
    throw new Error(`Image short edge must be at least ${MIN_SHORT_EDGE}px (current: ${width}x${height})`);
  }

  // Check maximum pixels
  if (pixels > MAX_PIXELS) {
    throw new Error(`Image exceeds ${MAX_PIXELS / 1000000} megapixels limit`);
  }

  return { width, height, pixels };
}

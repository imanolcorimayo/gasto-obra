import sharp from 'sharp';

const THUMB_MAX = 400;
const DISPLAY_MAX = 2000;

// Process an input image buffer into two JPEG outputs: thumbnail + display.
// Always rotates based on EXIF so the orientation is correct downstream.
export async function processImage(buffer) {
  const base = sharp(buffer).rotate();

  const [thumb, display] = await Promise.all([
    base.clone()
      .resize(THUMB_MAX, THUMB_MAX, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer(),
    base.clone()
      .resize(DISPLAY_MAX, DISPLAY_MAX, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()
  ]);

  return { thumb, display };
}

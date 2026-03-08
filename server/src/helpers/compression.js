import sharp from 'sharp';
import logger from '../../lib/logger.js';

export async function compressImage(base64, mimeType) {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const compressed = await sharp(buffer)
      .rotate() // auto-EXIF rotation
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    return { buffer: compressed, mimeType: 'image/jpeg' };
  } catch (error) {
    logger.error('Error compressing image', { error, originalMimeType: mimeType });
    return null;
  }
}

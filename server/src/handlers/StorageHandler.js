import { randomBytes, randomUUID } from 'crypto';
import * as Sentry from '@sentry/node';
import logger from '../../lib/logger.js';

class StorageHandler {
  constructor(bucket) {
    this.bucket = bucket;
  }

  async uploadFile(buffer, storagePath, contentType) {
    try {
      const token = randomUUID();
      const file = this.bucket.file(storagePath);

      await file.save(buffer, {
        metadata: {
          contentType,
          metadata: {
            firebaseStorageDownloadTokens: token
          }
        }
      });

      const encodedPath = encodeURIComponent(storagePath);
      const bucketName = this.bucket.name;
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

      logger.info('File uploaded to Storage', { storagePath });
      return url;
    } catch (error) {
      Sentry.captureException(error, { extra: { storagePath, contentType } });
      logger.error('Error uploading file to Storage', { error, storagePath });
      return null;
    }
  }

  async deleteFile(storagePath) {
    try {
      await this.bucket.file(storagePath).delete();
      logger.info('File deleted from Storage', { storagePath });
      return true;
    } catch (error) {
      Sentry.captureException(error, { extra: { storagePath } });
      logger.error('Error deleting file from Storage', { error, storagePath });
      return false;
    }
  }

  generatePath(prefix, filename) {
    const timestamp = Date.now();
    const randomHex = randomBytes(2).toString('hex');
    return `${prefix}/${timestamp}-${randomHex}/${filename}`;
  }
}

export default StorageHandler;

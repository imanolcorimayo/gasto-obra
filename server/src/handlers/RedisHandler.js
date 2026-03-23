import Redis from 'ioredis';
import logger from '../../lib/logger.js';

const KEY_PREFIX = 'go:';

class RedisHandler {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  connect() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379/1';

    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 3) return null; // stop retrying
          return Math.min(times * 500, 2000);
        },
        lazyConnect: false,
      });

      this.client.on('connect', () => {
        this.connected = true;
        logger.info('Redis connected', { url: url.replace(/\/\/.*@/, '//***@') });
      });

      this.client.on('error', (err) => {
        this.connected = false;
        logger.warn('Redis error', { error: err.message });
      });

      this.client.on('close', () => {
        this.connected = false;
      });
    } catch (err) {
      logger.warn('Redis connection failed', { error: err.message });
    }
  }

  _key(key) {
    return `${KEY_PREFIX}${key}`;
  }

  /**
   * Increment a rate limit counter and check if allowed.
   * Returns { allowed: boolean, remaining: number, total: number }
   */
  async incrementRateLimit(key, limit, windowSeconds) {
    if (!this.connected) return null;

    try {
      const k = this._key(key);
      const count = await this.client.incr(k);

      // Set TTL only on first increment
      if (count === 1) {
        await this.client.expire(k, windowSeconds);
      }

      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        total: limit,
      };
    } catch (err) {
      logger.warn('Redis rate limit increment failed', { error: err.message });
      return null;
    }
  }

  /**
   * Get current rate limit status without incrementing.
   * Returns { remaining: number, total: number }
   */
  async getRateLimitStatus(key, limit) {
    if (!this.connected) return null;

    try {
      const k = this._key(key);
      const count = parseInt(await this.client.get(k), 10) || 0;
      return {
        remaining: Math.max(0, limit - count),
        total: limit,
      };
    } catch (err) {
      logger.warn('Redis rate limit status failed', { error: err.message });
      return null;
    }
  }
}

// Singleton
const redis = new RedisHandler();
export default redis;

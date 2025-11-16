/**
 * Rate Limiting Middleware
 *
 * Prevents abuse and ensures fair usage:
 * - Per-user rate limiting
 * - Per-IP rate limiting
 * - Sliding window algorithm
 * - Firestore-based storage
 * - Customizable limits
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db, serverTimestamp } from '../config/firebase';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests in window
  keyGenerator?: (context: functions.https.CallableContext) => string;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  firstRequest: admin.firestore.Timestamp;
  lastRequest: admin.firestore.Timestamp;
  resetAt: admin.firestore.Timestamp;
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  // Vector Search: 30 requests per minute
  VECTOR_SEARCH: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },

  // File Upload: 10 requests per hour
  FILE_UPLOAD: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
  },

  // Claude API: 100 requests per hour
  CLAUDE_API: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 100,
  },

  // General API: 300 requests per 5 minutes
  GENERAL: {
    windowMs: 5 * 60 * 1000,
    maxRequests: 300,
  },
};

/**
 * Generate rate limit key from user ID
 */
function defaultKeyGenerator(context: functions.https.CallableContext): string {
  if (context.auth?.uid) {
    return `user:${context.auth.uid}`;
  }

  // Fallback to IP address (less reliable behind proxies)
  const ip = context.rawRequest.ip || 'unknown';
  return `ip:${ip}`;
}

/**
 * Check if request should be rate limited
 */
async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const rateLimitRef = db.collection('rate_limits').doc(key);

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    // Get current rate limit entry
    const doc = await rateLimitRef.get();

    if (!doc.exists) {
      // First request - create entry
      await rateLimitRef.set({
        count: 1,
        firstRequest: serverTimestamp(),
        lastRequest: serverTimestamp(),
        resetAt: new Date(now.getTime() + config.windowMs),
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: new Date(now.getTime() + config.windowMs),
      };
    }

    const entry = doc.data() as RateLimitEntry;
    const firstRequestTime = entry.firstRequest.toDate();

    // Check if window has expired
    if (firstRequestTime < windowStart) {
      // Reset window
      await rateLimitRef.set({
        count: 1,
        firstRequest: serverTimestamp(),
        lastRequest: serverTimestamp(),
        resetAt: new Date(now.getTime() + config.windowMs),
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: new Date(now.getTime() + config.windowMs),
      };
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt.toDate(),
      };
    }

    // Increment counter
    await rateLimitRef.update({
      count: entry.count + 1,
      lastRequest: serverTimestamp(),
    });

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count - 1,
      resetAt: entry.resetAt.toDate(),
    };
  } catch (error) {
    console.error('Rate limit check error:', error);

    // On error, allow request (fail open)
    const now = new Date();
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  }
}

/**
 * Create rate limit middleware for callable functions
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (data: any, context: functions.https.CallableContext) => Promise<any>
) {
  const keyGenerator = config.keyGenerator || defaultKeyGenerator;
  const message = config.message || 'Too many requests. Please try again later.';

  return async (data: any, context: functions.https.CallableContext) => {
    // Generate rate limit key
    const key = keyGenerator(context);

    // Check rate limit
    const result = await checkRateLimit(key, config);

    if (!result.allowed) {
      const resetTime = result.resetAt.toISOString();

      throw new functions.https.HttpsError(
        'resource-exhausted',
        `${message} Try again after ${resetTime}`,
        {
          retryAfter: result.resetAt.getTime(),
        }
      );
    }

    // Log remaining requests in debug mode
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
      console.log(`Rate limit - Key: ${key}, Remaining: ${result.remaining}`);
    }

    return handler(data, context);
  };
}

/**
 * Clean up expired rate limit entries
 * Should be run periodically (e.g., daily cron job)
 */
export async function cleanupRateLimits(): Promise<number> {
  const now = new Date();
  let deletedCount = 0;

  try {
    const snapshot = await db
      .collection('rate_limits')
      .where('resetAt', '<', now)
      .limit(500)
      .get();

    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();

    console.log(`Cleaned up ${deletedCount} expired rate limit entries`);

    return deletedCount;
  } catch (error) {
    console.error('Rate limit cleanup error:', error);
    return 0;
  }
}

/**
 * Scheduled function to clean up rate limits
 */
export const rateLimitCleanup = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const deleted = await cleanupRateLimits();
    console.log(`Rate limit cleanup completed: ${deleted} entries deleted`);
  });

/**
 * Get current rate limit status
 */
export async function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): Promise<{ current: number; max: number; remaining: number; resetAt: Date }> {
  const rateLimitRef = db.collection('rate_limits').doc(key);

  try {
    const doc = await rateLimitRef.get();

    if (!doc.exists) {
      const now = new Date();
      return {
        current: 0,
        max: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: new Date(now.getTime() + config.windowMs),
      };
    }

    const entry = doc.data() as RateLimitEntry;

    return {
      current: entry.count,
      max: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetAt: entry.resetAt.toDate(),
    };
  } catch (error) {
    console.error('Get rate limit status error:', error);

    const now = new Date();
    return {
      current: 0,
      max: config.maxRequests,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  }
}

export default withRateLimit;

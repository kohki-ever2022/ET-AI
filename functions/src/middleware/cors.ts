/**
 * CORS Middleware
 *
 * Configures Cross-Origin Resource Sharing for Cloud Functions:
 * - Allow specific origins
 * - Handle preflight requests
 * - Set appropriate headers
 * - Environment-based configuration
 */

import type { Request, Response } from 'express';
import type { CallableRequest, HttpsError } from 'firebase-functions/v2/https';

interface CorsOptions {
  origin: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * Get allowed origins based on environment
 */
function getAllowedOrigins(): string[] {
  const environment = process.env.FUNCTIONS_EMULATOR === 'true' ? 'development' : 'production';

  const origins: Record<string, string[]> = {
    development: [
      'http://localhost:3000',
      'http://localhost:5173', // Vite dev server
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ],
    staging: [
      'https://your-project-staging.web.app',
      'https://your-project-staging.firebaseapp.com',
    ],
    production: [
      'https://your-project.web.app',
      'https://your-project.firebaseapp.com',
      'https://your-custom-domain.com',
    ],
  };

  return origins[environment] || origins.development;
}

/**
 * Create CORS middleware
 */
export function createCorsMiddleware(options?: Partial<CorsOptions>) {
  const allowedOrigins = getAllowedOrigins();

  const defaultOptions: CorsOptions = {
    origin: true, // Will be checked dynamically
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: [],
    credentials: true,
    maxAge: 86400, // 24 hours
  };

  const corsOptions = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: () => void) => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (corsOptions.origin === true) {
      // Allow all origins (development only)
      if (process.env.FUNCTIONS_EMULATOR === 'true') {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
      }
    }

    // Set credentials header
    if (corsOptions.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight request
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', corsOptions.methods!.join(', '));
      res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders!.join(', '));

      if (corsOptions.exposedHeaders && corsOptions.exposedHeaders.length > 0) {
        res.setHeader('Access-Control-Expose-Headers', corsOptions.exposedHeaders.join(', '));
      }

      if (corsOptions.maxAge) {
        res.setHeader('Access-Control-Max-Age', corsOptions.maxAge.toString());
      }

      res.status(204).send('');
      return;
    }

    next();
  };
}

/**
 * CORS wrapper for callable functions
 * Note: v2 callable functions handle CORS automatically, this is optional
 */
export function withCors<T = any>(
  handler: (request: CallableRequest<T>) => Promise<any>
) {
  return async (request: CallableRequest<T>) => {
    // Verify origin for callable functions
    const origin = request.rawRequest.headers.origin;
    const allowedOrigins = getAllowedOrigins();

    if (origin && !allowedOrigins.includes(origin)) {
      console.warn(`Request from unauthorized origin: ${origin}`);

      // In production, reject unauthorized origins
      if (process.env.FUNCTIONS_EMULATOR !== 'true') {
        const { HttpsError } = require('firebase-functions/v2/https');
        throw new HttpsError(
          'permission-denied',
          'Request from unauthorized origin'
        );
      }
    }

    return handler(request);
  };
}

/**
 * Apply CORS to HTTP function
 */
export function applyCors(
  handler: (req: Request, res: Response) => void | Promise<void>
) {
  const corsMiddleware = createCorsMiddleware();

  return (req: Request, res: Response) => {
    corsMiddleware(req, res, () => {
      handler(req, res);
    });
  };
}

export default createCorsMiddleware;

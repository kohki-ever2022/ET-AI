/**
 * Environment Configuration
 *
 * Centralized environment variable management with type safety.
 * Supports multiple environments: development, staging, production.
 */

interface EnvironmentConfig {
  // Firebase
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };

  // API Keys
  apiKeys: {
    anthropic: string;
    voyage: string;
  };

  // Environment
  environment: 'development' | 'staging' | 'production';
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;

  // Feature Flags
  features: {
    debugMode: boolean;
    analytics: boolean;
    errorReporting: boolean;
    promptCaching: boolean;
    csp: boolean;
    rateLimiting: boolean;
  };

  // API Configuration
  api: {
    timeout: number;
    maxFileSize: number;
    maxUploadConcurrent: number;
  };

  // Cache Configuration
  cache: {
    ttl: number;
  };

  // Search Configuration
  search: {
    threshold: number;
    limit: number;
    debounceMs: number;
  };

  // Monitoring
  monitoring: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    sentryDsn?: string;
  };
}

/**
 * Gets environment variable with fallback
 */
function getEnv(key: string, fallback: string = ''): string {
  return import.meta.env[key] || fallback;
}

/**
 * Gets boolean environment variable
 */
function getBoolEnv(key: string, fallback: boolean = false): boolean {
  const value = getEnv(key);
  if (value === '') return fallback;
  return value === 'true' || value === '1';
}

/**
 * Gets number environment variable
 */
function getNumberEnv(key: string, fallback: number = 0): number {
  const value = getEnv(key);
  if (value === '') return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Current environment configuration
 */
export const env: EnvironmentConfig = {
  firebase: {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID'),
  },

  apiKeys: {
    anthropic: getEnv('VITE_ANTHROPIC_API_KEY'),
    voyage: getEnv('VITE_VOYAGE_API_KEY'),
  },

  environment: (getEnv('VITE_ENVIRONMENT', 'development') as any) || 'development',
  isDevelopment: getEnv('VITE_ENVIRONMENT', 'development') === 'development',
  isStaging: getEnv('VITE_ENVIRONMENT') === 'staging',
  isProduction: getEnv('VITE_ENVIRONMENT') === 'production',

  features: {
    debugMode: getBoolEnv('VITE_ENABLE_DEBUG_MODE', false),
    analytics: getBoolEnv('VITE_ENABLE_ANALYTICS', false),
    errorReporting: getBoolEnv('VITE_ENABLE_ERROR_REPORTING', false),
    promptCaching: getBoolEnv('VITE_ENABLE_PROMPT_CACHING', true),
    csp: getBoolEnv('VITE_ENABLE_CSP', false),
    rateLimiting: getBoolEnv('VITE_ENABLE_RATE_LIMITING', false),
  },

  api: {
    timeout: getNumberEnv('VITE_API_TIMEOUT', 30000),
    maxFileSize: getNumberEnv('VITE_MAX_FILE_SIZE', 5 * 1024 * 1024),
    maxUploadConcurrent: getNumberEnv('VITE_MAX_UPLOAD_CONCURRENT', 3),
  },

  cache: {
    ttl: getNumberEnv('VITE_CACHE_TTL', 3600000),
  },

  search: {
    threshold: parseFloat(getEnv('VITE_VECTOR_SEARCH_THRESHOLD', '0.7')),
    limit: getNumberEnv('VITE_VECTOR_SEARCH_LIMIT', 10),
    debounceMs: getNumberEnv('VITE_SEARCH_DEBOUNCE_MS', 500),
  },

  monitoring: {
    logLevel: (getEnv('VITE_LOG_LEVEL', 'info') as any) || 'info',
    sentryDsn: getEnv('VITE_SENTRY_DSN') || undefined,
  },
};

/**
 * Validates required environment variables
 */
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_ANTHROPIC_API_KEY',
  ];

  const missing = required.filter((key) => !getEnv(key));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Logs environment configuration (safe for production)
 */
export function logEnvironmentInfo(): void {
  if (env.features.debugMode) {
    console.log('Environment Configuration:', {
      environment: env.environment,
      features: env.features,
      firebase: {
        projectId: env.firebase.projectId,
        authDomain: env.firebase.authDomain,
      },
    });
  }
}

// Validate on import
const validation = validateEnvironment();
if (!validation.valid) {
  console.error('Missing required environment variables:', validation.missing);
  if (env.isProduction) {
    throw new Error('Missing required environment variables in production');
  }
}

export default env;

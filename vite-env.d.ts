/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Firebase
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;

  // API Keys
  readonly VITE_ANTHROPIC_API_KEY: string;
  readonly VITE_VOYAGE_API_KEY: string;

  // Environment
  readonly VITE_ENVIRONMENT: 'development' | 'staging' | 'production';

  // Feature Flags
  readonly VITE_ENABLE_DEBUG_MODE: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_ENABLE_ERROR_REPORTING: string;
  readonly VITE_ENABLE_PROMPT_CACHING: string;
  readonly VITE_ENABLE_CSP: string;
  readonly VITE_ENABLE_RATE_LIMITING: string;

  // API Configuration
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_MAX_FILE_SIZE: string;
  readonly VITE_MAX_UPLOAD_CONCURRENT: string;

  // Cache Configuration
  readonly VITE_CACHE_TTL: string;

  // Search Configuration
  readonly VITE_VECTOR_SEARCH_THRESHOLD: string;
  readonly VITE_VECTOR_SEARCH_LIMIT: string;
  readonly VITE_SEARCH_DEBOUNCE_MS: string;

  // Monitoring
  readonly VITE_LOG_LEVEL: string;
  readonly VITE_SENTRY_DSN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

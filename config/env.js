// config/env.js
// Single source of truth for all backend URLs & runtime config.
// Change the URL here -> every file picks it up automatically.
export const ENV = {
  // Primary API (Koyeb) — all /api/* calls except uploads
  API_BASE_URL: 'https://honest-mercedes-school1660440-a2fe48e2.koyeb.app',
  // Image server (Render) — uploads & GridFS reads
  IMAGE_SERVER_URL: 'https://agriagent-farm.onrender.com',
  // OAuth callback (Vercel)
  OAUTH_CALLBACK_URL: 'https://agriagentt.vercel.app/api/auth/google-mobile/callback',
  // Google OAuth client ID
  GOOGLE_CLIENT_ID: '711028859107-2rc50traimr2ao72snkq3mmjomn1np1h.apps.googleusercontent.com',
  // Network tuning
  REQUEST_TIMEOUT_MS: 30000,        // per-request timeout
  SESSION_CHECK_TIMEOUT_MS: 10000,  // shorter for cold-start gate
  RETRY_ON_5XX: 1,                  // retry once on 5xx / network error
};
if (__DEV__) {
  console.log('[ENV] API_BASE_URL:', ENV.API_BASE_URL);
}
/**
 * Central API Configuration
 * 
 * This file is the SINGLE SOURCE OF TRUTH for the backend API URL.
 * It uses RUNTIME detection to determine the correct backend URL,
 * eliminating build-time dependency on environment variables.
 * 
 * PROBLEM SOLVED:
 * - Preview URLs being baked into production builds
 * - Production calling preview backend
 * - CORS failures and full app outages
 * 
 * DO NOT import process.env.REACT_APP_BACKEND_URL anywhere else.
 * Always import API_BASE_URL from this file.
 */

const getBackendUrl = () => {
  // Get current hostname at RUNTIME (not build time)
  const host = typeof window !== 'undefined' ? window.location.hostname : '';

  // Production domains
  const isProduction =
    host === 'ineednumbers.com' ||
    host === 'www.ineednumbers.com';

  // Capacitor iOS/Android runs on localhost
  const isMobile = host === 'localhost' || host === '127.0.0.1';

  // FORCE production backend for web production + mobile
  if (isProduction || isMobile) {
    return 'https://ineednumbers.com';
  }

  // Preview / development fallback
  // This allows preview environments to work during development
  const envUrl = process.env.REACT_APP_BACKEND_URL || '';
  
  // If no env URL, default to production (safest option)
  if (!envUrl) {
    console.warn('[API Config] No REACT_APP_BACKEND_URL set, defaulting to production');
    return 'https://ineednumbers.com';
  }

  return envUrl;
};

// Resolve the URL once at module load
const API_BASE_URL = getBackendUrl();

// SAFETY GUARD — prevent preview backend in production
// This is a fail-fast mechanism that will crash the app rather than
// allow it to make requests to the wrong backend
const isProductionHost = typeof window !== 'undefined' && (
  window.location.hostname === 'ineednumbers.com' ||
  window.location.hostname === 'www.ineednumbers.com'
);

const isPreviewBackend = API_BASE_URL.includes('preview') || 
                          API_BASE_URL.includes('emergent.host') ||
                          API_BASE_URL.includes('backend-url-debug');

if (isProductionHost && isPreviewBackend) {
  console.error('[API Config] CRITICAL: Preview backend detected in production!');
  console.error('[API Config] Resolved URL:', API_BASE_URL);
  console.error('[API Config] Host:', window.location.hostname);
  throw new Error('FATAL: Invalid API configuration - preview backend cannot be used in production');
}

// Log the resolved URL for debugging (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log('[API Config] Backend URL resolved to:', API_BASE_URL);
}

export default API_BASE_URL;

// Named export for explicit imports
export { API_BASE_URL };

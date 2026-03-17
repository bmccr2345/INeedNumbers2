/**
 * API Configuration Utility
 * 
 * This file ensures the correct backend URL is ALWAYS used in production,
 * regardless of what's in the .env file at build time.
 * 
 * PROBLEM: The Emergent platform sometimes resets .env to debug URLs,
 * which then get baked into the production build, breaking the app.
 * 
 * SOLUTION: This utility detects the environment and forces the correct URL.
 */

// Production backend URL - HARDCODED as a safeguard
const PRODUCTION_BACKEND_URL = 'https://ineednumbers.com';

// Known bad URLs that should never be used in production
const INVALID_URLS = [
  'agent-financials.emergent.host',
  'backend-url-debug.preview.emergentagent.com',
  'preview.emergentagent.com',
  'localhost:8001',
  'localhost:3000',
];

/**
 * Returns the correct backend URL for the current environment.
 * In production (ineednumbers.com), ALWAYS returns the production URL.
 * In development, uses the .env value.
 */
export function getBackendUrl() {
  const envUrl = process.env.REACT_APP_BACKEND_URL || '';
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  
  // If we're on the production domain, ALWAYS use production URL
  if (currentHost === 'ineednumbers.com' || currentHost === 'www.ineednumbers.com') {
    // Check if env URL is invalid
    const isInvalidUrl = INVALID_URLS.some(bad => envUrl.includes(bad));
    
    if (isInvalidUrl || !envUrl) {
      console.warn('[apiConfig] Invalid backend URL detected in production, using hardcoded URL');
      return PRODUCTION_BACKEND_URL;
    }
    
    // Even if env URL looks OK, in production always use the production URL
    return PRODUCTION_BACKEND_URL;
  }
  
  // For preview/development environments, use the env variable
  // but validate it's not pointing to a dead URL
  if (envUrl && !INVALID_URLS.some(bad => envUrl.includes(bad))) {
    return envUrl;
  }
  
  // Fallback for development
  console.warn('[apiConfig] No valid backend URL found, using production URL');
  return PRODUCTION_BACKEND_URL;
}

/**
 * Validates that a URL is not one of the known bad URLs
 */
export function isValidBackendUrl(url) {
  if (!url) return false;
  return !INVALID_URLS.some(bad => url.includes(bad));
}

// Export the URL directly for simple imports
export const API_URL = getBackendUrl();

export default { getBackendUrl, isValidBackendUrl, API_URL };

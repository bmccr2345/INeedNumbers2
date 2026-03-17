/**
 * Central API Configuration
 * 
 * This file is the SINGLE SOURCE OF TRUTH for the backend API URL.
 * It uses RUNTIME detection to determine the correct backend URL.
 * 
 * DEPLOYMENT MODES:
 * 1. Production (ineednumbers.com) -> https://ineednumbers.com
 * 2. Emergent Production (*.emergent.host) -> Uses REACT_APP_BACKEND_URL from env
 * 3. Preview (*.preview.emergentagent.com) -> Uses REACT_APP_BACKEND_URL from env
 * 4. Mobile (localhost) -> https://ineednumbers.com (Capacitor apps)
 * 
 * DO NOT import process.env.REACT_APP_BACKEND_URL anywhere else.
 * Always import API_BASE_URL from this file.
 */

const getBackendUrl = () => {
  // Get current hostname at RUNTIME (not build time)
  const host = typeof window !== 'undefined' ? window.location.hostname : '';

  // Custom production domain
  const isCustomProduction =
    host === 'ineednumbers.com' ||
    host === 'www.ineednumbers.com';

  // Emergent production deployment (*.emergent.host)
  const isEmergentProduction = host.endsWith('.emergent.host');

  // Preview environment (*.preview.emergentagent.com)
  const isPreview = host.includes('preview.emergentagent.com');

  // Capacitor iOS/Android runs on localhost
  const isMobile = host === 'localhost' || host === '127.0.0.1';

  // Custom production domain -> hardcoded production URL
  if (isCustomProduction) {
    return 'https://ineednumbers.com';
  }

  // Mobile app -> hardcoded production URL
  if (isMobile) {
    return 'https://ineednumbers.com';
  }

  // Emergent production or Preview -> use environment variable
  // Emergent auto-updates REACT_APP_BACKEND_URL at deployment time
  if (isEmergentProduction || isPreview) {
    const envUrl = process.env.REACT_APP_BACKEND_URL;
    if (envUrl) {
      return envUrl;
    }
    // Fallback to same-origin if env not set
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  // Development or unknown -> try env, then same-origin
  const envUrl = process.env.REACT_APP_BACKEND_URL || '';
  if (envUrl) {
    return envUrl;
  }

  // Ultimate fallback: same-origin
  return typeof window !== 'undefined' ? window.location.origin : '';
};

// Resolve the URL once at module load
const API_BASE_URL = getBackendUrl();

// Log the resolved URL for debugging
console.log('[API Config] Backend URL resolved to:', API_BASE_URL);
console.log('[API Config] Host:', typeof window !== 'undefined' ? window.location.hostname : 'SSR');

export default API_BASE_URL;

// Named export for explicit imports
export { API_BASE_URL };

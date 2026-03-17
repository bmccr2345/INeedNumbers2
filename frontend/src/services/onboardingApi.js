import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    // Get Clerk session token
    if (window.Clerk) {
      try {
        const token = await window.Clerk.session?.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('[OnboardingAPI] Error getting auth token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Save partial onboarding data
 * @param {Object} profile - Onboarding profile data
 * @returns {Promise<Object>} Response with saved profile
 */
export const saveOnboardingData = async (profile) => {
  try {
    const response = await api.post('/api/onboarding/save', { profile });
    return response.data;
  } catch (error) {
    console.error('[OnboardingAPI] Error saving onboarding data:', error);
    throw error;
  }
};

/**
 * Complete onboarding and initialize dashboard
 * @returns {Promise<Object>} Response with profile and dashboard data
 */
export const completeOnboarding = async () => {
  try {
    const response = await api.post('/api/onboarding/complete');
    return response.data;
  } catch (error) {
    console.error('[OnboardingAPI] Error completing onboarding:', error);
    throw error;
  }
};

/**
 * Get current onboarding status
 * @returns {Promise<Object>} Onboarding status and profile
 */
export const getOnboardingStatus = async () => {
  try {
    const response = await api.get('/api/onboarding/status');
    return response.data;
  } catch (error) {
    console.error('[OnboardingAPI] Error getting onboarding status:', error);
    throw error;
  }
};

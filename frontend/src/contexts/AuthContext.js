import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import safeLocalStorage from '../utils/safeStorage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  
  // Get Auth0 authentication state
  const {
    isAuthenticated: isAuth0Authenticated,
    user: auth0User,
    isLoading: isAuth0Loading,
    getAccessTokenSilently,
    loginWithRedirect,
    logout: auth0Logout
  } = useAuth0();

  // Configure axios for cookie-based authentication (legacy)
  useEffect(() => {
    axios.defaults.withCredentials = true;
  }, []);

  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
  }, [isAuth0Authenticated, auth0User]);

  const checkAuth = async () => {
    try {
      // If Auth0 is authenticated, sync with backend
      if (isAuth0Authenticated && auth0User) {
        console.log('[AuthContext] Auth0 user authenticated:', auth0User.email);
        
        try {
          // Get Auth0 access token
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: process.env.REACT_APP_AUTH0_AUDIENCE
            }
          });
          
          // Fetch user profile from backend using Auth0 token
          const response = await axios.get(`${backendUrl}/api/auth0/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          const userData = response.data;
          console.log('[AuthContext] Auth0 user profile fetched:', userData.email);
          
          setUser(userData);
          setLoading(false);
          return;
        } catch (error) {
          console.error('[AuthContext] Failed to fetch Auth0 user profile:', error);
          // Fall through to try legacy auth
        }
      }
      
      // Fallback to legacy cookie-based authentication
      if (!isAuth0Authenticated || !auth0User) {
        console.log('[AuthContext] Checking legacy authentication...');
        try {
          const response = await axios.get(`${backendUrl}/api/auth/me`);
          const userData = response.data;
          console.log('[AuthContext] Legacy user authenticated:', userData.email);
          setUser(userData);
        } catch (error) {
          console.log('[AuthContext] No active session');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('[AuthContext] Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Legacy login function (for backward compatibility)
  const login = async (email, password, rememberMe = false) => {
    console.log('[AuthContext] Legacy login attempt for:', email);
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${backendUrl}/api/auth/login`, {
        email,
        password,
        remember_me: rememberMe
      }, {
        withCredentials: true,
        timeout: 30000
      });
      
      console.log(`[AuthContext] Login API response received after ${Date.now() - startTime}ms`);
      
      if (response.data && response.data.user) {
        const { user } = response.data;
        setUser(user);
        return { success: true };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[AuthContext] Login failed after ${duration}ms:`, error);
      
      let errorMessage = 'Login failed. Please try again.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map(err => err.msg || JSON.stringify(err)).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (typeof detail === 'object') {
          errorMessage = JSON.stringify(detail);
        }
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  // Auth0 login (new method)
  const loginWithAuth0 = async (options = {}) => {
    try {
      await loginWithRedirect({
        appState: { returnTo: options.returnTo || window.location.pathname },
        ...options
      });
    } catch (error) {
      console.error('[AuthContext] Auth0 login failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Legacy register function (deprecated with Auth0)
  const register = async (email, password, fullName = '') => {
    try {
      const response = await axios.post(`${backendUrl}/api/auth/register`, {
        email,
        password,
        full_name: fullName
      }, {
        withCredentials: true,
        timeout: 10000
      });

      const loginResult = await login(email, password, false);
      return loginResult;
    } catch (error) {
      console.error('Registration failed:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map(err => err.msg || JSON.stringify(err)).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (typeof detail === 'object') {
          errorMessage = JSON.stringify(detail);
        }
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  // Unified logout function
  const logout = async () => {
    try {
      // If using Auth0, logout from Auth0
      if (isAuth0Authenticated) {
        await auth0Logout({
          logoutParams: {
            returnTo: window.location.origin
          }
        });
      } else {
        // Legacy logout
        await axios.post(`${backendUrl}/api/auth/logout`, {}, {
          withCredentials: true,
          timeout: 8000
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setUser(null);
  };

  const deleteAccount = async (confirmation) => {
    try {
      // Get token if using Auth0
      let headers = {};
      if (isAuth0Authenticated) {
        const token = await getAccessTokenSilently();
        headers.Authorization = `Bearer ${token}`;
      }
      
      await axios.delete(`${backendUrl}/api/auth/delete-account`, {
        data: { confirmation },
        headers
      });
      
      logout();
      return { success: true };
    } catch (error) {
      console.error('Account deletion failed:', error);
      
      let errorMessage = 'Account deletion failed. Please try again.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map(err => err.msg || JSON.stringify(err)).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (typeof detail === 'object') {
          errorMessage = JSON.stringify(detail);
        }
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const refreshUser = async () => {
    try {
      // Get token if using Auth0
      let headers = {};
      if (isAuth0Authenticated) {
        const token = await getAccessTokenSilently();
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.get(`${backendUrl}/api/auth/me`, { headers });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  // Helper to get auth headers for API calls
  const getAuthHeaders = async () => {
    if (isAuth0Authenticated) {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: process.env.REACT_APP_AUTH0_AUDIENCE
          }
        });
        return { Authorization: `Bearer ${token}` };
      } catch (error) {
        console.error('Failed to get Auth0 token:', error);
        return {};
      }
    }
    // Legacy: cookies are sent automatically with withCredentials
    return {};
  };

  const createCheckoutSession = async (plan) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${backendUrl}/api/stripe/checkout`, {
        plan,
        origin_url: window.location.origin
      }, { headers });
      
      return { success: true, url: response.data.url };
    } catch (error) {
      console.error('Checkout session creation failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to create checkout session.' 
      };
    }
  };

  const createCustomerPortal = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${backendUrl}/api/stripe/portal`, {}, { headers });
      return { success: true, url: response.data.url };
    } catch (error) {
      console.error('Customer portal creation failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to access billing portal.' 
      };
    }
  };

  const exportUserData = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${backendUrl}/api/user/export`, { headers });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Data export failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Data export failed.' 
      };
    }
  };

  const getPlanLimits = (plan) => {
    switch (plan) {
      case 'STARTER':
        return { deals: 10, portfolios: 1, branding: true };
      case 'PRO':
        return { deals: -1, portfolios: -1, branding: true };
      default:
        return { deals: 0, portfolios: 0, branding: false };
    }
  };

  const canPerformAction = (action, plan = user?.plan) => {
    const limits = getPlanLimits(plan);
    
    switch (action) {
      case 'save_deal':
        return limits.deals !== 0 && (limits.deals === -1 || (user?.deals_count || 0) < limits.deals);
      case 'branded_pdf':
        return limits.branding;
      case 'share_deal':
        return limits.deals !== 0;
      case 'create_portfolio':
        return limits.portfolios !== 0;
      default:
        return true;
    }
  };

  const value = {
    user,
    loading: loading || isAuth0Loading,
    login,
    loginWithAuth0,
    register,
    logout,
    deleteAccount,
    refreshUser,
    createCheckoutSession,
    createCustomerPortal,
    exportUserData,
    isAuthenticated: !!user,
    isAuth0: isAuth0Authenticated,
    getPlanLimits,
    canPerformAction,
    getAuthHeaders // Export for use in components
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
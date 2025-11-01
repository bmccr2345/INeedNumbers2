import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Configure axios for cookie-based authentication
  useEffect(() => {
    // Use cookies for authentication, not Authorization headers
    axios.defaults.withCredentials = true;
    // Remove any Authorization header as we use HttpOnly cookies
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('[AuthContext] Checking authentication...');
      
      // Use cookie-based authentication - no token needed in JS
      const response = await axios.get(`${backendUrl}/api/auth/me`);
      const user = response.data;
      
      console.log('[AuthContext] User fetched:', {
        exists: !!user,
        id: user?.id,
        email: user?.email,
        name: user?.name,
        plan: user?.plan,
        role: user?.role
      });
      
      // For master admin, check security setup status (keep in localStorage for UI state only)
      // Use safe localStorage to prevent Safari blocking
      if (user.role === 'master_admin') {
        try {
          // Check if password was changed in the last 365 days
          const passwordChangedTimestamp = safeLocalStorage.getItem('admin_password_changed_time', Date.now().toString());
          const oneYear = 365 * 24 * 60 * 60 * 1000; // 365 days in milliseconds
          const now = Date.now();
          
          // Set default timestamp if none exists, then check if still valid
          if (!safeLocalStorage.getItem('admin_password_changed_time')) {
            safeLocalStorage.setItem('admin_password_changed_time', passwordChangedTimestamp);
          }
          
          const hasChangedPassword = (now - parseInt(passwordChangedTimestamp)) < oneYear;
            
          const hasSetup2FA = safeLocalStorage.getItem('admin_2fa_setup', 'false') === 'true';
          
          // Only require password reset if it's been more than 365 days
          user.requiresPasswordReset = !hasChangedPassword;
          user.requires2FA = !hasSetup2FA;
          user.firstLogin = !hasChangedPassword || !hasSetup2FA;
        } catch (error) {
          // If localStorage fails in Safari, use safe defaults
          console.warn('Failed to check admin security status:', error);
          user.requiresPasswordReset = false;
          user.requires2FA = false;
          user.firstLogin = false;
        }
      }
      
      setUser(user);
      console.log('[AuthContext] User set in state');
    } catch (error) {
      console.error('[AuthContext] Auth check failed:', error);
      console.error('[AuthContext] Error response:', error.response?.data);
      // User is not authenticated
      setUser(null);
    } finally {
      setLoading(false);
      console.log('[AuthContext] Auth check complete, loading=false');
    }
  };

  const login = async (email, password, rememberMe = false) => {
    console.log('[AuthContext] Login attempt started for:', email);
    const startTime = Date.now();
    
    try {
      console.log('[AuthContext] Making login API call...');
      // Use real backend API for all authentication (including demo)
      const response = await axios.post(`${backendUrl}/api/auth/login`, {
        email,
        password,
        remember_me: rememberMe
      }, {
        withCredentials: true,
        timeout: 30000 // Increase to 30 seconds
      });
      
      console.log(`[AuthContext] Login API response received after ${Date.now() - startTime}ms`);
      
      if (response.data && response.data.user) {
        const { user } = response.data;
        // Authentication cookies are set by the server as HttpOnly
        
        // For master admin, check security setup status
        // Use safe localStorage to prevent Safari blocking
        if (user.role === 'master_admin') {
          try {
            // Check if password was changed in the last 365 days
            const passwordChangedTimestamp = safeLocalStorage.getItem('admin_password_changed_time', Date.now().toString());
            const oneYear = 365 * 24 * 60 * 60 * 1000; // 365 days in milliseconds
            const now = Date.now();
            
            // Set default timestamp if none exists, then check if still valid
            if (!safeLocalStorage.getItem('admin_password_changed_time')) {
              safeLocalStorage.setItem('admin_password_changed_time', passwordChangedTimestamp);
            }
            
            const hasChangedPassword = (now - parseInt(passwordChangedTimestamp)) < oneYear;
              
            const hasSetup2FA = safeLocalStorage.getItem('admin_2fa_setup', 'false') === 'true';
            
            // Only require password reset if it's been more than 365 days
            user.requiresPasswordReset = !hasChangedPassword;
            user.requires2FA = !hasSetup2FA;
            user.firstLogin = !hasChangedPassword || !hasSetup2FA;
          } catch (error) {
            // If localStorage fails in Safari, use safe defaults
            console.warn('Failed to check admin security status during login:', error);
            user.requiresPasswordReset = false;
            user.requires2FA = false;
            user.firstLogin = false;
          }
        }
        
        setUser(user);
        return { success: true };
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle Pydantic validation errors (array of error objects)
      let errorMessage = 'Login failed. Please try again.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          // Pydantic validation errors
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

      // Auto-login after registration
      const loginResult = await login(email, password, false);
      return loginResult;
    } catch (error) {
      console.error('Registration failed:', error);
      
      // Handle Pydantic validation errors
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

  const logout = async () => {
    try {
      // Call server logout to clear HttpOnly cookies
      await axios.post(`${backendUrl}/api/auth/logout`, {}, {
        withCredentials: true,
        timeout: 8000
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
    // Clear local state
    setUser(null);
  };

  const deleteAccount = async (confirmation) => {
    try {
      await axios.delete(`${backendUrl}/api/auth/delete-account`, {
        data: { confirmation }
      });
      
      logout();
      return { success: true };
    } catch (error) {
      console.error('Account deletion failed:', error);
      
      // Handle Pydantic validation errors
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
      const response = await axios.get(`${backendUrl}/api/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const createCheckoutSession = async (plan) => {
    try {
      const response = await axios.post(`${backendUrl}/api/stripe/checkout`, {
        plan,
        origin_url: window.location.origin
      });
      
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
      const response = await axios.post(`${backendUrl}/api/stripe/portal`);
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
      const response = await axios.get(`${backendUrl}/api/user/export`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Data export failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Data export failed.' 
      };
    }
  };

  // Get plan limits
  const getPlanLimits = (plan) => {
    switch (plan) {
      case 'STARTER':
        return { deals: 10, portfolios: 1, branding: true };
      case 'PRO':
        return { deals: -1, portfolios: -1, branding: true }; // -1 = unlimited
      default:
        return { deals: 0, portfolios: 0, branding: false };
    }
  };

  // Check if user can perform action
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
    loading,
    login,
    register,
    logout,
    deleteAccount,
    refreshUser,
    createCheckoutSession,
    createCustomerPortal,
    exportUserData,
    isAuthenticated: !!user,
    getPlanLimits,
    canPerformAction
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
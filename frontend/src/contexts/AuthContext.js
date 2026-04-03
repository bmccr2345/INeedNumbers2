import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import safeLocalStorage from '../utils/safeStorage';
import API_BASE_URL from '../config/api';

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
  const backendUrl = API_BASE_URL;
  
  // Get current route to detect auth pages
  const location = useLocation();
  const isAuthRoute = location.pathname.startsWith('/auth/');
  
  // Get Clerk authentication state
  const { isSignedIn, user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useClerkAuth();
  
  // Store getToken in ref to use in interceptor
  const getTokenRef = useRef(getToken);
  
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // Configure axios interceptor to add Clerk session token to all requests
  useEffect(() => {
    axios.defaults.withCredentials = true;
    
    // Add axios interceptor to include Clerk JWT token in Authorization header
    // This enables cross-origin authentication between different domains
    const interceptor = axios.interceptors.request.use(
      async (config) => {
        try {
          // Get fresh JWT token from Clerk using official getToken() method
          // This works across domains and returns a valid JWT
          const token = await getTokenRef.current();
          
          if (token && !config.headers['Authorization']) {
            config.headers['Authorization'] = `Bearer ${token}`;
            console.log('[AuthContext] Added Clerk token to request:', config.url);
          }
        } catch (error) {
          console.warn('[AuthContext] Failed to get Clerk token:', error);
          // Continue with request even if token fetch fails
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, []);

  // Check authentication status - only runs when NOT on auth routes
  // This prevents cascading re-renders during Clerk's multi-step login flow
  const checkAuth = useCallback(async () => {
    // Guard: Don't run during Clerk login/register flow
    // Clerk handles all auth state during /auth/* routes
    if (isAuthRoute) {
      return;
    }
    
    // Guard: Don't run until Clerk is fully loaded
    if (!isLoaded) {
      return;
    }
    
    // Only populate user state when signed in
    if (isSignedIn && clerkUser) {
      console.log('[AuthContext] Clerk user authenticated:', clerkUser.primaryEmailAddress?.emailAddress);
      
      const clerkPlanKey = clerkUser.publicMetadata?.plan || 'free_user';
      const clerkPlanStatus = clerkUser.publicMetadata?.subscription_status || 'active';
      
      const planMapping = {
        'free_user': 'FREE',
        'starter': 'STARTER',
        'pro': 'PRO'
      };
      
      const mappedPlan = planMapping[clerkPlanKey] || 'FREE';
      const finalPlan = (mappedPlan !== 'FREE' && clerkPlanStatus !== 'active') ? 'FREE' : mappedPlan;
      
      const userData = {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        full_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        plan: finalPlan,
        role: 'user',
        status: 'active',
        clerk_user_id: clerkUser.id
      };
      
      setUser(userData);
      setLoading(false);
      return;
    }
    
    // Not signed in and not on auth route - set loading false
    // Do NOT set user to null here to avoid unnecessary re-renders
    setLoading(false);
  }, [isAuthRoute, isLoaded, isSignedIn, clerkUser]);

  // Only run checkAuth when conditions are stable and not on auth routes
  useEffect(() => {
    // Skip entirely during auth flow - let Clerk handle everything
    if (isAuthRoute) {
      return;
    }
    
    if (isLoaded) {
      checkAuth();
    }
  }, [isLoaded, isAuthRoute, checkAuth]);

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

  // Legacy register function (deprecated with Clerk)
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
      // If using Clerk, sign out from Clerk
      if (isSignedIn) {
        await signOut();
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
      await axios.delete(`${backendUrl}/api/auth/delete-account`, {
        data: { confirmation }
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
    // Guard: Don't refresh until Clerk is loaded and user is signed in
    if (!isLoaded || !isSignedIn) return;
    
    try {
      if (clerkUser) {
        // Refresh from backend
        const response = await axios.get(`${backendUrl}/api/clerk/me/${clerkUser.id}`);
        setUser(response.data);
      }
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
      // Use existing billing portal endpoint with clerk_user_id
      const clerkUserId = clerkUser?.id;
      if (!clerkUserId) {
        return { success: false, error: 'Not authenticated' };
      }
      
      const response = await axios.post(`${backendUrl}/api/clerk/billing-portal`, {
        clerk_user_id: clerkUserId,
        return_url: `${window.location.origin}/account`
      });
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

  // Get current plan from Clerk or user object
  const getCurrentPlan = () => {
    if (isSignedIn && clerkUser?.publicMetadata?.plan) {
      const clerkPlanKey = clerkUser.publicMetadata.plan;
      const planMapping = {
        'free_user': 'FREE',
        'starter': 'STARTER',
        'pro': 'PRO'
      };
      return planMapping[clerkPlanKey] || 'FREE';
    }
    return user?.plan || 'FREE';
  };

  // Check if user has active subscription
  const hasActiveSubscription = () => {
    if (!isSignedIn || !clerkUser) return false;
    const plan = getCurrentPlan();
    const planStatus = clerkUser.publicMetadata?.plan_status || 'active';
    return plan !== 'FREE' && planStatus === 'active';
  };

  const value = {
    user,
    loading: loading || !isLoaded,
    login,
    register,
    logout,
    deleteAccount,
    refreshUser,
    createCheckoutSession,
    createCustomerPortal,
    exportUserData,
    isAuthenticated: !!user,
    isClerk: isSignedIn,
    clerkUser,
    getPlanLimits,
    canPerformAction,
    getCurrentPlan,
    hasActiveSubscription,
    getToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
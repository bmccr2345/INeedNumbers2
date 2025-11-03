import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import axios from 'axios';
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
  
  // Get Clerk authentication state
  const { isSignedIn, user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();

  // Configure axios for cookie-based authentication (legacy fallback)
  useEffect(() => {
    axios.defaults.withCredentials = true;
  }, []);

  // Check authentication status on app load
  const checkAuth = useCallback(async () => {
    try {
      // If Clerk is signed in, sync with backend
      if (isSignedIn && clerkUser) {
        console.log('[AuthContext] Clerk user authenticated:', clerkUser.primaryEmailAddress?.emailAddress);
        
        try {
          // Get plan from Clerk public metadata
          const clerkPlanKey = clerkUser.publicMetadata?.plan || 'free_user';
          const clerkPlanStatus = clerkUser.publicMetadata?.subscription_status || 'active';
          
          // Map Clerk plan keys to our internal plan names
          const planMapping = {
            'free_user': 'FREE',
            'starter': 'STARTER',
            'pro': 'PRO'
          };
          
          const mappedPlan = planMapping[clerkPlanKey] || 'FREE';
          
          console.log('[AuthContext] Clerk plan:', clerkPlanKey, '→', mappedPlan, '| Status:', clerkPlanStatus);
          
          // Sync Clerk user with backend, including metadata
          const response = await axios.post(`${backendUrl}/api/clerk/sync-user`, {
            clerk_user_id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            full_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
            metadata: {
              plan: mappedPlan,
              plan_status: clerkPlanStatus,  // Send as plan_status for backend compatibility
              clerk_plan_key: clerkPlanKey
            }
          }, {
            withCredentials: true
          });
          
          const userData = response.data;
          console.log('[AuthContext] Clerk user profile synced:', userData.email, '| Plan:', userData.plan);
          
          setUser(userData);
          setLoading(false);
          return;
        } catch (error) {
          console.error('[AuthContext] Failed to sync Clerk user:', error);
        }
      }
      
      // Fallback to legacy cookie-based authentication
      if (!isSignedIn) {
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
  }, [isSignedIn, clerkUser, backendUrl]);

  useEffect(() => {
    if (isLoaded) {
      checkAuth();
    }
  }, [isLoaded, checkAuth]);

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
    try {
      if (isSignedIn && clerkUser) {
        // Refresh from backend
        const response = await axios.get(`${backendUrl}/api/clerk/me/${clerkUser.id}`);
        setUser(response.data);
      } else {
        const response = await axios.get(`${backendUrl}/api/auth/me`);
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
      const response = await axios.post(`${backendUrl}/api/stripe/portal`, {});
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
    hasActiveSubscription
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
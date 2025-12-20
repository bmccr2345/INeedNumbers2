import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

/**
 * MobileEntry - Pure authentication gate for mobile app
 * 
 * This route serves as the sole entry point for the Capacitor iOS app.
 * It performs no UI rendering except a loading state while auth resolves.
 * 
 * Behavior:
 * - While loading: Shows minimal splash screen
 * - If unauthenticated: Redirects to /auth/login
 * - If authenticated: Redirects to /dashboard
 */
const MobileEntry = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded) {
      // Still checking auth state
      return;
    }

    if (!isSignedIn) {
      // User is not authenticated, redirect to login
      navigate('/auth/login', { replace: true });
    } else {
      // User is authenticated, redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Always render loading splash (never return null)
  // This ensures no blank white page appears during redirect
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
};

export default MobileEntry;

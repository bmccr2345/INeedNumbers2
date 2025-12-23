import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

/**
 * MobileEntry - Pure authentication gate for mobile app
 * 
 * Behavior:
 * - Capacitor (iOS app): Immediately redirect to /auth/login
 * - Desktop/Web: Use Clerk auth state to determine redirect
 */
const MobileEntry = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Detect if running inside Capacitor (native iOS app)
    const isCapacitor = window.Capacitor?.isNativePlatform?.() === true;

    if (isCapacitor) {
      // Mobile app: immediately redirect to login without waiting for Clerk
      navigate('/auth/login', { replace: true });
      return;
    }

    // Desktop/Web: use normal Clerk auth flow
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

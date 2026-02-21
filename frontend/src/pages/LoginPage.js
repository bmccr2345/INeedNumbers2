import React, { useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { SignIn, useUser } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { navigateToHome } from '../utils/navigation';
// Capacitor imports for iOS native OAuth compliance
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const LoginPage = () => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  // Detect if running inside iOS Capacitor native shell
  const isNativeIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  // Clerk hosted sign-in URL for iOS native (Apple App Store compliant)
  const CLERK_HOSTED_SIGNIN_URL = 'https://apparent-dragon-65.accounts.dev/sign-in?redirect_url=ineednumbers://sso-callback';

  // Redirect if already authenticated
  useEffect(() => {
    if (isSignedIn && user) {
      navigate(from, { replace: true });
    }
  }, [isSignedIn, user, navigate, from]);

  // For iOS native: Open Clerk sign-in in system browser (Apple App Store requirement)
  // For desktop/web: Render Clerk component in-page (existing behavior)
  useEffect(() => {
    if (isNativeIOS && !isSignedIn) {
      // Open Clerk hosted sign-in page in system browser
      // This complies with Apple App Store rules by not embedding OAuth in WebView
      Browser.open({ url: CLERK_HOSTED_SIGNIN_URL });
    }
  }, [isNativeIOS, isSignedIn]);

  // iOS Native: Show loading state while system browser handles OAuth
  if (isNativeIOS) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_agent-portal-27/artifacts/azdcmpew_Logo_with_brown_background-removebg-preview.png" 
              alt="I Need Numbers" 
              className="h-12 w-auto"
            />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Opening sign-in in your browser...</p>
        </div>
      </div>
    );
  }

  // Desktop/Web: Render Clerk SignIn component (existing behavior - unchanged)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigateToHome(navigate, user)}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="flex justify-center mb-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_agent-portal-27/artifacts/azdcmpew_Logo_with_brown_background-removebg-preview.png" 
              alt="I Need Numbers" 
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-600 mt-2">Sign in to your <span className="font-bold text-green-600" style={{fontFamily: 'Poppins, sans-serif'}}>I Need Numbers</span> account</p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="flex justify-center">
          <SignIn 
            afterSignInUrl={from}
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-xl border-0"
              }
            }}
          />
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>By signing in, you agree to our{' '}
            <Link to="/legal/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/legal/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
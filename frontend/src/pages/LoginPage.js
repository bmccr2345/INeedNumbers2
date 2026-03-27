import React, { useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { SignIn, useUser } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { navigateToHome } from '../utils/navigation';

const LoginPage = () => {
  const { isSignedIn, user, isLoaded } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated - only after Clerk is loaded
  // AND only when on the base /auth/login path (not during multi-step flows like /auth/login/factor-one)
  useEffect(() => {
    if (!isLoaded) return;
    
    // Guard: Don't redirect during Clerk's multi-step auth flow
    // Clerk uses sub-paths like /auth/login/factor-one, /auth/login/factor-two for MFA
    // Only redirect when on the exact base login path AND fully signed in
    const isBaseLoginPath = location.pathname === '/auth/login';
    
    if (isSignedIn && user && isBaseLoginPath) {
      console.log('[LoginPage] User already signed in, redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [isLoaded, isSignedIn, user, navigate, from, location.pathname]);

  // Show nothing while Clerk is loading to prevent flash
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Render Clerk SignIn component inline for ALL platforms (web + iOS WKWebView)
  // No Browser.open() - Clerk renders directly inside the WebView
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

        {/* Clerk Sign In Component - routing="path" prevents redirect to clerk domain in WKWebView */}
        <div className="flex justify-center">
          <SignIn 
            routing="path"
            path="/auth/login"
            fallbackRedirectUrl={from}
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
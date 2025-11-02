import React, { useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Sparkles, Lock, Shield } from 'lucide-react';
import { navigateToHome } from '../utils/navigation';

const LoginPage = () => {
  const { loginWithAuth0, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleAuth0Login = () => {
    loginWithAuth0({ returnTo: from });
  };

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

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">Secure Sign In</CardTitle>
            <CardDescription className="text-base">
              We've upgraded to Auth0 for enhanced security
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Main Login Button */}
            <Button
              onClick={handleAuth0Login}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-6 text-lg shadow-lg"
            >
              <Lock className="w-5 h-5 mr-2" />
              Continue with Auth0
            </Button>

            {/* Security Features */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Why Auth0?</p>
              
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Bank-level Security</p>
                  <p className="text-xs text-gray-600">Industry-leading authentication protection</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Single Sign-On</p>
                  <p className="text-xs text-gray-600">One secure login for all your devices</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Lock className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Your Data Protected</p>
                  <p className="text-xs text-gray-600">Passwords never stored on our servers</p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>New to Auth0?</strong> Don't worry! Click the button above and you'll be able to create an account or sign in securely.
              </p>
            </div>

            {/* Footer Links */}
            <div className="text-center text-sm text-gray-600 space-y-2 pt-4">
              <p>
                Need help?{' '}
                <Link
                  to="/support"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Contact Support
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

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
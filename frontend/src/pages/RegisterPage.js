import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SignUp, useUser } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { navigateToHome } from '../utils/navigation';
import axios from 'axios';

const RegisterPage = () => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState(null);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // After signup, redirect to Stripe checkout
  useEffect(() => {
    const redirectToCheckout = async () => {
      if (isSignedIn && user && !isRedirecting) {
        setIsRedirecting(true);
        setError(null);
        
        console.log('[RegisterPage] User signed in, redirecting to checkout...');
        
        try {
          // Get the base URL for redirects
          const baseUrl = window.location.origin;
          
          // Create Stripe checkout session
          const response = await axios.post(
            `${backendUrl}/api/clerk/create-checkout`,
            {
              clerk_user_id: user.id,
              plan: 'pro', // Single plan at $49.99
              email: user.primaryEmailAddress?.emailAddress,
              success_url: `${baseUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${baseUrl}/complete-subscription?checkout=cancelled`
            },
            {
              withCredentials: true,
              timeout: 15000
            }
          );
          
          console.log('[RegisterPage] Checkout session created:', response.data);
          
          if (response.data.url) {
            // Redirect to Stripe Checkout
            window.location.href = response.data.url;
          } else {
            throw new Error('No checkout URL returned');
          }
          
        } catch (error) {
          console.error('[RegisterPage] Error creating checkout:', error);
          setError('Unable to start checkout. Please try again.');
          setIsRedirecting(false);
        }
      }
    };

    redirectToCheckout();
  }, [isSignedIn, user, backendUrl, isRedirecting]);

  // Show loading state while redirecting to checkout
  if (isSignedIn && user && isRedirecting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2FA163] mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your subscription...</p>
          <p className="text-gray-400 text-sm mt-2">Redirecting to secure checkout...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button 
            onClick={() => {
              setError(null);
              setIsRedirecting(false);
            }}
            className="bg-[#2FA163] hover:bg-[#268a54] text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
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
          <h1 className="text-3xl font-bold text-gray-900">Create Your Account</h1>
          <p className="text-gray-600 mt-2">Join <span className="font-bold text-[#2FA163]">I Need Numbers</span> and take control of your business</p>
        </div>

        {/* Clerk Sign Up Component */}
        <div className="flex justify-center">
          <SignUp 
            signInUrl="/auth/login"
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
          <p>By signing up, you agree to our{' '}
            <Link to="/legal/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/legal/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

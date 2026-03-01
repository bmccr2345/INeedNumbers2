import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Check, CreditCard, LogOut } from 'lucide-react';
import axios from 'axios';

const CompleteSubscriptionPage = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  const handleCompleteSubscription = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get the base URL for redirects
      const baseUrl = window.location.origin;
      
      console.log('[CompleteSubscription] Creating checkout for user:', user.id);
      console.log('[CompleteSubscription] Email:', user.primaryEmailAddress?.emailAddress);
      
      const response = await axios.post(
        `${backendUrl}/api/clerk/create-checkout`,
        {
          clerk_user_id: user.id,
          plan: 'pro',
          email: user.primaryEmailAddress?.emailAddress,
          success_url: `${baseUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/complete-subscription?checkout=cancelled`
        },
        {
          withCredentials: true,
          timeout: 15000
        }
      );
      
      console.log('[CompleteSubscription] Checkout response:', response.data);
      
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('[CompleteSubscription] Error creating checkout:', err);
      console.error('[CompleteSubscription] Error response:', err.response?.data);
      const errorMessage = err.response?.data?.detail || 'Unable to start checkout. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const features = [
    "AI Coach - Daily personalized business insights",
    "Agent P&L Tracker - Real profit tracking",
    "Commission Cap Report - Automatic cap monitoring",
    "Action Tracker - Goal-to-activity conversion",
    "All Calculators - Mortgage, Net Sheet, Commission & more",
    "Branded PDFs - Professional client presentations",
    "Unlimited Saves - Store all your deals & calculations"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Simple header */}
      <nav className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img 
                src="https://customer-assets.emergentagent.com/job_agent-portal-27/artifacts/azdcmpew_Logo_with_brown_background-removebg-preview.png" 
                alt="I Need Numbers" 
                className="h-8 w-auto"
              />
              <span 
                className="text-lg font-bold text-[#2FA163]"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                I NEED NUMBERS
              </span>
            </div>
            
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Welcome message */}
          <h1 
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            Welcome{user?.firstName ? `, ${user.firstName}` : ''}!
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Complete your subscription to unlock all features.
          </p>

          {/* Pricing card */}
          <div className="bg-gray-50 rounded-2xl p-8 mb-8 border border-gray-100">
            <div className="mb-6">
              <span className="text-5xl font-bold text-gray-900">$49.99</span>
              <span className="text-xl text-gray-500">/month</span>
            </div>
            
            <p className="text-gray-600 mb-6">
              One plan. Everything included. Cancel anytime.
            </p>

            {/* Features list */}
            <ul className="text-left space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="w-5 h-5 text-[#2FA163] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleCompleteSubscription}
              disabled={isLoading}
              className="w-full bg-[#2FA163] hover:bg-[#268a54] text-white text-lg py-6 font-semibold"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Redirecting to checkout...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Complete Subscription
                </>
              )}
            </Button>
          </div>

          <p className="text-sm text-gray-500">
            Secure payment powered by Stripe. Cancel anytime from your account settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompleteSubscriptionPage;

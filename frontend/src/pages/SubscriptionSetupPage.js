import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle, CreditCard, ArrowLeft, AlertTriangle, Sparkles } from 'lucide-react';
import axios from 'axios';

const SubscriptionSetupPage = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [error, setError] = useState('');
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // Fetch subscription status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      if (!isLoaded || !user) return;

      try {
        setLoading(true);
        const response = await axios.get(
          `${backendUrl}/api/clerk/subscription-status?clerk_user_id=${user.id}`,
          {
            withCredentials: true,
            timeout: 10000
          }
        );

        const data = response.data;
        setSubscriptionStatus(data);

        console.log('[SubscriptionSetup] Status:', data);

        // If user is on FREE plan or has active subscription, redirect to dashboard
        if (data.plan === 'FREE' || data.subscription_status === 'active') {
          console.log('[SubscriptionSetup] User has active plan, redirecting to dashboard');
          setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
        }
      } catch (err) {
        console.error('[SubscriptionSetup] Error fetching status:', err);
        setError('Failed to load subscription status. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [isLoaded, user, backendUrl, navigate]);

  const handleCompleteSubscription = async () => {
    if (!user || !subscriptionStatus) return;

    try {
      setCreatingCheckout(true);
      setError('');

      const plan = subscriptionStatus.plan.toLowerCase();
      
      // Create Stripe Checkout session
      const response = await axios.post(
        `${backendUrl}/api/clerk/create-checkout`,
        {
          clerk_user_id: user.id,
          plan: plan,
          success_url: `${window.location.origin}/dashboard?checkout=success`,
          cancel_url: `${window.location.origin}/subscription-setup?checkout=cancelled`
        },
        {
          withCredentials: true,
          timeout: 10000
        }
      );

      console.log('[SubscriptionSetup] Checkout session created:', response.data);

      // Redirect to Stripe Checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('[SubscriptionSetup] Error creating checkout:', err);
      setError(
        err.response?.data?.detail || 
        'Failed to create checkout session. Please try again.'
      );
      setCreatingCheckout(false);
    }
  };

  const handleSkipForNow = () => {
    // User wants to skip payment - downgrade to FREE and go to dashboard
    console.log('[SubscriptionSetup] User skipped payment, redirecting to dashboard');
    navigate('/dashboard', { replace: true });
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  const planDetails = {
    STARTER: {
      name: 'Starter',
      price: '$19.99',
      period: 'month',
      features: [
        'All Free tools included',
        'Save up to 10 deals',
        'Share links with clients',
        'Branded PDF reports',
        'Portfolio basics'
      ],
      color: 'from-blue-600 to-blue-700'
    },
    PRO: {
      name: 'Pro',
      price: '$49.99',
      period: 'month',
      features: [
        'All Starter features included',
        'Agent P&L Tracker',
        'Exportable PDF/Excel reports',
        'Unlimited deals & portfolios',
        'URL prefill from listings',
        '5-year projections',
        'Multi-brand profiles',
        'All future Pro features'
      ],
      color: 'from-emerald-600 to-emerald-700'
    }
  };

  const currentPlanDetails = planDetails[subscriptionStatus?.plan] || planDetails.STARTER;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/pricing')}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pricing
          </Button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Subscription
          </h1>
          <p className="text-gray-600">
            You're almost there! Complete your payment to unlock all {currentPlanDetails.name} features.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Plan Summary Card */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className={`bg-gradient-to-r ${currentPlanDetails.color} text-white rounded-t-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{currentPlanDetails.name} Plan</CardTitle>
                <CardDescription className="text-white/90 mt-1">
                  Professional tools for your real estate business
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{currentPlanDetails.price}</div>
                <div className="text-sm text-white/80">per {currentPlanDetails.period}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="font-semibold">30 days free trial - Cancel anytime</span>
            </div>
            
            <h3 className="font-semibold text-gray-900 mb-3">What's included:</h3>
            <ul className="space-y-2">
              {currentPlanDetails.features.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={handleCompleteSubscription}
            disabled={creatingCheckout}
            className={`w-full h-12 text-lg bg-gradient-to-r ${currentPlanDetails.color} hover:from-emerald-700 hover:to-emerald-800 text-white`}
          >
            {creatingCheckout ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Checkout Session...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Complete Payment & Start Trial
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkipForNow}
            disabled={creatingCheckout}
            className="w-full text-gray-600 hover:text-gray-900"
          >
            Skip for now (Use Free Plan)
          </Button>
        </div>

        {/* Payment Info */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2 text-sm">Payment Information</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Secure payment processing by Stripe</li>
            <li>• 30-day free trial - no charge today</li>
            <li>• Cancel anytime from your dashboard</li>
            <li>• Automatic billing after trial ends</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSetupPage;

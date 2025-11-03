import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import PlanPreviewRibbon from '../components/PlanPreviewRibbon';
import { usePlanPreview } from '../hooks/usePlanPreview';
import ClerkPricingTable from '../components/ClerkPricingTable';

const PricingPage = () => {
  const { user, isClerk, getCurrentPlan } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const currentPlan = getCurrentPlan ? getCurrentPlan() : user?.plan || 'FREE';
  const { effectivePlan, previewPlan, isPreviewMode, clearPreview } = usePlanPreview(currentPlan);

  React.useEffect(() => {
    // Check for checkout cancellation
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'cancelled') {
      setError('Payment was cancelled. You can try again anytime.');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-light via-white to-neutral-medium">
      {/* Plan Preview Ribbon */}
      {isPreviewMode && (
        <PlanPreviewRibbon previewPlan={previewPlan} onClear={clearPreview} />
      )}

      {/* Navigation */}
      <nav className={`bg-white/80 backdrop-blur-md border-b border-neutral-medium/20 ${isPreviewMode ? 'mt-12' : ''}`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="text-deep-forest hover:text-primary"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
              
              <div className="flex items-center space-x-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_agent-portal-27/artifacts/azdcmpew_Logo_with_brown_background-removebg-preview.png" 
                  alt="I Need Numbers" 
                  className="h-8 w-auto"
                />
                <span className="text-lg font-bold text-primary font-poppins">I NEED NUMBERS</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-neutral-dark">
                    Welcome, {user.full_name || user.email}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                    className="border-primary text-primary hover:bg-primary hover:text-white"
                  >
                    My Account
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/auth/login')}
                    className="text-deep-forest hover:text-primary"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => navigate('/auth/register')}
                    className="bg-primary hover:bg-secondary text-white"
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 mb-4">
            Pricing
          </Badge>
          <h1 className="text-4xl font-bold text-deep-forest mb-4 font-poppins">
            Choose the Plan That Fits Your Business
          </h1>
          <p className="text-xl text-neutral-dark max-w-3xl mx-auto">
            From essential calculators to comprehensive business tracking, find the perfect toolkit for your real estate practice.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert className="mb-8 border-red-200 bg-red-50 max-w-2xl mx-auto">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Pricing Cards */}
        <ClerkPricingTable />

        {/* Additional Info */}
        <div className="mt-16 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-deep-forest mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4 text-left">
            <div>
              <h3 className="font-semibold text-deep-forest">Can I cancel anytime?</h3>
              <p className="text-neutral-dark">Yes! You can cancel your subscription at any time from your account settings. Your access will continue until the end of your billing period.</p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-forest">What happens to my data if I downgrade?</h3>
              <p className="text-neutral-dark">All your saved data is preserved. You'll have read-only access to deals that exceed the plan limits.</p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-forest">Do you offer refunds?</h3>
              <p className="text-neutral-dark">We offer a 30-day money-back guarantee. If you're not satisfied, contact support for a full refund.</p>
            </div>
          </div>
        </div>

        {/* Cancellation Policy */}
        <div className="text-center mt-12 space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="font-semibold text-green-900 mb-2">Flexible Cancellation Policy</h3>
            <p className="text-green-800">
              Cancel anytime. You will not be charged for subsequent months. No questions asked, no hidden fees.
            </p>
          </div>
          
          <p className="text-neutral-dark">
            All plans include professional tools designed specifically for real estate agents.
          </p>
          
          <div className="flex justify-center space-x-8 text-sm text-neutral-dark">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>No hidden fees</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-secondary rounded-full"></div>
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Secure payments</span>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PricingPage;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '@clerk/clerk-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { saveOnboardingData, completeOnboarding } from '../../services/onboardingApi';

const CompletionScreen = () => {
  const navigate = useNavigate();
  const { onboardingData, resetOnboarding } = useOnboarding();
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // First save all onboarding data
      await saveOnboardingData(onboardingData);
      
      // Then mark onboarding as complete and get dashboard initialization
      const result = await completeOnboarding();
      
      console.log('[Onboarding] Completed successfully:', result);
      
      // Reset onboarding context
      resetOnboarding();
      
      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (err) {
      console.error('[Onboarding] Error completing onboarding:', err);
      
      // Check if it's a database connection error
      const errorMessage = err?.response?.data?.detail || err?.message || 'Unknown error';
      
      if (errorMessage.includes('SSL') || errorMessage.includes('MongoDB') || errorMessage.includes('database')) {
        setError('Database connection issue detected. Your data cannot be saved right now, but you can continue to the dashboard. The onboarding can be completed later from Settings.');
      } else {
        setError(`Failed to complete onboarding: ${errorMessage}`);
      }
      
      setIsSubmitting(false);
    }
  };

  const handleSkipAndContinue = () => {
    // Skip database save and go directly to dashboard
    console.log('[Onboarding] User chose to skip and continue to dashboard');
    resetOnboarding();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-6 text-center pb-6">
          <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            All Done! Thank you for the details. Your A.I. Coach needs this foundational information to help you.
          </h1>
          <p className="text-lg text-gray-600">
            As you enter more information in (Deals, Expenses, etc) the coach will get smarter and smarter.
          </p>
          <p className="text-base text-gray-700 font-medium">
            Now we will customize a plan just for you!
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <Button
            onClick={handleComplete}
            disabled={isSubmitting}
            className="w-full h-14 text-lg bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Setting up your dashboard...
              </>
            ) : (
              'Enter dashboard'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompletionScreen;

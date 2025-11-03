import React from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, Sparkles } from 'lucide-react';

const ClerkPricingTable = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const navigate = useNavigate();

  if (!isLoaded) {
    return <div className="text-center py-8">Loading plans...</div>;
  }

  const currentPlan = user?.publicMetadata?.plan || 'free_user';

  const handleSubscribe = (planKey) => {
    // If user is not signed in, redirect to sign up
    if (!isSignedIn) {
      navigate('/auth/login');
      return;
    }

    // If clicking on Free plan, just navigate to dashboard
    if (planKey === 'free_user') {
      navigate('/dashboard');
      return;
    }

    // For paid plans, open Clerk's user profile with billing
    if (clerk && clerk.openUserProfile) {
      clerk.openUserProfile({
        appearance: {
          elements: {
            rootBox: "mx-auto"
          }
        }
      });
    } else {
      // Fallback: Navigate to account page
      navigate('/account');
    }
  };

  const plans = [
    {
      key: 'free_user',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Access to core calculators',
      features: [
        'Commission Split Calculator',
        'Seller Net Sheet Estimator',
        'Mortgage & Affordability Calculator',
        'Basic calculations and results'
      ],
      cta: 'Get Started',
      popular: false
    },
    {
      key: 'starter',
      name: 'Starter',
      price: '$19.99',
      period: 'month',
      description: 'Save deals and create branded reports',
      features: [
        'All Free tools included',
        'Save up to 10 deals',
        'Share links with clients',
        'Branded PDF reports',
        'Portfolio basics'
      ],
      cta: 'Buy Now',
      popular: false,
      trial: '30 days free trial'
    },
    {
      key: 'pro',
      name: 'Pro',
      price: '$49.99',
      period: 'month',
      description: 'Advanced business tracking and insights',
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
      cta: 'Buy Now',
      popular: true,
      trial: '30 days free trial'
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {plans.map((plan) => {
        const isCurrent = currentPlan === plan.key;
        const isUpgrade = !isCurrent && plan.key !== 'free_user';

        return (
          <Card 
            key={plan.key}
            className={`relative ${
              plan.popular ? 'border-primary shadow-2xl scale-105' : 'border-neutral-medium'
            } ${isCurrent ? 'bg-primary/5' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white">
                Most Popular
              </Badge>
            )}
            
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{plan.name}</span>
                {isCurrent && (
                  <Badge variant="outline" className="text-primary border-primary">
                    Current
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-deep-forest">{plan.price}</span>
                <span className="text-neutral-dark ml-2">/ {plan.period}</span>
              </div>
              {plan.trial && !isCurrent && (
                <div className="flex items-center text-sm text-primary mt-2">
                  <Sparkles className="w-4 h-4 mr-1" />
                  {plan.trial}
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-neutral-dark">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                onClick={() => handleSubscribe(plan.key)}
                disabled={isCurrent}
                className={`w-full ${
                  plan.popular
                    ? 'bg-primary hover:bg-secondary text-white'
                    : 'bg-neutral-medium hover:bg-neutral-dark text-white'
                } ${isCurrent ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isCurrent ? 'Current Plan' : plan.cta}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ClerkPricingTable;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

/**
 * IOSRestrictionMessage
 * 
 * Displayed to iOS app users when they attempt to access signup,
 * pricing, or subscription pages. Complies with Apple App Store
 * Guideline 3.1.1 by not allowing in-app purchases via Stripe.
 */
const IOSRestrictionMessage = ({ showSignIn = true }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src="https://customer-assets.emergentagent.com/job_agent-portal-27/artifacts/azdcmpew_Logo_with_brown_background-removebg-preview.png" 
            alt="I Need Numbers" 
            className="h-16 w-auto"
          />
        </div>

        {/* Title */}
        <h1 
          className="text-2xl font-bold text-gray-900 mb-4"
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          Subscription Required
        </h1>

        {/* Message */}
        <p 
          className="text-gray-600 mb-8 leading-relaxed"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          To create an account and subscribe, please visit{' '}
          <span className="font-semibold text-gray-900">ineednumbers.com</span>{' '}
          on your computer or mobile browser.
        </p>

        {/* Sign In Button */}
        {showSignIn && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Already have an account?</p>
            <Button
              onClick={() => navigate('/auth/login')}
              className="bg-[#2FA163] hover:bg-[#268a54] text-white px-8 py-3 text-lg font-medium"
              data-testid="ios-signin-btn"
            >
              Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IOSRestrictionMessage;

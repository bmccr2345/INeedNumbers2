import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { SignUp, useUser } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { navigateToHome } from '../utils/navigation';
import axios from 'axios';

const RegisterPage = () => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isAssigningPlan, setIsAssigningPlan] = useState(false);
  
  const from = location.state?.from?.pathname || '/dashboard';
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // Get plan from URL or localStorage
  const getPlanSelection = () => {
    const urlPlan = searchParams.get('plan');
    const storedPlan = localStorage.getItem('selected_plan');
    return urlPlan || storedPlan || 'free';
  };

  // Assign plan to user after signup
  useEffect(() => {
    const assignPlanAfterSignup = async () => {
      if (isSignedIn && user && !isAssigningPlan) {
        const selectedPlan = getPlanSelection();
        
        console.log('[RegisterPage] User signed in, assigning plan:', selectedPlan);
        setIsAssigningPlan(true);
        
        try {
          // Assign plan via backend
          const response = await axios.post(
            `${backendUrl}/api/clerk/assign-plan`,
            {
              clerk_user_id: user.id,
              plan: selectedPlan
            },
            {
              withCredentials: true,
              timeout: 10000
            }
          );
          
          console.log('[RegisterPage] Plan assigned:', response.data);
          
          // Clear stored plan
          localStorage.removeItem('selected_plan');
          
          // Redirect based on plan
          if (selectedPlan === 'free') {
            console.log('[RegisterPage] Free plan - redirecting to dashboard');
            navigate('/dashboard', { replace: true });
          } else {
            console.log('[RegisterPage] Paid plan - redirecting to subscription setup');
            navigate('/subscription-setup', { replace: true });
          }
        } catch (error) {
          console.error('[RegisterPage] Error assigning plan:', error);
          // On error, still redirect to dashboard
          navigate('/dashboard', { replace: true });
        } finally {
          setIsAssigningPlan(false);
        }
      }
    };

    assignPlanAfterSignup();
  }, [isSignedIn, user, navigate, backendUrl, isAssigningPlan]);

  // Show loading state while assigning plan
  if (isSignedIn && user && isAssigningPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  const selectedPlan = getPlanSelection();

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
          <h1 className="text-3xl font-bold text-gray-900">Create Your Account</h1>
          <p className="text-gray-600 mt-2">Join <span className="font-bold text-green-600" style={{fontFamily: 'Poppins, sans-serif'}}>I Need Numbers</span> and take control of your business</p>
          
          {/* Show selected plan */}
          {selectedPlan && selectedPlan !== 'free' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Selected Plan: <span className="font-bold capitalize">{selectedPlan}</span>
              </p>
            </div>
          )}
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
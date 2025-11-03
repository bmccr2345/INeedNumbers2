import React, { useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { SignUp, useUser } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { navigateToHome } from '../utils/navigation';

const RegisterPage = () => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isSignedIn && user) {
      navigate(from, { replace: true });
    }
  }, [isSignedIn, user, navigate, from]);

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
        </div>

        {/* Clerk Sign Up Component */}
        <div className="flex justify-center">
          <SignUp 
            afterSignUpUrl={from}
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
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Join <span className="font-bold text-green-600" style={{fontFamily: 'Poppins, sans-serif'}}>I Need Numbers</span> and start creating investor packets</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle>Account Access</CardTitle>
            <CardDescription>
              Accounts are only available for Starter and Pro subscribers
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Free users:</strong> Use the calculator without creating an account. No sign-up needed!
              </AlertDescription>
            </Alert>

            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Paid subscribers:</strong> Get automatic account access after subscribing to Starter or Pro plans.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-2">Choose your path:</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <Button 
                  onClick={() => navigate('/calculator')}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                >
                  <div className="text-lg font-semibold">Use Free Calculator</div>
                  <div className="text-sm text-gray-600">Start analyzing deals immediately</div>
                </Button>
                
                <Button 
                  onClick={() => navigate('/pricing')}
                  className="h-auto p-4 flex flex-col items-center space-y-2 bg-gradient-to-r from-primary to-secondary hover:from-emerald-700 hover:to-emerald-800"
                >
                  <div className="text-lg font-semibold">Subscribe & Get Account</div>
                  <div className="text-sm">Save deals, branded PDFs, and more</div>
                </Button>
              </div>
            </div>
            
            <div className="text-center pt-4 border-t">
              <p className="text-gray-600">
                Already a subscriber?{' '}
                <Link to="/auth/login" className="text-green-600 hover:text-green-500 font-medium">
                  Sign in to your account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
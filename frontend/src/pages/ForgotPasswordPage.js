import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import API_BASE_URL from '../config/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const backendUrl = API_BASE_URL;
      
      const response = await fetch(`${backendUrl}/api/auth/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess(true);
        
        // In development, log the reset token
        if (data.dev_reset_token) {
          console.log('🔐 DEV MODE: Password reset token:', data.dev_reset_token);
          console.log('🔗 Reset link:', `${window.location.origin}/auth/reset-password?token=${data.dev_reset_token}`);
        }
      } else {
        setError(data.detail || data.message || 'Failed to send password reset email');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Unable to send password reset email. Please try again later.');
    }
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/auth/login" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Link>
            
            <div className="flex justify-center mb-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_agent-portal-27/artifacts/azdcmpew_Logo_with_brown_background-removebg-preview.png" 
                alt="I Need Numbers" 
                className="h-12 w-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Check your email</h1>
          </div>

          <Card className="shadow-xl border-0">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset link sent!</h2>
                <p className="text-gray-600 mb-6">
                  We've sent a password reset link to <strong>{email}</strong>.
                  Check your inbox and click the link to reset your password.
                </p>
                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <Link to="/auth/login">
                      Back to Sign In
                    </Link>
                  </Button>
                  <p className="text-sm text-gray-500">
                    Didn't receive the email? Check your spam folder or{' '}
                    <button
                      onClick={() => {
                        setSuccess(false);
                        setEmail('');
                      }}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      try again
                    </button>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/auth/login" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Link>
          
          <div className="flex justify-center mb-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_agent-portal-27/artifacts/azdcmpew_Logo_with_brown_background-removebg-preview.png" 
              alt="I Need Numbers" 
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Reset your password</h1>
          <p className="text-gray-600 mt-2">Enter your email and we'll send you a reset link</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary hover:from-emerald-700 hover:to-emerald-800"
                disabled={loading || !email}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <Link
                  to="/auth/login"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
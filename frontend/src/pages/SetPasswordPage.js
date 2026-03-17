import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ArrowLeft, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import API_BASE_URL from '../config/api';

const SetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const sessionId = searchParams.get('session_id') || '';
  
  const [formData, setFormData] = useState({
    email: emailFromUrl,
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Fetch email from session if session_id is provided but email is not
  useEffect(() => {
    if (sessionId && !emailFromUrl) {
      fetchSessionInfo();
    }
  }, [sessionId, emailFromUrl]);

  const fetchSessionInfo = async () => {
    setSessionLoading(true);
    try {
      const backendUrl = API_BASE_URL;
      const response = await fetch(`${backendUrl}/api/stripe/checkout/session/${sessionId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.customer_email) {
          setFormData(prev => ({ ...prev, email: data.customer_email }));
        }
      }
    } catch (error) {
      console.error('Error fetching session info:', error);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const backendUrl = API_BASE_URL;
      
      const requestBody = {
        email: formData.email,
        password: formData.password
      };
      
      // Include session_id if available for fallback user creation
      if (sessionId) {
        requestBody.session_id = sessionId;
      }
      
      const response = await fetch(`${backendUrl}/api/auth/set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        
        // If backend returns a different email, show it to the user
        if (data.email && data.email !== formData.email) {
          toast.success(`Password set successfully! Your login email is: ${data.email}`);
          setFormData(prev => ({ ...prev, email: data.email }));
        } else {
          toast.success('Password set successfully! You can now log in.');
        }
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/auth/login', { 
            state: { 
              email: data.email || formData.email,
              message: 'Password set successfully! Please log in with your credentials.'
            }
          });
        }, 3000);
      } else {
        console.error('Set password error response:', data);
        console.error('Response status:', response.status);
        console.error('Email used:', formData.email);
        console.error('Session ID used:', sessionId);
        
        setError(data.detail || 'Failed to set password');
      }
    } catch (error) {
      console.error('Set password error:', error);
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Password Set Successfully!</h2>
                <p className="text-gray-600">
                  Your password has been set. You can now log in to your account.
                </p>
                <Button 
                  onClick={() => navigate('/auth/login')}
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                >
                  Continue to Login
                </Button>
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
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
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
          <h1 className="text-3xl font-bold text-gray-900">Set Your Password</h1>
          <p className="text-gray-600 mt-2">Complete your account setup to access your Pro features</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle>Complete Your Account</CardTitle>
            <CardDescription>
              Set a password for your new Pro/Starter account
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {sessionId ? 'Payment successful! Your account has been created.' : 'Your account has been created!'} Set a password to complete the setup.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={sessionLoading ? "Loading..." : "Enter your email"}
                  required
                  disabled={loading || sessionLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading || sessionLoading}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:from-emerald-700 hover:to-emerald-800"
              >
                {loading ? 'Setting Password...' : sessionLoading ? 'Loading...' : 'Set Password & Continue'}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have a password?{' '}
                <Button
                  variant="link"
                  onClick={() => navigate('/auth/login')}
                  className="text-green-600 hover:text-green-500 font-medium p-0"
                >
                  Sign in here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetPasswordPage;
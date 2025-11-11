import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  DollarSign,
  Calendar,
  Settings,
  AlertCircle,
  CheckCircle,
  Target,
  BarChart3
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const CapTrackerPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [capConfig, setCapConfig] = useState(null);
  const [capProgress, setCapProgress] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);

  // Get backend URL
  const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;

  // Cap configuration form state
  const [capForm, setCapForm] = useState({
    annual_cap_amount: '',
    cap_percentage: '',
    cap_period_type: 'calendar_year', // calendar_year, rolling_12_months
    cap_period_start: new Date().getFullYear() + '-01-01',
    current_cap_paid: 0,
    reset_date: new Date().getFullYear() + '-12-31'
  });

  useEffect(() => {
    loadCapConfiguration();
    loadCapProgress();
  }, []);

  const loadCapConfiguration = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(`${backendUrl}/api/cap-tracker/config`, {
        withCredentials: true  // Use HttpOnly cookie authentication
      });

      if (response.data) {
        setCapConfig(response.data);
        setCapForm({
          annual_cap_amount: response.data.annual_cap_amount?.toString() || '',
          cap_percentage: response.data.cap_percentage?.toString() || '',
          cap_period_type: response.data.cap_period_type || 'calendar_year',
          cap_period_start: response.data.cap_period_start || new Date().getFullYear() + '-01-01',
          current_cap_paid: response.data.current_cap_paid || 0,
          reset_date: response.data.reset_date || new Date().getFullYear() + '-12-31'
        });
      } else {
        // No configuration exists, show setup form
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Failed to load cap configuration:', error);
      if (error.response?.status === 404) {
        // No configuration exists, show setup form
        setIsEditing(true);
      } else {
        setError('Failed to load cap configuration');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCapProgress = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/cap-tracker/progress`, {
        withCredentials: true
      });

      if (response.data) {
        setCapProgress(response.data);
      }
    } catch (error) {
      console.error('Failed to load cap progress:', error);
      // Don't show error if config doesn't exist yet
      if (error.response?.status !== 404) {
        console.error('Error loading cap progress:', error);
      }
    }
  };

  const handleSaveConfiguration = async (e) => {
    e.preventDefault();
    try {
      const configData = {
        annual_cap_amount: parseFloat(capForm.annual_cap_amount) || 0,
        cap_percentage: parseFloat(capForm.cap_percentage) || 0,
        cap_period_type: capForm.cap_period_type,
        cap_period_start: capForm.cap_period_start,
        current_cap_paid: parseFloat(capForm.current_cap_paid) || 0,
        reset_date: capForm.reset_date
      };

      const response = await axios.post(`${backendUrl}/api/cap-tracker/config`, configData, {
        withCredentials: true  // Use HttpOnly cookie authentication
      });

      setCapConfig(response.data);
      setIsEditing(false);
      setError(null);
      
      // Reload progress after saving config
      await loadCapProgress();
    } catch (error) {
      console.error('Failed to save cap configuration:', error);
      setError('Failed to save configuration');
    }
  };

  // Calculate cap progress from backend data or fallback to config
  const calculateProgress = () => {
    // If we have real-time progress data from backend, use that
    if (capProgress) {
      return {
        percentage: capProgress.percentage || 0,
        remaining: capProgress.remaining || 0,
        paid: capProgress.paid_so_far || 0,
        total: capProgress.total_cap || 0,
        isComplete: capProgress.is_complete || false,
        dealsContributing: capProgress.deals_contributing || 0
      };
    }
    
    // Fallback to config-based calculation (for backwards compatibility)
    if (!capConfig) return { percentage: 0, remaining: 0, paid: 0, total: 0, isComplete: false, dealsContributing: 0 };
    
    const totalCap = capConfig.annual_cap_amount || 0;
    const paidSoFar = capConfig.current_cap_paid || 0;
    const remaining = Math.max(0, totalCap - paidSoFar);
    const percentage = totalCap > 0 ? Math.min(100, (paidSoFar / totalCap) * 100) : 0;
    const isComplete = paidSoFar >= totalCap;

    return {
      percentage: Math.round(percentage * 100) / 100,
      remaining,
      paid: paidSoFar,
      total: totalCap,
      isComplete,
      dealsContributing: 0
    };
  };

  const progress = calculateProgress();

  // Format currency
  const formatCurrency = (amount, compact = false) => {
    if (compact && amount >= 1000) {
      // For mobile: $5K instead of $5,000
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(amount || 0);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Check if user has Pro access
  const hasProAccess = user?.plan === 'PRO';

  if (!hasProAccess) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-orange-900">Pro Feature Required</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    The Cap Tracker is a Pro-only feature. Upgrade your plan to track commission caps and monitor your progress.
                  </p>
                  <Button 
                    className="mt-3 bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => navigate('/pricing')}
                  >
                    Upgrade to Pro
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Commission Cap Tracker
            </h1>
            <p className="text-gray-600 mt-1">
              Track your annual commission cap progress and obligations
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Monitor how much you've paid toward your brokerage commission cap
            </p>
          </div>
          
          {capConfig && !isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="mt-4 sm:mt-0"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Configuration
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {isEditing ? (
              // Configuration Form
              <Card>
                <CardHeader>
                  <CardTitle>
                    {capConfig ? 'Edit Cap Configuration' : 'Set Up Commission Cap Tracking'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveConfiguration} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="annual_cap_amount">Annual Cap Amount *</Label>
                        <Input
                          id="annual_cap_amount"
                          type="number"
                          step="0.01"
                          value={capForm.annual_cap_amount}
                          onChange={(e) => setCapForm(prev => ({ ...prev, annual_cap_amount: e.target.value }))}
                          placeholder="18000.00"
                          className="mt-1"
                          required
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Total annual commission cap amount (e.g., $18,000)
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="cap_percentage">Cap % Per Deal *</Label>
                        <Input
                          id="cap_percentage"
                          type="number"
                          step="0.1"
                          value={capForm.cap_percentage}
                          onChange={(e) => setCapForm(prev => ({ ...prev, cap_percentage: e.target.value }))}
                          placeholder="5.0"
                          className="mt-1"
                          required
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Percentage taken from each deal until cap is met (e.g., 5%)
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="cap_period_type">Cap Period Type *</Label>
                        <select
                          id="cap_period_type"
                          value={capForm.cap_period_type}
                          onChange={(e) => setCapForm(prev => ({ ...prev, cap_period_type: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        >
                          <option value="calendar_year">Calendar Year (Jan 1 - Dec 31)</option>
                          <option value="rolling_12_months">Rolling 12 Months</option>
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="cap_period_start">Cap Period Start Date *</Label>
                        <Input
                          id="cap_period_start"
                          type="date"
                          value={capForm.cap_period_start}
                          onChange={(e) => setCapForm(prev => ({ ...prev, cap_period_start: e.target.value }))}
                          className="mt-1"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="current_cap_paid">Current Cap Paid (If Mid-Year)</Label>
                        <Input
                          id="current_cap_paid"
                          type="number"
                          step="0.01"
                          value={capForm.current_cap_paid}
                          onChange={(e) => setCapForm(prev => ({ ...prev, current_cap_paid: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Amount already paid this cap period
                        </p>
                      </div>
                      
                      <div className="md:col-span-2">
                        <Label htmlFor="reset_date">Cap Reset Date *</Label>
                        <Input
                          id="reset_date"
                          type="date"
                          value={capForm.reset_date}
                          onChange={(e) => setCapForm(prev => ({ ...prev, reset_date: e.target.value }))}
                          className="mt-1"
                          required
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          When the cap resets for the next period
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button type="submit" className="bg-primary hover:bg-primary-dark">
                        {capConfig ? 'Update Configuration' : 'Save Configuration'}
                      </Button>
                      {capConfig && (
                        <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : capConfig ? (
              // Cap Progress Display
              <>
                {/* Progress Overview */}
                <div className="grid grid-cols-3 gap-3 md:gap-6">
                  <Card>
                    <CardContent className="pt-4 md:pt-6">
                      <div className="flex flex-col items-center md:flex-row md:items-center md:justify-between">
                        <div className="text-center md:text-left">
                          <div className="text-xs md:text-sm text-gray-600">Progress</div>
                          <div className="text-lg md:text-2xl font-bold text-blue-600">
                            {progress.percentage}%
                          </div>
                          <div className="text-xs text-gray-500 mt-1 hidden md:block">
                            {progress.isComplete ? 'Cap Complete!' : 'In Progress'}
                          </div>
                        </div>
                        <Target className="w-6 h-6 md:w-8 md:h-8 text-blue-600 mt-2 md:mt-0" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4 md:pt-6">
                      <div className="flex flex-col items-center md:flex-row md:items-center md:justify-between">
                        <div className="text-center md:text-left">
                          <div className="text-xs md:text-sm text-gray-600">Paid</div>
                          <div className="text-base md:text-2xl font-bold text-green-600">
                            {formatCurrency(progress.paid, true)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 hidden md:block">
                            of {formatCurrency(progress.total)}
                          </div>
                        </div>
                        <CheckCircle className={`w-6 h-6 md:w-8 md:h-8 ${progress.isComplete ? 'text-green-600' : 'text-gray-400'} mt-2 md:mt-0`} />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4 md:pt-6">
                      <div className="flex flex-col items-center md:flex-row md:items-center md:justify-between">
                        <div className="text-center md:text-left">
                          <div className="text-xs md:text-sm text-gray-600">Left</div>
                          <div className={`text-base md:text-2xl font-bold ${progress.isComplete ? 'text-green-600' : 'text-orange-600'}`}>
                            {formatCurrency(progress.remaining, true)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 hidden md:block">
                            {progress.isComplete ? 'Complete' : 'To Pay'}
                          </div>
                        </div>
                        <DollarSign className={`w-6 h-6 md:w-8 md:h-8 ${progress.isComplete ? 'text-green-600' : 'text-orange-600'} mt-2 md:mt-0`} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress Bar */}
                <Card>
                  <CardHeader>
                    <CardTitle>Commission Cap Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Progress: {formatCurrency(progress.paid)} / {formatCurrency(progress.total)}</span>
                        <span>{progress.percentage}% Complete</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-6">
                        <div 
                          className={`h-6 rounded-full transition-all duration-300 ${
                            progress.isComplete ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                        ></div>
                      </div>
                      
                      {progress.dealsContributing > 0 && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{progress.dealsContributing}</span> deal{progress.dealsContributing !== 1 ? 's' : ''} contributing to cap from P&L Tracker
                        </div>
                      )}
                      
                      {progress.isComplete && (
                        <div className="flex items-center space-x-2 text-green-700 bg-green-50 p-3 rounded-lg">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">Congratulations! You've completed your commission cap for this period.</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Configuration Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Current Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600 block text-xs mb-1">Cap Amount:</span>
                        <span className="font-semibold">{formatCurrency(capConfig.annual_cap_amount)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 block text-xs mb-1">Cap % Per Deal:</span>
                        <span className="font-semibold">{capConfig.cap_percentage}%</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 block text-xs mb-1">Period Type:</span>
                        <span className="font-semibold capitalize">{capConfig.cap_period_type?.replace('_', ' ')}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 block text-xs mb-1">Period Start:</span>
                        <span className="font-semibold">{new Date(capConfig.cap_period_start).toLocaleDateString()}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-600 block text-xs mb-1">Reset Date:</span>
                        <span className="font-semibold">{new Date(capConfig.reset_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default CapTrackerPanel;
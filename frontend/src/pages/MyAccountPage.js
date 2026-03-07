import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import PlanPreviewRibbon from '../components/PlanPreviewRibbon';
import { usePlanPreview } from '../hooks/usePlanPreview';
import { 
  User, 
  Crown, 
  FileText, 
  Download, 
  Trash2, 
  CreditCard, 
  LogOut, 
  CheckCircle,
  ArrowLeft,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { navigateToHome } from '../utils/navigation';

const MyAccountPage = () => {
  const { user, logout, deleteAccount, refreshUser, createCheckoutSession, createCustomerPortal, exportUserData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const { effectivePlan, previewPlan, isPreviewMode, setPreview, clearPreview, isProduction } = usePlanPreview(user?.plan);

  useEffect(() => {
    // Check for checkout success/cancel
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      setMessage('Payment successful! Your plan has been upgraded.');
      refreshUser();
    } else if (checkoutStatus === 'cancelled') {
      setError('Payment was cancelled.');
    }
  }, [searchParams, refreshUser]);

  const getPlanInfo = (plan) => {
    switch (plan) {
      case 'FREE':
        return {
          name: 'Free',
          color: 'bg-neutral-medium/20 text-deep-forest',
          limit: 'Calculator only (no saving)',
          features: ['Single deal calculator', 'Generic PDF downloads', 'No saving or sharing']
        };
      case 'STARTER':
        return {
          name: 'Starter',
          color: 'bg-primary/20 text-primary',
          limit: `${user?.deals_count || 0}/10 deals saved`,
          features: ['Save up to 10 deals', 'Branded PDFs', 'Share links', 'Portfolio basics']
        };
      case 'PRO':
        return {
          name: 'Pro',
          color: 'bg-secondary/20 text-secondary',
          limit: 'Unlimited deals',
          features: ['Unlimited deals & portfolios', 'Multiple brand profiles', '5-year projections', 'URL prefill']
        };
      default:
        return getPlanInfo('FREE');
    }
  };

  const handleUpgrade = async (plan) => {
    setLoading(true);
    const result = await createCheckoutSession(plan);
    
    if (result.success) {
      window.location.href = result.url;
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleManageBilling = async () => {
    setLoading(true);
    const result = await createCustomerPortal();
    
    if (result.success) {
      window.location.href = result.url;
    } else {
      setError(result.error || 'Billing portal integration coming soon');
    }
    
    setLoading(false);
  };

  const handleExportData = async () => {
    setLoading(true);
    setError('');
    
    const result = await exportUserData();
    
    if (result.success) {
      // Convert data to CSV format
      const data = result.data;
      let csvContent = '';
      
      // Helper function to escape CSV values and prevent CSV injection
      const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        // Escape double quotes by doubling them
        let escaped = str.replace(/"/g, '""');
        // Prevent CSV injection by prefixing dangerous characters with a single quote
        if (/^[=+\-@\t\r]/.test(escaped)) {
          escaped = "'" + escaped;
        }
        return `"${escaped}"`;
      };
      
      // Add user info section
      csvContent += 'USER INFORMATION\n';
      csvContent += 'Email,Full Name\n';
      csvContent += `${escapeCSV(data.user?.email)},${escapeCSV(data.user?.full_name)}\n\n`;
      
      // Add deals section if present
      if (data.deals && data.deals.length > 0) {
        csvContent += 'DEALS\n';
        csvContent += 'Address,Sale Price,Commission %,Split %,Team/Brokerage %,Final Income,Lead Source,Contract Signed,Closing Date\n';
        data.deals.forEach(deal => {
          csvContent += `${escapeCSV(deal.house_address)},${deal.amount_sold_for || 0},${deal.commission_percent || 0},${deal.split_percent || 0},${deal.team_brokerage_split_percent || 0},${deal.final_income || 0},${escapeCSV(deal.lead_source)},${escapeCSV(deal.contract_signed)},${escapeCSV(deal.closing_date)}\n`;
        });
        csvContent += '\n';
      }
      
      // Add expenses section if present
      if (data.expenses && data.expenses.length > 0) {
        csvContent += 'EXPENSES\n';
        csvContent += 'Date,Category,Description,Amount\n';
        data.expenses.forEach(expense => {
          csvContent += `${escapeCSV(expense.date)},${escapeCSV(expense.category)},${escapeCSV(expense.description)},${expense.amount || 0}\n`;
        });
        csvContent += '\n';
      }
      
      // Add activity logs section if present
      if (data.activity_logs && data.activity_logs.length > 0) {
        csvContent += 'ACTIVITY LOGS\n';
        csvContent += 'Date,Activities,Hours,Reflection\n';
        data.activity_logs.forEach(log => {
          const activities = typeof log.activities === 'object' ? JSON.stringify(log.activities) : log.activities || '';
          const hours = typeof log.hours === 'object' ? JSON.stringify(log.hours) : log.hours || '';
          csvContent += `${escapeCSV(log.logged_at || log.date)},${escapeCSV(activities)},${escapeCSV(hours)},${escapeCSV(log.reflection)}\n`;
        });
        csvContent += '\n';
      }
      
      // Add reflection logs section if present
      if (data.reflection_logs && data.reflection_logs.length > 0) {
        csvContent += 'REFLECTION LOGS\n';
        csvContent += 'Date,Reflection,Mood\n';
        data.reflection_logs.forEach(log => {
          csvContent += `${escapeCSV(log.logged_at)},${escapeCSV(log.reflection)},${escapeCSV(log.mood)}\n`;
        });
        csvContent += '\n';
      }
      
      // Add cap configuration if present
      if (data.cap_configuration) {
        csvContent += 'COMMISSION CAP CONFIGURATION\n';
        csvContent += 'Annual Cap Amount,Cap Percentage,Period Start,Reset Date\n';
        csvContent += `${data.cap_configuration.annual_cap_amount || 0},${data.cap_configuration.cap_percentage || 0},${escapeCSV(data.cap_configuration.cap_period_start)},${escapeCSV(data.cap_configuration.reset_date)}\n\n`;
      }
      
      // Create and download CSV file
      const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ineednumbers-data-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      setMessage('Data exported successfully!');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion');
      return;
    }
    
    setLoading(true);
    const result = await deleteAccount(deleteConfirmation);
    
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handlePreviewChange = (value) => {
    if (value === 'reset') {
      clearPreview();
    } else {
      setPreview(value);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-light via-white to-neutral-medium flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-deep-forest mb-4 font-poppins">Please sign in</h1>
          <Button 
            onClick={() => navigate('/auth/login')}
            className="bg-primary hover:bg-secondary text-white"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const planInfo = getPlanInfo(effectivePlan);

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
                onClick={() => navigateToHome(navigate, user)}
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
            
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-deep-forest hover:text-primary border-deep-forest hover:border-primary"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-deep-forest mb-4 font-poppins">My Account</h1>
            <p className="text-xl text-neutral-dark">Manage your <span className="font-bold text-primary font-poppins">I Need Numbers</span> subscription and data</p>
          </div>

          {/* Messages */}
          {message && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{message}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Account Information */}
            <Card className="shadow-lg border border-neutral-medium/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-deep-forest font-poppins">
                  <User className="w-5 h-5" />
                  <span>Account Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-neutral-dark">Email</Label>
                  <p className="text-lg font-medium text-deep-forest">{user.email}</p>
                </div>
                
                {user.full_name && (
                  <div>
                    <Label className="text-sm font-medium text-neutral-dark">Full Name</Label>
                    <p className="text-lg font-medium text-deep-forest">{user.full_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plan Information */}
            <Card className="shadow-lg border border-neutral-medium/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-deep-forest font-poppins">
                  <Crown className="w-5 h-5" />
                  <span>Current Plan</span>
                  {isPreviewMode && <Badge className="bg-amber-500 text-white">Preview</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={planInfo.color}>
                    {planInfo.name}
                  </Badge>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-neutral-dark">Usage</Label>
                  <p className="text-lg font-medium text-deep-forest">{planInfo.limit}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-neutral-dark mb-2 block">Features</Label>
                  <ul className="space-y-1">
                    {planInfo.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-neutral-dark">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Upgrade Buttons */}
                {effectivePlan === 'FREE' && (
                  <div className="space-y-2 pt-4">
                    <Button
                      onClick={() => handleUpgrade('starter')}
                      disabled={loading}
                      className="w-full bg-primary hover:bg-secondary text-white font-poppins"
                    >
                      Upgrade to Starter ($19/mo)
                    </Button>
                    <Button
                      onClick={() => handleUpgrade('pro')}
                      disabled={loading}
                      className="w-full bg-secondary hover:bg-secondary/90 text-white font-poppins"
                    >
                      Upgrade to Pro ($49/mo)
                    </Button>
                  </div>
                )}

                {effectivePlan === 'STARTER' && (
                  <Button
                    onClick={() => handleUpgrade('pro')}
                    disabled={loading}
                    className="w-full bg-secondary hover:bg-secondary/90 text-white mt-4 font-poppins"
                  >
                    Upgrade to Pro ($49/mo)
                  </Button>
                )}

                {(effectivePlan === 'STARTER' || effectivePlan === 'PRO') && (
                  <Button
                    variant="outline"
                    disabled={loading}
                    className="w-full mt-2 border-primary text-primary hover:bg-primary hover:text-white"
                    onClick={handleManageBilling}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Plan Preview Control (Non-Production Only) */}
          {!isProduction && (
            <Card className="mt-8 shadow-lg border border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-amber-900 font-poppins">
                  <Eye className="w-5 h-5" />
                  <span>Plan Preview (Testing Only)</span>
                </CardTitle>
                <CardDescription className="text-amber-800">
                  Switch between plans to test features without billing. Only visible in development.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Label htmlFor="preview-select" className="text-sm font-medium text-amber-900">
                    Preview as:
                  </Label>
                  <Select 
                    value={previewPlan || user?.plan || 'FREE'} 
                    onValueChange={handlePreviewChange}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">Free</SelectItem>
                      <SelectItem value="STARTER">Starter</SelectItem>
                      <SelectItem value="PRO">Pro</SelectItem>
                      <SelectItem value="reset">Reset</SelectItem>
                    </SelectContent>
                  </Select>
                  {isPreviewMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearPreview}
                      className="text-amber-900 border-amber-300 hover:bg-amber-100"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={loading}
              className="border-primary text-primary hover:bg-primary hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export My Data
            </Button>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-red-900">Delete Account</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete your account and all associated data.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="deleteConfirm">
                      Type "DELETE" to confirm account deletion
                    </Label>
                    <Input
                      id="deleteConfirm"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="Type DELETE here"
                      className="mt-2"
                    />
                  </div>
                  
                  <div className="flex space-x-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteDialog(false);
                        setDeleteConfirmation('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={loading || deleteConfirmation !== 'DELETE'}
                    >
                      {loading ? 'Deleting...' : 'Delete Account'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAccountPage;
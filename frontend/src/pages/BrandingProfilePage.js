import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  User, 
  Building, 
  Palette, 
  Eye,
  Download,
  Loader2,
  Lock,
  Crown
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import Footer from '../components/Footer';
import API_BASE_URL from '../config/api';

const BrandingProfilePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [saveMessage, setSaveMessage] = useState('');
  const [brandProfile, setBrandProfile] = useState(null);
  const [formData, setFormData] = useState({
    agent: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      team: '',
      licenseNumber: '',
      licenseState: ''
    },
    brokerage: {
      name: '',
      licenseNumber: '',
      address: ''
    },
    brand: {
      primaryHex: '#16a34a',
      secondaryHex: '#0ea5e9',
      fontKey: 'default'
    },
    footer: {
      compliance: '',
      cta: 'Contact {{agent.name}} — {{agent.email}}'
    },
    planRules: {
      starterHeaderBar: true,
      proShowAgentLogo: true,
      proShowBrokerLogo: true,
      proShowCta: true
    }
  });
  const [uploadingAsset, setUploadingAsset] = useState(null);
  const [storageStatus, setStorageStatus] = useState({ ok: false, loading: true });
  
  // Ref for debounce timer
  const saveTimeoutRef = useRef(null);
  // Ref for current formData (for debounced saves)
  const formDataRef = useRef(formData);
  // Ref for headshot file input (to trigger from Replace button)
  const headshotInputRef = useRef(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/login');
      return;
    }
  }, [user, authLoading, navigate]);

  // Load brand profile on mount
  useEffect(() => {
    if (user) {
      loadBrandProfile();
      checkStorageHealth();
    }
  }, [user]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Keep formDataRef in sync with formData
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const checkStorageHealth = async () => {
    try {
      if (!user) return;  // Check authentication using AuthContext

      const response = await fetch(`${API_BASE_URL}/api/storage/health`, {
        credentials: 'include',  // Use HttpOnly cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setStorageStatus({ ok: result.ok, loading: false, ...result });
      } else {
        setStorageStatus({ ok: false, loading: false, error: 'Health check failed' });
      }
    } catch (error) {
      console.error('Storage health check error:', error);
      setStorageStatus({ ok: false, loading: false, error: 'Network error' });
    }
  };

  const loadBrandProfile = async () => {
    try {
      setLoading(true);
      
      // Check authentication using AuthContext (not manual token checking)
      if (!user) {
        console.error('User not authenticated');
        console.error('Please log in again to access your branding profile.');
        navigate('/auth/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/brand/profile`, {
        credentials: 'include',  // Use HttpOnly cookies instead of Bearer token
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.error('Authentication token expired or invalid');
        console.error('Your session has expired. Please log in again.');

        navigate('/auth/login');
        return;
      }

      if (response.ok) {
        const profile = await response.json();
        setBrandProfile(profile);
        setFormData({
          agent: profile.agent || formData.agent,
          brokerage: profile.brokerage || formData.brokerage,
          brand: profile.brand || formData.brand,
          footer: profile.footer || formData.footer,
          planRules: profile.planRules || formData.planRules
        });
      } else {
        console.error('Failed to load brand profile:', response.status, response.statusText);
        console.error('Failed to load your branding profile. Please try again.');
      }
    } catch (error) {
      console.error('Error loading brand profile:', error);
      console.error('Network error loading branding profile. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));

    // Clear any pending save before setting a new one
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveBrandProfile();
    }, 1000);
  };

  const saveBrandProfile = async () => {
    if (saving) return;
    
    try {
      setSaving(true);
      // Check authentication using AuthContext
      if (!user) {
        console.error('User not authenticated');
        console.error('Please log in again to save your profile.');
        navigate('/auth/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/brand/profile`, {
        method: 'POST',
        credentials: 'include',  // Use HttpOnly cookies
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formDataRef.current)
      });

      if (response.status === 401) {
        console.error('Authentication token expired or invalid');
        console.error('Your session has expired. Please log in again.');

        navigate('/auth/login');
        return;
      }

      if (response.ok) {
        const updatedProfile = await response.json();
        setBrandProfile(updatedProfile);
        // Sync formData with server response so completion score updates
        setFormData({
          agent: updatedProfile.agent || formDataRef.current.agent,
          brokerage: updatedProfile.brokerage || formDataRef.current.brokerage,
          brand: updatedProfile.brand || formDataRef.current.brand,
          footer: updatedProfile.footer || formDataRef.current.footer,
          planRules: updatedProfile.planRules || formDataRef.current.planRules
        });
        setSaveStatus('success');
        setSaveMessage('Profile saved successfully');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to save brand profile:', errorData?.detail || response.statusText || response.status);
        setSaveStatus('error');
        setSaveMessage(errorData?.detail || 'Failed to save profile');
        setTimeout(() => setSaveStatus(null), 5000);
      }
    } catch (error) {
      console.error('Error saving brand profile:', error.response?.data?.detail || error.message || error);
      setSaveStatus('error');
      setSaveMessage('Network error — please try again');
      setTimeout(() => setSaveStatus(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleAssetUpload = async (assetType, file) => {
    try {
      setUploadingAsset(assetType);
      
      // Check authentication using AuthContext
      if (!user) {
        console.error('User not authenticated');
        console.error('Please log in again to upload files.');
        navigate('/auth/login');
        return;
      }
      
      const formData = new FormData();
      formData.append('asset', assetType);
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/brand/upload`, {
        method: 'POST',
        credentials: 'include',  // Use HttpOnly cookies
        // Don't set headers for FormData - browser sets Content-Type automatically with boundary
        body: formData
      });

      if (response.status === 401) {
        console.error('Authentication token expired or invalid');
        console.error('Your session has expired. Please log in again.');

        navigate('/auth/login');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Upload successful:', result);
        
        // Reload profile to get updated assets and check storage again
        await loadBrandProfile();
        await checkStorageHealth();
        
        console.error('File uploaded successfully!');
      } else {
        const error = await response.json();
        console.error('Upload failed:', error);
        
        // Show user-friendly error messages
        if (error.detail?.includes('File too large')) {
          console.error('File is too large. Maximum size is 5MB.');
        } else if (error.detail?.includes('Unsupported file type')) {
          console.error('Unsupported file type. Please use PNG, JPEG, or SVG files.');
        } else {
          console.error(error.detail || 'Upload failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Network error during upload. Please check your connection.');
    } finally {
      setUploadingAsset(null);
    }
  };

  const handleAssetDelete = async (assetType) => {
    try {
      // Check authentication using AuthContext
      if (!user) {
        console.error('User not authenticated');
        console.error('Please log in again to delete assets.');
        navigate('/auth/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/brand/asset?type=${assetType}`, {
        method: 'DELETE',
        credentials: 'include',  // Use HttpOnly cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.error('Authentication token expired or invalid');
        console.error('Your session has expired. Please log in again.');

        navigate('/auth/login');
        return;
      }

      if (response.ok) {
        await loadBrandProfile();
        console.error('Asset deleted successfully!');
      } else {
        const error = await response.json();
        console.error('Delete failed:', error);
        console.error(error.detail || 'Failed to delete asset.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      console.error('Network error during deletion. Please check your connection.');
    }
  };

  const generateTestPDF = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/brand/test-pdf`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Get the PDF blob
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `branding_test_${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        
        console.log('Test PDF generated successfully');
      } else {
        const errorData = await response.json();
        console.error('PDF generation failed:', errorData);
        console.error(`Failed to generate test PDF: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      console.error('Network error during PDF generation. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading your branding profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  const isStarter = user.plan === 'STARTER';
  const isPro = user.plan === 'PRO';
  const isPaid = isStarter || isPro;
  const completion = brandProfile?.completion || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Keyframe animation for toast */}
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      
      {/* Save Status Toast */}
      {saveStatus && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideIn 0.3s ease-out',
          backgroundColor: saveStatus === 'success' ? '#f0fdf4' : '#fef2f2',
          color: saveStatus === 'success' ? '#16a34a' : '#dc2626',
          border: saveStatus === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca'
        }}>
          {saveStatus === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {saveMessage}
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="mr-4"
              >
                ← Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Branding & Profile</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Completion: <span className="font-medium">{completion.toFixed(0)}%</span>
              </div>
              {/* Storage Health Status */}
              <div className="flex items-center">
                {storageStatus.loading ? (
                  <div className="flex items-center text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    Checking storage...
                  </div>
                ) : storageStatus.ok ? (
                  <div className="flex items-center text-sm text-green-600">
                    <Check className="w-4 h-4 mr-1" />
                    Storage: OK
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Storage: Error
                  </div>
                )}
              </div>
              {saving && (
                <div className="flex items-center text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Saving...
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Brand Header & Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Brand Header & Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Live Preview */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Live PDF Header Preview</h3>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div 
                      className="p-4 rounded text-white text-sm"
                      style={{ background: formData.brand.primaryHex }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold">Property Analysis</div>
                        </div>
                        {isPaid && (
                          <div className="text-right text-xs">
                            <div>Prepared by</div>
                            <div className="font-semibold">
                              {formData.agent.firstName} {formData.agent.lastName}
                            </div>
                            <div>{formData.brokerage.name}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Completion Meter</h3>
                    <span className="text-2xl font-bold text-primary">{completion.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all duration-300"
                      style={{ width: `${completion}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Last updated: {brandProfile?.updatedAt ? new Date(brandProfile.updatedAt).toLocaleDateString() : 'Never'}
                  </p>
                  <Button 
                    onClick={generateTestPDF}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate Test PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Agent Details
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Starter + Pro
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.agent.firstName}
                    onChange={(e) => handleInputChange('agent', 'firstName', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Your first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.agent.lastName}
                    onChange={(e) => handleInputChange('agent', 'lastName', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Your last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.agent.email}
                    onChange={(e) => handleInputChange('agent', 'email', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.agent.phone}
                    onChange={(e) => handleInputChange('agent', 'phone', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={formData.agent.team}
                    onChange={(e) => handleInputChange('agent', 'team', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="The Smith Team"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={formData.agent.licenseNumber}
                    onChange={(e) => handleInputChange('agent', 'licenseNumber', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="License #"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License State
                  </label>
                  <input
                    type="text"
                    value={formData.agent.licenseState}
                    onChange={(e) => handleInputChange('agent', 'licenseState', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="FL"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Brokerage Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Brokerage Details
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Starter + Pro
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brokerage Name
                  </label>
                  <input
                    type="text"
                    value={formData.brokerage.name}
                    onChange={(e) => handleInputChange('brokerage', 'name', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Your Brokerage Name"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brokerage License # (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.brokerage.licenseNumber}
                      onChange={(e) => handleInputChange('brokerage', 'licenseNumber', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="Brokerage License #"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brokerage Address (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.brokerage.address}
                      onChange={(e) => handleInputChange('brokerage', 'address', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Compliance Footer (optional)
                  </label>
                  <textarea
                    value={formData.footer.compliance}
                    onChange={(e) => handleInputChange('footer', 'compliance', e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Required compliance text for your brokerage..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Brand Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="w-5 h-5 mr-2" />
                Brand Colors & Typography
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.brand.primaryHex}
                      onChange={(e) => handleInputChange('brand', 'primaryHex', e.target.value)}
                      className="w-12 h-12 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.brand.primaryHex}
                      onChange={(e) => handleInputChange('brand', 'primaryHex', e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="#16a34a"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary/Accent Color (optional)
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.brand.secondaryHex}
                      onChange={(e) => handleInputChange('brand', 'secondaryHex', e.target.value)}
                      className="w-12 h-12 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.brand.secondaryHex}
                      onChange={(e) => handleInputChange('brand', 'secondaryHex', e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="#0ea5e9"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={true}
                    readOnly
                    className="mr-2"
                  />
                  Use brand color on header bar/buttons
                </label>
              </div>
            </CardContent>
          </Card>

          {/* File Upload Sections - These will show upgrade prompts for FREE users */}
          {!isPaid && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Lock className="w-6 h-6 text-amber-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-amber-900">Upgrade for Asset Uploads</h3>
                      <p className="text-sm text-amber-700">Upload headshots and logos with a paid plan</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/pricing')}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Asset Upload Sections - Only shown for paid users */}
          {isPaid && (
            <>
              {/* Headshot Upload */}
              <Card>
                <CardHeader>
                  <CardTitle>Agent Headshot</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-4">
                        Square crop 1:1, recommended 600×600, max 5 MB, JPG/PNG
                      </p>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        {/* Hidden file input - always in DOM */}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files[0]) {
                              handleAssetUpload('headshot', e.target.files[0]);
                            }
                          }}
                          className="hidden"
                          id="headshot-upload"
                          ref={headshotInputRef}
                        />
                        {brandProfile?.assets?.headshot?.url ? (
                          <div>
                            <img 
                              src={brandProfile.assets.headshot.url}
                              alt="Headshot"
                              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                            />
                            <div className="space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => headshotInputRef.current?.click()}
                              >
                                Replace
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleAssetDelete('headshot')}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-sm text-gray-500">
                              Drag and drop or click to upload
                            </p>
                            <label
                              htmlFor="headshot-upload"
                              className="mt-2 inline-block cursor-pointer text-primary hover:text-primary-dark"
                            >
                              Choose File
                            </label>
                          </div>
                        )}
                        {uploadingAsset === 'headshot' && (
                          <div className="mt-4">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                            <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pro-only Logo Uploads */}
              {isPro && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        Agent/Team Logo
                        <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          Pro Only
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Horizontal crop 4:1, recommended 800×200, transparent PNG or SVG, max 3 MB
                      </p>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        {brandProfile?.assets?.agentLogo?.url ? (
                          <div>
                            <img 
                              src={brandProfile.assets.agentLogo.url}
                              alt="Agent Logo"
                              className="h-12 mx-auto mb-4 object-contain"
                            />
                            <div className="space-x-2">
                              <Button variant="outline" size="sm">Replace</Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleAssetDelete('agentLogo')}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files[0]) {
                                  handleAssetUpload('agentLogo', e.target.files[0]);
                                }
                              }}
                              className="hidden"
                              id="agent-logo-upload"
                            />
                            <label
                              htmlFor="agent-logo-upload"
                              className="cursor-pointer text-primary hover:text-primary-dark"
                            >
                              Upload Agent/Team Logo
                            </label>
                          </div>
                        )}
                        {uploadingAsset === 'agentLogo' && (
                          <div className="mt-4">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        Brokerage Logo
                        <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          Pro Only
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Horizontal crop 4:1, recommended 800×200, transparent PNG or SVG, max 3 MB
                      </p>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        {brandProfile?.assets?.brokerLogo?.url ? (
                          <div>
                            <img 
                              src={brandProfile.assets.brokerLogo.url}
                              alt="Brokerage Logo"
                              className="h-12 mx-auto mb-4 object-contain"
                            />
                            <div className="space-x-2">
                              <Button variant="outline" size="sm">Replace</Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleAssetDelete('brokerLogo')}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files[0]) {
                                  handleAssetUpload('brokerLogo', e.target.files[0]);
                                }
                              }}
                              className="hidden"
                              id="broker-logo-upload"
                            />
                            <label
                              htmlFor="broker-logo-upload"
                              className="cursor-pointer text-primary hover:text-primary-dark"
                            >
                              Upload Brokerage Logo
                            </label>
                          </div>
                        )}
                        {uploadingAsset === 'brokerLogo' && (
                          <div className="mt-4">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}

          {/* Footer Actions */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-4">
                  <Button 
                    onClick={saveBrandProfile}
                    disabled={saving}
                    className="bg-primary hover:bg-primary-dark"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Save Branding
                  </Button>
                  <Button variant="outline">
                    Reset to Defaults
                  </Button>
                </div>
                <Button 
                  onClick={generateTestPDF}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generate Test PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BrandingProfilePage;
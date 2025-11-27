import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, User, Settings as SettingsIcon, Upload, Save } from 'lucide-react';
import { toast } from 'sonner';
import { safeLocalStorage } from '../utils/safeStorage';
import { useIsMobile } from '../hooks/useMediaQuery';

const Settings = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Agent profile state
  const [agentProfile, setAgentProfile] = useState({
    agent_full_name: '',
    agent_title_or_team: '',
    agent_brokerage: '',
    agent_license_number: '',
    agent_phone: '',
    agent_email: '',
    agent_website: '',
    agent_brand_color: '#5B56F1',
    agent_logo_url: '',
    agent_headshot_url: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load agent profile on component mount
  useEffect(() => {
    loadAgentProfile();
  }, []);

  const loadAgentProfile = async () => {
    try {
      // TODO: Replace with actual API call when authentication is implemented
      // For now, load from localStorage as demo
      const savedProfile = safeLocalStorage.getItem('dealpack_agent_profile');
      if (savedProfile) {
        setAgentProfile(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.error('Error loading agent profile:', error);
      toast.error('Error loading profile data');
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setAgentProfile(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  // Validate email format
  const isValidEmail = (email) => {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate phone format
  const isValidPhone = (phone) => {
    if (!phone) return true; // Optional field
    const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
    return phoneRegex.test(phone);
  };

  // Validate website format
  const formatWebsite = (website) => {
    if (!website) return '';
    if (!website.startsWith('http://') && !website.startsWith('https://')) {
      return `https://${website}`;
    }
    return website;
  };

  // Validate hex color
  const isValidHexColor = (color) => {
    if (!color) return true;
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  };

  // Save agent profile
  const saveAgentProfile = async () => {
    setIsSaving(true);
    
    try {
      // Validation
      if (!agentProfile.agent_full_name.trim()) {
        toast.error('Full Name is required for branded PDFs');
        setIsSaving(false);
        return;
      }

      if (agentProfile.agent_email && !isValidEmail(agentProfile.agent_email)) {
        toast.error('Please enter a valid email address');
        setIsSaving(false);
        return;
      }

      if (agentProfile.agent_phone && !isValidPhone(agentProfile.agent_phone)) {
        toast.error('Please enter a valid phone number');
        setIsSaving(false);
        return;
      }

      if (agentProfile.agent_brand_color && !isValidHexColor(agentProfile.agent_brand_color)) {
        toast.error('Please enter a valid hex color (e.g., #5B56F1)');
        setIsSaving(false);
        return;
      }

      // Format website URL
      const formattedProfile = {
        ...agentProfile,
        agent_website: formatWebsite(agentProfile.agent_website)
      };

      // TODO: Replace with actual API call when authentication is implemented
      // For now, save to localStorage as demo
      safeLocalStorage.setItem('dealpack_agent_profile', JSON.stringify(formattedProfile));
      
      setAgentProfile(formattedProfile);
      setHasUnsavedChanges(false);
      toast.success('Contact information saved successfully!');
      
    } catch (error) {
      console.error('Error saving agent profile:', error);
      toast.error('Error saving contact information');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle file upload (placeholder)
  const handleFileUpload = (field, file) => {
    // TODO: Implement actual file upload when storage is set up
    toast.info('File upload will be available in the full version');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_reipro/artifacts/0kmyam6x_Logo-removebg-preview.png" 
                  alt="DealPack Real Estate" 
                  className="h-6 w-auto"
                />
                <h1 className="text-xl font-bold">Settings</h1>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              Profile Management
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="branding" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="branding">Branding & Contact</TabsTrigger>
              <TabsTrigger value="business">Business Setup</TabsTrigger>
              <TabsTrigger value="preferences" disabled>Preferences</TabsTrigger>
            </TabsList>
            
            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Branding & Contact Information</span>
                  </CardTitle>

                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          placeholder="John Smith"
                          value={agentProfile.agent_full_name}
                          onChange={(e) => handleInputChange('agent_full_name', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="titleTeam">Title/Team (optional)</Label>
                        <Input
                          id="titleTeam"
                          placeholder="Senior Agent, Smith Team"
                          value={agentProfile.agent_title_or_team}
                          onChange={(e) => handleInputChange('agent_title_or_team', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="brokerage">Brokerage (optional)</Label>
                        <Input
                          id="brokerage"
                          placeholder="eXp Realty"
                          value={agentProfile.agent_brokerage}
                          onChange={(e) => handleInputChange('agent_brokerage', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="license">License # (optional)</Label>
                        <Input
                          id="license"
                          placeholder="SL1234567"
                          value={agentProfile.agent_license_number}
                          onChange={(e) => handleInputChange('agent_license_number', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone (optional)</Label>
                        <Input
                          id="phone"
                          placeholder="(555) 123-4567"
                          value={agentProfile.agent_phone}
                          onChange={(e) => handleInputChange('agent_phone', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email (optional)</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={agentProfile.agent_email}
                          onChange={(e) => handleInputChange('agent_email', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="website">Website (optional)</Label>
                      <Input
                        id="website"
                        placeholder="www.johnsmith.com"
                        value={agentProfile.agent_website}
                        onChange={(e) => handleInputChange('agent_website', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Branding - Hide on mobile */}
                  {!isMobile && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Branding</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="brandColor">Brand Color (optional)</Label>
                        <div className="flex space-x-2 mt-1">
                          <Input
                            id="brandColor"
                            placeholder="#5B56F1"
                            value={agentProfile.agent_brand_color}
                            onChange={(e) => handleInputChange('agent_brand_color', e.target.value)}
                            className="flex-1"
                          />
                          <div 
                            className="w-12 h-10 border rounded cursor-pointer"
                            style={{ backgroundColor: agentProfile.agent_brand_color }}
                            title="Brand color preview"
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="logo">Logo (optional)</Label>
                        <div className="mt-1">
                          <Button
                            variant="outline"
                            onClick={() => document.getElementById('logo-upload').click()}
                            className="w-full justify-start"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Logo
                          </Button>
                          <input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload('agent_logo_url', e.target.files[0])}
                          />
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="headshot">Headshot (optional)</Label>
                        <div className="mt-1">
                          <Button
                            variant="outline"
                            onClick={() => document.getElementById('headshot-upload').click()}
                            className="w-full justify-start"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Headshot
                          </Button>
                          <input
                            id="headshot-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload('agent_headshot_url', e.target.files[0])}
                          />
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end pt-6">
                    <Button
                      onClick={saveAgentProfile}
                      disabled={isSaving || !hasUnsavedChanges}
                      className="bg-gradient-to-r from-primary to-secondary hover:from-emerald-700 hover:to-emerald-800"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Contact Info'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Preview Card */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-900">PDF Preview</CardTitle>
                  <CardDescription className="text-blue-700">
                    This information will appear on your Starter/Pro PDFs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="space-y-2">
                      <h4 className="font-bold text-gray-900">
                        {agentProfile.agent_full_name || 'Your Name'}
                      </h4>
                      {agentProfile.agent_title_or_team && (
                        <p className="text-gray-600">{agentProfile.agent_title_or_team}</p>
                      )}
                      {agentProfile.agent_brokerage && (
                        <p className="text-gray-600">{agentProfile.agent_brokerage}</p>
                      )}
                      <div className="flex flex-col space-y-1 text-sm text-gray-600">
                        {agentProfile.agent_phone && <span>{agentProfile.agent_phone}</span>}
                        {agentProfile.agent_email && <span>{agentProfile.agent_email}</span>}
                        {agentProfile.agent_website && <span>{agentProfile.agent_website}</span>}
                        {agentProfile.agent_license_number && (
                          <span className="text-xs">License: {agentProfile.agent_license_number}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Settings;
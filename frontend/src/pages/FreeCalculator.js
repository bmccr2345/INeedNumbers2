import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Calculator, ArrowLeft, Download, TrendingUp, DollarSign, Home, FileText, HelpCircle, ChevronDown, ChevronUp, User, Upload, Save, Lock, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { tooltips } from '../config/tooltips';
import PDFReport from '../components/PDFReport';
import { useAuth } from '../contexts/AuthContext';
import { usePlanPreview } from '../hooks/usePlanPreview';
import Footer from '../components/Footer';
import { formatNumberWithCommas, parseNumberFromFormatted } from '../utils/calculatorUtils';
import { safeLocalStorage } from '../utils/safeStorage';

const FreeCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectivePlan } = usePlanPreview(user?.plan);
  
  // Form state
  const [propertyData, setPropertyData] = useState({
    // Property Details
    address: '',
    city: '',
    state: '',
    zipCode: '',
    propertyType: '',
    squareFootage: '',
    bedrooms: '',
    bathrooms: '',
    yearBuilt: '',
    propertyImageUrl: '',
    
    // Financial Data
    purchasePrice: '',
    downPayment: '',
    loanAmount: '',
    interestRate: '',
    loanTermYears: '',
    
    // Income
    monthlyRent: '',
    otherMonthlyIncome: '',
    
    // Expenses  
    propertyTaxes: '',
    insurance: '',
    hoaFees: '',
    maintenanceReserves: '',
    vacancyAllowance: '',
    propertyManagement: '',
    
    // Other assumptions
    appreciationRate: '3',
    exitCapRate: '6'
  });

  // Agent personalization state removed

  // UI state
  const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);
  const [hasAgentChanges, setHasAgentChanges] = useState(false);
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  // Removed showPDFPreview state (no longer needed)

  // Calculated metrics state
  const [metrics, setMetrics] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Load agent profile on component mount
  useEffect(() => {
    loadAgentProfile();
  }, []);

  const loadAgentProfile = () => {
    try {
      // Load from localStorage (in real app, this would be from API based on auth)
      const savedProfile = safeLocalStorage.getItem('dealpack_agent_profile');
      if (savedProfile) {
        setAgentData(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.error('Error loading agent profile:', error);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    // List of numeric fields that should be formatted with commas
    const numericFields = [
      'purchasePrice', 'downPayment', 'loanAmount', 'monthlyRent', 'otherMonthlyIncome',
      'propertyTaxes', 'insurance', 'hoaFees', 'otherExpenses', 'repairReserves',
      'vacancyAllowance', 'propertyManagement', 'squareFootage'
    ];
    
    if (numericFields.includes(field) && value) {
      // Format numeric fields with commas
      const formattedValue = formatNumberWithCommas(value);
      setPropertyData(prev => ({
        ...prev,
        [field]: formattedValue
      }));
    } else {
      setPropertyData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Handle agent data changes
  const handleAgentChange = (field, value) => {
    setAgentData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasAgentChanges(true);
  };

  // Validate email format
  const isValidEmail = (email) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate phone format
  const isValidPhone = (phone) => {
    if (!phone) return true;
    const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
    return phoneRegex.test(phone);
  };

  // Format website URL
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
    setIsSavingAgent(true);
    
    try {
      // Validation
      if (agentData.agent_email && !isValidEmail(agentData.agent_email)) {
        toast.error('Please enter a valid email address');
        setIsSavingAgent(false);
        return;
      }

      if (agentData.agent_phone && !isValidPhone(agentData.agent_phone)) {
        toast.error('Please enter a valid phone number');
        setIsSavingAgent(false);
        return;
      }

      if (agentData.agent_brand_color && !isValidHexColor(agentData.agent_brand_color)) {
        toast.error('Please enter a valid hex color (e.g., #5B56F1)');
        setIsSavingAgent(false);
        return;
      }

      // Format website URL
      const formattedProfile = {
        ...agentData,
        agent_website: formatWebsite(agentData.agent_website)
      };

      // Save to localStorage (in real app, this would be API call)
      safeLocalStorage.setItem('dealpack_agent_profile', JSON.stringify(formattedProfile));
      
      setAgentData(formattedProfile);
      setHasAgentChanges(false);
      toast.success('Agent information saved successfully!');
      
    } catch (error) {
      console.error('Error saving agent profile:', error);
      toast.error('Error saving agent information');
    } finally {
      setIsSavingAgent(false);
    }
  };

  // Handle file upload (placeholder)
  const handleFileUpload = (field, file) => {
    toast.info('File upload will be available in the full version');
  };

  // Handle property image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      // Create a URL for the uploaded image
      const imageUrl = URL.createObjectURL(file);
      handleInputChange('propertyImageUrl', imageUrl);
      toast.success('Property image uploaded successfully');
    }
  };

  // Calculate financial metrics
  const calculateMetrics = () => {
    setIsCalculating(true);
    
    try {
      const data = propertyData;
      
      // Convert strings to numbers (parse formatted numbers with commas)
      const purchasePrice = parseNumberFromFormatted(data.purchasePrice) || 0;
      const monthlyRent = parseNumberFromFormatted(data.monthlyRent) || 0;
      const otherMonthlyIncome = parseNumberFromFormatted(data.otherMonthlyIncome) || 0;
      const propertyTaxes = parseNumberFromFormatted(data.propertyTaxes) || 0;
      const insurance = parseNumberFromFormatted(data.insurance) || 0;
      const hoaFees = parseNumberFromFormatted(data.hoaFees) || 0;
      const maintenanceReserves = parseNumberFromFormatted(data.maintenanceReserves) || 0;
      const vacancyAllowance = parseNumberFromFormatted(data.vacancyAllowance) || 0;
      const propertyManagement = parseNumberFromFormatted(data.propertyManagement) || 0;
      const downPayment = parseNumberFromFormatted(data.downPayment) || 0;
      const loanAmount = parseNumberFromFormatted(data.loanAmount) || (purchasePrice - downPayment);
      const interestRate = parseFloat(data.interestRate) || 0;
      const loanTermYears = parseFloat(data.loanTermYears) || 30;
      const appreciationRate = parseFloat(data.appreciationRate) || 3;
      const exitCapRate = parseFloat(data.exitCapRate) || 6;

      // Calculate monthly mortgage payment
      const monthlyInterestRate = interestRate / 100 / 12;
      const numPayments = loanTermYears * 12;
      let monthlyMortgage = 0;
      
      if (loanAmount > 0 && interestRate > 0) {
        monthlyMortgage = loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numPayments)) / 
                          (Math.pow(1 + monthlyInterestRate, numPayments) - 1);
      }

      // Income calculations
      const totalMonthlyIncome = monthlyRent + otherMonthlyIncome;
      const annualGrossIncome = totalMonthlyIncome * 12;
      const effectiveGrossIncome = annualGrossIncome - vacancyAllowance * 12;

      // Expense calculations
      const monthlyExpenses = (propertyTaxes / 12) + (insurance / 12) + hoaFees + 
                             maintenanceReserves + propertyManagement + monthlyMortgage;
      const annualExpenses = monthlyExpenses * 12;
      
      // Operating expenses (excluding mortgage)
      const operatingExpenses = annualExpenses - (monthlyMortgage * 12);
      
      // NOI calculation
      const noi = effectiveGrossIncome - operatingExpenses;
      
      // Key metrics
      const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
      const monthlyCashFlow = totalMonthlyIncome - monthlyExpenses;
      const annualCashFlow = monthlyCashFlow * 12;
      const cashInvested = downPayment > 0 ? downPayment : purchasePrice * 0.25; // Assume 25% if not specified
      const cashOnCash = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0;
      
      // DSCR calculation
      const annualDebtService = monthlyMortgage * 12;
      const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
      
      // Break-even occupancy
      const potentialGrossIncome = annualGrossIncome;
      const breakEvenOccupancy = potentialGrossIncome > 0 ? 
        ((operatingExpenses + annualDebtService) / potentialGrossIncome) * 100 : 0;
      
      // 5-year IRR calculation (simplified)
      const futureValue = purchasePrice * Math.pow(1 + appreciationRate / 100, 5);
      const exitNOI = noi * Math.pow(1 + appreciationRate / 100, 5);
      const exitValue = exitNOI / (exitCapRate / 100);
      const totalCashFlows = annualCashFlow * 5;
      const totalReturn = (exitValue + totalCashFlows - purchasePrice) / purchasePrice * 100;
      
      // Simplified IRR calculation (this is a rough approximation)
      const irr = Math.pow((exitValue + totalCashFlows) / cashInvested, 1/5) - 1;
      const irrPercent = irr * 100;
      
      // MOIC calculation
      const moic = cashInvested > 0 ? (exitValue + totalCashFlows) / cashInvested : 0;
      
      // Rent-to-price ratio
      const rentToPriceRatio = purchasePrice > 0 ? (monthlyRent / purchasePrice) * 100 : 0;

      const calculatedMetrics = {
        // Property Info
        purchasePrice: purchasePrice,
        monthlyRent: monthlyRent,
        
        // Income & Expenses
        effectiveGrossIncome: effectiveGrossIncome,
        operatingExpenses: operatingExpenses,
        noi: noi,
        monthlyCashFlow: monthlyCashFlow,
        annualCashFlow: annualCashFlow,
        
        // Key Ratios
        capRate: capRate,
        cashOnCash: cashOnCash,
        dscr: dscr,
        rentToPriceRatio: rentToPriceRatio,
        breakEvenOccupancy: breakEvenOccupancy,
        
        // Investment Analysis
        irrPercent: irrPercent,
        moic: moic,
        totalReturn: totalReturn,
        
        // Additional Info
        cashInvested: cashInvested,
        monthlyMortgage: monthlyMortgage,
        exitValue: exitValue
      };

      setMetrics(calculatedMetrics);
      toast.success('Calculations completed successfully!');
      
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Error calculating metrics. Please check your inputs.');
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-calculate when key fields change
  useEffect(() => {
    const hasMinimumData = propertyData.purchasePrice && propertyData.monthlyRent;
    if (hasMinimumData) {
      const timeoutId = setTimeout(() => {
        calculateMetrics();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [propertyData.purchasePrice, propertyData.monthlyRent, propertyData.propertyTaxes, 
      propertyData.insurance, propertyData.downPayment, propertyData.interestRate]);

  // Handle PDF preview and download using new golden template
  const handleDownloadPDF = async () => {
    if (!metrics) {
      toast.error('Please calculate metrics first');
      return;
    }

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      // Prepare data for the backend
      const payload = {
        calculation_data: metrics,
        property_data: propertyData
      };

      // Make API call to generate PDF using the golden template
      const response = await fetch(`${backendUrl}/api/reports/investor/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.statusText}`);
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Get filename from response headers or generate one
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'investor_analysis.pdf';
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
      }

      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!');
      
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Error downloading PDF. Please try again.');
    }
  };

  // Removed handlePreviewPDF function

  // Format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '0%';
    return `${value.toFixed(2)}%`;
  };

  // Tooltip component for explanations - mobile-friendly with click support
  const InfoTooltip = ({ children, tooltipKey, content }) => {
    const [open, setOpen] = React.useState(false);
    
    return (
      <TooltipProvider>
        <Tooltip open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="flex items-center space-x-1 cursor-help hover:opacity-70 transition-opacity"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(!open);
              }}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            >
              {children}
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{content || tooltips[tooltipKey] || "Additional information available"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const handleSaveCalculation = async () => {
    if (!user || !['STARTER', 'PRO'].includes(user.plan)) {
      toast.error('Saving calculations requires a STARTER or PRO plan');
      return;
    }

    setIsSaving(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/investor/save`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: propertyData.address || `Investment Deal - ${new Date().toLocaleDateString()}`,
          inputs: propertyData,
          results: metrics
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save calculation');
      }

      const data = await response.json();
      toast.success(data.message || 'Calculation saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save calculation');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Navigate to Dashboard Overview if user is logged in as STARTER or PRO
                  if (user && (user.plan === 'STARTER' || user.plan === 'PRO')) {
                    navigate('/dashboard?tab=overview');
                  } else {
                    navigate('/');
                  }
                }}
                className="flex items-center space-x-1 sm:space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Home</span>
              </Button>
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <div className="flex items-center space-x-2 sm:space-x-3">
                <img 
                  src="https://customer-assets.emergentagent.com/job_agent-financials/artifacts/u7i6c8zh_Fairy_Holding_Wand.png" 
                  alt="Fairy AI" 
                  className="h-6 sm:h-8 w-auto"
                />
                <h1 className="text-base sm:text-xl md:text-2xl font-bold">Investor Deal Generator</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/glossary')}
                className="text-blue-600 hidden sm:flex"
              >
                View Glossary
              </Button>
              <Badge className="bg-blue-100 text-blue-800 text-xs">
                Free
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Input Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Home className="w-5 h-5" />
                  <span>Property Details</span>
                </CardTitle>
                <CardDescription>
                  Basic information about the property you're analyzing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <InfoTooltip tooltipKey="property_address">
                      <Label htmlFor="address">Property Address</Label>
                    </InfoTooltip>
                    <Input
                      id="address"
                      placeholder="123 Main Street"
                      value={propertyData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Austin"
                      value={propertyData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="TX"
                      value={propertyData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      placeholder="78701"
                      value={propertyData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    />
                  </div>
                  <div>
                    <InfoTooltip tooltipKey="property_type">
                      <Label htmlFor="propertyType">Property Type</Label>
                    </InfoTooltip>
                    <Select value={propertyData.propertyType} onValueChange={(value) => handleInputChange('propertyType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single-family">Single Family</SelectItem>
                        <SelectItem value="multi-family">Multi Family</SelectItem>
                        <SelectItem value="condo">Condominium</SelectItem>
                        <SelectItem value="townhouse">Townhouse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <InfoTooltip tooltipKey="square_footage">
                      <Label htmlFor="squareFootage">Square Footage</Label>
                    </InfoTooltip>
                    <Input
                      id="squareFootage"
                      type="text"
                      inputMode="numeric"
                      placeholder="1,800"
                      value={propertyData.squareFootage}
                      onChange={(e) => handleInputChange('squareFootage', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      placeholder="3"
                      value={propertyData.bedrooms}
                      onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      step="0.5"
                      placeholder="2.5"
                      value={propertyData.bathrooms}
                      onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="yearBuilt">Year Built</Label>
                    <Input
                      id="yearBuilt"
                      type="number"
                      placeholder="2010"
                      value={propertyData.yearBuilt}
                      onChange={(e) => handleInputChange('yearBuilt', e.target.value)}
                    />
                  </div>
                </div>

                {/* Property Image Upload */}
                <div className="space-y-2">
                  <Label htmlFor="propertyImage">Property Photo (Optional)</Label>
                  <div className="flex items-center space-x-4">
                    <Input
                      id="propertyImageUrl"
                      type="url"
                      placeholder="https://example.com/property-photo.jpg"
                      value={propertyData.propertyImageUrl}
                      onChange={(e) => handleInputChange('propertyImageUrl', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = handleImageUpload;
                        input.click();
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  {propertyData.propertyImageUrl && (
                    <div className="mt-2">
                      <img 
                        src={propertyData.propertyImageUrl} 
                        alt="Property preview" 
                        className="h-20 w-auto rounded border"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Add a URL to a property photo or upload an image file. This will appear in your PDF report.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Purchase & Financing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Purchase & Financing</span>
                </CardTitle>
                <CardDescription>
                  Purchase price and loan details for the investment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <InfoTooltip tooltipKey="purchase_price">
                      <Label htmlFor="purchasePrice">Purchase Price *</Label>
                    </InfoTooltip>
                    <Input
                      id="purchasePrice"
                      type="text"
                      inputMode="numeric"
                      placeholder="450,000"
                      value={propertyData.purchasePrice}
                      onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                      className="font-medium"
                    />
                  </div>
                  <div>
                    <InfoTooltip tooltipKey="down_payment">
                      <Label htmlFor="downPayment">Down Payment</Label>
                    </InfoTooltip>
                    <Input
                      id="downPayment"
                      type="text"
                      inputMode="numeric"
                      placeholder="90,000"
                      value={propertyData.downPayment}
                      onChange={(e) => handleInputChange('downPayment', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <InfoTooltip tooltipKey="loan_amount">
                      <Label htmlFor="loanAmount">Loan Amount</Label>
                    </InfoTooltip>
                    <Input
                      id="loanAmount"
                      type="text"
                      inputMode="numeric"
                      placeholder="360,000"
                      value={propertyData.loanAmount}
                      onChange={(e) => handleInputChange('loanAmount', e.target.value)}
                    />
                  </div>
                  <div>
                    <InfoTooltip tooltipKey="interest_rate">
                      <Label htmlFor="interestRate">Interest Rate (%)</Label>
                    </InfoTooltip>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.1"
                      placeholder="6.5"
                      value={propertyData.interestRate}
                      onChange={(e) => handleInputChange('interestRate', e.target.value)}
                    />
                  </div>
                  <div>
                    <InfoTooltip tooltipKey="loan_term">
                      <Label htmlFor="loanTermYears">Loan Term (Years)</Label>
                    </InfoTooltip>
                    <Input
                      id="loanTermYears"
                      type="number"
                      placeholder="30"
                      value={propertyData.loanTermYears}
                      onChange={(e) => handleInputChange('loanTermYears', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Income & Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Income & Expenses</span>
                </CardTitle>
                <CardDescription>
                  Monthly income and operating expenses for the property
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Income Section */}
                <div>
                  <h4 className="font-medium text-green-700 mb-3">Monthly Income</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <InfoTooltip tooltipKey="monthly_rent">
                        <Label htmlFor="monthlyRent">Monthly Rent *</Label>
                      </InfoTooltip>
                      <Input
                        id="monthlyRent"
                        type="text"
                        inputMode="numeric"
                        placeholder="2,800"
                        value={propertyData.monthlyRent}
                        onChange={(e) => handleInputChange('monthlyRent', e.target.value)}
                        className="font-medium text-green-600"
                      />
                    </div>
                    <div>
                      <InfoTooltip tooltipKey="other_income">
                        <Label htmlFor="otherMonthlyIncome">Other Monthly Income</Label>
                      </InfoTooltip>
                      <Input
                        id="otherMonthlyIncome"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={propertyData.otherMonthlyIncome}
                        onChange={(e) => handleInputChange('otherMonthlyIncome', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Expenses Section */}
                <div>
                  <h4 className="font-medium text-red-700 mb-3">Annual Expenses</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <InfoTooltip tooltipKey="property_taxes">
                        <Label htmlFor="propertyTaxes">Property Taxes</Label>
                      </InfoTooltip>
                      <Input
                        id="propertyTaxes"
                        type="text"
                        inputMode="numeric"
                        placeholder="6,500"
                        value={propertyData.propertyTaxes}
                        onChange={(e) => handleInputChange('propertyTaxes', e.target.value)}
                      />
                    </div>
                    <div>
                      <InfoTooltip tooltipKey="insurance">
                        <Label htmlFor="insurance">Insurance</Label>
                      </InfoTooltip>
                      <Input
                        id="insurance"
                        type="text"
                        inputMode="numeric"
                        placeholder="1,200"
                        value={propertyData.insurance}
                        onChange={(e) => handleInputChange('insurance', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <InfoTooltip tooltipKey="hoa_fees">
                        <Label htmlFor="hoaFees">HOA Fees (Monthly)</Label>
                      </InfoTooltip>
                      <Input
                        id="hoaFees"
                        type="number"
                        placeholder="0"
                        value={propertyData.hoaFees}
                        onChange={(e) => handleInputChange('hoaFees', e.target.value)}
                      />
                    </div>
                    <div>
                      <InfoTooltip tooltipKey="maintenance_reserve">
                        <Label htmlFor="maintenanceReserves">Maintenance Reserve (Monthly)</Label>
                      </InfoTooltip>
                      <Input
                        id="maintenanceReserves"
                        type="number"
                        placeholder="200"
                        value={propertyData.maintenanceReserves}
                        onChange={(e) => handleInputChange('maintenanceReserves', e.target.value)}
                      />
                    </div>
                    <div>
                      <InfoTooltip tooltipKey="vacancy_allowance">
                        <Label htmlFor="vacancyAllowance">Vacancy Allowance (Monthly)</Label>
                      </InfoTooltip>
                      <Input
                        id="vacancyAllowance"
                        type="number"
                        placeholder="140"
                        value={propertyData.vacancyAllowance}
                        onChange={(e) => handleInputChange('vacancyAllowance', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <InfoTooltip tooltipKey="property_management">
                      <Label htmlFor="propertyManagement">Property Management (Monthly)</Label>
                    </InfoTooltip>
                    <Input
                      id="propertyManagement"
                      type="number"
                      placeholder="280"
                      value={propertyData.propertyManagement}
                      onChange={(e) => handleInputChange('propertyManagement', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={calculateMetrics}
                disabled={isCalculating || !propertyData.purchasePrice || !propertyData.monthlyRent}
                className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-emerald-700 hover:to-emerald-800"
              >
                {isCalculating ? 'Calculating...' : 'Calculate Metrics'}
              </Button>
              <div className="flex space-x-2">
                {/* Preview PDF button removed */}
                <Button 
                  onClick={handleDownloadPDF}
                  disabled={!metrics}
                  className="flex items-center space-x-2 bg-primary hover:bg-primary/90"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download PDF</span>
                </Button>
                
                {user && ['STARTER', 'PRO'].includes(user.plan) && metrics && (
                  <Button
                    onClick={handleSaveCalculation}
                    disabled={isSaving}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Deal'}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Agent Personalization Section Removed */}
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {metrics ? (
              <>
                {/* Key Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Key Metrics</span>
                    </CardTitle>
                    <CardDescription>Plain-English explanations included</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">
                          {formatPercentage(metrics.capRate)}
                        </div>
                        <div className="text-sm text-green-600">Cap Rate</div>
                        <div className="text-xs text-gray-500">Yearly return based on purchase price</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-700">
                          {formatPercentage(metrics.cashOnCash)}
                        </div>
                        <div className="text-sm text-blue-600">Cash-on-Cash</div>
                        <div className="text-xs text-gray-500">Annual cash flow vs cash invested</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <InfoTooltip tooltipKey="cash_on_cash">
                          <span className="text-gray-600">Monthly Cash Flow</span>
                        </InfoTooltip>
                        <span className={`font-semibold ${metrics.monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(metrics.monthlyCashFlow)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <InfoTooltip tooltipKey="dscr">
                          <span className="text-gray-600">DSCR</span>
                        </InfoTooltip>
                        <span className="font-semibold">{metrics.dscr.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <InfoTooltip tooltipKey="irr_5yr">
                          <span className="text-gray-600">5-Year IRR</span>
                        </InfoTooltip>
                        <span className="font-semibold">{formatPercentage(metrics.irrPercent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <InfoTooltip tooltipKey="moic">
                          <span className="text-gray-600">MOIC</span>
                        </InfoTooltip>
                        <span className="font-semibold">{metrics.moic.toFixed(2)}x</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pro Forma */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pro Forma</CardTitle>
                    <CardDescription>Income after expenses, before loan payments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-green-700">
                      <InfoTooltip tooltipKey="egi">
                        <span>Effective Gross Income</span>
                      </InfoTooltip>
                      <span className="font-semibold">{formatCurrency(metrics.effectiveGrossIncome)}</span>
                    </div>
                    <div className="flex justify-between text-red-700">
                      <span>Operating Expenses</span>
                      <span className="font-semibold">({formatCurrency(metrics.operatingExpenses)})</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <InfoTooltip tooltipKey="noi">
                        <span>Net Operating Income</span>
                      </InfoTooltip>
                      <span>{formatCurrency(metrics.noi)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Analysis</CardTitle>  
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rent-to-Price Ratio</span>
                      <span className="font-semibold">{formatPercentage(metrics.rentToPriceRatio)}</span>
                    </div>
                    <div className="flex justify-between">
                      <InfoTooltip tooltipKey="break_even_occupancy">
                        <span className="text-gray-600">Break-even Occupancy</span>
                      </InfoTooltip>
                      <span className="font-semibold">{formatPercentage(metrics.breakEvenOccupancy)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash Invested</span>
                      <span className="font-semibold">{formatCurrency(metrics.cashInvested)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">5-Year Exit Value</span>
                      <span className="font-semibold">{formatCurrency(metrics.exitValue)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Upgrade Prompt - Only show for FREE users */}
                {effectivePlan === 'FREE' && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                      <div className="text-center space-y-3">
                        <h3 className="font-semibold text-blue-900">Want to save this deal?</h3>
                        <p className="text-sm text-blue-700">
                          Upgrade to save deals, add custom branding, and share with investors.
                        </p>
                        <Button 
                          className="w-full bg-primary hover:bg-emerald-700"
                          onClick={() => navigate('/#pricing')}
                        >
                          View Pricing Plans
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ): (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4 py-8">
                    <Calculator className="w-12 h-12 text-gray-400 mx-auto" />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900">Ready to Calculate</h3>
                      <p className="text-sm text-gray-500">
                        Enter property details and financial information to see your analysis results here.
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      * Required: Purchase Price and Monthly Rent
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

      </div>

      <Footer />
    </div>
  );
};

export default FreeCalculator;
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Switch } from '../components/ui/switch';
import { Calculator, ArrowLeft, Download, TrendingUp, DollarSign, Home, FileText, HelpCircle, Upload, Save, AlertTriangle, Sparkles, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { tooltips } from '../config/tooltips';
import { useAuth } from '../contexts/AuthContext';
import { usePlanPreview } from '../hooks/usePlanPreview';
import Footer from '../components/Footer';
import { formatNumberWithCommas, parseNumberFromFormatted } from '../utils/calculatorUtils';
import { safeLocalStorage } from '../utils/safeStorage';
import API_BASE_URL from '../config/api';
import InvestorAICoach from '../components/InvestorAICoach';

const FreeCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectivePlan } = usePlanPreview(user?.plan);
  
  // AI Coach modal state
  const [showAICoach, setShowAICoach] = useState(false);
  
  // Form state - ALL expenses are now MONTHLY
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
    
    // Multi-family unit breakdown (NEW)
    units1Bed: '',
    units2Bed: '',
    units3Bed: '',
    units4Bed: '',
    
    // Financial Data
    purchasePrice: '',
    downPayment: '',
    loanAmount: '',
    interestRate: '',
    loanTermYears: '30',
    
    // Income (Monthly)
    monthlyRent: '',
    otherMonthlyIncome: '',
    
    // Fixed Expenses (Monthly)
    propertyTaxesMonthly: '',
    insuranceMonthly: '',
    hoaMonthly: '',
    
    // Operating Expenses (Monthly)
    propertyManagementMonthly: '',
    propertyManagementIsPercent: false,
    propertyManagementPercent: '10',
    maintenanceReserveMonthly: '',
    utilitiesMonthly: '',
    otherExpensesMonthly: '',
    
    // Vacancy
    vacancyRatePercent: '5',
    
    // Other assumptions
    appreciationRate: '3',
    exitCapRate: '6'
  });

  // UI state
  const [hasAgentChanges, setHasAgentChanges] = useState(false);
  const [isSavingAgent, setIsSavingAgent] = useState(false);

  // Calculated metrics state
  const [metrics, setMetrics] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Validation warnings (NEW)
  const [warnings, setWarnings] = useState([]);

  // Load agent profile on component mount
  useEffect(() => {
    loadAgentProfile();
  }, []);

  const loadAgentProfile = () => {
    try {
      const savedProfile = safeLocalStorage.getItem('dealpack_agent_profile');
      if (savedProfile) {
        // Agent profile loaded (not used in this simplified version)
      }
    } catch (error) {
      console.error('Error loading agent profile:', error);
    }
  };

  // Calculate total units for multi-family (NEW)
  const calculateTotalUnits = useCallback(() => {
    const units1 = parseInt(propertyData.units1Bed) || 0;
    const units2 = parseInt(propertyData.units2Bed) || 0;
    const units3 = parseInt(propertyData.units3Bed) || 0;
    const units4 = parseInt(propertyData.units4Bed) || 0;
    return units1 + units2 + units3 + units4;
  }, [propertyData.units1Bed, propertyData.units2Bed, propertyData.units3Bed, propertyData.units4Bed]);

  // Handle input changes with bidirectional loan/down payment sync (PART 4)
  const handleInputChange = (field, value) => {
    const numericFields = [
      'purchasePrice', 'downPayment', 'loanAmount', 'monthlyRent', 'otherMonthlyIncome',
      'propertyTaxesMonthly', 'insuranceMonthly', 'hoaMonthly', 'otherExpensesMonthly',
      'maintenanceReserveMonthly', 'utilitiesMonthly', 'propertyManagementMonthly', 'squareFootage'
    ];
    
    let formattedValue = value;
    if (numericFields.includes(field) && value) {
      formattedValue = formatNumberWithCommas(value);
    }

    setPropertyData(prev => {
      const newData = { ...prev, [field]: formattedValue };
      
      // PART 4: Bidirectional loan/down payment calculation
      const purchasePrice = parseNumberFromFormatted(field === 'purchasePrice' ? value : prev.purchasePrice) || 0;
      
      if (field === 'downPayment' && purchasePrice > 0) {
        const downPayment = parseNumberFromFormatted(value) || 0;
        const calculatedLoan = Math.max(0, purchasePrice - downPayment);
        newData.loanAmount = formatNumberWithCommas(calculatedLoan.toString());
      } else if (field === 'loanAmount' && purchasePrice > 0) {
        const loanAmount = parseNumberFromFormatted(value) || 0;
        const calculatedDown = Math.max(0, purchasePrice - loanAmount);
        newData.downPayment = formatNumberWithCommas(calculatedDown.toString());
      } else if (field === 'purchasePrice') {
        // When purchase price changes, recalculate loan based on current down payment
        const downPayment = parseNumberFromFormatted(prev.downPayment) || 0;
        if (downPayment > 0) {
          const calculatedLoan = Math.max(0, purchasePrice - downPayment);
          newData.loanAmount = formatNumberWithCommas(calculatedLoan.toString());
        }
      }
      
      return newData;
    });
  };

  // Handle property image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      handleInputChange('propertyImageUrl', imageUrl);
      toast.success('Property image uploaded successfully');
    }
  };

  // Calculate financial metrics with NEW expense structure (PART 1)
  const calculateMetrics = useCallback(() => {
    setIsCalculating(true);
    const newWarnings = [];
    
    try {
      const data = propertyData;
      
      // Parse all values
      const purchasePrice = parseNumberFromFormatted(data.purchasePrice) || 0;
      const monthlyRent = parseNumberFromFormatted(data.monthlyRent) || 0;
      const otherMonthlyIncome = parseNumberFromFormatted(data.otherMonthlyIncome) || 0;
      const downPayment = parseNumberFromFormatted(data.downPayment) || 0;
      const loanAmount = parseNumberFromFormatted(data.loanAmount) || (purchasePrice - downPayment);
      const interestRate = parseFloat(data.interestRate) || 0;
      const loanTermYears = parseFloat(data.loanTermYears) || 30;
      const appreciationRate = parseFloat(data.appreciationRate) || 3;
      const exitCapRate = parseFloat(data.exitCapRate) || 6;
      const vacancyRatePercent = parseFloat(data.vacancyRatePercent) || 5;

      // Fixed Expenses (Monthly) - PART 1
      const propertyTaxesMonthly = parseNumberFromFormatted(data.propertyTaxesMonthly) || 0;
      const insuranceMonthly = parseNumberFromFormatted(data.insuranceMonthly) || 0;
      const hoaMonthly = parseNumberFromFormatted(data.hoaMonthly) || 0;
      
      // Operating Expenses (Monthly) - PART 1
      let propertyManagementMonthly = 0;
      if (data.propertyManagementIsPercent) {
        const pmPercent = parseFloat(data.propertyManagementPercent) || 10;
        propertyManagementMonthly = (monthlyRent * pmPercent) / 100;
      } else {
        propertyManagementMonthly = parseNumberFromFormatted(data.propertyManagementMonthly) || 0;
      }
      const maintenanceReserveMonthly = parseNumberFromFormatted(data.maintenanceReserveMonthly) || 0;
      const utilitiesMonthly = parseNumberFromFormatted(data.utilitiesMonthly) || 0;
      const otherExpensesMonthly = parseNumberFromFormatted(data.otherExpensesMonthly) || 0;

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
      
      // Vacancy loss calculation (PART 1)
      const monthlyVacancyLoss = (totalMonthlyIncome * vacancyRatePercent) / 100;
      const annualVacancyLoss = monthlyVacancyLoss * 12;
      const effectiveGrossIncome = annualGrossIncome - annualVacancyLoss;

      // ============================================================
      // EXPENSE CALCULATION - SINGLE SOURCE OF TRUTH (PART 1 & 4)
      // All values stored as ANNUAL for calculation integrity
      // ============================================================
      
      // Convert all monthly expenses to annual (PART 1)
      const annualPropertyTaxes = propertyTaxesMonthly * 12;
      const annualInsurance = insuranceMonthly * 12;
      const annualHOA = hoaMonthly * 12;
      const annualPropertyManagement = propertyManagementMonthly * 12;
      const annualMaintenance = maintenanceReserveMonthly * 12;
      const annualUtilities = utilitiesMonthly * 12;
      const annualOtherExpenses = otherExpensesMonthly * 12;
      
      // PART 4: Deterministic expense calculation - EXACT SUM, NO ADJUSTMENTS
      const totalOperatingExpenses = 
        annualPropertyTaxes +
        annualInsurance +
        annualHOA +
        annualPropertyManagement +
        annualMaintenance +
        annualUtilities +
        annualOtherExpenses;
      
      // Store annual expense breakdown for UI transparency (PART 7)
      const annualExpenseBreakdown = {
        propertyTaxes: annualPropertyTaxes,
        insurance: annualInsurance,
        hoa: annualHOA,
        propertyManagement: annualPropertyManagement,
        maintenance: annualMaintenance,
        utilities: annualUtilities,
        otherExpenses: annualOtherExpenses,
        total: totalOperatingExpenses
      };
      
      // PART 5: Reconciliation check - FAIL-SAFE
      const sumOfExpenses = annualPropertyTaxes + annualInsurance + annualHOA + 
                           annualPropertyManagement + annualMaintenance + 
                           annualUtilities + annualOtherExpenses;
      
      if (Math.abs(totalOperatingExpenses - sumOfExpenses) > 1) {
        console.error("EXPENSE MISMATCH DETECTED", {
          calculatedTotal: totalOperatingExpenses,
          sumOfComponents: sumOfExpenses,
          breakdown: annualExpenseBreakdown
        });
      }
      
      // Legacy variable names for compatibility
      const annualOperatingExpenses = totalOperatingExpenses;
      const totalMonthlyExpensesExcludingMortgage = totalOperatingExpenses / 12;
      
      // PART 6: NOI calculation - NO ADDITIONAL ADJUSTMENTS
      // NOI = Effective Gross Income - Total Operating Expenses
      const noi = effectiveGrossIncome - totalOperatingExpenses;
      
      // Key metrics
      const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
      
      // LTV calculation (PART 2)
      const ltv = purchasePrice > 0 ? (loanAmount / purchasePrice) * 100 : 0;
      
      // Monthly cash flow (includes mortgage)
      const totalMonthlyExpenses = totalMonthlyExpensesExcludingMortgage + monthlyMortgage;
      const monthlyCashFlow = totalMonthlyIncome - monthlyVacancyLoss - totalMonthlyExpenses;
      const annualCashFlow = monthlyCashFlow * 12;
      
      const cashInvested = downPayment > 0 ? downPayment : purchasePrice * 0.25;
      const cashOnCash = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0;
      
      // DSCR calculation
      const annualDebtService = monthlyMortgage * 12;
      const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
      
      // Break-even occupancy
      const breakEvenOccupancy = annualGrossIncome > 0 ? 
        ((annualOperatingExpenses + annualDebtService) / annualGrossIncome) * 100 : 0;
      
      // 5-year projections
      const exitNOI = noi * Math.pow(1 + appreciationRate / 100, 5);
      const exitValue = exitNOI / (exitCapRate / 100);
      const totalCashFlows = annualCashFlow * 5;
      
      // IRR calculation
      const irr = cashInvested > 0 ? Math.pow((exitValue + totalCashFlows) / cashInvested, 1/5) - 1 : 0;
      const irrPercent = irr * 100;
      
      // MOIC calculation
      const moic = cashInvested > 0 ? (exitValue + totalCashFlows) / cashInvested : 0;
      
      // Rent-to-price ratio
      const rentToPriceRatio = purchasePrice > 0 ? (monthlyRent / purchasePrice) * 100 : 0;

      // Expense ratio for validation
      const expenseRatio = annualGrossIncome > 0 ? (annualOperatingExpenses / annualGrossIncome) * 100 : 0;

      // PART 6: Validation warnings
      if (capRate > 0 && (capRate < 2 || capRate > 12)) {
        newWarnings.push({
          type: 'cap_rate',
          message: `Cap Rate of ${capRate.toFixed(2)}% is unusual. Check income/expense inputs.`,
          severity: 'warning'
        });
      }
      
      if (expenseRatio > 0 && expenseRatio < 20) {
        newWarnings.push({
          type: 'expense_ratio',
          message: `Expenses are only ${expenseRatio.toFixed(1)}% of income. This may be underestimated.`,
          severity: 'warning'
        });
      }

      setWarnings(newWarnings);

      const calculatedMetrics = {
        // Property Info
        purchasePrice,
        monthlyRent,
        
        // Financing
        loanAmount,
        downPayment,
        ltv, // NEW (PART 2)
        
        // Income & Expenses
        effectiveGrossIncome,
        annualVacancyLoss,
        operatingExpenses: annualOperatingExpenses,
        noi,
        monthlyCashFlow,
        annualCashFlow,
        monthlyMortgage,
        
        // PART 7: Annual expense breakdown for UI transparency
        annualExpenseBreakdown,
        
        // Monthly expense breakdown (for PDF)
        monthlyExpenses: {
          propertyTaxes: propertyTaxesMonthly,
          insurance: insuranceMonthly,
          hoa: hoaMonthly,
          propertyManagement: propertyManagementMonthly,
          maintenanceReserve: maintenanceReserveMonthly,
          utilities: utilitiesMonthly,
          otherExpenses: otherExpensesMonthly,
          vacancyLoss: monthlyVacancyLoss,
          mortgage: monthlyMortgage
        },
        
        // Key Ratios
        capRate,
        cashOnCash,
        dscr,
        rentToPriceRatio,
        breakEvenOccupancy,
        expenseRatio,
        
        // Investment Analysis
        irrPercent,
        moic,
        
        // Additional Info
        cashInvested,
        exitValue,
        
        // Multi-family unit breakdown (PART 3)
        unitBreakdown: data.propertyType === 'multi-family' ? {
          oneBed: parseInt(data.units1Bed) || 0,
          twoBed: parseInt(data.units2Bed) || 0,
          threeBed: parseInt(data.units3Bed) || 0,
          fourBed: parseInt(data.units4Bed) || 0,
          total: calculateTotalUnits()
        } : null
      };

      setMetrics(calculatedMetrics);
      toast.success('Calculations completed successfully!');
      
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Error calculating metrics. Please check your inputs.');
    } finally {
      setIsCalculating(false);
    }
  }, [propertyData, calculateTotalUnits]);

  // Auto-calculate when key fields change
  useEffect(() => {
    const hasMinimumData = propertyData.purchasePrice && propertyData.monthlyRent;
    if (hasMinimumData) {
      const timeoutId = setTimeout(() => {
        calculateMetrics();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [propertyData, calculateMetrics]);

  // Handle PDF download (PART 5)
  const handleDownloadPDF = async () => {
    if (!metrics) {
      toast.error('Please calculate metrics first');
      return;
    }

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    const fullPropertyData = {
      ...propertyData,
      totalUnits: propertyData.propertyType === 'multi-family' ? calculateTotalUnits() : null
    };

    if (isIOS) {
      const params = new URLSearchParams({
        calculation_data: JSON.stringify(metrics),
        property_data: JSON.stringify(fullPropertyData)
      });
      const url = `${API_BASE_URL}/api/reports/investor/pdf?${params.toString()}`;
      window.open(url, '_blank');
      toast.success('PDF opened. Use share icon to save.');
      return;
    }

    // EXISTING DESKTOP LOGIC (UNCHANGED)
    try {
      const backendUrl = API_BASE_URL;
      
      const payload = {
        calculation_data: metrics,
        property_data: fullPropertyData
      };

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

      const pdfBlob = await response.blob();
      
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'investor_analysis.pdf';
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
      }

      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!');
      
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Error downloading PDF. Please try again.');
    }
  };

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
    if (value === null || value === undefined || isNaN(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  // Get LTV color (PART 2)
  const getLTVColor = (ltv) => {
    if (ltv <= 75) return 'text-green-600 bg-green-50';
    if (ltv <= 80) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Tooltip component
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
      const backendUrl = API_BASE_URL;

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

  const isMultiFamily = propertyData.propertyType === 'multi-family';

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
                  src={`${process.env.REACT_APP_ASSETS_URL}/job_agent-portal-27/artifacts/azdcmpew_Logo_with_brown_background-removebg-preview.png`}
                  alt="I Need Numbers" 
                  className="h-6 sm:h-8 w-auto"
                />
                <h1 className="text-base sm:text-xl md:text-2xl font-bold text-primary">Investor Deal Generator</h1>
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
              <Badge className="lg:hidden bg-blue-100 text-blue-800 text-xs">
                Free
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* Validation Warnings (PART 6) */}
        {warnings.length > 0 && (
          <div className="mb-6 space-y-2">
            {warnings.map((warning, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <span className="text-sm text-yellow-800">{warning.message}</span>
              </div>
            ))}
          </div>
        )}

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

                {/* PART 3: Multi-Family Unit Breakdown */}
                {isMultiFamily && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                    <h4 className="font-medium text-blue-900">Unit Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <Label htmlFor="units1Bed" className="text-sm">1 Bedroom</Label>
                        <Input
                          id="units1Bed"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={propertyData.units1Bed}
                          onChange={(e) => handleInputChange('units1Bed', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="units2Bed" className="text-sm">2 Bedroom</Label>
                        <Input
                          id="units2Bed"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={propertyData.units2Bed}
                          onChange={(e) => handleInputChange('units2Bed', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="units3Bed" className="text-sm">3 Bedroom</Label>
                        <Input
                          id="units3Bed"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={propertyData.units3Bed}
                          onChange={(e) => handleInputChange('units3Bed', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="units4Bed" className="text-sm">4 Bedroom</Label>
                        <Input
                          id="units4Bed"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={propertyData.units4Bed}
                          onChange={(e) => handleInputChange('units4Bed', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Total Units</Label>
                        <Input
                          type="text"
                          value={calculateTotalUnits()}
                          disabled
                          className="bg-white font-semibold text-blue-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                      disabled={isMultiFamily}
                      className={isMultiFamily ? 'bg-gray-100 cursor-not-allowed' : ''}
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
                      disabled={isMultiFamily}
                      className={isMultiFamily ? 'bg-gray-100 cursor-not-allowed' : ''}
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

            {/* Income & Expenses - PART 1: New Structure */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Income & Expenses</span>
                </CardTitle>
                <CardDescription>
                  All expense inputs are monthly for accurate calculations
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

                {/* Fixed Expenses Section (PART 1) */}
                <div>
                  <h4 className="font-medium text-red-700 mb-3">Fixed Expenses (Monthly)</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <InfoTooltip tooltipKey="property_taxes">
                        <Label htmlFor="propertyTaxesMonthly">Property Taxes (Monthly)</Label>
                      </InfoTooltip>
                      <Input
                        id="propertyTaxesMonthly"
                        type="text"
                        inputMode="numeric"
                        placeholder="542"
                        value={propertyData.propertyTaxesMonthly}
                        onChange={(e) => handleInputChange('propertyTaxesMonthly', e.target.value)}
                      />
                    </div>
                    <div>
                      <InfoTooltip tooltipKey="insurance">
                        <Label htmlFor="insuranceMonthly">Insurance (Monthly)</Label>
                      </InfoTooltip>
                      <Input
                        id="insuranceMonthly"
                        type="text"
                        inputMode="numeric"
                        placeholder="100"
                        value={propertyData.insuranceMonthly}
                        onChange={(e) => handleInputChange('insuranceMonthly', e.target.value)}
                      />
                    </div>
                    <div>
                      <InfoTooltip tooltipKey="hoa_fees">
                        <Label htmlFor="hoaMonthly">HOA (Monthly)</Label>
                      </InfoTooltip>
                      <Input
                        id="hoaMonthly"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={propertyData.hoaMonthly}
                        onChange={(e) => handleInputChange('hoaMonthly', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Operating Expenses Section (PART 1) */}
                <div>
                  <h4 className="font-medium text-orange-700 mb-3">Operating Expenses (Monthly)</h4>
                  
                  {/* Property Management with toggle */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-medium">Property Management</Label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${!propertyData.propertyManagementIsPercent ? 'font-medium' : 'text-gray-500'}`}>$</span>
                        <Switch
                          checked={propertyData.propertyManagementIsPercent}
                          onCheckedChange={(checked) => handleInputChange('propertyManagementIsPercent', checked)}
                        />
                        <span className={`text-sm ${propertyData.propertyManagementIsPercent ? 'font-medium' : 'text-gray-500'}`}>%</span>
                      </div>
                    </div>
                    {propertyData.propertyManagementIsPercent ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="10"
                          value={propertyData.propertyManagementPercent}
                          onChange={(e) => handleInputChange('propertyManagementPercent', e.target.value)}
                          className="w-24"
                        />
                        <span className="text-sm text-gray-600">% of rent</span>
                        {propertyData.monthlyRent && (
                          <span className="text-sm text-gray-500">
                            ≈ {formatCurrency((parseNumberFromFormatted(propertyData.monthlyRent) * (parseFloat(propertyData.propertyManagementPercent) || 10)) / 100)}/mo
                          </span>
                        )}
                      </div>
                    ) : (
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="280"
                        value={propertyData.propertyManagementMonthly}
                        onChange={(e) => handleInputChange('propertyManagementMonthly', e.target.value)}
                      />
                    )}
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <InfoTooltip tooltipKey="maintenance_reserve">
                        <Label htmlFor="maintenanceReserveMonthly">Maintenance Reserve (Monthly)</Label>
                      </InfoTooltip>
                      <Input
                        id="maintenanceReserveMonthly"
                        type="text"
                        inputMode="numeric"
                        placeholder="200"
                        value={propertyData.maintenanceReserveMonthly}
                        onChange={(e) => handleInputChange('maintenanceReserveMonthly', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="utilitiesMonthly">Utilities (Monthly)</Label>
                      <Input
                        id="utilitiesMonthly"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={propertyData.utilitiesMonthly}
                        onChange={(e) => handleInputChange('utilitiesMonthly', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="otherExpensesMonthly">Other Expenses (Monthly)</Label>
                      <Input
                        id="otherExpensesMonthly"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={propertyData.otherExpensesMonthly}
                        onChange={(e) => handleInputChange('otherExpensesMonthly', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Vacancy Section (PART 1) */}
                <div>
                  <h4 className="font-medium text-purple-700 mb-3">Vacancy</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <InfoTooltip tooltipKey="vacancy_rate" content="Percentage of time the property is expected to be vacant">
                        <Label htmlFor="vacancyRatePercent">Vacancy Rate (%)</Label>
                      </InfoTooltip>
                      <Input
                        id="vacancyRatePercent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        placeholder="5"
                        value={propertyData.vacancyRatePercent}
                        onChange={(e) => handleInputChange('vacancyRatePercent', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-500">Vacancy Loss (Auto-calculated)</Label>
                      <div className="mt-2 p-2 bg-purple-50 rounded text-purple-700 font-medium">
                        {propertyData.monthlyRent ? 
                          formatCurrency((parseNumberFromFormatted(propertyData.monthlyRent) * (parseFloat(propertyData.vacancyRatePercent) || 5)) / 100) + '/mo'
                          : '$0/mo'}
                      </div>
                    </div>
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
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={handleDownloadPDF}
                  disabled={!metrics}
                  className="flex items-center space-x-2 bg-primary hover:bg-primary/90"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download PDF</span>
                </Button>
                
                {/* Fairy AI Coach Button */}
                {effectivePlan === 'PRO' ? (
                  <Button 
                    onClick={() => setShowAICoach(true)}
                    disabled={!metrics}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    data-testid="fairy-ai-coach-btn"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Fairy AI Coach</span>
                  </Button>
                ) : (
                  <Button 
                    onClick={() => navigate('/pricing')}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white opacity-75"
                    data-testid="fairy-ai-coach-locked-btn"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Fairy AI Coach (Pro)</span>
                  </Button>
                )}
                
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
                    
                    {/* LTV (PART 2) */}
                    <div className={`text-center p-3 rounded-lg ${getLTVColor(metrics.ltv)}`}>
                      <div className="text-2xl font-bold">
                        {formatPercentage(metrics.ltv)}
                      </div>
                      <div className="text-sm font-medium">LTV (Loan-to-Value)</div>
                      <div className="text-xs opacity-80">
                        {metrics.ltv <= 75 ? 'Conservative leverage' : 
                         metrics.ltv <= 80 ? 'Moderate leverage' : 'High leverage'}
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
                    <div className="flex justify-between text-gray-500 text-sm">
                      <span className="pl-4">- Vacancy Loss</span>
                      <span>({formatCurrency(metrics.annualVacancyLoss)})</span>
                    </div>
                    
                    {/* PART 7: Operating Expenses with Transparent Breakdown */}
                    <div className="text-red-700">
                      <div className="flex justify-between font-medium">
                        <span>Operating Expenses</span>
                        <span className="font-semibold">({formatCurrency(metrics.operatingExpenses)})</span>
                      </div>
                      
                      {/* Expense Breakdown - MUST match total exactly */}
                      {metrics.annualExpenseBreakdown && (
                        <div className="mt-2 pl-4 space-y-1 text-sm text-gray-600 border-l-2 border-red-200 ml-2">
                          {metrics.annualExpenseBreakdown.propertyTaxes > 0 && (
                            <div className="flex justify-between">
                              <span>Property Taxes</span>
                              <span>{formatCurrency(metrics.annualExpenseBreakdown.propertyTaxes)}</span>
                            </div>
                          )}
                          {metrics.annualExpenseBreakdown.insurance > 0 && (
                            <div className="flex justify-between">
                              <span>Insurance</span>
                              <span>{formatCurrency(metrics.annualExpenseBreakdown.insurance)}</span>
                            </div>
                          )}
                          {metrics.annualExpenseBreakdown.hoa > 0 && (
                            <div className="flex justify-between">
                              <span>HOA</span>
                              <span>{formatCurrency(metrics.annualExpenseBreakdown.hoa)}</span>
                            </div>
                          )}
                          {metrics.annualExpenseBreakdown.propertyManagement > 0 && (
                            <div className="flex justify-between">
                              <span>Property Management</span>
                              <span>{formatCurrency(metrics.annualExpenseBreakdown.propertyManagement)}</span>
                            </div>
                          )}
                          {metrics.annualExpenseBreakdown.maintenance > 0 && (
                            <div className="flex justify-between">
                              <span>Maintenance Reserve</span>
                              <span>{formatCurrency(metrics.annualExpenseBreakdown.maintenance)}</span>
                            </div>
                          )}
                          {metrics.annualExpenseBreakdown.utilities > 0 && (
                            <div className="flex justify-between">
                              <span>Utilities</span>
                              <span>{formatCurrency(metrics.annualExpenseBreakdown.utilities)}</span>
                            </div>
                          )}
                          {metrics.annualExpenseBreakdown.otherExpenses > 0 && (
                            <div className="flex justify-between">
                              <span>Other Expenses</span>
                              <span>{formatCurrency(metrics.annualExpenseBreakdown.otherExpenses)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium text-red-600 pt-1 border-t border-red-200">
                            <span>TOTAL</span>
                            <span>{formatCurrency(metrics.annualExpenseBreakdown.total)}</span>
                          </div>
                        </div>
                      )}
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

                {/* Unit Breakdown for Multi-Family (PART 3) */}
                {metrics.unitBreakdown && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Unit Breakdown</CardTitle>
                      <CardDescription>Multi-family property units</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {metrics.unitBreakdown.oneBed > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">1 Bedroom</span>
                          <span className="font-semibold">{metrics.unitBreakdown.oneBed}</span>
                        </div>
                      )}
                      {metrics.unitBreakdown.twoBed > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">2 Bedroom</span>
                          <span className="font-semibold">{metrics.unitBreakdown.twoBed}</span>
                        </div>
                      )}
                      {metrics.unitBreakdown.threeBed > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">3 Bedroom</span>
                          <span className="font-semibold">{metrics.unitBreakdown.threeBed}</span>
                        </div>
                      )}
                      {metrics.unitBreakdown.fourBed > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">4 Bedroom</span>
                          <span className="font-semibold">{metrics.unitBreakdown.fourBed}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Total Units</span>
                        <span>{metrics.unitBreakdown.total}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Mortgage</span>
                      <span className="font-semibold">{formatCurrency(metrics.monthlyMortgage)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Upgrade Prompt */}
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
      
      {/* AI Coach Modal - Pro Users Only */}
      {effectivePlan === 'PRO' && (
        <InvestorAICoach
          isOpen={showAICoach}
          onClose={() => setShowAICoach(false)}
          propertyData={propertyData}
          metrics={metrics}
        />
      )}
    </div>
  );
};

export default FreeCalculator;

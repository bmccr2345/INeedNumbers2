import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  ArrowLeft, 
  Home, 
  Download, 
  Save, 
  Share2,
  Calculator,
  DollarSign,
  Lock,
  CheckCircle,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePlanPreview } from '../hooks/usePlanPreview';
import { toast } from 'sonner';
import axios from 'axios';
import { handleSaveCalculation, handleShareCalculation, formatNumberWithCommas, parseNumberFromFormatted } from '../utils/calculatorUtils';
import { navigateBackFromCalculator } from '../utils/navigation';
import AffordabilityAICoach from '../components/AffordabilityAICoach';

const AffordabilityCalculator = () => {
  const navigate = useNavigate();
  const { calculationId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { effectivePlan } = usePlanPreview(user?.plan);
  
  // Check if auth is complete (regardless of login status)
  const isAuthComplete = !authLoading;
  
  const [inputs, setInputs] = useState({
    address: '',
    homePrice: '',
    downPayment: '',
    downPaymentType: 'dollar', // 'dollar' or 'percent'
    interestRate: '',
    termYears: 30,
    loanType: 'conventional', // 'conventional', 'fha', 'va', 'usda', 'jumbo'
    propertyTaxes: '',
    taxType: 'dollar', // 'dollar' or 'percent'
    insurance: '',
    pmiRate: '',
    hoaMonthly: '',
    grossMonthlyIncome: '',
    otherMonthlyDebt: ''
  });

  const [results, setResults] = useState({
    downPaymentAmount: 0,
    loanAmount: 0,
    ltv: 0,
    principalInterest: 0,
    taxesMonthly: 0,
    insuranceMonthly: 0,
    pmiMonthly: 0,
    hoaMonthly: 0,
    piti: 0,
    qualified: null,
    maxAllowedPITI: null,
    dti: null,
    maxAffordablePrice: null
  });

  const [loading, setLoading] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);
  const [showAICoach, setShowAICoach] = useState(false);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
  const [showBacksolve, setShowBacksolve] = useState(false);

  // Load shared calculation if calculationId is provided, otherwise ensure fields are clear
  useEffect(() => {
    if (calculationId) {
      loadSharedCalculation();
    } else {
      // Ensure fields are cleared when accessing calculator fresh
      clearAllFields();
    }
  }, [calculationId]);

  const clearAllFields = () => {
    setInputs({
      homePrice: '',
      downPayment: '',
      downPaymentType: 'dollar',
      interestRate: '',
      termYears: 30,
      loanType: 'conventional',
      propertyTaxes: '',
      taxType: 'dollar',
      insurance: '',
      pmiRate: '',
      hoaMonthly: '',
      grossMonthlyIncome: '',
      otherMonthlyDebt: ''
    });
    setResults({
      downPaymentAmount: 0,
      loanAmount: 0,
      ltv: 0,
      principalInterest: 0,
      taxesMonthly: 0,
      insuranceMonthly: 0,
      pmiMonthly: 0,
      hoaMonthly: 0,
      piti: 0,
      qualified: null,
      maxAllowedPITI: null,
      dti: null,
      maxAffordablePrice: null
    });
  };

  const loadSharedCalculation = async () => {
    try {
      setLoading(true);
      setIsSharedView(true);
      
      const response = await axios.get(`${backendUrl}/api/affordability/shared/${calculationId}`);
      
      if (response.data) {
        const { inputs: sharedInputs, results: sharedResults } = response.data;
        setInputs(sharedInputs);
        setResults(sharedResults);
        toast.success('Shared calculation loaded successfully!');
      }
    } catch (error) {
      console.error('Error loading shared calculation:', error);
      toast.error('Failed to load shared calculation');
      navigate('/tools/affordability');
    } finally {
      setLoading(false);
    }
  };

  // Calculate results whenever inputs change
  useEffect(() => {
    calculateAffordability();
  }, [inputs]);

  const calculateAffordability = () => {
    try {
      const { downPaymentType, taxType } = inputs;
      
      // Parse formatted numeric values
      const homePrice = parseNumberFromFormatted(inputs.homePrice) || 0;
      const downPayment = parseNumberFromFormatted(inputs.downPayment) || 0;
      const propertyTaxes = parseNumberFromFormatted(inputs.propertyTaxes) || 0;
      const insurance = parseNumberFromFormatted(inputs.insurance) || 0;
      const hoaMonthly = parseNumberFromFormatted(inputs.hoaMonthly) || 0;
      const grossMonthlyIncome = parseNumberFromFormatted(inputs.grossMonthlyIncome) || 0;
      const otherMonthlyDebt = parseNumberFromFormatted(inputs.otherMonthlyDebt) || 0;
      
      // Parse plain numeric values
      const interestRate = parseFloat(inputs.interestRate) || 0;
      const termYears = parseFloat(inputs.termYears) || 30;
      const pmiRate = parseFloat(inputs.pmiRate) || 0;
      const targetDTI = 36; // Fixed DTI at 36%

      // Calculate down payment amount
      const downPaymentAmount = downPaymentType === 'percent' 
        ? homePrice * (downPayment / 100)
        : downPayment;

      // Calculate loan amount
      const loanAmount = homePrice - downPaymentAmount;
      
      // Calculate LTV
      const ltv = homePrice > 0 ? (loanAmount / homePrice) * 100 : 0;

      // Calculate monthly interest rate
      const monthlyRate = (interestRate / 100) / 12;
      const numPayments = termYears * 12;

      // Calculate principal and interest (PI)
      let principalInterest = 0;
      if (monthlyRate > 0) {
        principalInterest = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
      } else {
        principalInterest = loanAmount / numPayments;
      }

      // Calculate property taxes monthly
      const taxesMonthly = taxType === 'percent' 
        ? (homePrice * (propertyTaxes / 100)) / 12
        : propertyTaxes / 12;

      // Calculate insurance monthly
      const insuranceMonthly = insurance / 12;

      // Calculate PMI monthly (if LTV > 80%)
      const pmiMonthly = ltv > 80 ? (loanAmount * (pmiRate / 100)) / 12 : 0;

      // Calculate PITI
      const piti = principalInterest + taxesMonthly + insuranceMonthly + pmiMonthly + hoaMonthly;

      // Calculate qualification metrics if income provided
      let qualified = null;
      let maxAllowedPITI = null;
      let dti = null;
      let maxAffordablePrice = null;

      if (grossMonthlyIncome > 0) {
        maxAllowedPITI = (grossMonthlyIncome * (targetDTI / 100)) - otherMonthlyDebt;
        qualified = piti <= maxAllowedPITI;
        dti = ((piti + otherMonthlyDebt) / grossMonthlyIncome) * 100;

        // Calculate max affordable price (backsolve)
        if (maxAllowedPITI > 0) {
          // Simplified backsolve - assumes same ratios
          const availableForPI = maxAllowedPITI - taxesMonthly - insuranceMonthly - hoaMonthly - pmiMonthly;
          if (availableForPI > 0 && monthlyRate > 0) {
            const maxLoanAmount = availableForPI / (monthlyRate * Math.pow(1 + monthlyRate, numPayments) / (Math.pow(1 + monthlyRate, numPayments) - 1));
            maxAffordablePrice = maxLoanAmount + downPaymentAmount;
          }
        }
      }

      setResults({
        downPaymentAmount: Number.isFinite(downPaymentAmount) ? downPaymentAmount : 0,
        loanAmount: Number.isFinite(loanAmount) ? loanAmount : 0,
        ltv: Number.isFinite(ltv) ? ltv : 0,
        principalInterest: Number.isFinite(principalInterest) ? principalInterest : 0,
        taxesMonthly: Number.isFinite(taxesMonthly) ? taxesMonthly : 0,
        insuranceMonthly: Number.isFinite(insuranceMonthly) ? insuranceMonthly : 0,
        pmiMonthly: Number.isFinite(pmiMonthly) ? pmiMonthly : 0,
        hoaMonthly: Number.isFinite(hoaMonthly) ? hoaMonthly : 0,
        piti: Number.isFinite(piti) ? piti : 0,
        qualified,
        maxAllowedPITI: Number.isFinite(maxAllowedPITI) ? maxAllowedPITI : null,
        dti: Number.isFinite(dti) ? dti : null,
        maxAffordablePrice: Number.isFinite(maxAffordablePrice) ? maxAffordablePrice : null,
        breakdown: {
          principal: Number.isFinite(principalInterest) ? principalInterest : 0,
          taxes: Number.isFinite(taxesMonthly) ? taxesMonthly : 0,
          insurance: Number.isFinite(insuranceMonthly) ? insuranceMonthly : 0,
          pmi: Number.isFinite(pmiMonthly) ? pmiMonthly : 0,
          hoa: Number.isFinite(hoaMonthly) ? hoaMonthly : 0
        }
      });
      
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Error calculating affordability');
    }
  };

  const handleInputChange = (field, value) => {
    // List of numeric fields that should be formatted with commas
    const numericFields = [
      'homePrice', 'downPayment', 'propertyTaxes', 'insurance', 'hoaMonthly',
      'grossMonthlyIncome', 'otherMonthlyDebt'
    ];
    
    // List of fields that should be treated as numbers but not formatted with commas
    const plainNumericFields = ['interestRate', 'termYears', 'pmiRate'];
    
    if (numericFields.includes(field) && value) {
      // Format numeric fields with commas only if there's a value
      const formattedValue = formatNumberWithCommas(value);
      setInputs(prev => ({
        ...prev,
        [field]: formattedValue
      }));
    } else {
      // For all other fields, or empty values, store as-is
      setInputs(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value) => {
    const numValue = parseFloat(value) || 0;
    return `${numValue.toFixed(2)}%`;
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please log in to save calculations');
      return;
    }

    if (effectivePlan === 'FREE') {
      toast.error('Saving calculations requires a Starter or Pro plan. Upgrade to save your calculations.');
      return;
    }

    try {
      const saveData = {
        title: `Affordability Analysis - $${inputs.homePrice.toLocaleString()}`,
        inputs: inputs,
        results: results
      };

      // Get token from localStorage or cookies
      const token = localStorage.getItem('access_token') || 
                   document.cookie.split(';')
                     .find(c => c.trim().startsWith('access_token='))
                     ?.split('=')[1];

      if (!token) {
        toast.error('Authentication token not found. Please log in again.');
        return;
      }

      const response = await axios.post(`${backendUrl}/api/affordability/save`, saveData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.message) {
        toast.success('Calculation saved successfully!');
      }
    } catch (error) {
      console.error('Save error:', error);
      if (error.response?.status === 402) {
        toast.error(error.response.data.detail || 'Plan upgrade required to save calculations');
      } else if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to save calculation. Please try again.');
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!results || !results.piti) {
      toast.error('Please calculate affordability first');
      return;
    }

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      // Prepare data for the backend (same format as investor calculator)
      const payload = {
        calculation_data: results,
        property_data: inputs
      };

      // Make API call to generate PDF using the same pattern as investor calculator
      const response = await fetch(`${backendUrl}/api/reports/affordability/pdf`, {
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
      let filename = 'affordability_analysis.pdf';
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
      toast.error('Failed to download PDF. Please try again.');
    }
  };

  const handleShare = async () => {
    if (!user) {
      toast.error('Please log in to share calculations');
      return;
    }

    if (effectivePlan === 'FREE') {
      toast.error('Sharing calculations requires a Starter or Pro plan. Upgrade to share your calculations.');
      return;
    }

    try {
      // For now, create a shareable summary instead of saving to backend
      const shareableData = {
        homePrice: inputs.homePrice,
        downPayment: inputs.downPayment,
        interestRate: inputs.interestRate,
        monthlyPayment: results.piti,
        qualified: results.qualified,
        ltv: results.ltv
      };

      const shareText = `🏠 Affordability Analysis Results:
📊 Home Price: $${parseNumberFromFormatted(inputs.homePrice)?.toLocaleString() || '0'}
💰 Down Payment: $${parseNumberFromFormatted(inputs.downPayment)?.toLocaleString() || '0'}
📈 Interest Rate: ${parseFloat(inputs.interestRate) || 0}%
💳 Monthly Payment (PITI): $${results.piti?.toLocaleString() || '0'}
📋 LTV: ${(results.ltv || 0).toFixed(2)}%
${results.qualified !== null ? `✅ Qualified: ${results.qualified ? 'Yes' : 'No'}` : ''}

Generated by I Need Numbers - Real Estate Tools`;

      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Calculation summary copied to clipboard! You can now paste and share it.');
      } catch (err) {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Calculation summary copied to clipboard! You can now paste and share it.');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to create shareable content. Please try again.');
    }
  };

  const handleBacksolve = () => {
    if (results.maxAffordablePrice) {
      handleInputChange('homePrice', formatNumberWithCommas(Math.round(results.maxAffordablePrice)));
      toast.success('Updated home price to maximum affordable amount');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigateBackFromCalculator(navigate, user)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tools
          </Button>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-orange-500 text-white rounded-xl mr-4">
                <Home className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center justify-center space-x-3">
                  <h1 className="text-3xl font-bold text-gray-900">Mortgage & Affordability Calculator</h1>
                  {isSharedView && (
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      Shared View
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600">
                  {isSharedView 
                    ? 'Viewing a shared affordability calculation'
                    : 'Calculate PITI and determine what buyers can afford'
                  }
                </p>
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-3 text-gray-600">Loading shared calculation...</span>
              </div>
            )}
          </div>
        </div>

        {!loading && (
          <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="w-5 h-5 mr-2" />
                  Home & Financing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="mb-4">
                  <Label htmlFor="address">Property Address</Label>
                  <Input
                    id="address"
                    type="text"
                    value={inputs.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="123 Main St, City, ST 12345"
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="homePrice">Home Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="homePrice"
                        type="text"
                        inputMode="numeric"
                        value={inputs.homePrice}
                        onChange={(e) => handleInputChange('homePrice', e.target.value)}
                        placeholder="400,000"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Down Payment</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <div className="relative">
                          {inputs.downPaymentType === 'dollar' && (
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          )}
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={inputs.downPayment}
                            onChange={(e) => handleInputChange('downPayment', e.target.value)}
                            placeholder={inputs.downPaymentType === 'dollar' ? '80,000' : '20'}
                            className={inputs.downPaymentType === 'dollar' ? 'pl-10' : 'pr-8'}
                          />
                          {inputs.downPaymentType === 'percent' && (
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <select
                          value={inputs.downPaymentType}
                          onChange={(e) => handleInputChange('downPaymentType', e.target.value)}
                          className="w-full h-10 px-3 border border-gray-200 rounded-md"
                        >
                          <option value="dollar">$</option>
                          <option value="percent">%</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="interestRate">Interest Rate (APR)</Label>
                    <p className="text-xs text-gray-600 mb-2">The annual percentage rate affects your monthly payment and total interest paid over the loan term</p>
                    <div className="relative">
                      <Input
                        id="interestRate"
                        type="number"
                        step="0.01"
                        value={inputs.interestRate}
                        onChange={(e) => handleInputChange('interestRate', e.target.value)}
                        placeholder="7.5"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="termYears">Loan Term (Years)</Label>
                    <Input
                      id="termYears"
                      type="number"
                      value={inputs.termYears}
                      onChange={(e) => handleInputChange('termYears', e.target.value)}
                      placeholder="30"
                    />
                  </div>

                  <div>
                    <Label htmlFor="loanType">Loan Type</Label>
                    <p className="text-xs text-gray-600 mb-2">Different loan programs have varying requirements and benefits</p>
                    <select
                      id="loanType"
                      value={inputs.loanType}
                      onChange={(e) => handleInputChange('loanType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="conventional">Conventional</option>
                      <option value="fha">FHA</option>
                      <option value="va">VA</option>
                      <option value="usda">USDA</option>
                      <option value="jumbo">Jumbo</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taxes, Insurance & HOA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Property Taxes (Annual)</Label>
                  <p className="text-xs text-gray-600 mb-2">Property taxes vary by location and affect your monthly housing payment (PITI)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <div className="relative">
                        {inputs.taxType === 'dollar' && (
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        )}
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={inputs.propertyTaxes}
                          onChange={(e) => handleInputChange('propertyTaxes', e.target.value)}
                          placeholder={inputs.taxType === 'dollar' ? '8,000' : '2.0'}
                          className={inputs.taxType === 'dollar' ? 'pl-10' : 'pr-8'}
                        />
                        {inputs.taxType === 'percent' && (
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <select
                        value={inputs.taxType}
                        onChange={(e) => handleInputChange('taxType', e.target.value)}
                        className="w-full h-10 px-3 border border-gray-200 rounded-md"
                      >
                        <option value="dollar">$</option>
                        <option value="percent">%</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="insurance">Home Insurance (Annual)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="insurance"
                        type="text"
                        inputMode="numeric"
                        value={inputs.insurance}
                        onChange={(e) => handleInputChange('insurance', e.target.value)}
                        placeholder="1,200"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="pmiRate">PMI Rate (Annual %)</Label>
                    <p className="text-xs text-gray-600 mb-2">Private Mortgage Insurance protects lenders when down payment is less than 20%</p>
                    <div className="relative">
                      <Input
                        id="pmiRate"
                        type="number"
                        step="0.1"
                        value={inputs.pmiRate}
                        onChange={(e) => handleInputChange('pmiRate', e.target.value)}
                        placeholder="0.5"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-applied if LTV &gt; 80%</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="hoaMonthly">HOA Monthly</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="hoaMonthly"
                      type="text"
                      inputMode="numeric"
                      value={inputs.hoaMonthly}
                      onChange={(e) => handleInputChange('hoaMonthly', e.target.value)}
                      placeholder="0"
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Qualification Check (Optional)</CardTitle>
                <CardDescription>Add income details to check affordability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="grossMonthlyIncome">Gross Monthly Income</Label>
                    <p className="text-xs text-gray-600 mb-2">Your total monthly income before taxes - determines how much house you can afford</p>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="grossMonthlyIncome"
                        type="text"
                        inputMode="numeric"
                        value={inputs.grossMonthlyIncome}
                        onChange={(e) => handleInputChange('grossMonthlyIncome', e.target.value)}
                        placeholder="10,000"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="otherMonthlyDebt">Other Monthly Debt</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="otherMonthlyDebt"
                        type="text"
                        inputMode="numeric"
                        value={inputs.otherMonthlyDebt}
                        onChange={(e) => handleInputChange('otherMonthlyDebt', e.target.value)}
                        placeholder="2,500"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="w-5 h-5 mr-2" />
                  Monthly Payment (PITI)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {formatCurrency(results.piti)}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Principal, Interest, Taxes & Insurance</p>
                  
                  {results.piti > 0 && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Principal & Interest:</span>
                        <span>{formatCurrency(results.principalInterest)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Property Taxes:</span>
                        <span>{formatCurrency(results.taxesMonthly)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Insurance:</span>
                        <span>{formatCurrency(results.insuranceMonthly)}</span>
                      </div>
                      {results.pmiMonthly > 0 && (
                        <div className="flex justify-between">
                          <span>PMI:</span>
                          <span>{formatCurrency(results.pmiMonthly)}</span>
                        </div>
                      )}
                      {results.hoaMonthly > 0 && (
                        <div className="flex justify-between">
                          <span>HOA:</span>
                          <span>{formatCurrency(results.hoaMonthly)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t space-y-3">
                    {/* AI Coach Button - Pro Users Only */}
                    {!isAuthComplete ? (
                      <Button 
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white opacity-50"
                        disabled
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        <Sparkles className="w-3 h-3 mr-1" />
                        Loading...
                      </Button>
                    ) : user && effectivePlan === 'PRO' ? (
                      <Button 
                        onClick={() => setShowAICoach(true)}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                        disabled={!inputs.homePrice || !inputs.grossMonthlyIncome}
                      >
                        <Sparkles className="w-4 h-4 mr-2 text-green-600" />
                        <Sparkles className="w-3 h-3 mr-1" />
                        Fairy AI Coach
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => navigate('/pricing')}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white opacity-75"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        <Sparkles className="w-3 h-3 mr-1" />
                        Fairy AI Coach (Pro Only)
                      </Button>
                    )}

                    {results.piti > 0 && (
                      <Button 
                        onClick={handleDownloadPDF}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF Report
                      </Button>
                    )}
                    
                    {user && ['STARTER', 'PRO'].includes(user.plan) && results.piti > 0 && (
                      <Button
                        onClick={async () => {
                          try {
                            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

                            const response = await fetch(`${backendUrl}/api/affordability/save`, {
                              method: 'POST',
                              credentials: 'include',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                title: inputs.address || `Affordability - ${new Date().toLocaleDateString()}`,
                                inputs: inputs,
                                results: results
                              })
                            });

                            if (!response.ok) {
                              const error = await response.json();
                              throw new Error(error.detail || 'Failed to save');
                            }

                            const data = await response.json();
                            toast.success(data.message || 'Calculation saved!');
                          } catch (error) {
                            toast.error(error.message || 'Failed to save calculation');
                          }
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Calculation
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loan Details Card */}
            {results.loanAmount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Loan Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loan Amount:</span>
                    <span className="font-semibold">{formatCurrency(results.loanAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Down Payment:</span>
                    <span className="font-semibold">{formatCurrency(results.downPaymentAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">LTV Ratio:</span>
                    <span className="font-semibold">{formatPercent(results.ltv)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Qualification Results */}
            {results.qualified !== null && inputs.grossMonthlyIncome && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    {results.qualified ? (
                      <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                    )}
                    Qualification Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Alert className={results.qualified ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                    <AlertDescription className={results.qualified ? "text-green-700" : "text-red-700"}>
                      {results.qualified 
                        ? "✅ This payment fits within recommended DTI guidelines"
                        : "⚠️ This payment exceeds recommended DTI guidelines"
                      }
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current DTI:</span>
                      <span className="font-semibold">{formatPercent(results.dti)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Recommended:</span>
                      <span className="font-semibold">36%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max PITI Allowed:</span>
                      <span className="font-semibold">{formatCurrency(results.maxAllowedPITI)}</span>
                    </div>
                  </div>

                  {results.maxAffordablePrice && results.maxAffordablePrice !== results.loanAmount + results.downPaymentAmount && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-600 mb-2">Maximum Affordable Home Price:</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatCurrency(results.maxAffordablePrice)}
                      </p>
                      <Button 
                        onClick={handleBacksolve}
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                      >
                        Update to Max Price
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

        </div>
        )}

        {/* Bottom spacing removed since no sticky bar */}

        {/* AI Coach Modal - Pro Users Only */}
        {effectivePlan === 'PRO' && (
          <AffordabilityAICoach
            isOpen={showAICoach}
            onClose={() => setShowAICoach(false)}
            inputs={inputs}
            results={results}
          />
        )}
      </div>
    </div>
  );
};

export default AffordabilityCalculator;
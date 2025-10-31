import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft, 
  DollarSign, 
  Download, 
  Save, 
  Share2,
  Calculator,
  HelpCircle,
  Lock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePlanPreview } from '../hooks/usePlanPreview';
import { toast } from 'sonner';
import axios from 'axios';
import PDFReport from '../components/PDFReport';
import { formatNumberWithCommas, parseNumberFromFormatted } from '../utils/calculatorUtils';
import { navigateBackFromCalculator } from '../utils/navigation';

const CommissionSplitCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectivePlan } = usePlanPreview(user?.plan);
  
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  
  // Backend URL
  const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
  
  // Auth helper functions
  const getAuthToken = () => {
    return localStorage.getItem('access_token') || 
           document.cookie.split(';')
             .find(c => c.trim().startsWith('access_token='))
             ?.split('=')[1];
  };

  const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  };
  
  const [inputs, setInputs] = useState({
    address: '',
    salePrice: '',
    totalCommission: '',
    yourSide: 'listing', // 'listing', 'buyer', 'dual'
    brokerageSplit: '',
    referralPercent: '',
    teamPercent: '',
    transactionFee: '',
    royaltyFee: ''
  });

  const [results, setResults] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Clear all fields when component mounts
  useEffect(() => {
    clearAllFields();
  }, []);

  const clearAllFields = () => {
    setInputs({
      address: '',
      salePrice: '',
      totalCommission: '',
      yourSide: 'listing',
      brokerageSplit: '',
      referralPercent: '',
      teamPercent: '',
      transactionFee: '',
      royaltyFee: ''
    });
    setResults({});
  };

  // Calculate results whenever inputs change
  useEffect(() => {
    calculateCommission();
  }, [inputs]);

  const calculateCommission = () => {
    setIsCalculating(true);
    
    try {
      // Parse formatted numeric values with fallback to 0
      const salePrice = parseNumberFromFormatted(inputs.salePrice) || 0;
      const totalCommission = parseFloat(inputs.totalCommission) || 0;
      const brokerageSplit = parseFloat(inputs.brokerageSplit) || 0;
      const referralPercent = parseFloat(inputs.referralPercent) || 0;
      const teamPercent = parseFloat(inputs.teamPercent) || 0;
      const transactionFee = parseNumberFromFormatted(inputs.transactionFee) || 0;
      const royaltyFee = parseNumberFromFormatted(inputs.royaltyFee) || 0;
      
      // Only calculate if we have meaningful input values
      if (salePrice === 0 || totalCommission === 0) {
        setResults({});
        setIsCalculating(false);
        return;
      }
      
      // Step 1: Calculate GCI (Gross Commission Income)
      const gci = salePrice * (totalCommission / 100);
      
      // Step 2: Determine your side share
      let yourSideShare = 0.5; // Default for listing or buyer side
      if (inputs.yourSide === 'dual') {
        yourSideShare = 1.0; // Get full commission for dual agency
      }
      
      // Step 3: Calculate side GCI
      const sideGCI = gci * yourSideShare;
      
      // Step 4: Calculate agent gross before fees (only if brokerage split is provided)
      const agentGrossBeforeFees = brokerageSplit > 0 ? sideGCI * (brokerageSplit / 100) : sideGCI;
      
      // Step 5: Calculate deductions
      const referralAmount = agentGrossBeforeFees * (referralPercent / 100);
      const teamAmount = agentGrossBeforeFees * (teamPercent / 100);
      const fixedFees = transactionFee + royaltyFee;
      
      // Step 6: Calculate final take home
      const agentTakeHome = agentGrossBeforeFees - referralAmount - teamAmount - fixedFees;
      
      // Step 7: Calculate effective commission rate (what percentage of sale price you actually get)
      
      setResults({
        gci,
        sideGCI,
        agentGrossBeforeFees,
        referralAmount,
        teamAmount,
        fixedFees,
        agentTakeHome,
        // Additional metrics
        effectiveCommissionRate: salePrice > 0 ? (agentTakeHome / salePrice) * 100 : 0,
        percentOfGCI: gci > 0 ? (agentTakeHome / gci) * 100 : 0
      });
      
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Error calculating commission split');
    }
    
    setIsCalculating(false);
  };

  const handleInputChange = (field, value) => {
    // List of numeric fields that should be formatted with commas
    const numericFields = ['salePrice', 'transactionFee', 'royaltyFee'];
    
    if (numericFields.includes(field) && value) {
      // Format numeric fields with commas
      const formattedValue = formatNumberWithCommas(value);
      setInputs(prev => ({
        ...prev,
        [field]: formattedValue
      }));
    } else {
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
    return `${value.toFixed(2)}%`;
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
        title: `Commission Split - $${inputs.salePrice.toLocaleString()}`,
        inputs: inputs,
        results: results
      };

      const response = await axios.post(`${backendUrl}/api/commission/save`, saveData, {
        headers: getAuthHeaders()
      });

      if (response.data && response.data.message) {
        toast.success('Commission calculation saved successfully!');
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
    if (!results || !results.agentTakeHome) {
      toast.error('Please calculate commission split first');
      return;
    }

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      // Prepare data for the backend (same format as other calculators)
      const payload = {
        calculation_data: results,
        property_data: inputs
      };

      // Make API call to generate PDF using the same pattern as other calculators
      const response = await fetch(`${backendUrl}/api/reports/commission/pdf`, {
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
      let filename = 'commission_split_analysis.pdf';
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
      // Create shareable text summary
      const shareText = `💰 Commission Split Analysis:
🏠 Sale Price: $${inputs.salePrice.toLocaleString()}
📊 Commission Rate: ${inputs.totalCommission}%
💵 Total Commission: $${results.gci?.toLocaleString()}
💰 Your Take Home: $${results.agentTakeHome?.toLocaleString()}

Generated by I Need Numbers - Real Estate Tools`;

      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Commission analysis copied to clipboard! You can now paste and share it.');
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
        toast.success('Commission analysis copied to clipboard! You can now paste and share it.');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to create shareable content. Please try again.');
    }
  };

  const isPaid = effectivePlan === 'STARTER' || effectivePlan === 'PRO';

  const handleSaveCalculation = async () => {
    if (!user || !['STARTER', 'PRO'].includes(user.plan)) {
      toast.error('Saving calculations requires a STARTER or PRO plan');
      return;
    }

    setIsSaving(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/commission/save`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: inputs.address || `Commission Split - ${new Date().toLocaleDateString()}`,
          inputs: inputs,
          results: results
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
              <div className="p-3 bg-green-500 text-white rounded-xl mr-4">
                <DollarSign className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Commission Split Calculator</h1>
                <p className="text-gray-600">Calculate your take-home after all fees and splits</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="w-5 h-5 mr-2" />
                  Transaction Details
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
                    <Label htmlFor="salePrice">Sale Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="salePrice"
                        type="text"
                        inputMode="numeric"
                        value={inputs.salePrice}
                        onChange={(e) => handleInputChange('salePrice', e.target.value)}
                        placeholder="500,000"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="totalCommission">Total Commission %</Label>
                    <div className="relative">
                      <Input
                        id="totalCommission"
                        type="number"
                        step="0.1"
                        value={inputs.totalCommission}
                        onChange={(e) => handleInputChange('totalCommission', parseFloat(e.target.value) || 0)}
                        placeholder="6.0"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="yourSide">Your Side</Label>
                  <Select value={inputs.yourSide} onValueChange={(value) => handleInputChange('yourSide', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your side" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="listing">Listing Side (50%)</SelectItem>
                      <SelectItem value="buyer">Buyer Side (50%)</SelectItem>
                      <SelectItem value="dual">Dual Agency (100%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Splits & Fees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brokerageSplit">Brokerage Split %</Label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Agent's share:</span>
                      <div className="relative flex-1">
                        <Input
                          id="brokerageSplit"
                          type="number"
                          step="1"
                          value={inputs.brokerageSplit}
                          onChange={(e) => handleInputChange('brokerageSplit', parseFloat(e.target.value) || 0)}
                          placeholder="70"
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="referralPercent">Referral %</Label>
                    <div className="relative">
                      <Input
                        id="referralPercent"
                        type="number"
                        step="0.1"
                        value={inputs.referralPercent}
                        onChange={(e) => handleInputChange('referralPercent', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="teamPercent">Team/Partner %</Label>
                    <div className="relative">
                      <Input
                        id="teamPercent"
                        type="number"
                        step="0.1"
                        value={inputs.teamPercent}
                        onChange={(e) => handleInputChange('teamPercent', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="transactionFee">Transaction Fee</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="transactionFee"
                        type="text"
                        inputMode="numeric"
                        value={inputs.transactionFee}
                        onChange={(e) => handleInputChange('transactionFee', e.target.value)}
                        placeholder="500"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="royaltyFee">Franchise/Royalty Fee</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="royaltyFee"
                        type="text"
                        inputMode="numeric"
                        value={inputs.royaltyFee}
                        onChange={(e) => handleInputChange('royaltyFee', e.target.value)}
                        placeholder="250"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-center">Your Take-Home</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="text-4xl font-bold text-green-600">
                    {results.agentTakeHome ? formatCurrency(results.agentTakeHome) : '$0'}
                  </div>
                  
                  {results.effectiveCommissionRate && (
                    <div className="text-sm text-gray-600">
                      {formatPercent(results.effectiveCommissionRate)} of sale price
                    </div>
                  )}

                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total GCI:</span>
                      <span className="font-medium">{results.gci ? formatCurrency(results.gci) : '$0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Your Side GCI:</span>
                      <span className="font-medium">{results.sideGCI ? formatCurrency(results.sideGCI) : '$0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Agent Gross:</span>
                      <span className="font-medium">{results.agentGrossBeforeFees ? formatCurrency(results.agentGrossBeforeFees) : '$0'}</span>
                    </div>
                    {results.referralAmount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Referral:</span>
                        <span>-{formatCurrency(results.referralAmount)}</span>
                      </div>
                    )}
                    {results.teamAmount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Team Split:</span>
                        <span>-{formatCurrency(results.teamAmount)}</span>
                      </div>
                    )}
                    {results.fixedFees > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Fixed Fees:</span>
                        <span>-{formatCurrency(results.fixedFees)}</span>
                      </div>
                    )}
                  </div>

                  {results.agentTakeHome > 0 && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <Button 
                        onClick={handleDownloadPDF}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF Report
                      </Button>
                      
                      {user && ['STARTER', 'PRO'].includes(user.plan) && (
                        <Button
                          onClick={handleSaveCalculation}
                          disabled={isSaving}
                          variant="outline"
                          className="w-full"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {isSaving ? 'Saving...' : 'Save Calculation'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Plan Badge */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <Badge variant={effectivePlan === 'FREE' ? 'secondary' : 'default'}>
                    {effectivePlan} Plan
                  </Badge>
                  {effectivePlan === 'FREE' && (
                    <p className="text-xs text-gray-600">
                      Upgrade to save and share your calculations
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>



        {/* PDF Preview Modal */}
        {showPDFPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">PDF Preview - Commission Split Analysis</h2>
                <Button
                  onClick={() => setShowPDFPreview(false)}
                  variant="ghost"
                  className="p-2"
                >
                  ✕
                </Button>
              </div>
              <div className="p-4">
                <PDFReport 
                  data={{
                    property_address: `Commission Split Analysis`,
                    purchase_price: inputs.salePrice,
                    total_commission: results.totalCommission,
                    agent_commission: results.agentTakeHome,
                    commission_rate: inputs.totalCommission,
                    listing_side: inputs.listingSplit,
                    selling_side: inputs.sellingSplit,
                    broker_fee: results.brokerFee,
                    referral_fee: results.referralFee
                  }}
                  plan={effectivePlan}
                  agentProfile={null}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommissionSplitCalculator;
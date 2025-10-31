import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Save, 
  Share2,
  Calculator,
  DollarSign,
  Lock,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePlanPreview } from '../hooks/usePlanPreview';
import { toast } from 'sonner';
import axios from 'axios';
import PDFReport from '../components/PDFReport';
import NetSheetAICoach from '../components/NetSheetAICoach';
import { formatNumberWithCommas, parseNumberFromFormatted } from '../utils/calculatorUtils';
import { navigateBackFromCalculator } from '../utils/navigation';

const SellerNetSheetCalculator = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { effectivePlan } = usePlanPreview(user?.plan);
  
  // If still loading auth, don't render AI Coach button yet
  const isUserLoaded = !loading && user;
  
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showAICoach, setShowAICoach] = useState(false);
  
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
    expectedSalePrice: '',
    firstPayoff: '',
    secondPayoff: '',
    totalCommission: '',
    sellerConcessions: '',
    concessionsType: 'dollar', // 'dollar' or 'percent'
    titleEscrowFee: '',
    recordingFee: '',
    transferTax: '',
    docStamps: '',
    hoaFees: '',
    stagingPhotography: '',
    otherCosts: '',
    proratedTaxes: '',
    dealState: ''
  });

  const [results, setResults] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Clear all fields when component mounts - safely implemented
  useEffect(() => {
    // Use setTimeout to ensure component is fully mounted before clearing
    const timer = setTimeout(() => {
      try {
        clearAllFields();
      } catch (error) {
        console.error('Error clearing fields:', error);
        // Fallback to just clearing results if clearAllFields fails
        setResults({});
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const clearAllFields = () => {
    setInputs({
      expectedSalePrice: '',
      firstPayoff: '',
      secondPayoff: '',
      totalCommission: '',
      sellerConcessions: '',
      concessionsType: 'dollar',
      titleEscrowFee: '',
      recordingFee: '',
      transferTax: '',
      docStamps: '',
      hoaFees: '',
      stagingPhotography: '',
      otherCosts: '',
      proratedTaxes: '',
      dealState: ''
    });
    setResults({});
  };

  // Calculate results whenever inputs change
  useEffect(() => {
    calculateNetSheet();
  }, [inputs]);

  const calculateNetSheet = () => {
    setIsCalculating(true);
    
    try {
      // Parse formatted numeric values with fallback to 0
      const expectedSalePrice = parseNumberFromFormatted(inputs.expectedSalePrice) || 0;
      const firstPayoff = parseNumberFromFormatted(inputs.firstPayoff) || 0;
      const secondPayoff = parseNumberFromFormatted(inputs.secondPayoff) || 0;
      const totalCommission = parseFloat(inputs.totalCommission) || 0;
      const sellerConcessions = parseNumberFromFormatted(inputs.sellerConcessions) || 0;
      const titleEscrowFee = parseNumberFromFormatted(inputs.titleEscrowFee) || 0;
      const recordingFee = parseNumberFromFormatted(inputs.recordingFee) || 0;
      const transferTax = parseNumberFromFormatted(inputs.transferTax) || 0;
      const docStamps = parseNumberFromFormatted(inputs.docStamps) || 0;
      const hoaFees = parseNumberFromFormatted(inputs.hoaFees) || 0;
      const stagingPhotography = parseNumberFromFormatted(inputs.stagingPhotography) || 0;
      const otherCosts = parseNumberFromFormatted(inputs.otherCosts) || 0;
      const proratedTaxes = parseNumberFromFormatted(inputs.proratedTaxes) || 0;
      const concessionsType = inputs.concessionsType || 'dollar';
      
      // Only calculate if we have a meaningful sale price
      if (expectedSalePrice === 0) {
        setResults({});
        setIsCalculating(false);
        return;
      }

      // Calculate commission
      const commissionAmount = expectedSalePrice * (totalCommission / 100);
      
      // Calculate concessions
      const concessionsAmount = concessionsType === 'percent' 
        ? expectedSalePrice * (sellerConcessions / 100)
        : sellerConcessions;
      
      // Calculate closing costs
      const closingCosts = titleEscrowFee + recordingFee + transferTax + docStamps + hoaFees + stagingPhotography + otherCosts;
      
      // Calculate payoffs
      const totalPayoffs = firstPayoff + secondPayoff;
      
      // Calculate estimated seller net
      const grossProceeds = expectedSalePrice;
      const totalDeductions = commissionAmount + concessionsAmount + closingCosts + totalPayoffs + proratedTaxes;
      const estimatedSellerNet = grossProceeds - totalDeductions;
      
      // Calculate percentages
      const netAsPercentOfSale = (estimatedSellerNet / expectedSalePrice) * 100;
      
      setResults({
        grossProceeds,
        commissionAmount,
        concessionsAmount,
        closingCosts,
        totalPayoffs,
        proratedTaxes,
        totalDeductions,
        estimatedSellerNet,
        netAsPercentOfSale,
        breakdown: {
          titleEscrowFee,
          recordingFee,
          transferTax,
          docStamps,
          hoaFees,
          stagingPhotography,
          otherCosts,
          firstPayoff,
          secondPayoff
        }
      });
      
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Error calculating seller net sheet');
    }
    
    setIsCalculating(false);
  };

  const handleInputChange = (field, value) => {
    // List of numeric fields that should be formatted with commas
    const numericFields = [
      'expectedSalePrice', 'sellerConcessions', 'firstPayoff', 'secondPayoff',
      'titleEscrowFee', 'recordingFee', 'transferTax', 'docStamps', 'hoaFees',
      'stagingPhotography', 'otherCosts', 'proratedTaxes'
    ];
    
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
        title: `Seller Net Sheet - $${inputs.expectedSalePrice.toLocaleString()}`,
        inputs: inputs,
        results: results
      };

      const response = await axios.post(`${backendUrl}/api/seller-net/save`, saveData, {
        headers: getAuthHeaders()
      });

      if (response.data && response.data.message) {
        toast.success('Seller net sheet saved successfully!');
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
    if (!results || !results.estimatedSellerNet) {
      toast.error('Please calculate seller net sheet first');
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
      const response = await fetch(`${backendUrl}/api/reports/seller-net/pdf`, {
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
      let filename = 'seller_net_sheet_analysis.pdf';
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
      const shareText = `📋 Seller Net Sheet Analysis:
🏠 Sale Price: $${inputs.expectedSalePrice.toLocaleString()}
💰 Estimated Net Proceeds: $${results.estimatedSellerNet?.toLocaleString()}
📊 Total Closing Costs: $${results.totalDeductions?.toLocaleString()}

Generated by I Need Numbers - Real Estate Tools`;

      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Seller net sheet copied to clipboard! You can now paste and share it.');
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
        toast.success('Seller net sheet copied to clipboard! You can now paste and share it.');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to create shareable content. Please try again.');
    }
  };

  const handleSaveCalculation = async () => {
    if (!user || !['STARTER', 'PRO'].includes(user.plan)) {
      toast.error('Saving calculations requires a STARTER or PRO plan');
      return;
    }

    setIsSaving(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

      const response = await fetch(`${backendUrl}/api/seller-net/save`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: inputs.address || `Seller Net Sheet - ${new Date().toLocaleDateString()}`,
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
              <div className="p-3 bg-purple-500 text-white rounded-xl mr-4">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Seller Net Sheet Estimator</h1>
                <p className="text-gray-600">Estimate what your seller will net from the sale</p>
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
                  Sale Information
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
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="expectedSalePrice">Expected Sale Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="expectedSalePrice"
                        type="text"
                        inputMode="numeric"
                        value={inputs.expectedSalePrice}
                        onChange={(e) => handleInputChange('expectedSalePrice', e.target.value)}
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

                  <div>
                    <Label htmlFor="dealState">Deal State</Label>
                    <select
                      id="dealState"
                      value={inputs.dealState}
                      onChange={(e) => handleInputChange('dealState', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select State</option>
                      <option value="AL">Alabama</option>
                      <option value="AK">Alaska</option>
                      <option value="AZ">Arizona</option>
                      <option value="AR">Arkansas</option>
                      <option value="CA">California</option>
                      <option value="CO">Colorado</option>
                      <option value="CT">Connecticut</option>
                      <option value="DE">Delaware</option>
                      <option value="FL">Florida</option>
                      <option value="GA">Georgia</option>
                      <option value="HI">Hawaii</option>
                      <option value="ID">Idaho</option>
                      <option value="IL">Illinois</option>
                      <option value="IN">Indiana</option>
                      <option value="IA">Iowa</option>
                      <option value="KS">Kansas</option>
                      <option value="KY">Kentucky</option>
                      <option value="LA">Louisiana</option>
                      <option value="ME">Maine</option>
                      <option value="MD">Maryland</option>
                      <option value="MA">Massachusetts</option>
                      <option value="MI">Michigan</option>
                      <option value="MN">Minnesota</option>
                      <option value="MS">Mississippi</option>
                      <option value="MO">Missouri</option>
                      <option value="MT">Montana</option>
                      <option value="NE">Nebraska</option>
                      <option value="NV">Nevada</option>
                      <option value="NH">New Hampshire</option>
                      <option value="NJ">New Jersey</option>
                      <option value="NM">New Mexico</option>
                      <option value="NY">New York</option>
                      <option value="NC">North Carolina</option>
                      <option value="ND">North Dakota</option>
                      <option value="OH">Ohio</option>
                      <option value="OK">Oklahoma</option>
                      <option value="OR">Oregon</option>
                      <option value="PA">Pennsylvania</option>
                      <option value="RI">Rhode Island</option>
                      <option value="SC">South Carolina</option>
                      <option value="SD">South Dakota</option>
                      <option value="TN">Tennessee</option>
                      <option value="TX">Texas</option>
                      <option value="UT">Utah</option>
                      <option value="VT">Vermont</option>
                      <option value="VA">Virginia</option>
                      <option value="WA">Washington</option>
                      <option value="WV">West Virginia</option>
                      <option value="WI">Wisconsin</option>
                      <option value="WY">Wyoming</option>
                      <option value="DC">Washington DC</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Seller Concessions</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <div className="relative">
                        {inputs.concessionsType === 'dollar' && (
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        )}
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={inputs.sellerConcessions}
                          onChange={(e) => handleInputChange('sellerConcessions', e.target.value)}
                          placeholder={inputs.concessionsType === 'dollar' ? '5,000' : '2.0'}
                          className={inputs.concessionsType === 'dollar' ? 'pl-10' : 'pr-8'}
                        />
                        {inputs.concessionsType === 'percent' && (
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <select
                        value={inputs.concessionsType}
                        onChange={(e) => handleInputChange('concessionsType', e.target.value)}
                        className="w-full h-10 px-3 border border-gray-200 rounded-md"
                      >
                        <option value="dollar">$</option>
                        <option value="percent">%</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Loans & Payoffs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstPayoff">First Mortgage Payoff</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="firstPayoff"
                        type="text"
                        inputMode="numeric"
                        value={inputs.firstPayoff}
                        onChange={(e) => handleInputChange('firstPayoff', e.target.value)}
                        placeholder="250,000"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="secondPayoff">Second/HELOC Payoff</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="secondPayoff"
                        type="text"
                        inputMode="numeric"
                        value={inputs.secondPayoff}
                        onChange={(e) => handleInputChange('secondPayoff', e.target.value)}
                        placeholder="0"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Closing Costs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="titleEscrowFee">Title/Escrow/Attorney</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="titleEscrowFee"
                        type="text"
                        inputMode="numeric"
                        value={inputs.titleEscrowFee}
                        onChange={(e) => handleInputChange('titleEscrowFee', e.target.value)}
                        placeholder="2,500"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="recordingFee">Recording Fees</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="recordingFee"
                        type="text"
                        inputMode="numeric"
                        value={inputs.recordingFee}
                        onChange={(e) => handleInputChange('recordingFee', e.target.value)}
                        placeholder="500"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="transferTax">Transfer Tax</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="transferTax"
                        type="text"
                        inputMode="numeric"
                        value={inputs.transferTax}
                        onChange={(e) => handleInputChange('transferTax', e.target.value)}
                        placeholder="1,000"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="docStamps">Doc Stamps</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="docStamps"
                        type="text"
                        inputMode="numeric"
                        value={inputs.docStamps}
                        onChange={(e) => handleInputChange('docStamps', e.target.value)}
                        placeholder="750"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="hoaFees">HOA Transfer</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="hoaFees"
                        type="text"
                        inputMode="numeric"
                        value={inputs.hoaFees}
                        onChange={(e) => handleInputChange('hoaFees', e.target.value)}
                        placeholder="300"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="stagingPhotography">Staging/Photography</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="stagingPhotography"
                        type="text"
                        inputMode="numeric"
                        value={inputs.stagingPhotography}
                        onChange={(e) => handleInputChange('stagingPhotography', e.target.value)}
                        placeholder="1,500"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="otherCosts">Other Costs</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="otherCosts"
                        type="text"
                        inputMode="numeric"
                        value={inputs.otherCosts}
                        onChange={(e) => handleInputChange('otherCosts', e.target.value)}
                        placeholder="0"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="proratedTaxes">Prorated Taxes</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="proratedTaxes"
                      type="text"
                      inputMode="numeric"
                      value={inputs.proratedTaxes}
                      onChange={(e) => handleInputChange('proratedTaxes', e.target.value)}
                      placeholder="2,000"
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-center">Estimated Seller Net</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="text-4xl font-bold text-green-600">
                    {results.estimatedSellerNet ? formatCurrency(results.estimatedSellerNet) : '$0'}
                  </div>
                  
                  {results.netAsPercentOfSale && (
                    <div className="text-sm text-gray-600">
                      {formatPercent(results.netAsPercentOfSale)} of sale price
                    </div>
                  )}

                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between font-medium">
                      <span>Gross Proceeds:</span>
                      <span className="text-green-600">{results.grossProceeds ? formatCurrency(results.grossProceeds) : '$0'}</span>
                    </div>
                    
                    <div className="space-y-1 text-red-600">
                      <div className="flex justify-between">
                        <span>Commission:</span>
                        <span>-{results.commissionAmount ? formatCurrency(results.commissionAmount) : '$0'}</span>
                      </div>
                      {results.concessionsAmount > 0 && (
                        <div className="flex justify-between">
                          <span>Concessions:</span>
                          <span>-{formatCurrency(results.concessionsAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Closing Costs:</span>
                        <span>-{results.closingCosts ? formatCurrency(results.closingCosts) : '$0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Loan Payoffs:</span>
                        <span>-{results.totalPayoffs ? formatCurrency(results.totalPayoffs) : '$0'}</span>
                      </div>
                      {results.proratedTaxes > 0 && (
                        <div className="flex justify-between">
                          <span>Prorated Taxes:</span>
                          <span>-{formatCurrency(results.proratedTaxes)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span>Total Deductions:</span>
                      <span className="text-red-600">-{results.totalDeductions ? formatCurrency(results.totalDeductions) : '$0'}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t space-y-3">
                    {/* AI Coach Button - Pro Users Only */}
                    {isUserLoaded && effectivePlan === 'PRO' ? (
                      <Button 
                        onClick={() => setShowAICoach(true)}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                        disabled={!inputs.expectedSalePrice}
                      >
                        <Sparkles className="w-4 h-4 mr-2 text-green-600" />
                        <Sparkles className="w-3 h-3 mr-1" />
                        Fairy AI Coach
                      </Button>
                    ) : isUserLoaded ? (
                      <Button 
                        onClick={() => navigate('/pricing')}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white opacity-75"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        <Sparkles className="w-3 h-3 mr-1" />
                        Fairy AI Coach (Pro Only)
                      </Button>
                    ) : (
                      <Button 
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white opacity-50"
                        disabled
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        <Sparkles className="w-3 h-3 mr-1" />
                        Loading...
                      </Button>
                    )}

                    {results.estimatedSellerNet > 0 && (
                      <>
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
                            className="w-full mt-3"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Estimate'}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This is an estimate. Actual costs may vary. Consult with title company for precise figures.
              </AlertDescription>
            </Alert>

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
      </div>

      {/* PDF Preview Modal */}
      {showPDFPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">PDF Preview - Seller Net Sheet</h3>
                <Button
                  variant="outline"
                  onClick={() => setShowPDFPreview(false)}
                  className="ml-4"
                >
                  Close
                </Button>
              </div>
              
              <div className="border rounded-lg p-6 bg-gray-50">
                <PDFReport 
                  dealData={{
                    title: `Seller Net Sheet - $${inputs.expectedSalePrice.toLocaleString()}`,
                    inputs: inputs,
                    results: results,
                    calculator_type: 'SellerNet'
                  }}
                />
              </div>

              <div className="flex justify-end gap-4 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPDFPreview(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  Print PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Coach Modal - Pro Users Only */}
      {effectivePlan === 'PRO' && (
        <NetSheetAICoach
          isOpen={showAICoach}
          onClose={() => setShowAICoach(false)}
          inputs={inputs}
          results={results}
          dealState={inputs.dealState}
        />
      )}
    </div>
  );
};

export default SellerNetSheetCalculator;
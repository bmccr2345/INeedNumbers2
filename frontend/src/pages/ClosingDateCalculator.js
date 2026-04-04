import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft, 
  Clock, 
  Download, 
  Save, 
  Share2,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  Lock,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePlanPreview } from '../hooks/usePlanPreview';
import { toast } from 'sonner';
import axios from 'axios';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { navigateBackFromCalculator } from '../utils/navigation';
import PdfLoadingPopup from '../components/PdfLoadingPopup';
import API_BASE_URL from '../config/api';

const ClosingDateCalculator = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, getToken } = useAuth();
  const { effectivePlan } = usePlanPreview(user?.plan);
  
  // Backend URL
  const backendUrl = API_BASE_URL;
  
  // Loading state for fetching saved calculation
  const [isLoadingCalculation, setIsLoadingCalculation] = useState(false);
  
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
    underContractDate: '',
    closingDate: '',
    pestInspectionDays: '',
    homeInspectionDays: '',
    dueDiligenceRepairRequestsDays: '',
    finalWalkthroughDays: '',
    appraisalDays: '',
    dueDiligenceStartDate: '',
    dueDiligenceStopDate: '',
    // Agent notes for each milestone
    pestInspectionNote: '',
    homeInspectionNote: '',
    dueDiligenceRepairRequestsNote: '',
    finalWalkthroughNote: '',
    appraisalNote: '',
    dueDiligenceStartNote: '',
    dueDiligenceStopNote: '',
    generalNotes: ''
  });

  const [timeline, setTimeline] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showTerminology, setShowTerminology] = useState(false);
  const [showPdfPopup, setShowPdfPopup] = useState(false);

  // Load saved calculation if ID is present in URL
  useEffect(() => {
    const calculationId = searchParams.get('id');
    if (calculationId) {
      loadSavedCalculation(calculationId);
    }
  }, [searchParams]);

  const loadSavedCalculation = async (calculationId) => {
    try {
      setIsLoadingCalculation(true);

      const response = await axios.get(`${backendUrl}/api/closing-date/${calculationId}`);
      const data = response.data;

      console.log('[ClosingDateCalculator] Loaded saved calculation:', data);

      // Populate the form with saved inputs (merge with defaults)
      if (data.inputs) {
        // Recover address from title for legacy records that didn't save address in inputs
        let recoveredAddress = data.inputs.address || '';
        if (!recoveredAddress && data.title) {
          // Title format is "ADDRESS - DATE" or "Closing Timeline - DATE"
          const titleParts = data.title.split(' - ');
          if (titleParts.length >= 2 && !titleParts[0].startsWith('Closing Timeline')) {
            recoveredAddress = titleParts[0].trim();
          }
        }

        setInputs(prev => ({
          ...prev,
          ...data.inputs,
          address: recoveredAddress
        }));
      }

      // If timeline was saved, restore it
      if (data.timeline && data.timeline.length > 0) {
        const restoredTimeline = data.timeline.map(milestone => ({
          ...milestone,
          date: new Date(milestone.date)
        }));
        setTimeline(restoredTimeline);
      }

      toast.success('Timeline loaded successfully');
    } catch (error) {
      console.error('[ClosingDateCalculator] Error loading calculation:', error);
      if (error.response?.status === 404) {
        toast.error('Timeline not found');
        navigate('/tools/closing-date', { replace: true });
      } else {
        toast.error('Failed to load saved timeline');
      }
    } finally {
      setIsLoadingCalculation(false);
    }
  };

  // Calculate timeline whenever inputs change
  useEffect(() => {
    if (inputs.underContractDate && inputs.closingDate) {
      calculateTimeline();
    }
  }, [inputs]);

  const calculateTimeline = () => {
    setIsCalculating(true);
    
    try {
      const underContractDate = new Date(inputs.underContractDate);
      const closingDate = new Date(inputs.closingDate);
      const currentDate = new Date();
      
      const milestones = [];

      // Add milestones calculated from Under Contract Date
      if (inputs.pestInspectionDays) {
        const pestDate = new Date(underContractDate);
        pestDate.setDate(pestDate.getDate() + parseInt(inputs.pestInspectionDays));
        milestones.push({
          name: 'Pest Inspection',
          date: pestDate,
          type: 'inspection',
          description: 'Professional pest inspection to identify any pest issues',
          agentNote: inputs.pestInspectionNote
        });
      }

      if (inputs.homeInspectionDays) {
        const homeDate = new Date(underContractDate);
        homeDate.setDate(homeDate.getDate() + parseInt(inputs.homeInspectionDays));
        milestones.push({
          name: 'Home Inspection',
          date: homeDate,
          type: 'inspection',
          description: 'Comprehensive home inspection to identify any property issues',
          agentNote: inputs.homeInspectionNote
        });
      }

      if (inputs.dueDiligenceRepairRequestsDays) {
        const repairDate = new Date(underContractDate);
        repairDate.setDate(repairDate.getDate() + parseInt(inputs.dueDiligenceRepairRequestsDays));
        milestones.push({
          name: 'Repair Requests Due',
          date: repairDate,
          type: 'deadline',
          description: 'Deadline to submit repair requests based on inspection findings',
          agentNote: inputs.dueDiligenceRepairRequestsNote
        });
      }

      // Add milestones calculated from Closing Date
      if (inputs.finalWalkthroughDays) {
        const walkthroughDate = new Date(closingDate);
        walkthroughDate.setDate(walkthroughDate.getDate() - parseInt(inputs.finalWalkthroughDays));
        milestones.push({
          name: 'Final Walkthrough',
          date: walkthroughDate,
          type: 'inspection',
          description: 'Final inspection to ensure property condition before closing',
          agentNote: inputs.finalWalkthroughNote
        });
      }

      if (inputs.appraisalDays) {
        const appraisalDate = new Date(closingDate);
        appraisalDate.setDate(appraisalDate.getDate() - parseInt(inputs.appraisalDays));
        milestones.push({
          name: 'Appraisal Due',
          date: appraisalDate,
          type: 'financial',
          description: 'Professional property appraisal must be completed',
          agentNote: inputs.appraisalNote
        });
      }

      // Add Due Diligence Period
      if (inputs.dueDiligenceStartDate && inputs.dueDiligenceStopDate) {
        const ddStart = new Date(inputs.dueDiligenceStartDate);
        const ddEnd = new Date(inputs.dueDiligenceStopDate);
        
        milestones.push({
          name: 'Due Diligence Starts',
          date: ddStart,
          type: 'period',
          description: 'Beginning of due diligence investigation period',
          agentNote: inputs.dueDiligenceStartNote
        });
        
        milestones.push({
          name: 'Due Diligence Ends',
          date: ddEnd,
          type: 'period',
          description: 'End of due diligence period - decision deadline',
          agentNote: inputs.dueDiligenceStopNote
        });
      }

      // Add key dates - Under Contract should ALWAYS be first
      const underContractMilestone = {
        name: 'Under Contract',
        date: underContractDate,
        type: 'contract',
        description: 'Contract was signed and executed',
        agentNote: ''
      };

      const closingMilestone = {
        name: 'Closing Date',
        date: closingDate,
        type: 'closing',
        description: 'Final closing and transfer of ownership',
        agentNote: ''
      };

      // Sort other milestones by date first
      milestones.sort((a, b) => a.date - b.date);
      
      // Then ensure Under Contract is always first, and Closing is last
      const finalMilestones = [underContractMilestone, ...milestones, closingMilestone];

      // Add status based on current date
      const timelineWithStatus = finalMilestones.map(milestone => {
        let status = 'upcoming';
        const milestoneDate = new Date(milestone.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        milestoneDate.setHours(0, 0, 0, 0);

        if (milestoneDate < today) {
          status = 'past-due';
        } else if (milestoneDate.getTime() === today.getTime()) {
          status = 'today';
        }

        return {
          ...milestone,
          status
        };
      });

      setTimeline(timelineWithStatus);
      
    } catch (error) {
      console.error('Timeline calculation error:', error);
      toast.error('Error calculating timeline. Please check your inputs.');
    }
    
    setIsCalculating(false);
  };

  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'today':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'upcoming':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'past-due':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-200 text-green-800';
      case 'today':
        return 'bg-orange-100 border-orange-200 text-orange-800';
      case 'upcoming':
        return 'bg-blue-100 border-blue-200 text-blue-800';
      case 'past-due':
        return 'bg-red-100 border-red-200 text-red-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
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
      const token = await getToken();
      
      const saveData = {
        title: inputs.address 
          ? `${inputs.address} - ${formatDate(inputs.closingDate)}`
          : `Closing Timeline - ${formatDate(inputs.closingDate)}`,
        inputs: inputs,
        timeline: timeline
      };

      const response = await axios.post(`${backendUrl}/api/closing-date/save`, saveData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.message) {
        toast.success('Closing timeline saved successfully!');
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
    setShowPdfPopup(true);
    
    if (!timeline || timeline.length === 0) {
      toast.error('Please calculate timeline first');
      return;
    }

    try {
      const backendUrl = API_BASE_URL;

      const calculation_data = {
        timeline: timeline,
        totalDays: timeline.length > 0 ? Math.ceil((new Date(inputs.closingDate) - new Date(inputs.underContractDate)) / (1000 * 60 * 60 * 24)) : 0,
        milestoneCount: timeline.length
      };

      const payload = {
        calculation_data: calculation_data,
        property_data: inputs
      };

      // Detect iOS (includes iPad with desktop user agent)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

      // Build headers
      const headers = {
        'Content-Type': 'application/json',
      };

      if (getToken) {
        try {
          const token = await getToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        } catch (e) {
          console.warn('Failed to get auth token for PDF:', e);
        }
      }

      if (isIOS) {
        // iOS PATH: Use /prepare endpoint + real HTTPS URL
        // WKWebView blocks blob: URLs. Instead we get a real download URL
        // and open it via Capacitor Browser plugin (SFSafariViewController).
        const prepareResponse = await fetch(`${backendUrl}/api/reports/closing-date/pdf/prepare`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          credentials: 'include'
        });

        if (!prepareResponse.ok) {
          throw new Error(`PDF generation failed: ${prepareResponse.statusText}`);
        }

        const { download_url } = await prepareResponse.json();
        const fullDownloadUrl = `${backendUrl}${download_url}`;

        if (isCapacitor) {
          const { Browser } = await import('@capacitor/browser');
          await Browser.open({ url: fullDownloadUrl });
        } else {
          window.location.href = fullDownloadUrl;
        }

        toast.success('PDF opened — use the share button to save or send it!');

      } else {
        // DESKTOP PATH: Keep existing blob download exactly as-is
        const response = await fetch(`${backendUrl}/api/reports/closing-date/pdf`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`PDF generation failed: ${response.statusText}`);
        }

        const pdfBlob = await response.blob();

        const disposition = response.headers.get('Content-Disposition');
        let filename = 'closing_timeline.pdf';
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
      }

    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF. Please try again.');
    }
  };

  const handleShare = async () => {
    if (!user) {
      toast.error('Please log in to share timelines');
      return;
    }

    if (effectivePlan === 'FREE') {
      toast.error('Sharing timelines requires a Starter or Pro plan. Upgrade to share your timelines.');
      return;
    }

    try {
      // Create shareable text summary
      const shareText = `🏠 Home Purchase Timeline:
📅 Under Contract: ${formatDate(inputs.underContractDate)}
🏁 Closing Date: ${formatDate(inputs.closingDate)}

Key Milestones:
${timeline.map(milestone => `${milestone.name}: ${formatDate(milestone.date)}`).join('\n')}

Generated by I Need Numbers - Real Estate Tools`;

      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Timeline copied to clipboard! You can now paste and share it.');
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
        toast.success('Timeline copied to clipboard! You can now paste and share it.');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to create shareable content. Please try again.');
    }
  };

  const isPaid = effectivePlan === 'STARTER' || effectivePlan === 'PRO';

  const terminology = [
    {
      term: "Under Contract Date",
      definition: "The date when the purchase agreement is signed by all parties and the property is officially under contract."
    },
    {
      term: "Due Diligence Period",
      definition: "A specified time frame during which the buyer can investigate the property and potentially withdraw from the contract without penalty."
    },
    {
      term: "Home Inspection",
      definition: "A comprehensive examination of the property's condition by a licensed professional inspector."
    },
    {
      term: "Pest Inspection",
      definition: "An inspection specifically looking for signs of termites, wood-destroying insects, or other pest-related damage."
    },
    {
      term: "Appraisal",
      definition: "A professional assessment of the property's market value, typically required by the lender."
    },
    {
      term: "Final Walkthrough",
      definition: "A final inspection of the property, usually done 24-48 hours before closing, to ensure the property is in the agreed-upon condition."
    },
    {
      term: "Repair Requests",
      definition: "Formal requests made by the buyer to the seller to address issues found during inspections."
    },
    {
      term: "Closing Date",
      definition: "The final step in the home buying process where ownership is officially transferred from seller to buyer."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading overlay when fetching saved calculation */}
      {isLoadingCalculation && (
        <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <p className="text-gray-600">Loading saved timeline...</p>
          </div>
        </div>
      )}
      
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
                <Calendar className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Closing Date Calculator</h1>
                <p className="text-gray-600">Track your home purchase timeline and milestones</p>
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
                  <Calendar className="w-5 h-5 mr-2" />
                  Key Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="mb-4">
                  <Label htmlFor="address">Property Address</Label>
                  <Input
                    id="address"
                    type="text"
                    value={inputs.address}
                    onChange={(e) => setInputs({...inputs, address: e.target.value})}
                    placeholder="123 Main St, City, ST 12345"
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="underContractDate">Under Contract Date *</Label>
                    <Input
                      id="underContractDate"
                      type="date"
                      value={inputs.underContractDate}
                      onChange={(e) => handleInputChange('underContractDate', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="closingDate">Closing Date *</Label>
                    <Input
                      id="closingDate"
                      type="date"
                      value={inputs.closingDate}
                      onChange={(e) => handleInputChange('closingDate', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dueDiligenceStartDate">Due Diligence Start Date</Label>
                    <Input
                      id="dueDiligenceStartDate"
                      type="date"
                      value={inputs.dueDiligenceStartDate}
                      onChange={(e) => handleInputChange('dueDiligenceStartDate', e.target.value)}
                    />
                    <div className="mt-2">
                      <Input
                        placeholder="Agent note for due diligence start..."
                        value={inputs.dueDiligenceStartNote}
                        onChange={(e) => handleInputChange('dueDiligenceStartNote', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dueDiligenceStopDate">Due Diligence End Date</Label>
                    <Input
                      id="dueDiligenceStopDate"
                      type="date"
                      value={inputs.dueDiligenceStopDate}
                      onChange={(e) => handleInputChange('dueDiligenceStopDate', e.target.value)}
                    />
                    <div className="mt-2">
                      <Input
                        placeholder="Agent note for due diligence end..."
                        value={inputs.dueDiligenceStopNote}
                        onChange={(e) => handleInputChange('dueDiligenceStopNote', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
                <CardDescription>General notes and instructions for your clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="generalNotes">General Timeline Notes</Label>
                  <textarea
                    id="generalNotes"
                    value={inputs.generalNotes}
                    onChange={(e) => handleInputChange('generalNotes', e.target.value)}
                    placeholder="Add any general notes, instructions, or important reminders for your clients about the timeline..."
                    className="w-full min-h-[100px] p-3 border rounded-md resize-vertical"
                    rows="4"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Milestone Timing (Days)</CardTitle>
                <CardDescription>Enter the number of days for each milestone</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pestInspectionDays">
                      Pest Inspection
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 ml-1 text-gray-400 inline" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Days after under contract date</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="pestInspectionDays"
                        type="number"
                        value={inputs.pestInspectionDays}
                        onChange={(e) => handleInputChange('pestInspectionDays', e.target.value)}
                        placeholder="7"
                        min="1"
                      />
                      <span className="text-sm text-gray-500">days after contract</span>
                    </div>
                    <div className="mt-2">
                      <Input
                        placeholder="Agent note for pest inspection..."
                        value={inputs.pestInspectionNote}
                        onChange={(e) => handleInputChange('pestInspectionNote', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="homeInspectionDays">
                      Home Inspection
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 ml-1 text-gray-400 inline" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Days after under contract date</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="homeInspectionDays"
                        type="number"
                        value={inputs.homeInspectionDays}
                        onChange={(e) => handleInputChange('homeInspectionDays', e.target.value)}
                        placeholder="10"
                        min="1"
                      />
                      <span className="text-sm text-gray-500">days after contract</span>
                    </div>
                    <div className="mt-2">
                      <Input
                        placeholder="Agent note for home inspection..."
                        value={inputs.homeInspectionNote}
                        onChange={(e) => handleInputChange('homeInspectionNote', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dueDiligenceRepairRequestsDays">
                      Repair Requests Due
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 ml-1 text-gray-400 inline" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Days after under contract date</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="dueDiligenceRepairRequestsDays"
                        type="number"
                        value={inputs.dueDiligenceRepairRequestsDays}
                        onChange={(e) => handleInputChange('dueDiligenceRepairRequestsDays', e.target.value)}
                        placeholder="14"
                        min="1"
                      />
                      <span className="text-sm text-gray-500">days after contract</span>
                    </div>
                    <div className="mt-2">
                      <Input
                        placeholder="Agent note for repair requests..."
                        value={inputs.dueDiligenceRepairRequestsNote}
                        onChange={(e) => handleInputChange('dueDiligenceRepairRequestsNote', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="finalWalkthroughDays">
                      Final Walkthrough
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 ml-1 text-gray-400 inline" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Days before closing date</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="finalWalkthroughDays"
                        type="number"
                        value={inputs.finalWalkthroughDays}
                        onChange={(e) => handleInputChange('finalWalkthroughDays', e.target.value)}
                        placeholder="1"
                        min="1"
                      />
                      <span className="text-sm text-gray-500">days before closing</span>
                    </div>
                    <div className="mt-2">
                      <Input
                        placeholder="Agent note for final walkthrough..."
                        value={inputs.finalWalkthroughNote}
                        onChange={(e) => handleInputChange('finalWalkthroughNote', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="appraisalDays">
                      Appraisal Due
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 ml-1 text-gray-400 inline" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Days before closing date</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="appraisalDays"
                        type="number"
                        value={inputs.appraisalDays}
                        onChange={(e) => handleInputChange('appraisalDays', e.target.value)}
                        placeholder="7"
                        min="1"
                      />
                      <span className="text-sm text-gray-500">days before closing</span>
                    </div>
                    <div className="mt-2">
                      <Input
                        placeholder="Agent note for appraisal..."
                        value={inputs.appraisalNote}
                        onChange={(e) => handleInputChange('appraisalNote', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Timeline & Plan Info */}
          <div className="space-y-6">
            {/* Plan Badge */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <Badge variant={effectivePlan === 'FREE' ? 'secondary' : 'default'}>
                    {effectivePlan} Plan
                  </Badge>
                  {effectivePlan === 'FREE' && (
                    <p className="text-xs text-gray-600">
                      Upgrade for PDF download with agent branding
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Timeline Preview */}
            {timeline.length > 0 && (
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-center">Timeline Preview</CardTitle>
                  {inputs.address && (
                    <p className="text-center text-sm text-gray-600 mt-1">{inputs.address}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {timeline.map((milestone, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${getStatusColor(milestone.status)}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(milestone.status)}
                            <span className="font-medium text-sm">{milestone.name}</span>
                          </div>
                        </div>
                        <div className="text-xs mt-1">
                          {formatDate(milestone.date)}
                        </div>
                        {milestone.agentNote && (
                          <div className="text-xs mt-1 italic text-blue-600">
                            "{milestone.agentNote}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Horizontal Timeline */}
        {timeline.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-center">
                {inputs.address ? `${inputs.address} — Timeline` : 'Your Home Purchase Timeline'}
              </CardTitle>
              <CardDescription className="text-center">Visual timeline with all important milestones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto pb-4">
                <div className="flex items-center space-x-8 min-w-max px-4">
                  {timeline.map((milestone, index) => (
                    <div key={index} className="flex flex-col items-center text-center min-w-[120px]">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 ${getStatusColor(milestone.status)}`}>
                        {getStatusIcon(milestone.status)}
                      </div>
                      
                      {/* Milestone name */}
                      <div className="font-medium text-sm text-gray-900 mb-1">
                        {milestone.name}
                      </div>
                      
                      <div className="text-xs text-gray-600 mb-2">
                        {formatDate(milestone.date)}
                      </div>
                      
                      {/* Agent note */}
                      {milestone.agentNote && (
                        <div className="text-xs text-blue-600 mb-2 italic">
                          "{milestone.agentNote}"
                        </div>
                      )}
                      
                      {/* Description */}
                      <div className="text-xs text-gray-500 max-w-[100px]">
                        {milestone.description}
                      </div>
                      
                      {/* Connection line */}
                      {index < timeline.length - 1 && (
                        <div className="absolute top-6 left-1/2 w-8 h-0.5 bg-gray-300 transform translate-x-full hidden sm:block" 
                             style={{ left: `${((index + 1) * 136) - 16}px` }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {timeline.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleSave}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={!user || effectivePlan === 'FREE'}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Timeline
            </Button>
            <Button 
              onClick={handleDownloadPDF}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF Report
            </Button>
          </div>
        )}

        {/* Terminology Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowTerminology(!showTerminology)}
            >
              <span>Real Estate Terminology</span>
              <Button variant="ghost" size="sm">
                {showTerminology ? 'Hide' : 'Show'} Definitions
              </Button>
            </CardTitle>
          </CardHeader>
          {showTerminology && (
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {terminology.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <h4 className="font-semibold text-gray-900">{item.term}</h4>
                    <p className="text-sm text-gray-600">{item.definition}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Disclaimer */}
        <Card className="mt-8 border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <p className="text-center text-xs text-gray-600">
              <strong>Disclaimer:</strong> Dates are estimates based on your input. Always confirm with your agent or lender for final deadlines.
            </p>
          </CardContent>
        </Card>

      </div>
      
      <PdfLoadingPopup
        isVisible={showPdfPopup}
        onClose={() => setShowPdfPopup(false)}
      />
    </div>
  );
};

export default ClosingDateCalculator;
import axios from 'axios';
import { toast } from 'sonner';
import { safeLocalStorage } from './safeStorage';
import API_BASE_URL from '../config/api';

const backendUrl = API_BASE_URL;

// Number formatting utilities
export const formatNumberWithCommas = (value) => {
  // Remove any existing commas and non-digit characters except decimal point
  const cleanValue = value.toString().replace(/[^\d.]/g, '');
  
  // Split by decimal point to handle decimal numbers
  const parts = cleanValue.split('.');
  
  // Add commas to the integer part
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Join back with decimal point if there was one
  return parts.join('.');
};

export const parseNumberFromFormatted = (formattedValue) => {
  // Remove commas and return as number
  return parseFloat(formattedValue.toString().replace(/,/g, '')) || 0;
};

export const handleNumberInputChange = (value, setter) => {
  // Format the value with commas
  const formattedValue = formatNumberWithCommas(value);
  
  // Set the formatted value in the input
  setter(formattedValue);
  
  // Return the numeric value for calculations
  return parseNumberFromFormatted(formattedValue);
};

// Get auth token
const getAuthToken = () => {
  return safeLocalStorage.getItem('access_token') || 
         document.cookie.split(';')
           .find(c => c.trim().startsWith('access_token='))
           ?.split('=')[1];
};

// Create auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };
};

// Save Deal Functionality (for Investor Deal Calculator)
export const handleSaveDeal = async (dealData, user, effectivePlan) => {
  if (!user) {
    toast.error('Please log in to save calculations');
    return false;
  }

  if (effectivePlan === 'FREE') {
    toast.error('Saving calculations requires a Starter or Pro plan. Upgrade to save your calculations.');
    return false;
  }

  try {
    const response = await axios.post(`${backendUrl}/api/save-deal`, dealData, {
      headers: getAuthHeaders()
    });

    if (response.data && response.data.message) {
      toast.success('Deal saved successfully!');
      return { success: true, dealId: response.data.deal_id };
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
  return false;
};

// Generate PDF with Preview Functionality (for all calculators)
export const handleGeneratePDF = async (pdfData, user, effectivePlan, setShowPDFPreview) => {
  try {
    toast.info('Generating PDF... This may take a moment.');
    
    // Show PDF preview first
    if (setShowPDFPreview) {
      setShowPDFPreview(true);
    }
    
    // Make API call to generate PDF
    const response = await axios.post(`${backendUrl}/api/generate-pdf`, pdfData, {
      headers: getAuthHeaders()
    });

    if (response.data) {
      // Simulate PDF download with success message
      setTimeout(() => {
        toast.success('PDF preview ready! In production, this would download the actual PDF file.');
      }, 2000);
      
      return { success: true, data: response.data };
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    toast.error('Error generating PDF. Please try again.');
  }
  return false;
};

// Share Deal Functionality
export const handleShareDeal = async (dealData, user, effectivePlan) => {
  if (!user) {
    toast.error('Please log in to share calculations');
    return false;
  }

  if (effectivePlan === 'FREE') {
    toast.error('Sharing calculations requires a Starter or Pro plan. Upgrade to share your calculations.');
    return false;
  }

  try {
    // First save the deal to get a shareable ID
    const saveResult = await handleSaveDeal(dealData, user, effectivePlan);
    
    if (saveResult && saveResult.success) {
      const shareUrl = `${window.location.origin}/shared/deal/${saveResult.dealId}`;
      
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Shareable link copied to clipboard!');
        return { success: true, shareUrl };
      } catch (err) {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Shareable link copied to clipboard!');
        return { success: true, shareUrl };
      }
    }
  } catch (error) {
    console.error('Share error:', error);
    toast.error('Failed to create shareable link. Please try again.');
  }
  return false;
};

// Save Calculator-specific data (for other calculators like Affordability, Commission, etc.)
export const handleSaveCalculation = async (calculationData, calculatorType, user, effectivePlan) => {
  if (!user) {
    toast.error('Please log in to save calculations');
    return false;
  }

  if (effectivePlan === 'FREE') {
    toast.error('Saving calculations requires a Starter or Pro plan. Upgrade to save your calculations.');
    return false;
  }

  try {
    // For now, save as a generic deal format until specific endpoints are created
    const dealData = {
      title: calculationData.title || `${calculatorType} Calculation`,
      inputs: calculationData.inputs,
      results: calculationData.results,
      calculator_type: calculatorType,
      agent_info: calculationData.agent_info
    };

    return await handleSaveDeal(dealData, user, effectivePlan);
  } catch (error) {
    console.error('Save calculation error:', error);
    toast.error('Failed to save calculation. Please try again.');
  }
  return false;
};

// Generate PDF for calculator-specific data
export const handleCalculatorPDF = async (calculationData, calculatorType, user, effectivePlan, setShowPDFPreview) => {
  try {
    const pdfData = {
      calculator_type: calculatorType,
      inputs: calculationData.inputs,
      results: calculationData.results,
      title: calculationData.title || `${calculatorType} Analysis`,
      agent_info: calculationData.agent_info
    };

    return await handleGeneratePDF(pdfData, user, effectivePlan, setShowPDFPreview);
  } catch (error) {
    console.error('Calculator PDF error:', error);
    toast.error('Failed to generate PDF. Please try again.');
  }
  return false;
};

// Share calculator-specific data
export const handleShareCalculation = async (calculationData, calculatorType, user, effectivePlan) => {
  if (!user) {
    toast.error('Please log in to share calculations');
    return false;
  }

  if (effectivePlan === 'FREE') {
    toast.error('Sharing calculations requires a Starter or Pro plan. Upgrade to share your calculations.');
    return false;
  }

  try {
    // For now, create a simple shareable summary
    const shareText = createShareableText(calculationData, calculatorType);
    
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success('Calculation summary copied to clipboard! You can now paste and share it.');
      return { success: true, shareText };
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Calculation summary copied to clipboard! You can now paste and share it.');
      return { success: true, shareText };
    }
  } catch (error) {
    console.error('Share calculation error:', error);
    toast.error('Failed to create shareable content. Please try again.');
  }
  return false;
};

// Helper function to create shareable text based on calculator type
const createShareableText = (calculationData, calculatorType) => {
  const { inputs, results } = calculationData;
  
  switch (calculatorType) {
    case 'Affordability':
      return `🏠 Affordability Analysis Results:
📊 Home Price: $${inputs.homePrice?.toLocaleString()}
💰 Down Payment: $${inputs.downPayment?.toLocaleString()}
📈 Interest Rate: ${inputs.interestRate}%
💳 Monthly Payment (PITI): $${results.piti?.toLocaleString()}
📋 LTV: ${results.ltv?.toFixed(2)}%
${results.qualified !== null ? `✅ Qualified: ${results.qualified ? 'Yes' : 'No'}` : ''}

Generated by I Need Numbers - Real Estate Tools`;

    case 'Commission':
      return `💰 Commission Split Analysis:
🏠 Sale Price: $${inputs.salePrice?.toLocaleString()}
📊 Commission Rate: ${inputs.commissionRate}%
💵 Total Commission: $${results.totalCommission?.toLocaleString()}
💰 Your Take Home: $${results.agentTakeHome?.toLocaleString()}

Generated by I Need Numbers - Real Estate Tools`;

    case 'SellerNet':
      return `📋 Seller Net Sheet Analysis:
🏠 Sale Price: $${inputs.salePrice?.toLocaleString()}
💰 Estimated Net Proceeds: $${results.netProceeds?.toLocaleString()}
📊 Total Closing Costs: $${results.totalClosingCosts?.toLocaleString()}

Generated by I Need Numbers - Real Estate Tools`;

    default:
      return `📊 ${calculatorType} Analysis Results:
Generated by I Need Numbers - Real Estate Tools

${JSON.stringify(results, null, 2)}`;
  }
};

export default {
  handleSaveDeal,
  handleGeneratePDF,
  handleShareDeal,
  handleSaveCalculation,
  handleCalculatorPDF,
  handleShareCalculation,
  formatNumberWithCommas,
  parseNumberFromFormatted,
  handleNumberInputChange
};
import React, { useState } from 'react';
import { X, Sparkles, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import API_BASE_URL from '../config/api';
// Removed js-cookie import - using HttpOnly cookies now

const NetSheetAICoach = ({ isOpen, onClose, inputs, results, dealState }) => {
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Helper function to format JSON analysis into readable text
  const formatJsonAnalysis = (data) => {
    let formatted = '';
    
    // Extract summary if it exists
    if (data.summary) {
      formatted += data.summary + '\n\n';
    }
    
    // Format stats section
    if (data.stats) {
      formatted += '📊 Deal Summary:\n';
      Object.entries(data.stats).forEach(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        formatted += `• ${label}: ${value}\n`;
      });
      formatted += '\n';
    }
    
    // Format insights
    if (data.insights && Array.isArray(data.insights)) {
      formatted += '💡 Key Insights:\n';
      data.insights.forEach((insight, idx) => {
        formatted += `${idx + 1}. ${insight}\n`;
      });
      formatted += '\n';
    }
    
    // Format recommendations
    if (data.recommendations && Array.isArray(data.recommendations)) {
      formatted += '🎯 Recommendations:\n';
      data.recommendations.forEach((rec, idx) => {
        formatted += `${idx + 1}. ${rec}\n`;
      });
      formatted += '\n';
    }
    
    // Format risks
    if (data.risks && Array.isArray(data.risks)) {
      formatted += '⚠️ Risks to Consider:\n';
      data.risks.forEach((risk, idx) => {
        formatted += `${idx + 1}. ${risk}\n`;
      });
    }
    
    return formatted.trim();
  };

  // Helper function for API headers (using HttpOnly cookie authentication)
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json'
    };
  };

  const generateAnalysis = async () => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      // Prepare deal context for AI Coach
      const salePrice = parseFloat(String(inputs.expectedSalePrice || '0').replace(/,/g, ''));
      const commission = parseFloat(inputs.totalCommission || 0);
      const netAmount = parseFloat(results.estimatedSellerNet || 0);
      const netPercentage = salePrice > 0 ? ((netAmount / salePrice) * 100).toFixed(1) : 0;
      
      // Call the AI Coach API with cookie-based authentication
      const response = await fetch(`${API_BASE_URL}/api/ai-coach-v2/generate`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',  // Include HttpOnly cookies
        body: JSON.stringify({
          context: 'net_sheet_analysis',
          deal_data: {
            sale_price: salePrice,
            commission: commission,
            net_amount: netAmount,
            net_percentage: netPercentage,
            deal_state: dealState,
            inputs: inputs,
            results: results
          },
          year: new Date().getFullYear(),
          stream: false
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please sign in to access AI Coach.');
        } else if (response.status === 503) {
          throw new Error('AI Coach is currently disabled. Please check back later.');
        } else {
          throw new Error(`AI Coach service error (${response.status}). Please try again.`);
        }
      }

      const aiResponse = await response.json();
      
      // Parse and format AI response
      let formattedAnalysis = '';
      
      if (aiResponse.summary) {
        // If summary is a string, check if it's JSON that needs parsing
        if (typeof aiResponse.summary === 'string') {
          // Try to parse if it looks like JSON (starts with { or [)
          const trimmed = aiResponse.summary.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
              const parsed = JSON.parse(aiResponse.summary);
              formattedAnalysis = formatJsonAnalysis(parsed);
            } catch {
              // Not valid JSON, use as-is
              formattedAnalysis = aiResponse.summary;
            }
          } else {
            formattedAnalysis = aiResponse.summary;
          }
        }
        // If summary is an object (JSON), parse and format it
        else if (typeof aiResponse.summary === 'object') {
          formattedAnalysis = formatJsonAnalysis(aiResponse.summary);
        }
      } else if (aiResponse.coaching_text) {
        // Fallback for legacy format
        formattedAnalysis = aiResponse.coaching_text;
      } else if (typeof aiResponse === 'string') {
        // Sometimes the response itself is the analysis string
        try {
          const parsed = JSON.parse(aiResponse);
          formattedAnalysis = formatJsonAnalysis(parsed);
        } catch {
          formattedAnalysis = aiResponse;
        }
      } else {
        // If response is already an object, format it
        formattedAnalysis = formatJsonAnalysis(aiResponse);
      }
      
      if (!formattedAnalysis) {
        throw new Error('Invalid AI response format');
      }
      
      setAnalysis(formattedAnalysis);
      
    } catch (error) {
      console.error('Error calling AI Coach API:', error);
      // Fallback to informative error message
      setAnalysis(`Unable to generate analysis at the moment. Please try again or check the deal details manually. ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-generate analysis when modal opens if there's sufficient data
  React.useEffect(() => {
    if (isOpen && inputs.expectedSalePrice && !analysis && !isAnalyzing) {
      console.log('Auto-generating analysis for:', inputs.expectedSalePrice);
      generateAnalysis();
    }
  }, [isOpen, inputs.expectedSalePrice, analysis, isAnalyzing]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg flex-shrink-0">
          <div className="flex items-center">
            <div className="relative">
              <Sparkles className="w-6 h-6 mr-3 text-green-600" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center">
                <h2 className="text-xl font-semibold">Fairy AI Coach</h2>
                <span className="ml-2 px-2 py-1 bg-yellow-400 text-purple-900 text-xs font-bold rounded">PRO</span>
              </div>
              <p className="text-purple-100 text-sm">Net Sheet Deal Analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-purple-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
          {/* Deal Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Deal Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Sale Price:</span>
                    <span className="font-semibold">${inputs.expectedSalePrice || 'Not entered'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Total Commission:</span>
                    <span className="font-semibold">${inputs.totalCommission || 'Not entered'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Deal State:</span>
                    <Badge variant={dealState ? 'default' : 'secondary'}>
                      {dealState || 'Not specified'}
                    </Badge>
                  </div>
                </div>
                <div>
                  {results.estimatedSellerNet && (
                    <>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Seller Net:</span>
                        <span className="font-bold text-green-600">${results.estimatedSellerNet.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Total Deductions:</span>
                        <span className="font-semibold text-red-600">${results.totalDeductions?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Net Percentage:</span>
                        <span className="font-semibold">
                          {results.estimatedSellerNet && inputs.expectedSalePrice 
                            ? `${((parseFloat(results.estimatedSellerNet) / parseFloat(inputs.expectedSalePrice.replace(/,/g, ''))) * 100).toFixed(1)}%`
                            : 'N/A'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Sparkles className="w-5 h-5 mr-2 text-green-600" />
                AI Analysis
                {isAnalyzing && <Sparkles className="w-4 h-4 ml-2 animate-spin text-purple-500" />}
              </CardTitle>
              <CardDescription>
                AI-powered insights based on your net sheet details and {dealState ? `${dealState} market` : 'market'} conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAnalyzing ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-2">
                    <Sparkles className="w-8 h-8 mx-auto animate-spin text-purple-500" />
                    <p className="text-gray-600">Analyzing your net sheet...</p>
                  </div>
                </div>
              ) : analysis ? (
                <div className="prose prose-sm max-w-none">
                  <div className="text-gray-700 leading-relaxed max-h-64 overflow-y-auto pr-2">
                    {(() => {
                      try {
                        // Try to parse JSON response
                        const parsed = JSON.parse(analysis);
                        return (
                          <div className="space-y-4">
                            {parsed.summary && (
                              <div>
                                <h4 className="font-semibold text-purple-700 mb-2">Summary</h4>
                                <p className="text-sm">{parsed.summary}</p>
                              </div>
                            )}
                            {parsed.analysis && (
                              <div>
                                <h4 className="font-semibold text-purple-700 mb-2">Analysis</h4>
                                <p className="text-sm">{parsed.analysis}</p>
                              </div>
                            )}
                            {parsed.actions && parsed.actions.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-purple-700 mb-2">Recommended Actions</h4>
                                <ul className="text-sm list-disc list-inside space-y-1">
                                  {parsed.actions.map((action, idx) => (
                                    <li key={idx}>{action}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {parsed.risks && parsed.risks.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-amber-700 mb-2">Potential Risks</h4>
                                <ul className="text-sm list-disc list-inside space-y-1">
                                  {parsed.risks.map((risk, idx) => (
                                    <li key={idx}>{risk}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      } catch (e) {
                        // If not JSON, display as plain text
                        return <div className="whitespace-pre-wrap text-sm">{analysis}</div>;
                      }
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                  <p className="text-gray-600 mb-4">Enter deal details to get AI analysis</p>
                  <Button onClick={generateAnalysis} disabled={!inputs.expectedSalePrice}>
                    <Sparkles className="w-4 h-4 mr-2 text-green-600" />
                    Generate Analysis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

            {/* AI Disclaimer */}
            <div className="text-xs text-gray-500 text-center py-2 px-4 bg-gray-50 rounded-lg border border-gray-200">
              <span className="italic">
                The I Need Numbers AI Fairy Coach can make mistakes. You should verify important information and don't forget it's just a software program.
              </span>
            </div>
          </div>
        </div>

        {/* Fixed Action Buttons at Bottom */}
        <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-white rounded-b-lg">
          <div className="flex justify-between">
            <Button
              onClick={generateAnalysis}
              disabled={isAnalyzing || !inputs.expectedSalePrice}
              variant="outline"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
            </Button>
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Close Coach
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetSheetAICoach;
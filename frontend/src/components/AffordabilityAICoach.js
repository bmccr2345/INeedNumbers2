import React, { useState } from 'react';
import { X, Sparkles, Home, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
// Removed js-cookie import - using HttpOnly cookies now

const AffordabilityAICoach = ({ isOpen, onClose, inputs, results }) => {
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
      formatted += '📊 Purchase Summary:\n';
      if (data.stats.home_price) formatted += `• Home Price: ${data.stats.home_price}\n`;
      if (data.stats.monthly_income) formatted += `• Monthly Income: ${data.stats.monthly_income}\n`;
      if (data.stats.down_payment) formatted += `• Down Payment: ${data.stats.down_payment}\n`;
      if (data.stats.interest_rate) formatted += `• Interest Rate: ${data.stats.interest_rate}\n`;
      if (data.stats.dti_ratio) formatted += `• DTI Ratio: ${data.stats.dti_ratio}\n`;
      if (data.stats.monthly_payment) formatted += `• Monthly Payment: ${data.stats.monthly_payment}\n`;
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
      // Prepare affordability context for AI Coach
      const homePrice = parseFloat(String(inputs.homePrice || '0').replace(/,/g, ''));
      const income = parseFloat(String(inputs.grossMonthlyIncome || '0').replace(/,/g, ''));
      const downPayment = parseFloat(inputs.downPayment || 0);
      const interestRate = parseFloat(inputs.interestRate || 0);
      const loanType = inputs.loanType || 'conventional';
      const dtiRatio = results.dti || 0;
      const qualified = results.qualified;
      
      // Call the AI Coach API with cookie-based authentication
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      if (!backendUrl) {
        throw new Error('Backend URL not configured');
      }
      
      const response = await fetch(`${backendUrl}/api/ai-coach-v2/generate`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',  // Include HttpOnly cookies
        body: JSON.stringify({
          context: 'affordability_analysis',
          affordability_data: {
            home_price: homePrice,
            monthly_income: income,
            down_payment: downPayment,
            interest_rate: interestRate,
            loan_type: loanType,
            dti_ratio: dtiRatio,
            qualified: qualified,
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
      
      // Parse and format AI response - backend returns structured JSON
      let formattedAnalysis = '';
      
      // If the response has summary, stats, actions, etc. structure, format it
      if (aiResponse && typeof aiResponse === 'object' && (aiResponse.summary || aiResponse.stats)) {
        // This is the standard structured response from backend
        formattedAnalysis = formatJsonAnalysis(aiResponse);
      } else if (aiResponse.coaching_text) {
        // Fallback for legacy format
        formattedAnalysis = aiResponse.coaching_text;
      } else if (typeof aiResponse === 'string') {
        // Sometimes the response itself is a string
        formattedAnalysis = aiResponse;
      } else {
        // Try to format whatever we got
        formattedAnalysis = JSON.stringify(aiResponse, null, 2);
      }
      
      if (!formattedAnalysis) {
        throw new Error('Invalid AI response format');
      }
      
      setAnalysis(formattedAnalysis);
      
    } catch (error) {
      console.error('Error calling AI Coach API:', error);
      // Fallback to informative error message
      setAnalysis(`Unable to generate analysis at the moment. Please try again or check the affordability details manually. ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-generate analysis when modal opens if there's sufficient data
  React.useEffect(() => {
    if (isOpen && inputs.homePrice && inputs.grossMonthlyIncome && !analysis && !isAnalyzing) {
      console.log('Auto-generating affordability analysis for:', inputs.homePrice, inputs.grossMonthlyIncome);
      generateAnalysis();
    }
  }, [isOpen, inputs.homePrice, inputs.grossMonthlyIncome, analysis, isAnalyzing]);

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
              <p className="text-purple-100 text-sm">Affordability Analysis</p>
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
          {/* Purchase Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Home className="w-5 h-5 mr-2 text-blue-600" />
                Purchase Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Home Price:</span>
                    <span className="font-semibold">${inputs.homePrice || 'Not entered'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Monthly Income:</span>
                    <span className="font-semibold">${inputs.grossMonthlyIncome || 'Not entered'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Loan Type:</span>
                    <Badge variant="default">
                      {inputs.loanType ? inputs.loanType.toUpperCase() : 'Conventional'}
                    </Badge>
                  </div>
                </div>
                <div>
                  {results.qualified !== null && (
                    <>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Qualification:</span>
                        <Badge variant={results.qualified ? "default" : "destructive"}>
                          {results.qualified ? "✓ Qualified" : "✗ Over Limits"}
                        </Badge>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">DTI Ratio:</span>
                        <span className={`font-semibold ${results.dti > 43 ? 'text-red-600' : results.dti > 36 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {results.dti ? `${results.dti.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Monthly Payment:</span>
                        <span className="font-bold text-blue-600">
                          ${results.piti?.toLocaleString() || '0'}
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
                AI-powered insights based on your affordability calculations and {inputs.loanType || 'conventional'} loan requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAnalyzing ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-2">
                    <Sparkles className="w-8 h-8 mx-auto animate-spin text-purple-500" />
                    <p className="text-gray-600">Analyzing your affordability scenario...</p>
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
                  <p className="text-gray-600 mb-4">Enter home price and monthly income to get AI analysis</p>
                  <Button onClick={generateAnalysis} disabled={!inputs.homePrice || !inputs.grossMonthlyIncome}>
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
              disabled={isAnalyzing || !inputs.homePrice || !inputs.grossMonthlyIncome}
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

export default AffordabilityAICoach;
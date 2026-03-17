import React, { useState } from 'react';
import { X, Sparkles, TrendingUp, AlertTriangle, DollarSign, Building } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import API_BASE_URL from '../config/api';

const InvestorAICoach = ({ isOpen, onClose, propertyData, metrics }) => {
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
      formatted += '📊 Investment Summary:\n';
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
      // Prepare investment context for AI Coach
      const purchasePrice = parseFloat(String(propertyData?.purchasePrice || '0').replace(/,/g, ''));
      const monthlyRent = parseFloat(String(propertyData?.monthlyRent || '0').replace(/,/g, ''));
      
      // Call the AI Coach API with cookie-based authentication
      const response = await fetch(`${API_BASE_URL}/api/ai-coach-v2/generate`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          context: 'investor_deal_analysis',
          deal_data: {
            // Property info
            purchase_price: purchasePrice,
            monthly_rent: monthlyRent,
            property_type: propertyData?.propertyType || 'Unknown',
            address: propertyData?.address || '',
            
            // Financial metrics
            cap_rate: metrics?.capRate || 0,
            cash_on_cash_return: metrics?.cashOnCashReturn || 0,
            noi: metrics?.noi || 0,
            annual_cash_flow: metrics?.annualCashFlow || 0,
            monthly_cash_flow: metrics?.monthlyCashFlow || 0,
            operating_expenses: metrics?.operatingExpenses || 0,
            
            // Financing
            down_payment: metrics?.downPayment || 0,
            loan_amount: metrics?.loanAmount || 0,
            ltv: metrics?.ltv || 0,
            monthly_mortgage: metrics?.monthlyMortgage || 0,
            
            // Expense breakdown
            expense_breakdown: metrics?.annualExpenseBreakdown || {},
            
            // Other details
            vacancy_rate: propertyData?.vacancyRate || 5,
            interest_rate: propertyData?.interestRate || 7
          },
          year: new Date().getFullYear(),
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle the response
      if (data.response) {
        // Try to parse as JSON first
        try {
          const jsonData = JSON.parse(data.response);
          setAnalysis(formatJsonAnalysis(jsonData));
        } catch {
          // If not JSON, use as-is
          setAnalysis(data.response);
        }
      } else if (data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setAnalysis('Analysis complete. Please review the metrics above.');
      }
      
    } catch (error) {
      console.error('AI Coach error:', error);
      setAnalysis(`Unable to generate analysis: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  // Calculate some display values
  const purchasePrice = parseFloat(String(propertyData?.purchasePrice || '0').replace(/,/g, ''));
  const monthlyRent = parseFloat(String(propertyData?.monthlyRent || '0').replace(/,/g, ''));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>Fairy AI Coach</span>
              </CardTitle>
              <CardDescription className="text-purple-100">
                Investment Deal Analysis
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-4">
          {/* Deal Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-700 mb-1">
                <Building className="w-4 h-4" />
                <span className="font-medium">Purchase Price</span>
              </div>
              <div className="text-xl font-bold text-blue-800">
                ${purchasePrice.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 text-green-700 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="font-medium">Monthly Rent</span>
              </div>
              <div className="text-xl font-bold text-green-800">
                ${monthlyRent.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          {metrics && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-lg font-bold text-primary">
                  {metrics.capRate?.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-600">Cap Rate</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-lg font-bold text-primary">
                  {metrics.cashOnCashReturn?.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-600">Cash on Cash</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-lg font-bold text-primary">
                  ${metrics.monthlyCashFlow?.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">Monthly Cash Flow</div>
              </div>
            </div>
          )}

          {/* Analysis Section */}
          <div className="border-t pt-4">
            {!analysis ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Get AI-powered insights on this investment opportunity. 
                  Our Fairy AI Coach will analyze the deal metrics and provide personalized recommendations.
                </p>
                <Button
                  onClick={generateAnalysis}
                  disabled={isAnalyzing || !metrics}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  data-testid="generate-ai-analysis-btn"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isAnalyzing ? 'Analyzing Deal...' : 'Analyze This Investment'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span>AI Analysis</span>
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAnalysis}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
                  </Button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {analysis}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Risk Indicator */}
          {metrics && (
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="font-medium text-sm">Quick Assessment</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {metrics.capRate >= 8 ? (
                  <Badge className="bg-green-100 text-green-700">Strong Cap Rate</Badge>
                ) : metrics.capRate >= 5 ? (
                  <Badge className="bg-yellow-100 text-yellow-700">Moderate Cap Rate</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700">Low Cap Rate</Badge>
                )}
                
                {metrics.cashOnCashReturn >= 10 ? (
                  <Badge className="bg-green-100 text-green-700">Excellent Cash on Cash</Badge>
                ) : metrics.cashOnCashReturn >= 6 ? (
                  <Badge className="bg-yellow-100 text-yellow-700">Good Cash on Cash</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700">Low Cash on Cash</Badge>
                )}
                
                {metrics.monthlyCashFlow > 0 ? (
                  <Badge className="bg-green-100 text-green-700">Positive Cash Flow</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700">Negative Cash Flow</Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestorAICoach;

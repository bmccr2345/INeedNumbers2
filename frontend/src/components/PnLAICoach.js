import React, { useState } from 'react';
import { X, Sparkles, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Target, PieChart } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import Cookies from 'js-cookie';
import axios from 'axios';

const PnLAICoach = ({ isOpen, onClose, currentMonthData, pastSixMonthsData }) => {
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
      formatted += '📊 Financial Summary:\n';
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

  // Helper function for API headers
  const getHeaders = () => {
    // Try localStorage first (more reliable), then cookies as fallback  
    const token = localStorage.getItem('access_token') || Cookies.get('access_token');
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  };

  const generateAnalysis = async () => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      // Prepare P&L context for AI Coach
      const currentMonth = currentMonthData || {};
      const historicalData = pastSixMonthsData || [];
      
      // Call the AI Coach API using axios
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/ai-coach-v2/generate`,
        {
          context: 'pnl_analysis',
          pnl_data: {
            current_month: {
              total_income: currentMonth.income || 0,
              total_expenses: currentMonth.expenses || 0,
              net_profit: currentMonth.net || 0,
              expense_categories: currentMonth.expenseCategories || {},
              income_categories: currentMonth.incomeCategories || {}
            },
            historical_data: historicalData.map(monthData => ({
              month: monthData.month,
              total_income: monthData.income || 0,
              total_expenses: monthData.expenses || 0,
              net_profit: monthData.net || 0,
              expense_categories: monthData.expenseCategories || {},
              income_categories: monthData.incomeCategories || {}
            })),
            analysis_focus: [
              'cost_reduction_opportunities',
              'expense_trend_analysis', 
              'profit_margin_optimization',
              'category_spending_patterns',
              'seasonal_trends',
              'budget_recommendations'
            ]
          },
          year: new Date().getFullYear(),
          stream: false
        },
        {
          withCredentials: true
        }
      );

      const aiResponse = response.data;
      
      console.log('AI Response received:', aiResponse); // Debug log
      
      // Parse and format AI response
      let formattedAnalysis = '';
      
      if (aiResponse) {
        // Check for formatted_analysis first (if backend already formatted it)
        if (aiResponse.formatted_analysis) {
          formattedAnalysis = aiResponse.formatted_analysis;
        }
        // If summary is a string, check if it's JSON that needs parsing
        else if (typeof aiResponse.summary === 'string') {
          const trimmed = aiResponse.summary.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
              const parsed = JSON.parse(aiResponse.summary);
              formattedAnalysis = formatJsonAnalysis(parsed);
            } catch {
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
        // Check coaching_text for legacy format
        else if (aiResponse.coaching_text) {
          formattedAnalysis = aiResponse.coaching_text;
        }
        // If the response itself is a string
        else if (typeof aiResponse === 'string') {
          try {
            const parsed = JSON.parse(aiResponse);
            formattedAnalysis = formatJsonAnalysis(parsed);
          } catch {
            formattedAnalysis = aiResponse;
          }
        }
        // If response is an object, format it
        else if (typeof aiResponse === 'object') {
          formattedAnalysis = formatJsonAnalysis(aiResponse);
        }
      }
      
      if (!formattedAnalysis) {
        throw new Error('Invalid AI response format');
      }
      
      setAnalysis(formattedAnalysis);
      
    } catch (error) {
      console.error('Error calling AI Coach API:', error);
      let errorMessage = 'Unable to generate P&L analysis at the moment.';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Authentication required. Please sign in to access AI Coach.';
        } else if (error.response.status === 503) {
          errorMessage = 'AI Coach is currently disabled. Please check back later.';
        } else {
          errorMessage = `AI Coach service error (${error.response.status}). Please try again.`;
        }
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setAnalysis(`Unable to generate P&L analysis at the moment. Please try again or review your financial data manually. ${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-generate analysis when modal opens
  React.useEffect(() => {
    if (isOpen && !analysis && !isAnalyzing) {
      generateAnalysis();
    }
  }, [isOpen, analysis, isAnalyzing]);

  const currentMonth = currentMonthData || {};
  const avgMonthlyIncome = pastSixMonthsData?.reduce((sum, month) => sum + (month.income || 0), 0) / (pastSixMonthsData?.length || 1) || 0;
  const avgMonthlyExpenses = pastSixMonthsData?.reduce((sum, month) => sum + (month.expenses || 0), 0) / (pastSixMonthsData?.length || 1) || 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white">
        <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6 mr-3 text-white" />
              <div>
                <CardTitle className="text-xl">Fairy AI Coach - P&L Analysis</CardTitle>
                <CardDescription className="text-green-100">
                  Smart financial insights and cost optimization recommendations
                </CardDescription>
              </div>
              <Badge className="bg-white/20 text-white border-white/30">PRO</Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <CardContent className="p-6">
          {/* P&L Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-sm">Current Month</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Income:</span>
                    <span className="font-medium text-green-600">${(currentMonth.income || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Expenses:</span>
                    <span className="font-medium text-red-600">${(currentMonth.expenses || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-1">
                    <span>Net Profit:</span>
                    <span className={`${(currentMonth.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${(currentMonth.net || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-sm">6-Month Average</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Avg Income:</span>
                    <span className="font-medium text-green-600">${avgMonthlyIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Expenses:</span>
                    <span className="font-medium text-red-600">${avgMonthlyExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-1">
                    <span>Avg Profit:</span>
                    <span className={`${(avgMonthlyIncome - avgMonthlyExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${(avgMonthlyIncome - avgMonthlyExpenses).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-sm">Performance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Profit Margin:</span>
                    <span className="font-medium">
                      {currentMonth.income > 0 ? Math.round(((currentMonth.net || 0) / currentMonth.income) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>vs 6mo Avg:</span>
                    <span className={`font-medium ${
                      (currentMonth.net || 0) >= (avgMonthlyIncome - avgMonthlyExpenses) ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(currentMonth.net || 0) >= (avgMonthlyIncome - avgMonthlyExpenses) ? '+' : ''}
                      ${((currentMonth.net || 0) - (avgMonthlyIncome - avgMonthlyExpenses)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

            {/* AI Analysis */}
            <Card className="border-green-200">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <CardTitle>AI Financial Analysis & Recommendations</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isAnalyzing ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center space-y-3">
                      <Sparkles className="w-8 h-8 text-green-600 animate-pulse" />
                      <p className="text-gray-600 text-center">Analyzing your P&L data and generating cost optimization recommendations...</p>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed max-h-96 overflow-y-auto pr-2">
                      {analysis || "Click 'Regenerate Analysis' to get personalized P&L insights and cost reduction recommendations."}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Disclaimer */}
            <div className="text-xs text-gray-500 text-center py-2 px-4 mt-4 bg-gray-50 rounded-lg border border-gray-200">
              <span className="italic">
                The I Need Numbers AI Fairy Coach can make mistakes. You should verify important information and don't forget it's just a software program.
              </span>
            </div>
          </CardContent>
        </div>

        {/* Fixed Action Buttons at Bottom */}
        <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-white">
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-6"
            >
              Close
            </Button>
            
            <Button 
              onClick={generateAnalysis}
              disabled={isAnalyzing}
              className="bg-green-600 hover:bg-green-700 text-white px-6"
            >
              {isAnalyzing ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2 text-white" />
                  Regenerate Analysis
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PnLAICoach;
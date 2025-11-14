import React, { useState } from 'react';
import { X, Sparkles, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Target, PieChart } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';

const PnLAICoach = ({ isOpen, onClose, currentMonthData, pastSixMonthsData }) => {
  const { getToken, isLoaded } = useAuth();
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(0);

  const formatDataForDisplay = (data) => {
    if (!data) return '';
    return JSON.stringify(data, null, 2);
  };

  const parseFormattedData = (text) => {
    if (typeof text === 'string' && text.startsWith('{')) {
      try {
        return JSON.parse(text);
      } catch (e) {
        return text;
      }
    }
    return text;
  };

  const getHeaders = () => {
    const token = Cookies.get('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const generateAnalysis = async () => {
    if (!currentMonthData) {
      setAnalysis('Please ensure you have P&L data for the current month.');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysis('');
    
    try {
      // Parse currentMonthData if it's a string
      const currentMonth = typeof currentMonthData === 'string' ? 
        parseFormattedData(currentMonthData) : currentMonthData;
      
      // Parse historical data
      const historicalData = pastSixMonthsData && pastSixMonthsData.length > 0 ? 
        pastSixMonthsData.map(month => 
          typeof month === 'string' ? parseFormattedData(month) : month
        ) : [];
      
      console.log('[PnLAICoach] Generating analysis for:', { currentMonth, historicalData });

      // Wait for Clerk to be loaded
      if (!isLoaded) {
        throw new Error('Authentication is still loading. Please wait a moment and try again.');
      }

      // Get fresh Clerk token with retry logic
      let token = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!token && attempts < maxAttempts) {
        try {
          token = await getToken();
          if (!token) {
            attempts++;
            if (attempts < maxAttempts) {
              console.log(`[PnLAICoach] Token fetch attempt ${attempts} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } catch (tokenError) {
          console.error('[PnLAICoach] Token fetch error:', tokenError);
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (!token) {
        throw new Error('Unable to get authentication token. Please try logging out and back in.');
      }

      console.log('[PnLAICoach] Token obtained, calling AI Coach...');

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
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true,
          timeout: 60000 // 60 second timeout for AI generation
        }
      );

      const aiResponse = response.data;
      console.log('[PnLAICoach] AI Response received:', aiResponse);
      
      // Handle different response formats
      if (aiResponse.summary) {
        // If summary is an object (JSON), parse and format it
        if (typeof aiResponse.summary === 'object') {
          let formattedSummary = '';
          
          if (aiResponse.summary.overview) {
            formattedSummary += aiResponse.summary.overview + '\n\n';
          }
          
          if (aiResponse.summary.key_insights && Array.isArray(aiResponse.summary.key_insights)) {
            formattedSummary += '**Key Insights:**\n';
            aiResponse.summary.key_insights.forEach((insight, i) => {
              formattedSummary += `${i + 1}. ${insight}\n`;
            });
            formattedSummary += '\n';
          }
          
          if (aiResponse.summary.recommendations && Array.isArray(aiResponse.summary.recommendations)) {
            formattedSummary += '**Recommendations:**\n';
            aiResponse.summary.recommendations.forEach((rec, i) => {
              formattedSummary += `${i + 1}. ${rec}\n`;
            });
          }
          
          setAnalysis(formattedSummary || JSON.stringify(aiResponse.summary, null, 2));
        } else {
          setAnalysis(aiResponse.summary);
        }
      } else if (aiResponse.insights) {
        setAnalysis(aiResponse.insights);
      } else if (typeof aiResponse === 'string') {
        setAnalysis(aiResponse);
      } else {
        setAnalysis(JSON.stringify(aiResponse, null, 2));
      }
    } catch (error) {
      console.error('[PnLAICoach] Error calling AI Coach API:', error);
      let errorMessage = 'Unable to generate P&L analysis at the moment.';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Authentication required. Please sign in to access AI Coach.';
        } else if (error.response.status === 403) {
          errorMessage = 'AI Coach is a PRO feature. Please upgrade your plan to access personalized insights.';
        } else if (error.response.status === 503) {
          errorMessage = 'AI Coach is currently disabled. Please check back later.';
        } else {
          errorMessage = `AI Coach service error (${error.response.status}). Please try again.`;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setAnalysis(`${errorMessage}\n\nPlease try again or review your financial data manually.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white">
        <CardHeader className="border-b flex-shrink-0 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <CardTitle>Fairy AI Coach - P&L Analysis</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            Get personalized insights and recommendations based on your profit & loss data
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 bg-white">
          {!analysis && !isAnalyzing && (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to Analyze Your Finances</h3>
              <p className="text-gray-600 mb-6">
                Click the button below to get AI-powered insights on your P&L performance
              </p>
              <Button
                onClick={generateAnalysis}
                disabled={isAnalyzing}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Analysis
              </Button>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing your financial data...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="whitespace-pre-wrap text-gray-800">{analysis}</div>
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={generateAnalysis}
                  variant="outline"
                  disabled={isAnalyzing}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate New Analysis
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PnLAICoach;
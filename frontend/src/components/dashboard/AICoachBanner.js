import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Target,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import axios from 'axios';
// Removed js-cookie import - using HttpOnly cookies now

const AICoachBanner = () => {
  const { user } = useAuth();
  const { getToken, isLoaded } = useClerkAuth();
  const [coachData, setCoachData] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // Auto-generate on mount
  useEffect(() => {
    if (user && isLoaded) {
      generateInsights();
    }
  }, [user, isLoaded]);

  const generateInsights = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      console.log('[AICoachBanner] Starting insight generation...');

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
              console.log(`[AICoachBanner] Token fetch attempt ${attempts} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } catch (tokenError) {
          console.error('[AICoachBanner] Token fetch error:', tokenError);
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (!token) {
        throw new Error('Unable to get authentication token. Please try logging out and back in.');
      }

      console.log('[AICoachBanner] Token obtained, calling AI Coach...');

      const response = await axios.post(`${backendUrl}/api/ai-coach-v2/generate`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true,
        timeout: 60000 // 60 second timeout for AI generation
      });

      console.log('[AICoachBanner] AI Coach response received');
      setCoachData(response.data);
      setIsExpanded(true); // Auto-expand on successful generation
    } catch (error) {
      console.error('[AICoachBanner] Error generating insights:', error);
      let errorMessage = 'AI Coach temporarily unavailable. Please try again in a moment.';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Authentication required. Please sign in to access AI Coach.';
        } else if (error.response.status === 403) {
          errorMessage = 'AI Coach is a PRO feature. Upgrade your plan for personalized insights.';
        } else if (error.response.status === 503) {
          errorMessage = 'AI Coach is currently disabled. Please check back later.';
        } else if (error.response.status >= 500) {
          errorMessage = 'AI Coach service is experiencing issues. Please try again later.';
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // Don't show banner if user is not logged in
  if (!user) {
    return null;
  }

  return (
    <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-purple-100 p-3 rounded-full">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                Fairy AI Coach
                {isGenerating && <span className="text-sm text-purple-600 animate-pulse">(Generating...)</span>}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {error ? error : 'Your personalized AI-powered business insights'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateInsights}
              disabled={isGenerating}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : 'Generate New Insights'}
            </Button>
            {coachData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>

        {isExpanded && coachData && (
          <div className="mt-6 space-y-4 animate-in slide-in-from-top">
            {/* Priority Actions */}
            {coachData.priority_actions && coachData.priority_actions.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-gray-900">Priority Actions</h4>
                </div>
                <ul className="space-y-2">
                  {coachData.priority_actions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-purple-600 font-semibold">{idx + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Time-Sensitive Items */}
            {coachData.time_sensitive && coachData.time_sensitive.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold text-gray-900">Time-Sensitive</h4>
                </div>
                <ul className="space-y-2">
                  {coachData.time_sensitive.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* General Summary */}
            {coachData.summary && (
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{coachData.summary}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AICoachBanner;
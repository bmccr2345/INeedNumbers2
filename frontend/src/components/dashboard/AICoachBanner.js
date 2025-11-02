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
import axios from 'axios';
// Removed js-cookie import - using HttpOnly cookies now

const AICoachBanner = () => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false); // Start minimized by default
  const [coachData, setCoachData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get backend URL
  const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;

  // AI Coach is PRO-only feature - don't render if not PRO user
  if (!user || user.plan !== 'PRO') {
    return null;
  }

  const loadCoachData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check authentication using AuthContext (not cookies)
      if (!user) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      const response = await axios.post(`${backendUrl}/api/ai-coach-v2/generate`, {}, {
        withCredentials: true,  // Use HttpOnly cookies instead of Bearer token
        timeout: 30000 // 30 second timeout for AI generation
      });

      setCoachData(response.data);
    } catch (error) {
      console.error('Failed to load coach data:', error);
      // Handle specific error cases without causing mobile dashboard to hang
      if (error.response?.status === 402) {
        setError('AI Coach requires a Pro plan. Upgrade to access personalized insights.');
      } else if (error.response?.status === 401) {
        setError('Authentication required for AI Coach insights.');
      } else if (error.response?.status === 500) {
        setError('AI Coach is temporarily unavailable. Please try again later.');
      } else if (error.code === 'ECONNABORTED') {
        setError('AI Coach is taking too long to respond. Please try again.');
      } else {
        setError('Unable to load coaching insights. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only load coach data if user is authenticated and is PRO
    if (user && user.plan === 'PRO') {
      loadCoachData();
    } else {
      setIsLoading(false);
      if (!user) {
        setError('Authentication required for AI Coach insights.');
      } else if (user.plan !== 'PRO') {
        setError('AI Coach requires a Pro plan. Upgrade to access personalized insights.');
      }
    }
  }, [user]);

  const handleGenerateCoaching = async (force = false) => {
    try {
      setIsGenerating(true);
      setError(null);
      
      // Try new AI coach API first
      try {
        const { fetchCoachJSON } = await import('../../lib/coach.js');
        const data = await fetchCoachJSON(force);
        
        // Transform new API response to legacy format for display
        setCoachData({
          coaching_text: data.summary || '',
          stats: data.stats || {},
          actions: data.actions || [],
          risks: data.risks || [],
          next_inputs: data.next_inputs || []
        });
        return;
      } catch (newApiError) {
        console.warn('New AI Coach API failed, falling back to legacy:', newApiError);
        
        // Fallback to legacy API
        const response = await fetch(`${BACKEND_URL}/api/ai-coach-v2/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setCoachData(data);
        } else {
          throw new Error(`Legacy API failed: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Error generating coaching:', error);
      
      if (error.message.includes('Upgrade to Pro')) {
        setError('Upgrade to Pro to unlock Fairy AI Coach insights');
      } else if (error.message.includes('Rate limit')) {
        setError(error.message);
      } else {
        setError('Fairy AI Coach temporarily unavailable. Please try again in a few minutes.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Agent';
    
    if (hour < 12) return `Good morning, ${firstName}`;
    if (hour < 17) return `Good afternoon, ${firstName}`;
    return `Good evening, ${firstName}`;
  };

  if (isLoading) {
    return (
      <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Sparkles className="w-6 h-6 text-green-600 animate-pulse" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 animate-pulse text-pink-500" />
            </div>
            <div className="flex-1">
              <div className="h-4 bg-purple-200 rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-3 bg-purple-100 rounded w-64 animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Sparkles className="w-6 h-6 text-green-600" />
                <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-pink-500" />
              </div>
              <div>
                <h3 className="font-medium text-purple-900">Fairy AI Coach Unavailable</h3>
                <p className="text-sm text-purple-700">{error}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateCoaching}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                'Retry'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!coachData) return null;

  return (
    <Card className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400 shadow-md">
      <CardContent className="p-4">
        
        {/* Collapsed View */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="relative">
              <Sparkles className="w-6 h-6 text-white" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 animate-pulse text-yellow-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white mb-1">
                {getGreeting()} Your Fairy AI Coach is here! ✨
              </h3>
              <p className="text-sm text-purple-100">
                {isExpanded ? "Click to collapse" : "Click to expand for your personalized coaching insights"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateCoaching}
              disabled={isGenerating}
              className="text-white hover:text-purple-100 hover:bg-purple-600 hover:bg-opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white hover:text-purple-100 hover:bg-purple-600 hover:bg-opacity-50"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Expanded View - Large Text Area */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-purple-300 border-opacity-50">
            <div className="bg-white rounded-lg p-6 border border-purple-100 shadow-sm">
              <div className="prose prose-sm max-w-none">
                {/* Conversational Coaching Paragraph - 4+ sentences */}
                {coachData?.coaching_advice && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      💬 {coachData.coaching_advice}
                    </p>
                  </div>
                )}

                {/* Stats Section - Your Numbers */}
                {coachData?.stats && Object.keys(coachData.stats).length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-sm text-blue-900 mb-2">📊 Your Numbers</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(coachData.stats).map(([key, value]) => {
                        // Only render primitive values (not objects or arrays)
                        if (typeof value === 'object' || value === null || value === undefined) {
                          return null;
                        }
                        
                        return (
                          <div key={key}>
                            <span className="text-gray-600">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                            </span>{' '}
                            <span className="font-medium text-gray-900">
                              {typeof value === 'number' ? value.toLocaleString() : value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actions Section */}
                {coachData?.actions && coachData.actions.length > 0 && (
                  <div className="mb-4 p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-sm text-green-900 mb-2">✅ Recommended Actions</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {coachData.actions.map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risks Section */}
                {coachData?.risks && coachData.risks.length > 0 && (
                  <div className="mb-4 p-4 bg-amber-50 rounded-lg">
                    <h4 className="font-semibold text-sm text-amber-900 mb-2">⚠️ Areas to Watch</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {coachData.risks.map((risk, idx) => (
                        <li key={idx}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next Inputs Section */}
                {coachData?.next_inputs && coachData.next_inputs.length > 0 && (
                  <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-sm text-purple-900 mb-2">📝 Next Steps</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {coachData.next_inputs.map((input, idx) => (
                        <li key={idx}>{input}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* AI Disclaimer */}
              <div className="text-xs text-gray-500 text-center py-2 px-4 mt-4 bg-gray-50 rounded-lg border border-gray-200">
                <span className="italic">
                  The I Need Numbers AI Fairy Coach can make mistakes. You should verify important information and don't forget it's just a software program.
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AICoachBanner;
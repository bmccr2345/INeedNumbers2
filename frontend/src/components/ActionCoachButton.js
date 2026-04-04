import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import API_BASE_URL from '../config/api';

const ActionCoachButton = () => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const { getToken } = useAuth();

  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Get today's date in YYYY-MM-DD format
  const getToday = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  // Parse the AI response into structured data
  const parseCoachResponse = (data) => {
    const text = data.response || data.message || data.coaching || JSON.stringify(data);

    // Try to extract structured sections
    const constraintMatch = text.match(/Constraint:\s*(.+?)(?:\n|$)/i);
    const focusMatch = text.match(/Focus:\s*(.+?)(?:\n|$)/i);

    // Extract numbered actions with flexible patterns
    const actions = [];
    
    // Pattern 1: Numbered actions with "Action:" prefix
    const actionRegex = /(\d+)\.\s*(?:Action:)?\s*(.+?)(?:\n|$)[\s\S]*?(?:How to do it:|How:)\s*(.+?)(?:\n|$)[\s\S]*?(?:Why (?:this|it) matters:|Why:)\s*(.+?)(?:\n|$)/gi;
    let match;
    while ((match = actionRegex.exec(text)) !== null) {
      actions.push({
        title: match[2].trim(),
        howToDoIt: match[3].trim(),
        whyItMatters: match[4].trim(),
      });
    }

    // If no structured actions found, create a default
    if (actions.length === 0) {
      // Try simpler pattern
      const simpleActionRegex = /\d+\.\s*\*\*(.+?)\*\*[:\s]*(.+?)(?=\d+\.|$)/gs;
      while ((match = simpleActionRegex.exec(text)) !== null) {
        actions.push({
          title: match[1].trim(),
          howToDoIt: match[2].trim().substring(0, 200),
          whyItMatters: 'Direct impact on your income this month.',
        });
      }
    }

    // Fallback if still no actions
    if (actions.length === 0) {
      actions.push({
        title: 'Reach out to your warmest lead',
        howToDoIt: 'Call or text your #1 hottest lead right now. Ask where they are in their decision process and what they need from you today.',
        whyItMatters: 'Direct contact is the fastest path to a closing.',
      });
    }

    // Build impact line
    const impactMatch = text.match(/If you do these.*?(?:\n|$)/i);

    return {
      impactLine: impactMatch ? impactMatch[0].trim() : "Complete these actions today to move closer to your monthly goal.",
      constraint: constraintMatch ? constraintMatch[1].trim() : 'Pipeline needs attention',
      focus: focusMatch ? focusMatch[1].trim() : 'Take action',
      actions: actions.slice(0, 3), // Max 3 actions
    };
  };

  const handleAskCoach = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const token = await getToken();
      const currentMonth = getCurrentMonth();
      const today = getToday();

      // Gather all context data in parallel
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [trackerSettings, dailyTracker, pnlData, activityLogs, goalSettings] = await Promise.all([
        fetch(`${API_BASE_URL}/api/tracker/settings?month=${currentMonth}`, {
          headers,
          credentials: 'include'
        }).then(r => r.ok ? r.json() : null).catch(() => null),

        fetch(`${API_BASE_URL}/api/tracker/daily?date=${today}`, {
          headers,
          credentials: 'include'
        }).then(r => r.ok ? r.json() : null).catch(() => null),

        fetch(`${API_BASE_URL}/api/pnl/summary?month=${currentMonth}`, {
          headers,
          credentials: 'include'
        }).then(r => r.ok ? r.json() : null).catch(() => null),

        fetch(`${API_BASE_URL}/api/activity-logs?limit=10`, {
          headers,
          credentials: 'include'
        }).then(r => r.ok ? r.json() : null).catch(() => null),

        fetch(`${API_BASE_URL}/api/goal-settings`, {
          headers,
          credentials: 'include'
        }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      // Call AI coach with action_coaching context
      const aiResponse = await fetch(`${API_BASE_URL}/api/ai-coach/generate`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          context: 'action_coaching',
          tracker_settings: trackerSettings,
          daily_tracker: dailyTracker,
          pnl_data: pnlData,
          recent_activity_logs: activityLogs,
          goal_settings: goalSettings,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error('AI response failed');
      }

      const data = await aiResponse.json();
      setResponse(parseCoachResponse(data));
    } catch (error) {
      console.error('Action coach error:', error);
      setResponse({
        impactLine: "Let's get you focused on what matters most today.",
        constraint: 'Unable to analyze — try again',
        focus: 'Take action',
        actions: [{
          title: 'Pick up the phone',
          howToDoIt: 'Call your 3 warmest leads right now. Even a 2-minute check-in can move a deal forward.',
          whyItMatters: 'Direct outreach converts faster than any other activity.'
        }]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (type) => {
    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/api/activity-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'ai_coach_feedback',
          feedback: type,
          actions: response?.actions?.map(a => a.title) || [],
          date: new Date().toISOString(),
        }),
      });

      if (type === 'completed') {
        setResponse(prev => ({ ...prev, impactLine: "Great work! Keep that momentum going." }));
      } else if (type === 'remind') {
        setResponse(null);
      }
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  return (
    <div className="mb-4">
      {/* Main Button */}
      <button
        onClick={handleAskCoach}
        disabled={loading}
        className="w-full bg-gradient-to-r from-[#2FA163] to-[#268a54] hover:from-[#268a54] hover:to-[#1e7a45] text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-3 text-lg disabled:opacity-70"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Analyzing your pipeline...</span>
          </>
        ) : (
          <>
            <span className="text-2xl">✨</span>
            <span>What should I do right now?</span>
          </>
        )}
      </button>

      {/* Response Panel */}
      {response && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
          {/* Header with impact line */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-[#2FA163]">
              {response.impactLine}
            </p>
          </div>

          {/* Constraint + Focus badges */}
          <div className="px-5 pt-4 pb-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
              🎯 {response.constraint}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              📌 Focus: {response.focus}
            </span>
          </div>

          {/* Action Cards */}
          <div className="px-5 py-3 space-y-4">
            {response.actions.map((action, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-[#2FA163] text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{action.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{action.howToDoIt}</p>
                    <p className="text-xs text-[#2FA163] mt-2 font-medium">{action.whyItMatters}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Feedback Buttons */}
          <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap gap-3">
            <button
              onClick={() => handleFeedback('completed')}
              className="flex-1 min-w-[100px] flex items-center justify-center space-x-2 px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium text-sm transition-colors"
            >
              <span>✅</span><span>I did this</span>
            </button>
            <button
              onClick={() => handleAskCoach()}
              className="flex-1 min-w-[100px] flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium text-sm transition-colors"
            >
              <span>🔁</span><span>Different actions</span>
            </button>
            <button
              onClick={() => handleFeedback('remind')}
              className="flex-1 min-w-[100px] flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-medium text-sm transition-colors"
            >
              <span>⏰</span><span>Remind me later</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionCoachButton;

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Circle, ChevronRight, Sparkles, TrendingUp, Target, Calendar, Clock, Brain, Trophy } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { safeLocalStorage } from '../utils/safeStorage';
import { useIsMobile } from '../hooks/useMediaQuery';

const ProOnboardingWizard = ({ isOpen, onClose, onComplete }) => {
  const isMobile = useIsMobile();
  const [currentDay, setCurrentDay] = useState(1);
  const [isMinimized, setIsMinimized] = useState(false);
  const [checklist, setChecklist] = useState({
    day1: {
      welcome: false,
      setupGoals: false,
      logFirstActivity: false,
      explorePnL: false
    },
    day2: {
      logActivity: false,
      dailyReflection: false,
      checkAICoach: false,
      reviewGoals: false
    },
    day3: {
      timeBlocking: false,
      weeklyReview: false,
      customizeDashboard: false,
      masterAI: false
    }
  });

  // Calculate progress
  const getDayProgress = (day) => {
    const tasks = Object.values(checklist[`day${day}`]);
    const completed = tasks.filter(Boolean).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const toggleTask = (day, task) => {
    setChecklist(prev => ({
      ...prev,
      [`day${day}`]: {
        ...prev[`day${day}`],
        [task]: !prev[`day${day}`][task]
      }
    }));
  };

  // Save progress to localStorage
  useEffect(() => {
    if (isOpen) {
      safeLocalStorage.setItem('pro_onboarding_checklist', JSON.stringify(checklist));
      safeLocalStorage.setItem('pro_onboarding_day', currentDay.toString());
    }
  }, [checklist, currentDay, isOpen]);

  // Load progress from localStorage
  useEffect(() => {
    const savedChecklist = safeLocalStorage.getItem('pro_onboarding_checklist');
    const savedDay = safeLocalStorage.getItem('pro_onboarding_day');
    
    if (savedChecklist) {
      try {
        setChecklist(JSON.parse(savedChecklist));
      } catch (e) {
        console.warn('[ProOnboarding] Failed to parse saved checklist:', e);
      }
    }
    if (savedDay) {
      setCurrentDay(parseInt(savedDay) || 1);
    }
  }, []);

  const dayContent = {
    1: {
      title: "Day 1: Plan Your Year (Start Simple)",
      icon: <Target className="w-6 h-6 text-emerald-600" />,
      description: "Let's build your 1-year game plan. We'll set your income goal, figure out how many homes you need to sell, and show how daily activity keeps you on track.",
      tasks: [
        {
          id: 'welcome',
          title: 'Let\'s Build Your 1-Year Game Plan',
          description: 'A simple approach to annual planning',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium text-emerald-700">You don't need a 10-year vision. Just one clear year.</p>
              <p>Here's how I Need Numbers helps you build it:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span><strong>Set Your Annual Income Goal</strong> – One number, no guesswork</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span><strong>Calculate Deals Needed</strong> – The app does the math for you</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span><strong>Break It Into Weekly Targets</strong> – Bite-sized, achievable goals</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span><strong>Fairy AI Coach</strong> – Keeps you on track when you fall behind</span>
                </li>
              </ul>
              <div className="bg-emerald-50 p-3 rounded-lg mt-3">
                <p className="text-emerald-900 font-medium">🔑 Key Insight:</p>
                <p className="text-emerald-800 text-xs">You don't need a 10-year vision. Just one clear year. The app will handle the math.</p>
              </div>
            </div>
          )
        },
        {
          id: 'setupGoals',
          title: 'Set Your Annual Income Goal',
          description: 'One simple number that drives everything',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Navigate to Plan and Track → Goal Settings</p>
              <ol className="space-y-2 ml-4 list-decimal">
                <li>Enter <strong>How much you want to earn this year</strong> (e.g., $120,000)</li>
                <li>The app auto-calculates:
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• Homes needed (based on your average commission)</li>
                    <li>• Deals per month (e.g., 24 homes = 2 per month)</li>
                    <li>• Weekly activity targets to hit that goal</li>
                  </ul>
                </li>
                <li>Example: <strong>$120,000 = about 24 homes = 2 per month</strong></li>
              </ol>
              <div className="bg-blue-50 p-3 rounded-lg mt-3">
                <p className="text-blue-900 font-medium">💡 Does That Feel Doable?</p>
                <p className="text-blue-800 text-xs">You can always adjust your pace. Start with a realistic number. The app will track your progress and help you course-correct.</p>
              </div>
            </div>
          )
        },
        {
          id: 'logFirstActivity',
          title: 'See How Daily Actions Connect',
          description: 'Understand how today\'s work builds your year',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">I Need Numbers turns your goal into weekly targets:</p>
              <ul className="space-y-2 ml-4">
                <li>• <strong>Conversations:</strong> How many calls/texts to hit your pipeline</li>
                <li>• <strong>Appointments:</strong> Showings and consultations needed</li>
                <li>• <strong>Listings:</strong> How many homes you need to list each month</li>
              </ul>
              <p className="mt-3 font-medium">The app tracks your progress and gives AI coaching when you fall off pace.</p>
              <div className="bg-purple-50 p-3 rounded-lg mt-3">
                <p className="text-purple-900 font-medium">🎯 Why This Matters:</p>
                <p className="text-purple-800 text-xs">Most agents focus on the wrong numbers. I Need Numbers shows you exactly what daily actions lead to your annual goal.</p>
              </div>
            </div>
          )
        },
        {
          id: 'explorePnL',
          title: 'Understand the Purpose',
          description: 'What I Need Numbers actually does for you',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Here's what happens next:</p>
              <ol className="space-y-2 ml-4 list-decimal">
                <li><strong>Activity Tracker</strong> logs your daily actions (calls, appointments, listings)</li>
                <li><strong>P&L Tracker</strong> shows your true take-home profit (not just commission)</li>
                <li><strong>Fairy AI Coach</strong> reads your data and gives guidance when you need it</li>
                <li><strong>Goal Settings</strong> tracks your progress toward your annual target</li>
              </ol>
              <div className="bg-amber-50 p-3 rounded-lg mt-3">
                <p className="text-amber-900 font-medium">🎓 Key Insight:</p>
                <p className="text-amber-800 text-xs">You don't need a 10-year vision. Just one clear year. The app will handle the math and keep you focused on what matters today.</p>
              </div>
            </div>
          )
        }
      ]
    },
    2: {
      title: "Day 2: Building Habits",
      icon: <Calendar className="w-6 h-6 text-blue-600" />,
      description: "Let's establish your daily routine and explore AI insights.",
      tasks: [
        {
          id: 'logActivity',
          title: 'Log Today\'s Activities',
          description: 'Make activity logging a daily habit',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Plan and Track → Action Tracker → Log Activity</p>
              <p>Today, focus on being thorough:</p>
              <ul className="space-y-2 ml-4">
                <li>• Record ALL conversations (not just promising ones)</li>
                <li>• Track appointments, showings, and listings</li>
                <li>• Note the hours spent in each activity category</li>
              </ul>
              <div className="bg-emerald-50 p-3 rounded-lg mt-3">
                <p className="text-emerald-900 font-medium">⏰ Time Blocking Tip:</p>
                <p className="text-emerald-800 text-xs">Block 10 minutes at end of day to log activities. Consistency beats perfection. Even rough numbers are better than none!</p>
              </div>
            </div>
          )
        },
        {
          id: 'dailyReflection',
          title: 'Complete Your First Daily Reflection',
          description: 'Review your day and learn from it',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Why Daily Reflection Matters</p>
              <p>Reflection turns experience into wisdom. Answer these:</p>
              <ol className="space-y-2 ml-4 list-decimal">
                <li>What worked well today?</li>
                <li>What would you do differently?</li>
                <li>Any insights or lessons learned?</li>
                <li>How did you feel about your productivity?</li>
              </ol>
              <div className="bg-blue-50 p-3 rounded-lg mt-3">
                <p className="text-blue-900 font-medium">🧠 AI Learning:</p>
                <p className="text-blue-800 text-xs">Your reflections help Fairy AI understand context. When you note "struggled with follow-ups," AI can suggest time management strategies.</p>
              </div>
            </div>
          )
        },
        {
          id: 'checkAICoach',
          title: 'Get Your First AI Insights',
          description: 'See what Fairy AI has learned about you',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Try AI Coach in Multiple Places:</p>
              <ul className="space-y-2 ml-4">
                <li>• <strong>Dashboard Overview:</strong> Click AI Coach banner for daily insights</li>
                <li>• <strong>Work Deals Calculators:</strong> Get deal analysis with AI recommendations</li>
                <li>• <strong>Manage Finances → P&L Tracker:</strong> Ask AI about expense patterns</li>
              </ul>
              <div className="bg-purple-50 p-3 rounded-lg mt-3">
                <p className="text-purple-900 font-medium">✨ AI Gets Smarter:</p>
                <p className="text-purple-800 text-xs">The more you use the platform (log activities, track deals, reflect), the better AI's insights become. It learns YOUR patterns, not generic advice.</p>
              </div>
            </div>
          )
        },
        {
          id: 'reviewGoals',
          title: 'Review Your Goal Progress',
          description: 'Check how you\'re tracking against targets',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Plan and Track → Goal Settings → Review Progress</p>
              <ol className="space-y-2 ml-4 list-decimal">
                <li>Compare actual activities vs. targets</li>
                <li>Check your income projection based on current pace</li>
                <li>Note any gaps (e.g., "need 3 more appointments")</li>
                <li>Adjust tomorrow's focus based on gaps</li>
              </ol>
              <div className="bg-amber-50 p-3 rounded-lg mt-3">
                <p className="text-amber-900 font-medium">🎯 Course Correction:</p>
                <p className="text-amber-800 text-xs">Daily reviews let you adjust before falling behind. If you're short on conversations, tomorrow you know to prioritize prospecting.</p>
              </div>
            </div>
          )
        }
      ]
    },
    3: {
      title: "Day 3: Mastery & Optimization",
      icon: <Trophy className="w-6 h-6 text-purple-600" />,
      description: "You're ready to master time blocking and leverage advanced features.",
      tasks: [
        {
          id: 'timeBlocking',
          title: 'Implement Time Blocking',
          description: 'Structure your day for maximum productivity',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Time Blocking Framework for Real Estate Agents:</p>
              <div className="space-y-2">
                <div className="bg-emerald-50 p-2 rounded">
                  <p className="font-medium text-emerald-900">🌅 Morning (8-10 AM): Lead Generation</p>
                  <p className="text-xs text-emerald-800">Prospecting calls, follow-ups, sphere outreach</p>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <p className="font-medium text-blue-900">☀️ Mid-Day (10 AM-2 PM): Appointments</p>
                  <p className="text-xs text-blue-800">Showings, buyer consultations, listing presentations</p>
                </div>
                <div className="bg-purple-50 p-2 rounded">
                  <p className="font-medium text-purple-900">🌆 Afternoon (2-5 PM): Admin & Marketing</p>
                  <p className="text-xs text-purple-800">Paperwork, social media, email, transaction management</p>
                </div>
                <div className="bg-amber-50 p-2 rounded">
                  <p className="font-medium text-amber-900">🌙 Evening (5-6 PM): Review & Planning</p>
                  <p className="text-xs text-amber-800">Log activities, daily reflection, plan tomorrow</p>
                </div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg mt-3">
                <p className="text-emerald-900 font-medium">⚡ Power Tip:</p>
                <p className="text-emerald-800 text-xs">Block the same time slots each week for consistency. Your brain adapts to the routine, making it easier to focus. Sunday evening plan + daily morning review = unstoppable momentum!</p>
              </div>
            </div>
          )
        },
        {
          id: 'weeklyReview',
          title: 'Plan Your Weekly Review Process',
          description: 'Set up your rhythm for long-term success',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Weekly Review Checklist (Every Sunday):</p>
              <ol className="space-y-2 ml-4 list-decimal">
                <li>Review last week's activity totals vs. goals in Action Tracker</li>
                <li>Check P&L: deals closed, profit margins, expense trends</li>
                <li>Read AI Coach insights for the week</li>
                <li>Identify patterns: What days/activities were most productive?</li>
                <li>Set next week's priorities based on gaps</li>
              </ol>
              <div className="bg-emerald-50 p-3 rounded-lg mt-3">
                <p className="text-emerald-900 font-medium">📊 Data-Driven Decisions:</p>
                <p className="text-emerald-800 text-xs">Weekly reviews reveal trends daily tracking misses. Maybe Tuesdays are your best prospecting days, or certain expense categories are creeping up.</p>
              </div>
            </div>
          )
        },
        {
          id: 'customizeDashboard',
          title: 'Customize Your Dashboard',
          description: 'Make the platform work for YOUR workflow',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Dashboard Customization:</p>
              <ul className="space-y-2 ml-4">
                <li>• Pin your most-used tools from the Work Deals section</li>
                <li>• Set up recurring expenses in Manage Finances → P&L Tracker</li>
                <li>• Customize activity categories in Action Tracker to match your business</li>
                <li>• Generate professional PDF reports for your clients</li>
              </ul>
              <div className="bg-blue-50 p-3 rounded-lg mt-3">
                <p className="text-blue-900 font-medium">⚡ Power User Tip:</p>
                <p className="text-blue-800 text-xs">The platform adapts to you. The more you customize and use it, the more valuable it becomes. Make it YOUR business command center.</p>
              </div>
            </div>
          )
        },
        {
          id: 'masterAI',
          title: 'Master the Fairy AI Coach',
          description: 'Unlock the full power of AI insights',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Getting the Most from Fairy AI:</p>
              <ol className="space-y-2 ml-4 list-decimal">
                <li><strong>Be Consistent:</strong> AI needs 2-3 weeks of data to spot patterns</li>
                <li><strong>Be Detailed:</strong> More context = better insights</li>
                <li><strong>Act on Insights:</strong> AI learns what works when you try its suggestions</li>
                <li><strong>Ask Questions:</strong> Use AI Coach on calculators for deal-specific advice</li>
              </ol>
              <div className="bg-purple-50 p-3 rounded-lg mt-3">
                <p className="text-purple-900 font-medium">🧠 AI Feedback Loop:</p>
                <p className="text-purple-800 text-xs">Track activities → AI spots patterns → Suggests improvements → You test them → Track results → AI refines suggestions. It's your personal business analyst!</p>
              </div>
            </div>
          )
        }
      ]
    }
  };

  if (!isOpen) return null;

  const currentDayData = dayContent[currentDay];
  const progress = getDayProgress(currentDay);
  const overallProgress = Math.round(
    (Object.values(checklist.day1).filter(Boolean).length +
     Object.values(checklist.day2).filter(Boolean).length +
     Object.values(checklist.day3).filter(Boolean).length) / 12 * 100
  );

  // Minimized widget (floating on right side) - Hide on mobile
  if (isMinimized) {
    // On mobile, minimizing should close the wizard completely
    if (isMobile) {
      return null;
    }
    
    return (
      <div className="fixed right-4 bottom-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg shadow-2xl hover:shadow-3xl transition-all hover:scale-105 p-4 flex flex-col items-center space-y-2 w-64"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold">Pro Onboarding</span>
            </div>
            <span className="text-xs bg-white text-emerald-700 px-2 py-1 rounded-full font-bold">
              Day {currentDay}/3
            </span>
          </div>
          
          <div className="w-full">
            <div className="flex justify-between text-xs mb-1">
              <span>Overall Progress</span>
              <span className="font-bold">{overallProgress}%</span>
            </div>
            <div className="w-full bg-emerald-800 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
          
          <div className="text-xs text-emerald-100 text-center">
            Click to continue your journey →
          </div>
        </button>
      </div>
    );
  }

  // Full expanded modal
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={() => {
        // On mobile, clicking backdrop closes completely
        if (isMobile) {
          onClose();
        } else {
          setIsMinimized(true);
        }
      }}
    >
      <Card 
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to backdrop
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 flex justify-between items-start">
          <div className="flex items-start space-x-3">
            {currentDayData.icon}
            <div>
              <h2 className="text-2xl font-bold">{currentDayData.title}</h2>
              <p className="text-emerald-100 text-sm mt-1">{currentDayData.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                // On mobile, minimize closes completely
                if (isMobile) {
                  onClose();
                } else {
                  setIsMinimized(true);
                }
              }}
              className="flex items-center space-x-2 text-white hover:text-emerald-100 transition-colors px-3 py-2 hover:bg-emerald-600 rounded-lg group"
              title={isMobile ? "Close and access later from + menu" : "Minimize to continue working"}
            >
              <span className="text-sm font-medium">{isMobile ? "Close" : "Minimize"}</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={onClose}
              className="text-white hover:text-emerald-100 transition-colors p-2 hover:bg-emerald-600 rounded-lg"
              title="Close wizard"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Day {currentDay} Progress</span>
            <div className="flex items-center space-x-2">
              {currentDay === 1 && (
                <span className="text-sm font-medium text-purple-600">
                  *We HIGHLY recommend onboarding via desktop*
                </span>
              )}
              <span className="text-sm font-bold text-emerald-600">{progress}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Day Navigation */}
        <div className="flex space-x-2 px-6 pt-4">
          {[1, 2, 3].map(day => (
            <button
              key={day}
              onClick={() => setCurrentDay(day)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                currentDay === day
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Day {day}
            </button>
          ))}
        </div>

        {/* Content */}
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {currentDayData.tasks.map((task, index) => (
            <Card 
              key={task.id}
              className={`border-2 transition-all ${
                checklist[`day${currentDay}`][task.id]
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-200'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => toggleTask(currentDay, task.id)}
                    className="mt-1 flex-shrink-0"
                  >
                    {checklist[`day${currentDay}`][task.id] ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    {task.content}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                onClose();
                safeLocalStorage.setItem('pro_onboarding_dismissed', 'true');
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              I'll do this later
            </button>
            <span className="text-xs text-gray-500 italic">
              💡 Tip: {isMobile ? "Close and reopen anytime from + button" : "Click outside or 'Minimize' to continue working"}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {currentDay < 3 && (
              <Button
                onClick={() => setCurrentDay(currentDay + 1)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Next Day <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {currentDay === 3 && progress === 100 && (
              <Button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Complete Onboarding 🎉
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProOnboardingWizard;

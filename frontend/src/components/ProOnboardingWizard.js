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
          description: 'Define your goal and commit to it',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium text-emerald-700">You don't need a ten-year vision—just one clear year.</p>
              <p>Let's set an income goal, see how many homes that means, and build small weekly targets that keep you on pace.</p>
              
              <div className="bg-purple-50/80 p-4 rounded-lg border border-purple-200 mt-4">
                <p className="text-purple-900 font-medium mb-2">💬 Coach Prompt:</p>
                <p className="text-purple-800 text-xs italic mb-3">Before we talk numbers, why do you want to grow this year?</p>
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1 bg-white border border-purple-200 rounded-md text-xs hover:bg-purple-100 transition-colors">
                    Freedom
                  </button>
                  <button className="px-3 py-1 bg-white border border-purple-200 rounded-md text-xs hover:bg-purple-100 transition-colors">
                    Family
                  </button>
                  <button className="px-3 py-1 bg-white border border-purple-200 rounded-md text-xs hover:bg-purple-100 transition-colors">
                    Stability
                  </button>
                  <button className="px-3 py-1 bg-white border border-purple-200 rounded-md text-xs hover:bg-purple-100 transition-colors">
                    Challenge
                  </button>
                  <input 
                    type="text" 
                    placeholder="Something else..." 
                    className="px-3 py-1 border border-purple-200 rounded-md text-xs flex-1 min-w-[120px]"
                  />
                </div>
              </div>

              <ul className="space-y-2 ml-4 mt-4">
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span><strong>Set Your Annual Income Goal</strong> — one number, one purpose.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span><strong>See Your Math Instantly</strong> — the app shows how many deals it takes.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span><strong>Break It Down</strong> — monthly and weekly goals you can actually hit.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span><strong>Meet Your Coach</strong> — Fairy AI learns your pace and keeps you on track.</span>
                </li>
              </ul>
              <div className="bg-emerald-50 p-3 rounded-lg mt-3">
                <p className="text-emerald-900 font-medium">🟩 Key Insight:</p>
                <p className="text-emerald-800 text-xs">Most agents overestimate short-term goals and underestimate what steady focus does in a year. We'll keep you consistent; the numbers will follow.</p>
              </div>
            </div>
          )
        },
        {
          id: 'setupGoals',
          title: 'Set Your Annual Income Goal',
          description: 'Pick one number that drives everything',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Pick one simple number that drives everything.</p>
              <p className="text-gray-700">Example — you want to earn <strong>$120,000</strong> this year.</p>
              
              <p className="font-medium mt-4">Navigate to Plan and Track → Goal Settings</p>
              <ol className="space-y-2 ml-4 list-decimal">
                <li>Enter your yearly income goal.</li>
                <li>The app calculates approximate homes you need to sell.</li>
                <li>You'll see it broken into monthly and weekly targets.</li>
                <li>Adjust until it <em>feels</em> realistic.</li>
              </ol>

              <div className="bg-blue-50/80 p-4 rounded-lg border border-blue-200 mt-4">
                <p className="text-blue-900 font-medium mb-2">💬 Coach Check-In:</p>
                <p className="text-blue-800 text-xs mb-3">Does this number excite you <em>and</em> feel doable?</p>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white border border-blue-200 rounded-md text-xs hover:bg-blue-100 transition-colors">
                    Too high
                  </button>
                  <button className="px-4 py-2 bg-emerald-50 border border-emerald-300 rounded-md text-xs hover:bg-emerald-100 transition-colors font-medium">
                    Just right
                  </button>
                  <button className="px-4 py-2 bg-white border border-blue-200 rounded-md text-xs hover:bg-blue-100 transition-colors">
                    Too low
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg mt-3">
                <p className="text-blue-900 font-medium">💡 Pro Tip:</p>
                <p className="text-blue-800 text-xs">You can always start smaller and raise your goal later. The habit matters more than the math.</p>
              </div>
            </div>
          )
        },
        {
          id: 'logFirstActivity',
          title: 'See How Daily Actions Connect',
          description: 'Every action moves you closer to your goal',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Every conversation, showing, and follow-up moves you closer to your goal.</p>
              <p>I Need Numbers turns your activity into insight:</p>
              
              <div className="bg-gray-50 p-3 rounded-lg my-3">
                <p className="font-medium text-emerald-700">📊 The Flow:</p>
                <p className="text-gray-700 text-sm mt-2">
                  <strong>Conversations</strong> → <strong>Appointments</strong> → <strong>Listings</strong> → <strong>Closings</strong>
                </p>
                <p className="text-gray-600 text-xs mt-2">Each step shows progress toward your yearly income target.</p>
              </div>

              <p className="font-medium">Here's what happens next:</p>
              <ul className="space-y-2 ml-4">
                <li>• <strong>Activity Tracker</strong> logs your daily actions (calls, appointments, listings)</li>
                <li>• <strong>P&L Tracker</strong> shows your true take-home profit (not just commission)</li>
                <li>• <strong>Fairy AI Coach</strong> reads your data and gives guidance when you need it</li>
                <li>• <strong>Goal Settings</strong> tracks your progress toward your annual target</li>
              </ul>

              <div className="bg-purple-50 p-3 rounded-lg mt-3">
                <p className="text-purple-900 font-medium">💬 Coach Note:</p>
                <p className="text-purple-800 text-xs">Most agents track the wrong numbers. You'll track <em>actions that create results</em>, not vanity metrics.</p>
              </div>
            </div>
          )
        },
        {
          id: 'explorePnL',
          title: 'Your "Why" Matters',
          description: 'Anchor your goal emotionally',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium text-emerald-700">Before you move to Day 2, let's make this personal.</p>
              <p>Goals without emotional connection fade fast. Let's anchor yours.</p>

              <div className="bg-amber-50/80 p-4 rounded-lg border border-amber-200 mt-4">
                <p className="text-amber-900 font-medium mb-2">🎯 Reflection:</p>
                <p className="text-amber-800 text-xs mb-3">In one sentence, why does hitting this goal matter to you?</p>
                <textarea 
                  placeholder="Type your answer here..."
                  className="w-full p-3 border border-amber-200 rounded-md text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              <div className="bg-emerald-50 p-4 rounded-lg mt-4">
                <p className="text-emerald-900 font-medium mb-2">💬 Coach Encouragement:</p>
                <p className="text-emerald-800 text-sm">
                  "Great start. Tomorrow we'll turn that goal into daily actions you can control."
                </p>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg mt-3">
                <p className="text-blue-900 font-medium">✅ Day 1 Complete!</p>
                <p className="text-blue-800 text-xs">You've set your annual goal and connected it to your purpose. That's more than most agents ever do. Keep going.</p>
              </div>
            </div>
          )
        }
      ]
    },
    2: {
      title: "Day 2: Bring Your Plan to Life",
      icon: <Calendar className="w-6 h-6 text-blue-600" />,
      description: "Your plan only works if you track what you do. Each part of I Need Numbers helps you stay focused and improve.",
      tasks: [
        {
          id: 'logActivity',
          title: 'Log One Conversation, One Appointment, One Expense',
          description: 'Try each tracking tool today',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Let's use the system:</p>
              <ol className="space-y-2 ml-4 list-decimal">
                <li><strong>Activity Tracker</strong> → Log conversations, appointments, listings
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• Navigate to Plan and Track → Action Tracker</li>
                    <li>• Click "Log Activity" and enter today's numbers</li>
                  </ul>
                </li>
                <li><strong>P&L Tracker</strong> → Shows true take-home profit
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• Navigate to Manage Finances → P&L Tracker</li>
                    <li>• Add one deal or expense to see how it works</li>
                  </ul>
                </li>
              </ol>
              <div className="bg-emerald-50 p-3 rounded-lg mt-3">
                <p className="text-emerald-900 font-medium">💡 Consistency Beats Perfection:</p>
                <p className="text-emerald-800 text-xs">Even rough numbers build insight. The AI learns from patterns, not precision. Start tracking today, refine as you go.</p>
              </div>
            </div>
          )
        },
        {
          id: 'dailyReflection',
          title: 'Understand How Fairy AI Coach Works',
          description: 'AI reads your data and gives guidance',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Fairy AI uses your daily actions to spot patterns and keep you focused.</p>
              <p>As you log activities and track deals, the AI will:</p>
              <ul className="space-y-2 ml-4">
                <li>• Identify what's working (and what's not)</li>
                <li>• Alert you when you're falling behind pace</li>
                <li>• Suggest where to focus next</li>
                <li>• Give deal-specific advice on calculators</li>
              </ul>
              <div className="bg-blue-50 p-3 rounded-lg mt-3">
                <p className="text-blue-900 font-medium">🧠 AI Gets Smarter Over Time:</p>
                <p className="text-blue-800 text-xs">The more you log, the better AI's insights become. It learns YOUR patterns, not generic advice.</p>
              </div>
            </div>
          )
        },
        {
          id: 'checkAICoach',
          title: 'Try the Fairy AI Coach Today',
          description: 'Ask a question or get insights',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Find Fairy AI Coach in multiple places:</p>
              <ul className="space-y-2 ml-4">
                <li>• <strong>Dashboard Overview:</strong> Click AI Coach banner for daily insights</li>
                <li>• <strong>Work Deals Calculators:</strong> Get deal analysis with AI recommendations</li>
                <li>• <strong>P&L Tracker:</strong> Ask AI about expense patterns or profit margins</li>
              </ul>
              <p className="mt-3 font-medium">Try asking: "How am I tracking this week?" or "What should I focus on?"</p>
              <div className="bg-purple-50 p-3 rounded-lg mt-3">
                <p className="text-purple-900 font-medium">✨ Real-Time Guidance:</p>
                <p className="text-purple-800 text-xs">Fairy AI uses your data to spot patterns. The more you track, the more helpful it becomes.</p>
              </div>
            </div>
          )
        },
        {
          id: 'reviewGoals',
          title: 'Review Your Progress',
          description: 'See how you\'re tracking vs. your annual goal',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Navigate to Plan and Track → Goal Settings → Review Progress</p>
              <ul className="space-y-2 ml-4">
                <li>• Check actual activities vs. weekly targets</li>
                <li>• See your projected annual income based on current pace</li>
                <li>• Identify gaps (e.g., "need 3 more appointments this week")</li>
                <li>• Adjust tomorrow's focus based on what's missing</li>
              </ul>
              <div className="bg-amber-50 p-3 rounded-lg mt-3">
                <p className="text-amber-900 font-medium">🎯 Stay On Track:</p>
                <p className="text-amber-800 text-xs">Small daily checks keep you from falling behind. If you're short on conversations, you know to prioritize prospecting tomorrow.</p>
              </div>
            </div>
          )
        }
      ]
    },
    3: {
      title: "Day 3: Make It a Habit",
      icon: <Trophy className="w-6 h-6 text-purple-600" />,
      description: "Small daily actions create predictable months. Let's build your rhythm.",
      tasks: [
        {
          id: 'timeBlocking',
          title: 'Block the Same Times Each Week',
          description: 'Consistency makes tracking automatic',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Time Blocking Framework for Real Estate Agents:</p>
              <div className="space-y-2">
                <div className="bg-emerald-50 p-2 rounded">
                  <p className="font-medium text-emerald-900">🌅 Morning (8-10 AM): Lead Gen & Follow-Up</p>
                  <p className="text-xs text-emerald-800">Prospecting calls, follow-ups, sphere outreach</p>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <p className="font-medium text-blue-900">☀️ Mid-Day (10 AM-2 PM): Appointments & Showings</p>
                  <p className="text-xs text-blue-800">Buyer consultations, listing presentations, showings</p>
                </div>
                <div className="bg-purple-50 p-2 rounded">
                  <p className="font-medium text-purple-900">🌆 Afternoon (2-5 PM): Admin & Marketing</p>
                  <p className="text-xs text-purple-800">Paperwork, social media, email, transaction management</p>
                </div>
                <div className="bg-amber-50 p-2 rounded">
                  <p className="font-medium text-amber-900">🌙 Evening (5-6 PM): Review & Plan</p>
                  <p className="text-xs text-amber-800">Log activities, daily reflection, plan tomorrow</p>
                </div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg mt-3">
                <p className="text-emerald-900 font-medium">⚡ Power Tip:</p>
                <p className="text-emerald-800 text-xs">Block the same times each week for consistency. Sunday reviews + daily logging = unstoppable momentum.</p>
              </div>
            </div>
          )
        },
        {
          id: 'weeklyReview',
          title: 'Set Up Your Weekly Review Routine',
          description: 'Every Sunday, take 20 minutes to review',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Weekly Review Checklist (Every Sunday):</p>
              <ol className="space-y-2 ml-4 list-decimal">
                <li>Review last week's activity totals in Action Tracker</li>
                <li>Check P&L and see your net profit (not just commission)</li>
                <li>Read AI insights from the week</li>
                <li>Identify what worked best (patterns in productive days)</li>
                <li>Set next week's top 3 priorities based on gaps</li>
              </ol>
              <div className="bg-blue-50 p-3 rounded-lg mt-3">
                <p className="text-blue-900 font-medium">📊 Why Weekly Reviews Matter:</p>
                <p className="text-blue-800 text-xs">They reveal trends daily tracking misses. Maybe Tuesdays are your best prospecting days, or certain expenses are creeping up.</p>
              </div>
            </div>
          )
        },
        {
          id: 'customizeDashboard',
          title: 'Understand What AI is Watching',
          description: 'How Fairy AI learns from your patterns',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">As Fairy AI learns from your patterns, it'll highlight:</p>
              <ul className="space-y-2 ml-4">
                <li>• <strong>What's slipping:</strong> "Your appointment rate dropped this week"</li>
                <li>• <strong>What's improving:</strong> "Conversion from showings to offers is up 15%"</li>
                <li>• <strong>Where to focus next:</strong> "You're behind on conversations—prioritize lead gen tomorrow"</li>
              </ul>
              <p className="mt-3 font-medium">The AI needs 2-3 weeks of consistent tracking to spot these patterns.</p>
              <div className="bg-purple-50 p-3 rounded-lg mt-3">
                <p className="text-purple-900 font-medium">🧠 AI Feedback Loop:</p>
                <p className="text-purple-800 text-xs">Track activities → AI spots patterns → Suggests improvements → You test them → Track results → AI refines. It's your personal business analyst.</p>
              </div>
            </div>
          )
        },
        {
          id: 'masterAI',
          title: 'Small Daily Actions = Predictable Months',
          description: 'The compounding effect of consistency',
          content: (
            <div className="space-y-3 text-sm">
              <p className="font-medium">You've built your 1-year plan. Now execute it daily:</p>
              <ol className="space-y-2 ml-4 list-decimal">
                <li><strong>Daily:</strong> Log activities (10 min at end of day)</li>
                <li><strong>Weekly:</strong> Review progress, read AI insights, set priorities (20 min Sunday)</li>
                <li><strong>Monthly:</strong> Check P&L, adjust goals if needed (30 min end of month)</li>
              </ol>
              <p className="mt-3 font-medium">That's it. Simple rhythm. Big results.</p>
              <div className="bg-emerald-50 p-3 rounded-lg mt-3">
                <p className="text-emerald-900 font-medium">🎯 You're Ready:</p>
                <p className="text-emerald-800 text-xs">You have a 1-year plan, a system to track it, and an AI coach to keep you focused. Now just stay consistent. The app handles the rest.</p>
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

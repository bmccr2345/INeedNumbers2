import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { 
  Target, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Gauge,
  Calendar,
  Save,
  Settings as SettingsIcon,
  BarChart3,
  Lock,
  ArrowUp,
  Activity,
  HelpCircle,
  TrendingDown
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import axios from 'axios';
import Cookies from 'js-cookie';

const ActionTrackerPanel = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [dailyEntry, setDailyEntry] = useState(null);
  const [summary, setSummary] = useState(null);
  const [pnlData, setPnlData] = useState(null);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get backend URL
  const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
  
  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Simple and reliable numeric input handler
  const handleNumericInput = (field, value) => {
    // Allow empty string or numbers only
    if (value === '' || /^\d+$/.test(value)) {
      setSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  };

  // Load data on mount
  useEffect(() => {
    loadTrackerData();
    if (user?.plan === 'PRO') {
      loadPnLData();
    }
  }, [user]);

  const loadTrackerData = async () => {
    try {
      setIsLoading(true);
      const currentMonth = getCurrentMonth();
      const today = getTodayDate();

      // Load settings
      const settingsResponse = await axios.get(
        `${backendUrl}/api/tracker/settings?month=${currentMonth}`,
        { 
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      setSettings(settingsResponse.data);

      // Check if this is first run (new settings)
      if (!settingsResponse.data.monthlyGciTarget && !settingsResponse.data.monthlyClosingsTarget) {
        setIsFirstRun(true);
      }

      // Load daily entry
      const dailyResponse = await axios.get(
        `${backendUrl}/api/tracker/daily?date=${today}`,
        { 
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      setDailyEntry(dailyResponse.data.dailyEntry);
      setSummary(dailyResponse.data.summary);

    } catch (error) {
      console.error('Error loading tracker data:', error);
      if (error.response?.status === 404) {
        setIsFirstRun(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadPnLData = async () => {
    try {
      const currentMonth = getCurrentMonth();
      const pnlResponse = await axios.get(
        `${backendUrl}/api/pnl/summary?month=${currentMonth}&ytd=true`,
        { 
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      setPnlData(pnlResponse.data);
    } catch (error) {
      console.error('Error loading P&L data:', error);
      // P&L data is optional
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      setIsSaving(true);
      await axios.post(
        `${backendUrl}/api/tracker/settings`,
        newSettings,
        { 
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      setSettings(newSettings);
      setIsFirstRun(false);
      
      // Reload daily data to get updated summary
      await loadTrackerData();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveDailyEntry = async (newDailyEntry) => {
    try {
      setIsSaving(true);
      const today = getTodayDate();
      
      await axios.post(
        `${backendUrl}/api/tracker/daily`,
        { 
          date: today,
          completed: newDailyEntry.completed,
          hours: newDailyEntry.hours,
          reflection: newDailyEntry.reflection
        },
        { 
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      setDailyEntry(newDailyEntry);
      
      // Reload to get updated summary
      await loadTrackerData();
      
    } catch (error) {
      console.error('Error saving daily entry:', error);
      alert('Error saving daily entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format activity name
  const formatActivityName = (activity) => {
    return activity.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  // Get gap color
  const getGapColor = (gap) => {
    if (gap === 0) return 'bg-green-100 text-green-800 border-green-200';
    if (gap <= 2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Goals ↔ P&L Overview Component
  const GoalsMoneyOverview = () => {
    if (!settings || !summary) return null;

    const isPro = user?.plan === 'PRO';
    const hasPnL = isPro && pnlData;

    // KPI calculations
    const mtdNet = hasPnL ? pnlData.kpis?.month?.net || 0 : 0;
    const goalPaceGci = summary.goalPaceGciToDate;
    const pnlPaceNet = mtdNet;
    const requiredPerDay = summary.requiredDollarsPerDay;
    
    // Calculate high-value hours and efficiency
    const highValueHours = (dailyEntry?.hours?.prospecting || 0) + 
                          (dailyEntry?.hours?.showings || 0) + 
                          (dailyEntry?.hours?.openHouses || 0);
    const earnedGci = settings.earnedGciToDate || (hasPnL ? pnlData.kpis?.month?.income || 0 : 0);
    const dollarsPerHour = highValueHours > 0 ? earnedGci / highValueHours : 0;

    // Enhanced KPI definitions for tooltips
    const kpiDefinitions = {
      profitThisMonth: {
        title: "Profit This Month",
        calculation: "Total Income - Total Expenses",
        whyCare: "Shows your actual take-home profit after all business costs. This is what you're really earning.",
        icon: <DollarSign className="w-5 h-5 text-emerald-600 mr-1" />
      },
      shouldHaveEarned: {
        title: "Should Have Earned",
        calculation: "Monthly Goal × (Days Worked ÷ Total Work Days)",
        whyCare: "Where you should be by today to hit your monthly goal. Helps you stay on track.",
        icon: <Target className="w-5 h-5 text-blue-600 mr-1" />
      },
      actuallyEarned: {
        title: "Actually Earned", 
        calculation: "Total commissions received this month",
        whyCare: "Your real income so far. Compare to 'Should Have Earned' to see if you're ahead or behind.",
        icon: <TrendingUp className="w-5 h-5 text-green-600 mr-1" />
      },
      dailyTarget: {
        title: "Daily Target",
        calculation: "(Monthly Goal - Earned So Far) ÷ Remaining Work Days",
        whyCare: "How much you need to earn each remaining day to hit your monthly goal. Your daily focus number.",
        icon: <Calendar className="w-5 h-5 text-orange-600 mr-1" />
      },
      hourlyEfficiency: {
        title: "Hourly Efficiency",
        calculation: "Total Earnings ÷ High-Value Hours (prospecting, showings, open houses)",
        whyCare: "Shows how much money you make per productive hour. Higher = more efficient business.",
        icon: <Activity className="w-5 h-5 text-purple-600 mr-1" />
      }
    };

    // Tooltip component
    const KPITooltip = ({ definition, children }) => {
      const [showTooltip, setShowTooltip] = useState(false);
      
      return (
        <div className="relative">
          <div 
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="cursor-help"
          >
            {children}
          </div>
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
              <div className="bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-xs text-sm">
                <div className="font-semibold mb-2">{definition.title}</div>
                <div className="mb-2">
                  <span className="font-medium">Calculation:</span><br />
                  {definition.calculation}
                </div>
                <div>
                  <span className="font-medium">Why it matters:</span><br />
                  {definition.whyCare}
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          )}
        </div>
      );
    };

    // Insight chips with better messaging
    const insights = [];
    if (earnedGci < goalPaceGci) {
      const gap = goalPaceGci - earnedGci;
      insights.push({
        text: `${formatCurrency(gap)} behind goal`,
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <TrendingDown className="w-4 h-4" />
      });
    } else if (earnedGci > goalPaceGci) {
      const ahead = earnedGci - goalPaceGci;
      insights.push({
        text: `${formatCurrency(ahead)} ahead of goal`,
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <TrendingUp className="w-4 h-4" />
      });
    }

    if (hasPnL && pnlData.kpis?.month?.expenses && pnlData.kpis?.month?.income) {
      const expenseRate = (pnlData.kpis.month.expenses / Math.max(pnlData.kpis.month.income, 1)) * 100;
      insights.push({
        text: `${expenseRate.toFixed(0)}% expense ratio`,
        color: expenseRate > 60 ? 'bg-red-100 text-red-800 border-red-200' : 
               expenseRate > 40 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
               'bg-green-100 text-green-800 border-green-200',
        icon: <BarChart3 className="w-4 h-4" />
      });
    }

    // Find bottleneck activity
    if (summary.gaps) {
      let maxGap = 0;
      let bottleneckActivity = '';
      Object.entries(summary.gaps).forEach(([activity, gap]) => {
        if (gap > maxGap) {
          maxGap = gap;
          bottleneckActivity = activity;
        }
      });
      
      if (bottleneckActivity && maxGap > 0) {
        const formatActivityName = (activity) => {
          return activity.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        };
        insights.push({
          text: `Focus: ${formatActivityName(bottleneckActivity)}`,
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: <AlertTriangle className="w-4 h-4" />
        });
      }
    }

    if (!isPro) {
      insights.push({
        text: 'Upgrade for full financial tracking',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Lock className="w-4 h-4" />,
        isUpgrade: true
      });
    }

    return (
      <div className="mb-8 p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Financial & Activity Overview</h3>
          <p className="text-sm text-gray-600">Your money and productivity at a glance</p>
        </div>

        {/* KPI Band */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {/* Profit This Month */}
          <KPITooltip definition={kpiDefinitions.profitThisMonth}>
            <Card className={`transition-all hover:shadow-md ${!hasPnL ? 'opacity-50' : ''}`}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  {kpiDefinitions.profitThisMonth.icon}
                  {!hasPnL && <Lock className="w-4 h-4 text-gray-400 ml-1" />}
                  <HelpCircle className="w-3 h-3 text-gray-400 ml-1" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(mtdNet)}
                </div>
                <div className="text-xs text-gray-600">Profit This Month</div>
                <div className="text-xs text-gray-500">after all expenses</div>
              </CardContent>
            </Card>
          </KPITooltip>

          {/* Should Have Earned */}
          <KPITooltip definition={kpiDefinitions.shouldHaveEarned}>
            <Card className="transition-all hover:shadow-md">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  {kpiDefinitions.shouldHaveEarned.icon}
                  <HelpCircle className="w-3 h-3 text-gray-400 ml-1" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(goalPaceGci)}
                </div>
                <div className="text-xs text-gray-600">Should Have Earned</div>
                <div className="text-xs text-gray-500">by today</div>
              </CardContent>
            </Card>
          </KPITooltip>

          {/* Actually Earned */}
          <KPITooltip definition={kpiDefinitions.actuallyEarned}>
            <Card className={`transition-all hover:shadow-md ${!hasPnL ? 'opacity-50' : ''}`}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  {kpiDefinitions.actuallyEarned.icon}
                  {!hasPnL && <Lock className="w-4 h-4 text-gray-400 ml-1" />}
                  <HelpCircle className="w-3 h-3 text-gray-400 ml-1" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(earnedGci)}
                </div>
                <div className="text-xs text-gray-600">Actually Earned</div>
                <div className="text-xs text-gray-500">total so far</div>
              </CardContent>
            </Card>
          </KPITooltip>

          {/* Daily Target */}
          <KPITooltip definition={kpiDefinitions.dailyTarget}>
            <Card className="transition-all hover:shadow-md">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  {kpiDefinitions.dailyTarget.icon}
                  <HelpCircle className="w-3 h-3 text-gray-400 ml-1" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(requiredPerDay)}
                </div>
                <div className="text-xs text-gray-600">Daily Target</div>
                <div className="text-xs text-gray-500">to hit monthly goal</div>
              </CardContent>
            </Card>
          </KPITooltip>

          {/* Hourly Efficiency */}
          <KPITooltip definition={kpiDefinitions.hourlyEfficiency}>
            <Card className="transition-all hover:shadow-md">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  {kpiDefinitions.hourlyEfficiency.icon}
                  <HelpCircle className="w-3 h-3 text-gray-400 ml-1" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dollarsPerHour)}
                </div>
                <div className="text-xs text-gray-600">Hourly Efficiency</div>
                <div className="text-xs text-gray-500">per productive hour</div>
              </CardContent>
            </Card>
          </KPITooltip>
        </div>

        {/* Dual Thermometers with better labels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Activity Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center mb-4">
                <h4 className="font-medium text-gray-900">Activity Progress</h4>
                <p className="text-sm text-gray-600">How your daily actions are converting to closings</p>
              </div>
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-6">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(summary.activityProgress * 100, 100)}%` }}
                  />
                </div>
                <div className="text-center mt-2 text-sm font-medium">
                  {(summary.activityProgress * 100).toFixed(0)}% to goal
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Money Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center mb-4">
                <h4 className="font-medium text-gray-900">Money Progress</h4>
                <p className="text-sm text-gray-600">How close you are to your monthly income goal</p>
              </div>
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-6">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(summary.progress * 100, 100)}%` }}
                  />
                </div>
                <div className="text-center mt-2 text-sm font-medium">
                  {(summary.progress * 100).toFixed(0)}% to goal
                </div>
                {/* Expense breakdown for Pro */}
                {hasPnL && pnlData.kpis?.month?.income && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className="bg-green-400 h-2 rounded-l-full"
                        style={{ 
                          width: `${Math.min((pnlData.kpis.month.income / (pnlData.kpis.month.income + pnlData.kpis.month.expenses)) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Keep</span>
                      <span>Spend</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insight Chips */}
        <div className="flex flex-wrap gap-2">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`${insight.color} border flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${insight.isUpgrade ? 'cursor-pointer hover:opacity-80' : ''}`}
              onClick={insight.isUpgrade ? () => window.open('/pricing', '_blank') : undefined}
            >
              {insight.icon}
              <span>{insight.text}</span>
              {insight.isUpgrade && <ArrowUp className="w-3 h-3 ml-1" />}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Setup Wizard Component
  const SetupWizard = () => {
    const [wizardStep, setWizardStep] = useState(1);
    const [wizardData, setWizardData] = useState({
      goalType: 'gci',
      monthlyClosingsTarget: 2,
      annualGciGoal: 250000,
      monthlyGciTarget: 20000,
      avgGciPerClosing: 10000,
      workdays: 20
    });

    const handleWizardNext = () => {
      if (wizardStep < 3) {
        setWizardStep(wizardStep + 1);
      } else {
        // Save settings and exit wizard
        const newSettings = {
          ...settings,
          ...wizardData,
          month: getCurrentMonth()
        };
        saveSettings(newSettings);
      }
    };

    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Action Tracker Setup</CardTitle>
            <p className="text-gray-600">Let's set up your monthly goals and activity targets</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {wizardStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Step 1: Choose Your Monthly Goal</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="gci-goal"
                      name="goalType"
                      value="gci"
                      checked={wizardData.goalType === 'gci'}
                      onChange={(e) => setWizardData({...wizardData, goalType: e.target.value})}
                      className="h-4 w-4 text-primary"
                    />
                    <label htmlFor="gci-goal" className="text-sm font-medium">
                      GCI (Gross Commission Income) Goal
                    </label>
                  </div>
                  
                  {wizardData.goalType === 'gci' && (
                    <div className="ml-7 space-y-3">
                      <div>
                        <Label htmlFor="annualGciGoal">Annual GCI Goal</Label>
                        <Input
                          id="annualGciGoal"
                          type="number"
                          step="1000"
                          value={wizardData.annualGciGoal}
                          onChange={(e) => setWizardData({...wizardData, annualGciGoal: e.target.value})}
                          placeholder="250000"
                        />
                        <p className="text-xs text-gray-600">Total amount you want to make for the year</p>
                      </div>
                      <div>
                        <Label htmlFor="monthlyGciTarget">Monthly GCI Target</Label>
                        <Input
                          id="monthlyGciTarget"
                          type="number"
                          step="1000"
                          value={wizardData.monthlyGciTarget}
                          onChange={(e) => setWizardData({...wizardData, monthlyGciTarget: e.target.value})}
                          placeholder="20000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="avgGciPerClosing">Average GCI per Closing</Label>
                        <Input
                          id="avgGciPerClosing"
                          type="number"
                          step="1000"
                          value={wizardData.avgGciPerClosing}
                          onChange={(e) => setWizardData({...wizardData, avgGciPerClosing: e.target.value})}
                          placeholder="10000"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="closings-goal"
                      name="goalType"
                      value="closings"
                      checked={wizardData.goalType === 'closings'}
                      onChange={(e) => setWizardData({...wizardData, goalType: e.target.value})}
                      className="h-4 w-4 text-primary"
                    />
                    <label htmlFor="closings-goal" className="text-sm font-medium">
                      Number of Closings Goal
                    </label>
                  </div>
                  
                  {wizardData.goalType === 'closings' && (
                    <div className="ml-7">
                      <Label htmlFor="monthlyClosingsTarget">Monthly Closings Target</Label>
                      <Input
                        id="monthlyClosingsTarget"
                        type="number"
                        value={wizardData.monthlyClosingsTarget}
                        onChange={(e) => setWizardData({...wizardData, monthlyClosingsTarget: parseInt(e.target.value)})}
                        placeholder="2"
                      />
                    </div>
                  )}
                </div>

                {wizardData.goalType === 'gci' && wizardData.monthlyGciTarget && wizardData.avgGciPerClosing && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Derived Closings Target:</strong> {Math.ceil(wizardData.monthlyGciTarget / wizardData.avgGciPerClosing)} closings
                    </p>
                  </div>
                )}
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Step 2: Working Days</h3>
                <div>
                  <Label htmlFor="workdays">Days available to work this month</Label>
                  <Input
                    id="workdays"
                    type="number"
                    value={wizardData.workdays}
                    onChange={(e) => setWizardData({...wizardData, workdays: parseInt(e.target.value)})}
                    placeholder="20"
                    min="1"
                    max="31"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Default is business days, but you can adjust based on your schedule
                  </p>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Step 3: Review & Confirm</h3>
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between">
                    <span>Goal Type:</span>
                    <span className="font-medium">{wizardData.goalType === 'gci' ? 'GCI Goal' : 'Closings Goal'}</span>
                  </div>
                  {wizardData.goalType === 'gci' ? (
                    <>
                      <div className="flex justify-between">
                        <span>Monthly GCI Target:</span>
                        <span className="font-medium">{formatCurrency(wizardData.monthlyGciTarget)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg GCI per Closing:</span>
                        <span className="font-medium">{formatCurrency(wizardData.avgGciPerClosing)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Derived Closings Target:</span>
                        <span className="font-medium">{Math.ceil(wizardData.monthlyGciTarget / wizardData.avgGciPerClosing)} closings</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span>Monthly Closings Target:</span>
                      <span className="font-medium">{wizardData.monthlyClosingsTarget} closings</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Working Days:</span>
                    <span className="font-medium">{wizardData.workdays} days</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              {wizardStep > 1 && (
                <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)}>
                  Back
                </Button>
              )}
              <Button 
                onClick={handleWizardNext}
                disabled={isSaving}
                className="ml-auto"
              >
                {wizardStep === 3 ? (isSaving ? 'Saving...' : 'Complete Setup') : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Sub-tab components
  const DashboardTab = () => (
    <div className="space-y-6">
      {/* Goal Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Goal this month: {settings?.goalType === 'gci' 
            ? formatCurrency(settings.monthlyGciTarget) 
            : `${settings?.monthlyClosingsTarget} closings`}
        </h2>
      </div>

      {/* Today's Activities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activities Needed Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Activity</th>
                  <th className="text-center py-2">Needed Today</th>
                  <th className="text-center py-2">Completed</th>
                  <th className="text-center py-2">Gap</th>
                </tr>
              </thead>
              <tbody>
                {settings?.activities?.map(activity => (
                  <tr key={activity} className="border-b">
                    <td className="py-3 font-medium">{formatActivityName(activity)}</td>
                    <td className="text-center py-3">{summary?.dailyTargets?.[activity] || 0}</td>
                    <td className="text-center py-3">{dailyEntry?.completed?.[activity] || 0}</td>
                    <td className="text-center py-3">
                      <Badge className={getGapColor(summary?.gaps?.[activity] || 0)}>
                        {summary?.gaps?.[activity] || 0}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {summary?.lowValueFlags?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Warning: where time was wasted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.lowValueFlags.map((flag, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="w-2 h-2 bg-orange-400 rounded-full mt-2 mr-3 flex-shrink-0" />
                  {flag}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tomorrow's Top 3 */}
      <Card>
        <CardHeader>
          <CardTitle>Tomorrow's Top 3</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {summary?.top3?.map((item, index) => (
              <li key={index} className="flex items-center">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                  {index + 1}
                </span>
                <span className="text-gray-900">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Reflection */}
      <Card>
        <CardHeader>
          <CardTitle>End-of-Day Reflection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label htmlFor="reflection">What did I do today that directly led to income?</Label>
            <Textarea
              id="reflection"
              value={dailyEntry?.reflection || ''}
              onChange={(e) => setDailyEntry({...dailyEntry, reflection: e.target.value})}
              placeholder="Reflect on today's income-generating activities..."
              className="min-h-[100px]"
            />
            <Button 
              onClick={() => saveDailyEntry(dailyEntry)}
              disabled={isSaving}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Reflection'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const LogTab = () => {
    const [currentEntry, setCurrentEntry] = useState({
      activities: {},
      hours: {},
      reflection: ''
    });
    const [activityLogs, setActivityLogs] = useState([]);
    const [reflectionLogs, setReflectionLogs] = useState([]);
    const [isLogging, setIsLogging] = useState(false);
    const [editingLog, setEditingLog] = useState(null);

    // Load activity and reflection logs on mount
    useEffect(() => {
      loadActivityLogs();
      loadReflectionLogs();
    }, []);

    const loadActivityLogs = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/activity-logs`, {
          headers: getHeaders()
        });
        if (response.ok) {
          const logs = await response.json();
          setActivityLogs(logs);
        }
      } catch (error) {
        console.error('Error loading activity logs:', error);
      }
    };

    const loadReflectionLogs = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reflection-logs`, {
          headers: getHeaders()
        });
        if (response.ok) {
          const logs = await response.json();
          setReflectionLogs(logs);
        }
      } catch (error) {
        console.error('Error loading reflection logs:', error);
      }
    };

    const handleActivityChange = (activity, value) => {
      if (value === '' || /^\d+$/.test(value)) {
        setCurrentEntry(prev => ({
          ...prev,
          activities: {
            ...prev.activities,
            [activity]: value === '' ? 0 : parseInt(value)
          }
        }));
      }
    };

    const handleHoursChange = (category, value) => {
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setCurrentEntry(prev => ({
          ...prev,
          hours: {
            ...prev.hours,
            [category]: value === '' ? 0 : parseFloat(value) || 0
          }
        }));
      }
    };

    const logActivityEntry = async () => {
      if (!currentEntry.activities || Object.keys(currentEntry.activities).length === 0) {
        alert('Please enter some activity data to log.');
        return;
      }

      try {
        setIsLogging(true);
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/activity-log`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            activities: currentEntry.activities,
            hours: currentEntry.hours,
            reflection: currentEntry.reflection
          })
        });

        if (response.ok) {
          // Clear current entry
          setCurrentEntry({ activities: {}, hours: {}, reflection: '' });
          // Reload logs
          await loadActivityLogs();
          alert('Activity Logged Successfully');
        } else {
          throw new Error('Failed to log activity');
        }
      } catch (error) {
        console.error('Error logging activity:', error);
        alert('Error logging activity. Please try again.');
      } finally {
        setIsLogging(false);
      }
    };

    const logReflectionEntry = async () => {
      if (!currentEntry.reflection?.trim()) {
        alert('Please enter a reflection to log.');
        return;
      }

      try {
        setIsLogging(true);
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reflection-log`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            reflection: currentEntry.reflection
          })
        });

        if (response.ok) {
          // Clear reflection
          setCurrentEntry(prev => ({ ...prev, reflection: '' }));
          // Reload reflection logs
          await loadReflectionLogs();
          alert('Reflection Logged Successfully');
        } else {
          throw new Error('Failed to log reflection');
        }
      } catch (error) {
        console.error('Error logging reflection:', error);
        alert('Error logging reflection. Please try again.');
      } finally {
        setIsLogging(false);
      }
    };

    const updateActivityLog = async (logId, updates) => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/activity-log/${logId}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify(updates)
        });

        if (response.ok) {
          await loadActivityLogs();
          setEditingLog(null);
        } else {
          throw new Error('Failed to update activity log');
        }
      } catch (error) {
        console.error('Error updating activity log:', error);
        alert('Error updating activity log. Please try again.');
      }
    };

    const updateReflectionLog = async (logId, updates) => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reflection-log/${logId}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify(updates)
        });

        if (response.ok) {
          await loadReflectionLogs();
          setEditingLog(null);
        } else {
          throw new Error('Failed to update reflection log');
        }
      } catch (error) {
        console.error('Error updating reflection log:', error);
        alert('Error updating reflection log. Please try again.');
      }
    };

    const formatDate = (isoString) => {
      return new Date(isoString).toLocaleString();
    };

    return (
      <div className="space-y-6">
        {/* Current Activity Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle>Log Today's Activities</CardTitle>
            <p className="text-gray-600">Enter your activities and hours to create a new log entry</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Activities Completed</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {['conversations', 'appointments', 'offersWritten', 'listingsTaken'].map(activity => (
                  <div key={activity}>
                    <Label htmlFor={activity}>{formatActivityName(activity)}</Label>
                    <Input
                      id={activity}
                      value={currentEntry.activities[activity]?.toString() || ''}
                      onChange={(e) => handleActivityChange(activity, e.target.value)}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Time Allocation (Hours)</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                {['prospecting', 'appointments', 'admin', 'marketing'].map(category => (
                  <div key={category}>
                    <Label htmlFor={category}>{formatActivityName(category)}</Label>
                    <Input
                      id={category}
                      value={currentEntry.hours[category]?.toString() || ''}
                      onChange={(e) => handleHoursChange(category, e.target.value)}
                      placeholder="0.0"
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={logActivityEntry}
                disabled={isLogging}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isLogging ? 'Logging...' : 'Log Activities'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Reflection Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Reflection</CardTitle>
            <p className="text-gray-600">Share your thoughts, insights, and lessons learned</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={currentEntry.reflection}
              onChange={(e) => setCurrentEntry(prev => ({...prev, reflection: e.target.value}))}
              placeholder="How did today go? What went well? What could be improved? Any insights or lessons learned?"
              rows={4}
            />
            <Button 
              onClick={logReflectionEntry}
              disabled={isLogging || !currentEntry.reflection?.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLogging ? 'Logging...' : 'Log Reflection'}
            </Button>
          </CardContent>
        </Card>

        {/* Activity Log History */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log History</CardTitle>
            <p className="text-gray-600">Your logged activities and time entries (click to edit)</p>
          </CardHeader>
          <CardContent>
            {activityLogs.length > 0 ? (
              <div className="space-y-3">
                {activityLogs.map(log => (
                  <div 
                    key={log.id} 
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setEditingLog(log.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-gray-500">{formatDate(log.loggedAt)}</div>
                      {editingLog === log.id && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLog(null);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                    
                    {editingLog === log.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(log.activities || {}).map(([activity, value]) => (
                            <div key={activity} className="flex items-center space-x-2">
                              <Label className="text-xs">{formatActivityName(activity)}:</Label>
                              <Input
                                type="number"
                                defaultValue={value}
                                className="h-8 text-sm"
                                onBlur={(e) => updateActivityLog(log.id, {
                                  activities: { ...log.activities, [activity]: parseInt(e.target.value) || 0 }
                                })}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm">
                          <strong>Activities:</strong> {
                            Object.entries(log.activities || {})
                              .filter(([_, value]) => value > 0)
                              .map(([activity, value]) => `${formatActivityName(activity)}: ${value}`)
                              .join(', ') || 'None'
                          }
                        </div>
                        {log.hours && Object.keys(log.hours).length > 0 && (
                          <div className="text-sm mt-1">
                            <strong>Hours:</strong> {
                              Object.entries(log.hours)
                                .filter(([_, value]) => value > 0)
                                .map(([category, value]) => `${formatActivityName(category)}: ${value}h`)
                                .join(', ')
                            }
                          </div>
                        )}
                        {log.reflection && (
                          <div className="text-sm mt-1 text-gray-700">
                            <strong>Note:</strong> {log.reflection}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No activity logs yet. Start logging your activities above!</p>
            )}
          </CardContent>
        </Card>

        {/* Reflection Log History */}
        <Card>
          <CardHeader>
            <CardTitle>Reflection History</CardTitle>
            <p className="text-gray-600">Your daily reflections and thoughts (click to edit)</p>
          </CardHeader>
          <CardContent>
            {reflectionLogs.length > 0 ? (
              <div className="space-y-3">
                {reflectionLogs.map(reflection => (
                  <div 
                    key={reflection.id} 
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setEditingLog(reflection.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-gray-500">{formatDate(reflection.loggedAt)}</div>
                      {editingLog === reflection.id && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLog(null);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                    
                    {editingLog === reflection.id ? (
                      <Textarea
                        defaultValue={reflection.reflection}
                        rows={3}
                        onBlur={(e) => updateReflectionLog(reflection.id, { reflection: e.target.value })}
                        className="mt-2"
                      />
                    ) : (
                      <div className="text-sm text-gray-700">{reflection.reflection}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No reflections logged yet. Start sharing your thoughts above!</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // SettingsTab component removed - moved to separate GoalSettingsPanel

  const ReportsTab = () => (
    <div className="space-y-6">
      {user?.plan === 'PRO' ? (
        <Card>
          <CardHeader>
            <CardTitle>Reports (Coming Soon)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Weekly and monthly reports with charts and PDF export will be available in Phase 2.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Reports (Pro Feature)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Unlock detailed reports, charts, and PDF exports with Pro.
            </p>
            <Button onClick={() => window.open('/pricing', '_blank')}>
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const ExplainedTab = () => (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900">Action Tracker Metrics Explained</h2>
        <p className="text-gray-600 mt-2">
          Understanding every metric in your Action Tracker to maximize your real estate success
        </p>
      </div>

      {/* Financial KPIs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-emerald-600" />
            Financial Metrics (Top Row KPIs)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Profit This Month */}
          <div className="border-l-4 border-emerald-200 bg-emerald-50 p-4 rounded">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <DollarSign className="w-4 h-4 text-emerald-600 mr-2" />
              Profit This Month
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>What it means:</strong> Your actual take-home profit after all business expenses have been deducted.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Calculation:</strong> Total Income - Total Expenses = Net Profit
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Why it matters:</strong> This is the real money you're making, not just gross commission. It shows the true health of your business.
            </p>
            <div className="text-sm text-gray-700">
              <strong>Best Practice:</strong> Track all business expenses (marketing, gas, client gifts, professional dues) and aim for a 40-60% profit margin.
            </div>
          </div>

          {/* Should Have Earned */}
          <div className="border-l-4 border-blue-200 bg-blue-50 p-4 rounded">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <Target className="w-4 h-4 text-blue-600 mr-2" />
              Should Have Earned
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>What it means:</strong> Where your income should be by today to stay on track for your monthly goal.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Calculation:</strong> Monthly Goal × (Days Worked ÷ Total Work Days This Month)
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Why it matters:</strong> Keeps you accountable to your goals and helps you course-correct early in the month.
            </p>
            <div className="text-sm text-gray-700">
              <strong>Best Practice:</strong> Check this daily - it's your "pace car" for success. If you're behind, immediately increase high-value activities.
            </div>
          </div>

          {/* Actually Earned */}
          <div className="border-l-4 border-green-200 bg-green-50 p-4 rounded">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
              Actually Earned
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>What it means:</strong> Your total commission income received this month from closed transactions.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Calculation:</strong> Sum of all commission checks deposited this month
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Why it matters:</strong> Reality check against your goals. Shows if your activities are converting to actual income.
            </p>
            <div className="text-sm text-gray-700">
              <strong>Best Practice:</strong> Celebrate when ahead - momentum builds momentum. When behind, analyze what activities led to current closings.
            </div>
          </div>

          {/* Daily Target */}
          <div className="border-l-4 border-orange-200 bg-orange-50 p-4 rounded">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <Calendar className="w-4 h-4 text-orange-600 mr-2" />
              Daily Target
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>What it means:</strong> How much you need to produce each remaining workday to hit your monthly goal.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Calculation:</strong> (Monthly Goal - Already Earned) ÷ Remaining Work Days
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Why it matters:</strong> Your daily focus number. Breaks overwhelming monthly goals into manageable daily actions.
            </p>
            <div className="text-sm text-gray-700">
              <strong>Best Practice:</strong> Write this number somewhere visible every morning and ask yourself: "What will I do TODAY to earn $X?"
            </div>
          </div>

          {/* Hourly Efficiency */}
          <div className="border-l-4 border-purple-200 bg-purple-50 p-4 rounded">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <Activity className="w-4 h-4 text-purple-600 mr-2" />
              Hourly Efficiency
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>What it means:</strong> How much money you generate per hour of high-value activities (prospecting, showings, open houses).
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Calculation:</strong> Total Earnings ÷ High-Value Hours Worked
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Why it matters:</strong> Shows the true value of your productive time. Higher efficiency = better business and more personal time.
            </p>
            <div className="text-sm text-gray-700">
              <strong>Best Practice:</strong> Track only income-producing hours and aim to increase this number over time through better systems. Industry average: $200-500/hour.
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Progress Thermometers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gauge className="w-5 h-5 mr-2 text-blue-600" />
            Progress Thermometers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Activity Progress */}
          <div className="border-l-4 border-blue-200 bg-blue-50 p-4 rounded">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <Gauge className="w-4 h-4 text-blue-500 mr-2" />
              Activity Progress Thermometer
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>What it shows:</strong> How your daily actions are converting toward your closing goals.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Why track this:</strong> Leading indicator of future success. Activities today create closings in 30-90 days.
            </p>
            <div className="text-sm text-gray-700">
              <strong>Best Practice:</strong> Focus on consistency over perfection - 80% every day beats 100% sporadically.
            </div>
          </div>

          {/* Money Progress */}
          <div className="border-l-4 border-green-200 bg-green-50 p-4 rounded">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
              Money Progress Thermometer
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>What it shows:</strong> Visual representation of how close you are to your monthly income goal.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Why track this:</strong> Quick visual check on goal progress. Green means go, red means adjust.
            </p>
            <div className="text-sm text-gray-700">
              <strong>Best Practice:</strong> Celebrate milestones (25%, 50%, 75% completion) and use as motivation tool.
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Core Activities Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-600" />
            Core Activities Explained
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border-l-4 border-blue-200 bg-blue-50 p-3 rounded">
              <h5 className="font-medium text-gray-900 mb-1">Prospecting</h5>
              <p className="text-sm text-gray-700 mb-1">Cold calls, warm calls, follow-ups with past clients and sphere of influence.</p>
              <p className="text-xs text-gray-600"><strong>Target:</strong> New agents: 50-100 calls/day, Experienced: 25-50 calls/day</p>
            </div>
            
            <div className="border-l-4 border-green-200 bg-green-50 p-3 rounded">
              <h5 className="font-medium text-gray-900 mb-1">Showings</h5>
              <p className="text-sm text-gray-700 mb-1">Individual property tours with qualified buyers.</p>
              <p className="text-xs text-gray-600"><strong>Target:</strong> 5-10 showings per week, 15-25% should lead to offers</p>
            </div>
            
            <div className="border-l-4 border-purple-200 bg-purple-50 p-3 rounded">
              <h5 className="font-medium text-gray-900 mb-1">Open Houses</h5>
              <p className="text-sm text-gray-700 mb-1">Public home tours for lead generation and listing exposure.</p>
              <p className="text-xs text-gray-600"><strong>Target:</strong> 1-2 per weekend, 8-15 visitors each</p>
            </div>
            
            <div className="border-l-4 border-orange-200 bg-orange-50 p-3 rounded">
              <h5 className="font-medium text-gray-900 mb-1">Listing Appointments</h5>
              <p className="text-sm text-gray-700 mb-1">Face-to-face meetings with potential sellers.</p>
              <p className="text-xs text-gray-600"><strong>Target:</strong> 2-5 appointments per week, 40-60% conversion rate</p>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Insight Chips Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
            Understanding Your Insight Chips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border-l-4 border-red-200 bg-red-50 p-3 rounded">
              <h5 className="font-medium text-gray-900 mb-1 flex items-center">
                <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                Behind Goal
              </h5>
              <p className="text-sm text-gray-700 mb-1">When your actual earnings are below your goal pace.</p>
              <p className="text-xs text-gray-600"><strong>Action:</strong> Increase daily prospecting by 25% and review your conversion rates.</p>
            </div>
            
            <div className="border-l-4 border-green-200 bg-green-50 p-3 rounded">
              <h5 className="font-medium text-gray-900 mb-1 flex items-center">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                Ahead of Goal
              </h5>
              <p className="text-sm text-gray-700 mb-1">When your actual earnings exceed your goal pace.</p>
              <p className="text-xs text-gray-600"><strong>Action:</strong> Maintain current activity levels and consider raising next month's goal by 10-20%.</p>
            </div>
            
            <div className="border-l-4 border-blue-200 bg-blue-50 p-3 rounded">
              <h5 className="font-medium text-gray-900 mb-1 flex items-center">
                <BarChart3 className="w-4 h-4 text-blue-600 mr-1" />
                Expense Ratio
              </h5>
              <p className="text-sm text-gray-700 mb-1">Your expenses as a percentage of your income.</p>
              <p className="text-xs text-gray-600"><strong>Target:</strong> Aim for 40-60% expense ratio (40-60% profit margin).</p>
            </div>
            
            <div className="border-l-4 border-orange-200 bg-orange-50 p-3 rounded">
              <h5 className="font-medium text-gray-900 mb-1 flex items-center">
                <AlertTriangle className="w-4 h-4 text-orange-600 mr-1" />
                Focus Activity
              </h5>
              <p className="text-sm text-gray-700 mb-1">The activity where you have the biggest gap between target and actual.</p>
              <p className="text-xs text-gray-600"><strong>Action:</strong> Block time specifically for this activity and make it your first priority each day.</p>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Pro Tips */}
      <Card className="border-l-4 border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-primary" />
            Pro Tips for Action Tracker Success
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Daily Habits:</h5>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Review your metrics first thing in the morning</li>
                <li>• Focus on activities with the biggest gaps first</li>
                <li>• Log activities immediately after completing them</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Weekly Reviews:</h5>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Compare weekly performance to identify patterns</li>
                <li>• Adjust activity targets based on conversion rates</li>
                <li>• Celebrate wins and learn from setbacks</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Action Tracker...</p>
        </div>
      </div>
    );
  }

  if (isFirstRun) {
    return <SetupWizard />;
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Action Tracker</h1>
          <p className="text-gray-600 mt-1">
            Distinguish productivity from busyness with daily action tracking
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard (Today)', icon: <Activity className="w-4 h-4" /> },
              { id: 'log', name: 'Log', icon: <Target className="w-4 h-4" /> },
              { id: 'reports', name: 'Action Tracker Explained', icon: <HelpCircle className="w-4 h-4" />, pro: false }
            ]
              .filter(tab => {
                // On mobile, only show Dashboard and Log tabs (hide reports/explained)
                if (isMobile) {
                  return tab.id === 'dashboard' || tab.id === 'log';
                }
                return true;
              })
              .map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeSubTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.name}</span>
                {tab.pro && user?.plan !== 'PRO' && (
                  <Lock className="w-3 h-3 ml-1 text-gray-400" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeSubTab === 'dashboard' && <DashboardTab />}
        {activeSubTab === 'log' && <LogTab />}
        {activeSubTab === 'reports' && <ExplainedTab />}

      </div>
    </div>
  );
};

export default ActionTrackerPanel;
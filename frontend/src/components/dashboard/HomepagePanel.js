import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  DollarSign, 
  Calculator, 
  FileText, 
  BarChart3,
  ArrowRight,
  TrendingUp,
  Target,
  Clock,
  AlertTriangle,
  Lock,
  ArrowUp,
  Calendar,
  HelpCircle,
  TrendingDown,
  Activity,
  Sparkles,
  Zap
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { mockDashboardAPI } from '../../services/mockDashboardAPI';
import AICoachBanner from './AICoachBanner';
import ActiveDealsCard from './ActiveDealsCard';
import ReflectionModal from './ReflectionModal';
import ActivityModal from './ActivityModal';
import FinancialOverviewModal from './FinancialOverviewModal';
import axios from 'axios';
import Cookies from 'js-cookie';


const HomepagePanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    mortgage: { count: 0, loading: true },
    commission: { count: 0, loading: true },
    sellerNet: { count: 0, loading: true },
    investorPDFs: { count: 0, loading: true },
    pnlNet: { amount: 0, loading: true }
  });

  // Action Tracker data for Goals ↔ P&L Overview
  const [trackerData, setTrackerData] = useState({
    settings: null,
    dailyEntry: null,
    summary: null,
    pnlData: null,
    loading: true
  });

  // Commission Cap Progress data
  const [capProgress, setCapProgress] = useState({
    data: null,
    loading: true
  });

  // Modal states
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isFinancialOverviewModalOpen, setIsFinancialOverviewModalOpen] = useState(false);
  const [showFairyAICoach, setShowFairyAICoach] = useState(false);

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

  // Load metrics for all tools
  useEffect(() => {
    loadAllMetrics();
    loadTrackerData();
    loadCapProgress();
  }, [user]);

  const loadAllMetrics = async () => {
    try {
      // Load mortgage calculations count
      const mortgageData = await mockDashboardAPI.mortgage.history({ limit: 50 });
      setMetrics(prev => ({ 
        ...prev, 
        mortgage: { count: mortgageData.items.length, loading: false } 
      }));

      // Load commission splits count
      const commissionData = await mockDashboardAPI.commission.history({ limit: 50 });
      setMetrics(prev => ({ 
        ...prev, 
        commission: { count: commissionData.items.length, loading: false } 
      }));

      // Load seller net sheets count
      const netData = await mockDashboardAPI.net.history({ limit: 50 });
      setMetrics(prev => ({ 
        ...prev, 
        sellerNet: { count: netData.items.length, loading: false } 
      }));

      // Load investor PDFs count (Pro only)
      if (user?.plan === 'PRO') {
        const investorData = await mockDashboardAPI.investor.list({ limit: 50 });
        setMetrics(prev => ({ 
          ...prev, 
          investorPDFs: { count: investorData.items.length, loading: false } 
        }));

        // Load P&L net profit (Pro only)
        const pnlData = await mockDashboardAPI.pnl.summary();
        setMetrics(prev => ({ 
          ...prev, 
          pnlNet: { amount: pnlData.kpis.month.net, loading: false } 
        }));
      } else {
        setMetrics(prev => ({ 
          ...prev, 
          investorPDFs: { count: 0, loading: false },
          pnlNet: { amount: 0, loading: false }
        }));
      }

    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
      // Set all to not loading on error
      setMetrics(prev => ({
        mortgage: { count: 0, loading: false },
        commission: { count: 0, loading: false },
        sellerNet: { count: 0, loading: false },
        investorPDFs: { count: 0, loading: false },
        pnlNet: { amount: 0, loading: false }
      }));
    }
  };

  const loadTrackerData = async () => {
    try {
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

      // Load daily entry
      const dailyResponse = await axios.get(
        `${backendUrl}/api/tracker/daily?date=${today}`,
        { 
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      // Load P&L data if Pro user
      let pnlData = null;
      if (user?.plan === 'PRO') {
        try {
          const pnlResponse = await axios.get(
            `${backendUrl}/api/pnl/summary?month=${currentMonth}&ytd=true`,
            { 
              withCredentials: true,
              headers: { 'Content-Type': 'application/json' }
            }
          );
          pnlData = pnlResponse.data;
        } catch (error) {
          console.error('P&L data not available:', error);
        }
      }

      setTrackerData({
        settings: settingsResponse.data,
        dailyEntry: dailyResponse.data.dailyEntry,
        summary: dailyResponse.data.summary,
        pnlData: pnlData,
        loading: false
      });

    } catch (error) {
      console.error('Error loading tracker data:', error);
      setTrackerData(prev => ({ ...prev, loading: false }));
    }
  };

  const loadCapProgress = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/cap-tracker/progress`, {
        withCredentials: true,
        headers: { 
          'Content-Type': 'application/json'
        }
      });
      
      setCapProgress({ data: response.data, loading: false });
    } catch (error) {
      // Cap progress is optional, don't show error if not configured
      console.log('Cap progress not available:', error);
      setCapProgress({ data: null, loading: false });
    }
  };

  // Get user's first name from full name or email
  const getFirstName = () => {
    // First try full_name
    if (user?.full_name && user.full_name.trim()) {
      return user.full_name.split(' ')[0];
    }
    // Then try name (for backward compatibility)
    if (user?.name && user.name.trim()) {
      return user.name.split(' ')[0];
    }
    // Extract from email as fallback
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0];
      // Convert email prefix to a readable name
      const name = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).replace(/[^a-zA-Z]/g, '');
      return name;
    }
    return 'Agent';
  };

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cents / 100);
  };

  // Format currency for Action Tracker
  const formatCurrencyAT = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // GoalsMoneyOverview component was moved to FinancialOverviewModal

  const MetricCard = ({ icon: Icon, title, metric, subtext, loading, ctaText, onClick, isPro = false }) => (
    <Card className={`${isPro && user?.plan !== 'PRO' ? 'opacity-60' : ''} hover:shadow-md transition-shadow`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              {metric}
            </div>
          )}
          <p className="text-sm text-gray-500">
            {subtext}
          </p>
          <Button 
            size="sm"
            onClick={onClick}
            disabled={isPro && user?.plan !== 'PRO'}
            className="w-full bg-gradient-to-r from-primary to-secondary hover:from-emerald-700 hover:to-emerald-800"
          >
            {ctaText}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Plan Indicator Badge */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600 text-sm mt-1">Welcome back! Here's what's happening with your business.</p>
          </div>
          <div className="flex items-center gap-2">
            {user?.plan === 'PRO' && (
              <Badge className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-2 text-sm font-semibold shadow-lg">
                <Sparkles className="w-4 h-4 mr-1.5 inline" />
                PRO Plan
              </Badge>
            )}
            {user?.plan === 'STARTER' && (
              <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-lg">
                <Zap className="w-4 h-4 mr-1.5 inline" />
                STARTER Plan
              </Badge>
            )}
            {user?.plan === 'FREE' && (
              <Badge className="bg-gray-500 text-white px-4 py-2 text-sm font-semibold">
                FREE Plan
              </Badge>
            )}
          </div>
        </div>
        
        {/* Header section removed - now handled in conditional content below */}

        {/* Conditional Content Based on User Plan */}
        {user?.plan === 'PRO' ? (
          <>
            {/* PRO Users: Action Buttons Row */}
            <div className="flex flex-wrap gap-4 justify-center mb-8">
              <Button
                onClick={async () => {
                  try {
                    const { fetchCoachJSON } = await import('../../lib/coach.js');
                    await fetchCoachJSON(true); // Force refresh
                    window.location.reload(); // Refresh to show updated data
                  } catch (error) {
                    console.error('Failed to refresh AI Coach:', error);
                    window.location.reload(); // Fallback to simple refresh
                  }
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg shadow-lg transition-all duration-300"
              >
                <div className="relative inline-block mr-2">
                  <Sparkles className="w-4 h-4 text-green-600" />
                  <Sparkles className="w-2 h-2 absolute -top-0.5 -right-0.5 animate-pulse" />
                </div>
                Refresh Fairy AI Coach
              </Button>
              
              <Button
                onClick={() => setIsActivityModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-lg transition-all duration-300"
              >
                <Activity className="w-4 h-4 mr-2" />
                Log Activity
              </Button>
              
              <Button
                onClick={() => setIsReflectionModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg shadow-lg transition-all duration-300"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Log a Reflection
              </Button>
              
              <Button
                onClick={() => setIsFinancialOverviewModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg shadow-lg transition-all duration-300"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Financial & Activity Overview
              </Button>
            </div>

            {/* AI Coach Banner for PRO users */}
            <AICoachBanner />

            {/* Active Deals Card - PRO users only */}
            {user?.plan === 'PRO' && (
              <ActiveDealsCard 
                onDealClick={(deal) => {
                  // Navigate to P&L panel
                  window.location.href = '/dashboard?panel=pnl';
                }}
              />
            )}
          </>
        ) : (
          <>
            {/* STARTER/FREE Users: Simple Welcome Section */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Welcome {user?.full_name ? user.full_name.split(' ')[0] : user?.email?.split('@')[0] || 'User'}
                  </h2>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4 leading-relaxed">
                Get personalized insights that analyze your goals, activities, and performance 24/7. 
                Never miss opportunities or lose momentum again! Strategic advice to hit your targets faster.{' '}
                <Button
                  onClick={() => navigate('/pricing')}
                  className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm transition-all duration-300 ml-2"
                >
                  <ArrowUp className="w-4 h-4 mr-1" />
                  Upgrade to Pro
                </Button>
              </p>
            </div>
          </>
        )}

        {/* Tool Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Mortgage Calculator Card */}
          <MetricCard
            icon={Home}
            title="Mortgage Calculator"
            metric={metrics.mortgage.count}
            subtext={metrics.mortgage.count === 0 ? "No calculations yet" : "Recent Calculations"}
            loading={metrics.mortgage.loading}
            ctaText="Go to Mortgage Tool"
            onClick={() => navigate('/dashboard?tab=mortgage')}
          />

          {/* Commission Split Card */}
          <MetricCard
            icon={DollarSign}
            title="Commission Split"
            metric={metrics.commission.count}
            subtext={metrics.commission.count === 0 ? "No splits yet" : "Recent Splits"}
            loading={metrics.commission.loading}
            ctaText="Go to Commission Tool"
            onClick={() => navigate('/dashboard?tab=commission')}
          />

          {/* Seller Net Sheet Card */}
          <MetricCard
            icon={Calculator}
            title="Seller Net Sheet"
            metric={metrics.sellerNet.count}
            subtext={metrics.sellerNet.count === 0 ? "No estimates yet" : "Recent Estimates"}
            loading={metrics.sellerNet.loading}
            ctaText="Go to Net Sheet Tool"
            onClick={() => navigate('/dashboard?tab=sellernet')}
          />

          {/* Investor PDFs Card (Pro only) */}
          <MetricCard
            icon={FileText}
            title="Investor Deal PDFs"
            metric={metrics.investorPDFs.count}
            subtext={
              user?.plan !== 'PRO' 
                ? "Upgrade to Pro" 
                : metrics.investorPDFs.count === 0 
                  ? "No PDFs created yet" 
                  : "Investor Packets"
            }
            loading={metrics.investorPDFs.loading}
            ctaText={user?.plan !== 'PRO' ? "Upgrade to Pro" : "Go to Investor Tool"}
            onClick={() => {
              if (user?.plan !== 'PRO') {
                navigate('/pricing');
              } else {
                navigate('/dashboard?tab=investor');
              }
            }}
            isPro={true}
          />

          {/* P&L Tracker Card (Pro only) */}
          <MetricCard
            icon={BarChart3}
            title="Agent P&L Tracker"
            metric={
              user?.plan !== 'PRO' 
                ? "Pro Only" 
                : metrics.pnlNet.amount === 0 
                  ? "$0" 
                  : formatCurrency(metrics.pnlNet.amount)
            }
            subtext={
              user?.plan !== 'PRO' 
                ? "Upgrade to Pro" 
                : metrics.pnlNet.amount === 0 
                  ? "No transactions yet" 
                  : "Monthly Net Profit"
            }
            loading={metrics.pnlNet.loading && user?.plan === 'PRO'}
            ctaText={user?.plan !== 'PRO' ? "Upgrade to Pro" : "Go to P&L Tool"}
            onClick={() => {
              if (user?.plan !== 'PRO') {
                navigate('/pricing');
              } else {
                navigate('/dashboard?tab=pnl');
              }
            }}
            isPro={true}
          />

          {/* Quick Action Card */}
          <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Quick Actions
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-lg font-semibold text-gray-900">
                  Get Started
                </div>
                <p className="text-sm text-gray-600">
                  Run your first calculation or create an investor packet
                </p>
                <div className="space-y-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/calculator')}
                    className="w-full"
                  >
                    Free Calculator
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => navigate('/tools')}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-emerald-700 hover:to-emerald-800"
                  >
                    Browse All Tools
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA Section */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Need Help Getting Started?
              </h3>
              <p className="text-gray-600">
                Check out our support center or browse all available tools.
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => navigate('/support')}>
                Support Center
              </Button>
              <Button 
                onClick={() => navigate('/tools')}
                className="bg-gradient-to-r from-primary to-secondary hover:from-emerald-700 hover:to-emerald-800"
              >
                All Tools
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Modal */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onActivitySaved={() => {
          // Optionally refresh any data that depends on activities
          console.log('Activity saved successfully');
        }}
      />

      {/* Reflection Modal */}
      <ReflectionModal
        isOpen={isReflectionModalOpen}
        onClose={() => setIsReflectionModalOpen(false)}
        onReflectionSaved={() => {
          // Optionally refresh any data that depends on reflections
          console.log('Reflection saved successfully');
        }}
      />

      {/* Financial Overview Modal */}
      <FinancialOverviewModal
        isOpen={isFinancialOverviewModalOpen}
        onClose={() => setIsFinancialOverviewModalOpen(false)}
        trackerData={trackerData}
        capProgress={capProgress}
        user={user}
      />

      {/* Bug Tracker */}
      <BugTracker context="Dashboard Overview" />
    </div>
  );
};

export default HomepagePanel;
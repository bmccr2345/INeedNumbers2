import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calculator, 
  DollarSign, 
  FileText, 
  BarChart3,
  Home,
  User,
  Settings,
  LogOut,
  Sparkles,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Shield,
  Calendar,
  Target,
  Badge,
  TrendingUp,
  Briefcase,
  PiggyBank,
  Store,
  CheckSquare
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import Footer from '../components/Footer';
import { safeLocalStorage } from '../utils/safeStorage';
import MobileBackButton from '../components/mobile/MobileBackButton';
import { useIsMobile } from '../hooks/useMediaQuery';

// Tab panels
import HomepagePanel from '../components/dashboard/HomepagePanel';
import ActionTrackerPanel from '../components/dashboard/ActionTrackerPanel';
import MortgagePanel from '../components/dashboard/MortgagePanel';
import CommissionPanel from '../components/dashboard/CommissionPanel'; 
import SellerNetPanel from '../components/dashboard/SellerNetPanel';
import InvestorPanel from '../components/dashboard/InvestorPanel';
import ClosingDatePanel from '../components/dashboard/ClosingDatePanel';
import PnLPanel from '../components/dashboard/PnLPanel';
import CapTrackerPanel from '../components/dashboard/CapTrackerPanel';
import BrandingPanel from '../components/dashboard/BrandingPanel';
import GoalSettingsPanel from '../components/dashboard/GoalSettingsPanel';
import UpgradeModal from '../components/dashboard/UpgradeModal';
import ProOnboardingWizard from '../components/ProOnboardingWizard';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout, loading } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('homepage'); // Default to homepage
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    planTrack: true,
    workDeals: true,
    manageFinances: true,
    myBusiness: true
  });

  // Check if Pro user needs onboarding
  useEffect(() => {
    if (user && user.plan === 'PRO') {
      const hasCompletedOnboarding = safeLocalStorage.getItem('pro_onboarding_completed');
      const hasDismissedThisSession = sessionStorage.getItem('pro_onboarding_dismissed_session');
      
      if (!hasCompletedOnboarding && !hasDismissedThisSession) {
        // Show wizard after a brief delay to let dashboard load
        setTimeout(() => {
          setShowOnboardingWizard(true);
        }, 1000);
      }
    }
  }, [user]);

  // Sidebar categories with sub-tabs
  const sidebarStructure = [
    {
      id: 'overview',
      type: 'single',
      name: 'Dashboard Overview',
      icon: <LayoutDashboard className="w-5 h-5" />,
      tabId: 'homepage',
      available: ['FREE', 'STARTER', 'PRO']
    },
    {
      id: 'planTrack',
      type: 'category',
      name: 'Plan and Track',
      icon: <CheckSquare className="w-5 h-5" />,
      available: ['STARTER', 'PRO'],
      subTabs: [
        {
          id: 'actiontracker',
          name: 'Action Tracker',
          icon: <Target className="w-4 h-4" />,
          available: ['PRO'],
          proOnly: true
        },
        {
          id: 'goalsettings',
          name: 'Goal Settings',
          icon: <TrendingUp className="w-4 h-4" />,
          available: ['PRO'],
          proOnly: true
        },
        {
          id: 'captracker',
          name: 'Cap Tracker',
          icon: <Badge className="w-4 h-4" />,
          available: ['PRO'],
          proOnly: true
        }
      ]
    },
    {
      id: 'workDeals',
      type: 'category',
      name: 'Work Deals',
      icon: <Briefcase className="w-5 h-5" />,
      available: ['FREE', 'STARTER', 'PRO'],
      subTabs: [
        {
          id: 'commission',
          name: 'Commission Split',
          icon: <DollarSign className="w-4 h-4" />,
          available: ['FREE', 'STARTER', 'PRO']
        },
        {
          id: 'sellernet',
          name: 'Seller Net Sheet',
          icon: <FileText className="w-4 h-4" />,
          available: ['FREE', 'STARTER', 'PRO']
        },
        {
          id: 'closingdate',
          name: 'Closing Date Calculator',
          icon: <Calendar className="w-4 h-4" />,
          available: ['FREE', 'STARTER', 'PRO']
        },
        {
          id: 'investor',
          name: 'Investor PDFs',
          icon: <FileText className="w-4 h-4" />,
          available: ['FREE', 'STARTER', 'PRO']
        },
        {
          id: 'mortgage',
          name: 'Mortgage & Affordability',
          icon: <Calculator className="w-4 h-4" />,
          available: ['FREE', 'STARTER', 'PRO']
        }
      ]
    },
    {
      id: 'manageFinances',
      type: 'category',
      name: 'Manage Finances',
      icon: <PiggyBank className="w-5 h-5" />,
      available: ['STARTER', 'PRO'],
      subTabs: [
        {
          id: 'pnl',
          name: 'P&L Tracker',
          icon: <BarChart3 className="w-4 h-4" />,
          available: ['STARTER', 'PRO']
        }
      ]
    },
    // MY BUSINESS CATEGORY REMOVED
    // {
    //   id: 'myBusiness',
    //   type: 'category',
    //   name: 'My Business',
    //   icon: <Store className="w-5 h-5" />,
    //   available: ['PRO'],
    //   subTabs: []
    // }
  ];

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Tab configuration for rendering content
  const tabs = [
    {
      id: 'homepage',
      name: 'Dashboard Overview',
      icon: <LayoutDashboard className="w-5 h-5" />,
      available: ['FREE', 'STARTER', 'PRO']
    },
    {
      id: 'actiontracker',
      name: 'Action Tracker',
      icon: <Target className="w-5 h-5" />, 
      available: ['PRO'],
      proOnly: true
    },
    {
      id: 'mortgage',
      name: 'Mortgage & Affordability',
      icon: <Home className="w-5 h-5" />,
      available: ['FREE', 'STARTER', 'PRO']
    },
    {
      id: 'commission', 
      name: 'Commission Split',
      icon: <DollarSign className="w-5 h-5" />,
      available: ['FREE', 'STARTER', 'PRO']
    },
    {
      id: 'sellernet',
      name: 'Seller Net Sheet', 
      icon: <Calculator className="w-5 h-5" />,
      available: ['FREE', 'STARTER', 'PRO']
    },
    {
      id: 'investor',
      name: 'Investor Deal PDFs',
      icon: <FileText className="w-5 h-5" />,
      available: ['FREE', 'STARTER', 'PRO']
    },
    {
      id: 'closingdate',
      name: 'Closing Date Calculator',
      icon: <Calendar className="w-5 h-5" />,
      available: ['FREE', 'STARTER', 'PRO']
    },
    {
      id: 'pnl',
      name: 'Agent P&L Tracker',
      icon: <BarChart3 className="w-5 h-5" />,
      available: ['PRO'], 
      proOnly: true
    },
    {
      id: 'captracker',
      name: 'Cap Tracker',
      icon: <TrendingUp className="w-5 h-5" />,
      available: ['PRO'],
      proOnly: true
    },
    // BRANDING DISABLED - Hidden for future work
    // {
    //   id: 'branding',
    //   name: 'Branding & Profile',
    //   icon: <Badge className="w-5 h-5" />,
    //   available: ['STARTER', 'PRO']
    // },
    {
      id: 'goalsettings',
      name: 'Goal Settings',
      icon: <Settings className="w-5 h-5" />,
      available: ['STARTER', 'PRO']
    }
  ];

  // Get user's available tabs based on plan
  const availableTabs = tabs.filter(tab => 
    tab.available.includes(user?.plan || 'FREE')
  );

  // Load last selected tab from localStorage or URL params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const panelFromUrl = searchParams.get('panel'); // Support panel parameter for mobile
    const savedTab = safeLocalStorage.getItem('INN:lastTab');
    
    // Map panel names to tab IDs
    const panelToTabMap = {
      'pnl': 'pnl',
      'captracker': 'captracker',
      'actiontracker': 'actiontracker',
      'coach': 'coach'
    };
    
    if (tabFromUrl && availableTabs.find(tab => tab.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (panelFromUrl && panelToTabMap[panelFromUrl]) {
      // Mobile panel navigation - check if user has access
      const mappedTab = panelToTabMap[panelFromUrl];
      const hasAccess = availableTabs.find(tab => tab.id === mappedTab);
      
      if (hasAccess) {
        setActiveTab(mappedTab);
      } else {
        // Redirect to homepage if no access
        setActiveTab('homepage');
      }
    } else if (savedTab && availableTabs.find(tab => tab.id === savedTab)) {
      setActiveTab(savedTab);
    } else if (availableTabs.length > 0) {
      setActiveTab('homepage'); // Always default to homepage
    }
  }, [user?.plan, searchParams]);

  // Save active tab to localStorage
  useEffect(() => {
    if (activeTab) {
      safeLocalStorage.setItem('INN:lastTab', activeTab);
      
      // Analytics event
      if (window.gtag) {
        window.gtag('event', 'dashboard_tab_viewed', {
          tab: activeTab,
          plan: user?.plan || 'FREE'
        });
      }
    }
  }, [activeTab, user?.plan]);

  const handleTabClick = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    
    // Check if user has access to this tab
    if (tab && !tab.available.includes(user?.plan || 'FREE')) {
      // For PRO-only tabs, just silently ignore click (no popup)
      // Analytics event for tracking
      if (window.gtag) {
        window.gtag('event', 'pro_feature_clicked', {
          source: `tab_${tabId}`,
          user_plan: user?.plan || 'FREE'
        });
      }
      return;
    }
    
    setActiveTab(tabId);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'homepage':
        return <HomepagePanel />;
      case 'actiontracker':
        return <ActionTrackerPanel />;
      case 'mortgage':
        return <MortgagePanel />;
      case 'commission':
        return <CommissionPanel />;
      case 'sellernet':
        return <SellerNetPanel />;
      case 'investor':
        return <InvestorPanel />;
      case 'closingdate':
        return <ClosingDatePanel />;
      case 'pnl':
        return <PnLPanel />;
      case 'captracker':
        return <CapTrackerPanel />;
      case 'branding':
        return <BrandingPanel />;
      case 'goalsettings':
        return <GoalSettingsPanel />;
      default:
        return <HomepagePanel />; // Default to homepage
    }
  };

  // Show loading state while user data is being fetched
  // TEMPORARY: Bypass loading for debugging
  // if (loading) {
  if (false) { // Force disable DashboardPage loading screen
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
          <p className="text-red-500 text-xs mt-2">DEBUG: DashboardPage loading disabled</p>
        </div>
      </div>
    );
  }

  // Mobile simplified view - just render the active panel without desktop chrome
  // The MobileLayout component handles header and navigation
  return (
    <div className="md:min-h-screen bg-gray-50 md:flex md:flex-col">
      {/* Header - Only show on desktop (md and up) */}
      <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src={`${process.env.REACT_APP_ASSETS_URL}/job_agent-portal-27/artifacts/azdcmpew_Logo_with_brown_background-removebg-preview.png`} 
                alt="I Need Numbers" 
                className="h-8 w-auto"
              />
              <span className="ml-3 text-xl font-bold text-primary tracking-wide font-poppins">
                I NEED NUMBERS
              </span>
            </div>

            {/* Account Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center space-x-2 text-gray-700 hover:text-primary"
              >
                <User className="w-5 h-5" />
                <span className="hidden sm:inline">Account</span>
                <ChevronDown className="w-4 h-4" />
              </Button>

              {showAccountMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-500 border-b">
                    {user?.email}
                    <div className="text-xs text-primary font-medium mt-1">
                      {user?.plan || 'FREE'} Plan
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigate('/account')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Profile & Billing
                  </button>
                  
                  <button
                    onClick={() => navigate('/')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Home className="w-4 h-4 mr-3" />
                    Home
                  </button>
                  
                  <button
                    onClick={() => navigate('/tools')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Calculator className="w-4 h-4 mr-3" />
                    Tools
                  </button>
                  
                  <button
                    onClick={() => navigate('/pricing')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <BarChart3 className="w-4 h-4 mr-3" />
                    Pricing
                  </button>
                  
                  <button
                    onClick={() => navigate('/support')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FileText className="w-4 h-4 mr-3" />
                    Support
                  </button>
                  
                  {/* Admin Console Link - Only for master_admin users */}
                  {user?.role === 'master_admin' && (
                    <button
                      onClick={() => navigate('/app/admin')}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 border-t"
                    >
                      <Shield className="w-4 h-4 mr-3" />
                      Admin Console
                    </button>
                  )}
                  
                  {user?.plan === 'PRO' && (
                    <button
                      onClick={() => {
                        setShowOnboardingWizard(true);
                        setShowAccountMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                    >
                      <Sparkles className="w-4 h-4 mr-3" />
                      Pro Onboarding Guide
                    </button>
                  )}
                  
                  <div className="border-t">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar Tabs (Desktop only - hidden on mobile) */}
        <nav className="hidden lg:block w-64 bg-white border-r border-gray-200 sticky top-16 h-screen overflow-y-auto">
          <div className="p-6">
            {/* Fairy logo watermark */}
            <div className="absolute top-6 right-6 opacity-10">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Dashboard
            </h2>
            
            <div 
              role="tablist" 
              aria-orientation="vertical"
              className="space-y-1"
            >
              {sidebarStructure.map((item) => {
                const isItemAvailable = item.available.includes(user?.plan || 'FREE');
                
                if (item.type === 'single') {
                  // Single tab without category
                  const isActive = activeTab === item.tabId;
                  return (
                    <button
                      key={item.id}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleTabClick(item.tabId)}
                      className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer'
                      }`}
                    >
                      {item.icon}
                      <span className="ml-3 truncate">{item.name}</span>
                    </button>
                  );
                }
                
                // Category with sub-tabs
                if (!isItemAvailable) return null;
                
                const isExpanded = expandedCategories[item.id];
                
                return (
                  <div key={item.id} className="space-y-1">
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(item.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center">
                        {item.icon}
                        <span className="ml-3">{item.name}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    
                    {/* Sub-tabs */}
                    {isExpanded && (
                      <div className="ml-6 space-y-0.5 border-l-2 border-gray-200 pl-3">
                        {item.subTabs.map((subTab) => {
                          const isActive = activeTab === subTab.id;
                          const isSubAvailable = subTab.available.includes(user?.plan || 'FREE');
                          
                          return (
                            <button
                              key={subTab.id}
                              role="tab"
                              aria-selected={isActive}
                              onClick={() => handleTabClick(subTab.id)}
                              disabled={!isSubAvailable}
                              className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-700 font-medium border-l-2 border-emerald-600 -ml-[14px] pl-[14px]'
                                  : isSubAvailable
                                  ? 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer'
                                  : 'text-gray-400 cursor-not-allowed opacity-50'
                              }`}
                            >
                              {subTab.icon}
                              <span className="ml-2 truncate">{subTab.name}</span>
                              {subTab.proOnly && !isSubAvailable && (
                                <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                  Pro
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Mobile Tabs - Simplified horizontal scroll - Only show on Overview/Homepage */}
        {isMobile && activeTab === 'homepage' && (
          <div className="lg:hidden bg-white border-b border-gray-200 sticky top-16 z-30">
            <div className="flex overflow-x-auto">
              <div 
                role="tablist" 
                aria-orientation="horizontal"
                className="flex space-x-1 p-4 min-w-max"
              >
                {/* Dashboard Overview */}
                <button
                  role="tab"
                  onClick={() => handleTabClick('homepage')}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                    activeTab === 'homepage'
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-700 hover:text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Overview
                </button>
                
                {/* Flatten all sub-tabs for mobile */}
                {sidebarStructure.filter(item => item.type === 'category').map(category => 
                  category.subTabs
                    .filter(subTab => subTab.available.includes(user?.plan || 'FREE'))
                    .map(subTab => {
                      const isActive = activeTab === subTab.id;
                      return (
                        <button
                          key={subTab.id}
                          role="tab"
                          onClick={() => handleTabClick(subTab.id)}
                          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                            isActive
                              ? 'bg-emerald-600 text-white'
                              : 'text-gray-700 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {subTab.icon}
                          <span className="ml-2">{subTab.name}</span>
                        </button>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content - Mobile: full width with proper overflow, Desktop: with sidebar */}
        <main className="flex-1 overflow-auto w-full bg-gray-50">
          {/* Mobile Back Button - show when viewing a panel (not homepage) */}
          {isMobile && activeTab !== 'homepage' && (
            <MobileBackButton title="Back to Overview" />
          )}
          
          <div 
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="h-full w-full"
          >
            {renderActivePanel()}
          </div>
        </main>
      </div>

      {/* Footer - Hidden on mobile (MobileLayout handles footer space) */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal 
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      {/* Pro Onboarding Wizard */}
      {showOnboardingWizard && (
        <ProOnboardingWizard 
          isOpen={showOnboardingWizard}
          onClose={() => {
            // Set session storage to prevent showing again this session
            sessionStorage.setItem('pro_onboarding_dismissed_session', 'true');
            setShowOnboardingWizard(false);
          }}
          onComplete={() => {
            safeLocalStorage.setItem('pro_onboarding_completed', 'true');
            setShowOnboardingWizard(false);
          }}
        />
      )}

      {/* Click away handler for account menu */}
      {showAccountMenu && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setShowAccountMenu(false)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
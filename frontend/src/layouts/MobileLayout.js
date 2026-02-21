import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import MobileDashboard from '../pages/MobileDashboard';
import MobileTabBar from '../components/mobile/MobileTabBar';
import MobileMoreMenu from '../components/mobile/MobileMoreMenu';
import MobileCalculatorMenu from '../components/mobile/MobileCalculatorMenu';

/**
 * Mobile Layout Component
 * Provides bottom tab navigation and mobile-optimized layout for dashboard
 * Phase 4: Full implementation with tab switching and modals
 */
const MobileLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCalculatorMenu, setShowCalculatorMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const handleTabClick = (tabId, route) => {
    setActiveTab(tabId);
    
    // Close calculator menu when switching to other tabs
    if (tabId !== 'calculators' && showCalculatorMenu) {
      setShowCalculatorMenu(false);
    }
    
    // Handle special tabs
    if (tabId === 'more') {
      setShowMoreMenu(true);
      return;
    }
    
    if (tabId === 'calculators') {
      setShowCalculatorMenu(true);
      return;
    }
    
    // Handle coach, actions, and finances tabs
    if (tabId === 'coach') {
      navigate('/dashboard?panel=coach');
      return;
    }
    
    if (tabId === 'actions') {
      navigate('/dashboard?panel=actiontracker');
      return;
    }

    if (tabId === 'finances') {
      navigate('/dashboard?panel=pnl');
      return;
    }
    
    // Navigate to route
    if (route) {
      navigate(route);
    }
  };

  // Determine what to render based on URL params
  const searchParams = new URLSearchParams(location.search);
  const panelParam = searchParams.get('panel');
  
  const shouldShowMobileDashboard = 
    location.pathname === '/dashboard' && 
    !panelParam && 
    activeTab === 'overview';

  // Debug logging
  console.log('[MobileLayout] Render conditions:', {
    pathname: location.pathname,
    panelParam,
    activeTab,
    shouldShowMobileDashboard,
    originalCondition: location.pathname === '/dashboard' && !panelParam && activeTab === 'overview'
  });

  return (
    <div className="mobile-layout h-screen flex flex-col bg-gray-50">
      {/* Mobile Header - Minimal for iOS status bar compatibility */}
      <header className="bg-primary text-white px-4 py-2 flex items-center justify-center shadow-md" style={{ paddingTop: 'env(safe-area-inset-top, 8px)' }}>
        <img 
          src={`${process.env.REACT_APP_ASSETS_URL}/job_agent-portal-27/artifacts/azdcmpew_Logo_with_brown_background-removebg-preview.png`}
          alt="I Need Numbers"
          className="h-8 w-auto brightness-0 invert"
        />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto" style={{ paddingBottom: '80px' }}>
        {/* Show MobileDashboard for overview tab, otherwise show passed children (DashboardPage) */}
        {shouldShowMobileDashboard ? (
          <MobileDashboard />
        ) : (
          children
        )}
      </main>

      {/* Bottom Tab Navigation */}
      <MobileTabBar activeTab={activeTab} onTabClick={handleTabClick} />

      {/* Modals */}
      <MobileMoreMenu 
        isOpen={showMoreMenu} 
        onClose={() => setShowMoreMenu(false)} 
      />
      
      <MobileCalculatorMenu 
        isOpen={showCalculatorMenu} 
        onClose={() => setShowCalculatorMenu(false)} 
      />

      {/* Safe area for iOS home indicator */}
      <style jsx>{`
        .safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
};

export default MobileLayout;

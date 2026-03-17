import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RoleProtected from '../components/auth/RoleProtected';
import { 
  Shield,
  Users,
  BarChart3,
  Settings,
  CreditCard,
  Activity,
  Search,
  Plus,
  Download,
  ChevronDown,
  User,
  LogOut,
  Key,
  Lock
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

// Admin Console Components (will create these)
import AdminOverview from '../components/admin/AdminOverview';
import AdminUsers from '../components/admin/AdminUsers';
import AdminAuditLogs from '../components/admin/AdminAuditLogs';
import AdminSettings from '../components/admin/AdminSettings';
import AdminBilling from '../components/admin/AdminBilling';

// Security Components
import PasswordResetModal from '../components/admin/PasswordResetModal';
import TwoFactorSetupModal from '../components/admin/TwoFactorSetupModal';
import API_BASE_URL from '../config/api';

const AdminConsolePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  // Security modals
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Admin navigation sections
  const sections = [
    {
      id: 'overview',
      name: 'Overview',
      icon: <BarChart3 className="w-5 h-5" />,
      description: 'Dashboard and key metrics'
    },
    {
      id: 'users',
      name: 'Users',
      icon: <Users className="w-5 h-5" />,
      description: 'User management and accounts'
    },
    {
      id: 'billing',
      name: 'Billing & Subscriptions',
      icon: <CreditCard className="w-5 h-5" />,
      description: 'Subscription and payment management'
    },
    {
      id: 'audit',
      name: 'Activity / Audit Logs',
      icon: <Activity className="w-5 h-5" />,
      description: 'System activity and audit trails'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      description: 'Admin configuration and security'
    }
  ];

  // Check 2FA status on load
  useEffect(() => {
    const check2FAStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/2fa/status`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setTwoFactorEnabled(data.enabled);
          setTwoFactorRequired(data.required);
          
          // Show 2FA setup modal if required but not enabled
          if (data.required && !data.enabled) {
            setShow2FASetup(true);
          }
        }
      } catch (error) {
        console.error('Error checking 2FA status:', error);
      }
    };
    
    if (user?.role === 'master_admin') {
      check2FAStatus();
    }
  }, [user]);

  // Handle first login security setup
  useEffect(() => {
    if (user?.firstLogin && user?.role === 'master_admin') {
      // Force password reset on first login
      if (user.requiresPasswordReset) {
        setShowPasswordReset(true);
      }
    }
  }, [user]);

  // Handle section from URL params
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && sections.find(s => s.id === section)) {
      setActiveSection(section);
    }
  }, [searchParams]);

  // Update URL when section changes
  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setSearchParams({ section: sectionId });
    
    // Analytics event
    if (window.gtag) {
      window.gtag('event', 'admin_section_viewed', {
        section: sectionId,
        admin_user: user?.email
      });
    }
  };

  const handleLogout = () => {
    // Log admin logout
    if (window.gtag) {
      window.gtag('event', 'admin_logout', {
        admin_user: user?.email
      });
    }
    logout();
    navigate('/');
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview':
        return <AdminOverview />;
      case 'users':
        return <AdminUsers globalSearch={globalSearch} />;
      case 'billing':
        return <AdminBilling />;
      case 'audit':
        return <AdminAuditLogs />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminOverview />;
    }
  };

  const QuickActionsMenu = () => (
    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border">
      <button
        onClick={() => {
          setShowQuickActions(false);
          // Navigate to add user
          handleSectionChange('users');
        }}
        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
      >
        <Plus className="w-4 h-4 mr-3" />
        Add User
      </button>
      <button
        onClick={() => {
          setShowQuickActions(false);
          // Trigger CSV export
        }}
        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
      >
        <Download className="w-4 h-4 mr-3" />
        Export Users CSV
      </button>
      <button
        onClick={() => {
          setShowQuickActions(false);
          handleSectionChange('audit');
        }}
        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
      >
        <Activity className="w-4 h-4 mr-3" />
        View Audit Log
      </button>
    </div>
  );

  return (
    <RoleProtected requiredRole="master_admin">
      <div className="min-h-screen bg-gray-50 flex">
        
        {/* Left Sidebar Navigation */}
        <nav className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
          <div className="p-6">
            {/* Admin Console Header */}
            <div className="flex items-center space-x-2 mb-8">
              <Shield className="w-6 h-6 text-red-600" />
              <h1 className="text-lg font-bold text-gray-900">Admin Console</h1>
            </div>
            
            {/* Navigation Sections */}
            <div className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeSection === section.id
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'text-gray-700 hover:text-red-700 hover:bg-gray-100'
                  }`}
                  title={section.description}
                >
                  {section.icon}
                  <span className="ml-3">{section.name}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Top Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              
              {/* Search Bar */}
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search users, emails, or actions..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center space-x-4">
                
                {/* Quick Actions Dropdown */}
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setShowQuickActions(!showQuickActions)}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Quick Actions</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  {showQuickActions && <QuickActionsMenu />}
                </div>

                {/* Admin Account Menu */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className="flex items-center space-x-2"
                  >
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {user?.name}
                      </div>
                      <div className="text-xs text-red-600 font-medium">
                        Master Admin
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </Button>

                  {showAccountMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border">
                      <div className="px-4 py-2 text-xs text-gray-500 border-b">
                        {user?.email}
                      </div>
                      
                      <button
                        onClick={() => {
                          setShowAccountMenu(false);
                          setShowPasswordReset(true);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Key className="w-4 h-4 mr-3" />
                        Change Password
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowAccountMenu(false);
                          setShow2FASetup(true);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Lock className="w-4 h-4 mr-3" />
                        2FA Settings
                      </button>
                      
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <BarChart3 className="w-4 h-4 mr-3" />
                        User Dashboard
                      </button>
                      
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
          <main className="flex-1 overflow-y-auto">
            {renderActiveSection()}
          </main>
        </div>

        {/* Security Modals */}
        {showPasswordReset && (
          <PasswordResetModal
            isOpen={showPasswordReset}
            onClose={() => setShowPasswordReset(false)}
            isRequired={user?.requiresPasswordReset}
          />
        )}

        {show2FASetup && (
          <TwoFactorSetupModal
            isOpen={show2FASetup}
            onClose={() => {
              // Only allow closing if 2FA is not required or already enabled
              if (!twoFactorRequired || twoFactorEnabled) {
                setShow2FASetup(false);
              }
            }}
            isRequired={twoFactorRequired && !twoFactorEnabled}
          />
        )}

        {/* Click away handlers */}
        {showAccountMenu && (
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setShowAccountMenu(false)}
          />
        )}
        
        {showQuickActions && (
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setShowQuickActions(false)}
          />
        )}
      </div>
    </RoleProtected>
  );
};

export default AdminConsolePage;
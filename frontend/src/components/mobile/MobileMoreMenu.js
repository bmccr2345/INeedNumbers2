import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  Sparkles,
  HelpCircle,
  X,
  Palette
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

/**
 * Mobile More Menu Modal
 * Full-screen modal for settings, profile, and account actions
 * Accessed from "More" tab on mobile
 */
const MobileMoreMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!isOpen) return null;

  // Debug logging for user object
  console.log('[MobileMoreMenu] User object:', {
    exists: !!user,
    email: user?.email,
    name: user?.name,
    plan: user?.plan,
    role: user?.role,
    id: user?.id
  });

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const menuItems = [
    {
      id: 'profile',
      label: 'My Profile',
      icon: User,
      action: () => {
        navigate('/settings');
        onClose();
      }
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      action: () => {
        navigate('/settings');
        onClose();
      }
    },
    {
      id: 'branding',
      label: 'Branding Profile',
      icon: Palette,
      action: () => {
        navigate('/app/branding');
        onClose();
      }
    },
    {
      id: 'support',
      label: 'Help & Support',
      icon: HelpCircle,
      action: () => {
        navigate('/support');
        onClose();
      }
    }
  ];

  // Add admin console for master_admin users
  if (user?.role === 'master_admin') {
    menuItems.unshift({
      id: 'admin',
      label: 'Admin Console',
      icon: Shield,
      badge: 'Admin',
      badgeColor: 'bg-red-100 text-red-700',
      action: () => {
        navigate('/app/admin');
        onClose();
      }
    });
  }

  // Add Pro onboarding for PRO users
  if (user?.plan === 'PRO') {
    menuItems.push({
      id: 'pro-guide',
      label: 'Pro Onboarding Guide',
      icon: Sparkles,
      badge: 'PRO',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      action: () => {
        // TODO: Open Pro onboarding wizard
        console.log('Open Pro Onboarding');
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col" style={{ paddingBottom: '64px' }}>
      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">More</h2>
          <p className="text-sm text-white/80 mt-1">
            {user?.email}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* User Info Card */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{user?.name || user?.full_name || 'User'}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {user?.plan || 'FREE'}
              </Badge>
              {user?.role === 'master_admin' && (
                <Badge variant="destructive" className="text-xs">
                  Admin
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="w-full flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left"
                style={{ minHeight: '56px' }} // Touch target
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-700" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{item.label}</span>
                </div>
                {item.badge && (
                  <Badge className={item.badgeColor || 'bg-gray-100 text-gray-700'}>
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-gray-200"></div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-4 p-4 rounded-lg hover:bg-red-50 transition-colors text-left text-red-600 mb-6"
          style={{ minHeight: '56px' }}
        >
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <LogOut className="w-5 h-5 text-red-600" />
          </div>
          <span className="font-medium">Logout</span>
        </button>

        {/* Footer Info */}
        <div className="pb-4 border-t border-gray-200 pt-4 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            I Need Numbers v1.0
          </p>
          <div className="flex justify-center space-x-4 mt-2">
            <button 
              onClick={() => {
                navigate('/terms');
                onClose();
              }}
              className="text-xs text-gray-600 hover:text-primary"
            >
              Terms
            </button>
            <button 
              onClick={() => {
                navigate('/privacy');
                onClose();
              }}
              className="text-xs text-gray-600 hover:text-primary"
            >
              Privacy
            </button>
            <button 
              onClick={() => {
                navigate('/support');
                onClose();
              }}
              className="text-xs text-gray-600 hover:text-primary"
            >
              Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMoreMenu;

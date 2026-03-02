import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { ClerkProvider, useUser } from '@clerk/clerk-react';
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import PerformanceMonitor from "./components/PerformanceMonitor";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from 'sonner';
import { useIsMobile } from "./hooks/useMediaQuery";
import "./App.css";

// Clerk Publishable Key
const CLERK_PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

// ClerkProvider wrapper that provides React Router navigation
// This prevents WKWebView from redirecting to clerk.ineednumbers.com
const ClerkProviderWithNavigation = ({ children, publishableKey }) => {
  const navigate = useNavigate();
  
  return (
    <ClerkProvider 
      publishableKey={publishableKey}
      navigate={(to) => navigate(to)}
      // Force inline auth components instead of redirecting to Clerk domain
      signInUrl="/auth/login"
      signUpUrl="/auth/register"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/complete-subscription"
    >
      {children}
    </ClerkProvider>
  );
};

// Import pages
import HomePage from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import FreeCalculator from "./pages/FreeCalculator";
import Glossary from "./pages/Glossary";
import SamplePDF from "./pages/SamplePDF";
import Settings from "./pages/Settings";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyAccountPage from "./pages/MyAccountPage";
import PricingPage from "./pages/PricingPage";
import SubscriptionSetupPage from "./pages/SubscriptionSetupPage";
import ClerkDebugPage from "./pages/ClerkDebugPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import WelcomePage from "./pages/WelcomePage";
import ToolsPage from "./pages/ToolsPage";
import CommissionSplitCalculator from "./pages/CommissionSplitCalculator";
import SellerNetSheetCalculator from "./pages/SellerNetSheetCalculator";
import AffordabilityCalculator from "./pages/AffordabilityCalculator";
import SetPasswordPage from "./pages/SetPasswordPage";
import SupportPage from "./pages/SupportPage";
import CookiePolicyPage from "./pages/CookiePolicyPage";
import AccessibilityPage from "./pages/AccessibilityPage";
import PnLPanel from "./components/dashboard/PnLPanel";
import ClosingDateCalculator from "./pages/ClosingDateCalculator";
import AdminConsolePage from "./pages/AdminConsolePage";
import BrandingProfilePage from "./pages/BrandingProfilePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import MobileLayout from "./layouts/MobileLayout";
import MobileEntry from "./pages/MobileEntry";
import CompleteSubscriptionPage from "./pages/CompleteSubscriptionPage";

// Import Onboarding Screens
import {
  WelcomeScreen,
  AgentTypeScreen,
  WhyScreen,
  IncomeGoalScreen,
  HomesSoldGoalScreen,
  WeeklyHoursScreen,
  CommissionSetupScreen,
  WeeklyFocusScreen,
  CompletionScreen
} from "./screens/onboarding";

/**
 * Dashboard Route Wrapper
 * Conditionally renders mobile or desktop layout based on viewport
 * Also checks subscription status and redirects to complete subscription if needed
 */
function DashboardRoute() {
  const isMobile = useIsMobile();
  const { hasActiveSubscription, loading, user, refreshUser } = useAuth();
  const { isSignedIn, isLoaded, user: clerkUser } = useUser();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [hasCheckedCheckout, setHasCheckedCheckout] = React.useState(false);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  
  // Check for checkout success and verify/refresh subscription
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get('checkout');
    const sessionId = urlParams.get('session_id');
    
    if (checkoutStatus === 'success' && !hasCheckedCheckout && clerkUser) {
      setHasCheckedCheckout(true);
      setIsRefreshing(true);
      
      console.log('[DashboardRoute] Checkout success detected, verifying subscription...');
      console.log('[DashboardRoute] Session ID:', sessionId);
      
      const verifyAndRefresh = async () => {
        try {
          // Call backend to verify subscription status using session_id
          const response = await fetch(`${backendUrl}/api/clerk/verify-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              clerk_user_id: clerkUser.id,
              session_id: sessionId 
            }),
            credentials: 'include'
          });
          
          const result = await response.json();
          console.log('[DashboardRoute] Subscription verification result:', result);
          
          // Wait a moment for updates to propagate
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Reload the Clerk user to get updated metadata
          await clerkUser.reload();
          console.log('[DashboardRoute] Clerk user reloaded, metadata:', clerkUser.publicMetadata);
          
          // Also refresh our auth context
          if (refreshUser) {
            await refreshUser();
          }
          
          // Clear the checkout params from URL
          window.history.replaceState({}, '', window.location.pathname);
        } catch (err) {
          console.error('[DashboardRoute] Error verifying subscription:', err);
        } finally {
          setIsRefreshing(false);
        }
      };
      
      // Start verification after a short delay to allow Stripe webhook to process first
      setTimeout(verifyAndRefresh, 1500);
    }
  }, [clerkUser, hasCheckedCheckout, refreshUser, backendUrl]);
  
  // Wait for auth to load or for refresh to complete
  if (loading || !isLoaded || isRefreshing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2FA163] mx-auto mb-4"></div>
          {isRefreshing && <p className="text-gray-600">Activating your subscription...</p>}
        </div>
      </div>
    );
  }
  
  // If user is signed in but doesn't have an active subscription, redirect to complete subscription
  if (isSignedIn && user && !hasActiveSubscription()) {
    return <Navigate to="/complete-subscription" replace />;
  }
  
  // On mobile, render MobileLayout with DashboardPage
  // MobileLayout will decide whether to show MobileDashboard or DashboardPage
  if (isMobile) {
    return (
      <ErrorBoundary>
        <MobileLayout>
          <DashboardPage />
        </MobileLayout>
      </ErrorBoundary>
    );
  }
  
  // On desktop, render DashboardPage directly
  return (
    <ErrorBoundary>
      <DashboardPage />
    </ErrorBoundary>
  );
}

/**
 * Calculator Route Wrapper
 * Wraps calculator pages in MobileLayout on mobile to maintain bottom navigation
 */
function CalculatorRoute({ children }) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <ErrorBoundary>
        <MobileLayout>
          {children}
        </MobileLayout>
      </ErrorBoundary>
    );
  }
  
  // On desktop, render calculator directly
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

function App() {
  return (
    <div className="App">
      <HelmetProvider>
        <PerformanceMonitor />
        <Toaster position="top-right" richColors />
        <BrowserRouter future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
          v7_fetcherPersist: true
        }}>
          <ClerkProviderWithNavigation publishableKey={CLERK_PUBLISHABLE_KEY}>
            <AuthProvider>
              <OnboardingProvider>
                <Routes>
              {/* Mobile-only entry route - bypasses all layouts */}
              <Route path="/mobile" element={<MobileEntry />} />
              
              {/* New redesigned landing page as main homepage */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/home-legacy" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardRoute />} />
              <Route path="/calculator" element={<CalculatorRoute><FreeCalculator /></CalculatorRoute>} />
              <Route path="/glossary" element={<Glossary />} />
              <Route path="/sample-pdf" element={<SamplePDF />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/subscription-setup" element={<SubscriptionSetupPage />} />
              <Route path="/complete-subscription" element={<CompleteSubscriptionPage />} />
              <Route path="/clerk-debug" element={<ClerkDebugPage />} />
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/support" element={<SupportPage />} />
              
              {/* Tools Routes */}
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/tools/commission-split" element={<CalculatorRoute><CommissionSplitCalculator /></CalculatorRoute>} />
              <Route path="/tools/net-sheet" element={<CalculatorRoute><SellerNetSheetCalculator /></CalculatorRoute>} />
              <Route path="/tools/affordability" element={<CalculatorRoute><AffordabilityCalculator /></CalculatorRoute>} />
              <Route path="/tools/closing-date" element={<CalculatorRoute><ClosingDateCalculator /></CalculatorRoute>} />
              <Route path="/affordability/shared/:calculationId" element={<CalculatorRoute><AffordabilityCalculator /></CalculatorRoute>} />
              <Route path="/tools/agent-pl-tracker" element={<CalculatorRoute><PnLPanel /></CalculatorRoute>} />
              <Route path="/tools/pnl-tracker" element={<CalculatorRoute><PnLPanel /></CalculatorRoute>} />
              {/* Redirect old P&L Tracker URL to correct path */}
              <Route path="/agent-pnl-tracker" element={<Navigate to="/tools/agent-pl-tracker" replace />} />
              <Route path="/login" element={<Navigate to="/auth/login" replace />} />
              <Route path="/app/branding" element={<BrandingProfilePage />} />
              
              {/* Onboarding Routes */}
              <Route path="/onboarding" element={<WelcomeScreen />} />
              <Route path="/onboarding/welcome" element={<WelcomeScreen />} />
              <Route path="/onboarding/agent-type" element={<AgentTypeScreen />} />
              <Route path="/onboarding/why" element={<WhyScreen />} />
              <Route path="/onboarding/income-goal" element={<IncomeGoalScreen />} />
              <Route path="/onboarding/homes-sold-goal" element={<HomesSoldGoalScreen />} />
              <Route path="/onboarding/weekly-hours" element={<WeeklyHoursScreen />} />
              <Route path="/onboarding/commission-setup" element={<CommissionSetupScreen />} />
              <Route path="/onboarding/weekly-focus" element={<WeeklyFocusScreen />} />
              <Route path="/onboarding/completion" element={<CompletionScreen />} />
              
              {/* Auth Routes */}
              <Route path="/auth/login/*" element={<LoginPage />} />
              <Route path="/auth/register/*" element={<RegisterPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/set-password" element={<SetPasswordPage />} />
              <Route path="/account" element={<MyAccountPage />} />
              
              {/* Legal Routes */}
              <Route path="/legal/terms" element={<TermsPage />} />
              <Route path="/legal/privacy" element={<PrivacyPage />} />
              <Route path="/legal/cookies" element={<CookiePolicyPage />} />
              <Route path="/legal/accessibility" element={<AccessibilityPage />} />
              
              {/* Admin Routes */}
              <Route path="/app/admin" element={<AdminConsolePage />} />
              </Routes>
            </OnboardingProvider>
          </AuthProvider>
          </ClerkProviderWithNavigation>
        </BrowserRouter>
      </HelmetProvider>
    </div>
  );
}

export default App;
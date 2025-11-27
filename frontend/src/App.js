import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { ClerkProvider } from '@clerk/clerk-react';
import { AuthProvider } from "./contexts/AuthContext";
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
 */
function DashboardRoute() {
  const isMobile = useIsMobile();
  
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
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
          <BrowserRouter future={{
            v7_relativeSplatPath: true,
            v7_startTransition: true,
            v7_fetcherPersist: true
          }}>
            <AuthProvider>
              <OnboardingProvider>
                <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardRoute />} />
              <Route path="/calculator" element={<CalculatorRoute><FreeCalculator /></CalculatorRoute>} />
              <Route path="/glossary" element={<Glossary />} />
              <Route path="/sample-pdf" element={<SamplePDF />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/subscription-setup" element={<SubscriptionSetupPage />} />
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
              
              {/* Auth Routes */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
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
          </AuthProvider>
        </BrowserRouter>
      </ClerkProvider>
      </HelmetProvider>
    </div>
  );
}

export default App;
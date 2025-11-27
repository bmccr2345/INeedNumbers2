import React, { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider = ({ children }) => {
  const [onboardingData, setOnboardingData] = useState({
    agent_type: null,
    why: null,
    income_goal: null,
    homes_sold_goal: null,
    weekly_hours: null,
    commission: {
      split: null,
      team_fees: false,
      transaction_fees: false,
      auto_net_calc: false
    },
    weekly_focus: {
      lead_generation: false,
      pipeline_growth: false,
      consistency: false
    }
  });

  const updateOnboardingData = (field, value) => {
    setOnboardingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateCommission = (field, value) => {
    setOnboardingData(prev => ({
      ...prev,
      commission: {
        ...prev.commission,
        [field]: value
      }
    }));
  };

  const updateWeeklyFocus = (field, value) => {
    setOnboardingData(prev => ({
      ...prev,
      weekly_focus: {
        ...prev.weekly_focus,
        [field]: value
      }
    }));
  };

  const resetOnboarding = () => {
    setOnboardingData({
      agent_type: null,
      why: null,
      income_goal: null,
      homes_sold_goal: null,
      weekly_hours: null,
      commission: {
        split: null,
        team_fees: false,
        transaction_fees: false,
        auto_net_calc: false
      },
      weekly_focus: {
        lead_generation: false,
        pipeline_growth: false,
        consistency: false
      }
    });
  };

  const loadExistingProfile = (profile) => {
    setOnboardingData({
      agent_type: profile.agent_type || null,
      why: profile.why || null,
      income_goal: profile.income_goal || null,
      homes_sold_goal: profile.homes_sold_goal || null,
      weekly_hours: profile.weekly_hours || null,
      commission: profile.commission || {
        split: null,
        team_fees: false,
        transaction_fees: false,
        auto_net_calc: false
      },
      weekly_focus: profile.weekly_focus || {
        lead_generation: false,
        pipeline_growth: false,
        consistency: false
      }
    });
  };

  const value = {
    onboardingData,
    updateOnboardingData,
    updateCommission,
    updateWeeklyFocus,
    resetOnboarding,
    loadExistingProfile
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

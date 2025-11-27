from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CommissionSettings(BaseModel):
    """Commission structure settings from onboarding"""
    split: Optional[str] = None  # e.g., "70/30", "80/20", "90/10", "custom"
    team_fees: Optional[bool] = False
    transaction_fees: Optional[bool] = False
    auto_net_calc: Optional[bool] = False


class WeeklyFocus(BaseModel):
    """Weekly plan focus areas from onboarding"""
    lead_generation: Optional[bool] = False
    pipeline_growth: Optional[bool] = False
    consistency: Optional[bool] = False


class OnboardingProfile(BaseModel):
    """Complete onboarding profile data model"""
    agent_type: Optional[str] = None  # "building_momentum", "steady_growing", "scaling_business"
    why: Optional[str] = None  # User's motivation/reason for real estate
    income_goal: Optional[int] = None  # Annual income goal
    homes_sold_goal: Optional[int] = None  # Number of homes to sell this year
    weekly_hours: Optional[int] = None  # Hours per week to work
    commission: Optional[CommissionSettings] = None  # Commission structure
    weekly_focus: Optional[WeeklyFocus] = None  # Weekly priorities
    onboarding_completed: Optional[bool] = False
    onboarding_completed_at: Optional[datetime] = None


class OnboardingSaveRequest(BaseModel):
    """Request model for saving partial onboarding data"""
    profile: OnboardingProfile


class OnboardingCompleteResponse(BaseModel):
    """Response model after completing onboarding"""
    profile: OnboardingProfile
    dashboard: dict  # Contains weekly_plan, income_goal, production_goal, first_steps_checklist
